// netlify/functions/proxy.js

// ======= Config =======
// Prefer env var so you can switch without code changes in Netlify UI.
const PRIMARY_ENDPOINT =
  process.env.OA_ENDPOINT || "https://openastro.vercel.app/api/chart";

// Safe fallbacks if the primary endpoint is temporarily unreachable.
const FALLBACK_ENDPOINTS = [
  "https://openastro.fly.dev/api/chart",
  // "https://api.openastro.io/chart", // enable if/when it’s stable in your region
];

// CORS headers (relaxed for demo/tools)
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "600",
  "Content-Type": "application/json",
};

// General fetch timeout (ms)
const FETCH_TIMEOUT = 15000;

// ======= Utilities =======

function ok(body, extraHeaders = {}) {
  return {
    statusCode: 200,
    headers: { ...CORS, ...extraHeaders },
    body: JSON.stringify(body),
  };
}

function err(status, message, extra = {}) {
  return {
    statusCode: status,
    headers: CORS,
    body: JSON.stringify({ error: message, ...extra }),
  };
}

function getPayload(event) {
  try {
    return JSON.parse(event.body || "{}");
  } catch {
    return null;
  }
}

function normalizeInput(raw) {
  // Support both {lat, lon} and {latitude, longitude}
  const lat = raw.lat ?? raw.latitude;
  const lon = raw.lon ?? raw.longitude;

  // Support date separators either "-" or "/"
  let date = raw.date;
  if (typeof date === "string") {
    date = date.replace(/\//g, "-"); // normalize to YYYY-MM-DD
  }

  return {
    lat: typeof lat === "number" ? lat : Number(lat),
    lon: typeof lon === "number" ? lon : Number(lon),
    date,
    time: raw.time,
    tz: raw.tz,
  };
}

function validateInput({ lat, lon, date, time, tz }) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return "lat and lon must be numbers";
  }
  if (!date || typeof date !== "string") return "date is required (YYYY-MM-DD)";
  if (!time || typeof time !== "string") return "time is required (HH:mm)";
  if (!tz || typeof tz !== "string") return "tz is required (e.g. +08:00)";
  return null;
}

async function postWithTimeout(url, jsonBody, timeoutMs) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(jsonBody),
      signal: controller.signal,
    });
    return resp;
  } finally {
    clearTimeout(id);
  }
}

async function callUpstreamWithFallbacks(payload) {
  const endpoints = [PRIMARY_ENDPOINT, ...FALLBACK_ENDPOINTS];

  let lastError;
  for (const url of endpoints) {
    try {
      console.log("[proxy] hitting:", url);
      const resp = await postWithTimeout(url, payload, FETCH_TIMEOUT);
      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        console.error("[proxy] upstream non-200", resp.status, text.slice(0, 500));
        lastError = new Error(`Upstream ${resp.status}`);
        continue;
      }
      return await resp.json();
    } catch (e) {
      console.error("[proxy] fetch failed:", String(e));
      lastError = e;
    }
  }
  throw lastError || new Error("All upstream endpoints failed");
}

// ======= Netlify Function entry =======

export async function handler(event) {
  console.log("== proxy invoked ==");

  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: CORS,
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return err(405, "Method Not Allowed");
  }

  const raw = getPayload(event);
  if (!raw) return err(400, "Invalid JSON body");

  const input = normalizeInput(raw);
  const bad = validateInput(input);
  if (bad) return err(400, bad);

  try {
    const data = await callUpstreamWithFallbacks(input);
    return ok(data);
  } catch (e) {
    // Common DNS issue (ENOTFOUND) / timeouts surface here
    console.error("[proxy] final error:", e);
    return err(502, "Upstream fetch failed", {
      detail: String(e && e.message ? e.message : e),
    });
  }
}
