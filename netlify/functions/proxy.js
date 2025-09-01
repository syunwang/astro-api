// netlify/functions/proxy.js
// 兼容 CommonJS 的寫法，避免 ESM/require 差異
const OA_ENDPOINT = "https://api.openastro.io/chart";

const baseHeaders = {
  "content-type": "application/json; charset=utf-8",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST,OPTIONS",
  "access-control-allow-headers": "content-type",
};

const ok = (data) => ({
  statusCode: 200,
  headers: baseHeaders,
  body: JSON.stringify(data),
});

const err = (code, data) => ({
  statusCode: code,
  headers: baseHeaders,
  body: JSON.stringify(data),
});

// Netlify Functions (CommonJS) 入口
exports.handler = async (event) => {
  try {
    if (event.httpMethod === "OPTIONS") return ok({}); // CORS preflight

    if (event.httpMethod !== "POST") {
      return err(405, { error: "Use POST to call this endpoint." });
    }

    // 解析前端傳來的 JSON
    let payload = {};
    try {
      payload = JSON.parse(event.body || "{}");
    } catch (e) {
      return err(400, { error: "Bad JSON body", detail: String(e) });
    }

    // 轉呼叫 OpenAstro
    const resp = await fetch(OA_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    const text = await resp.text();

    // 非 2xx，把上游的狀態碼與內容一起吐回去，並寫入日志
    if (!resp.ok) {
      console.log("Upstream error:", resp.status, text);
      return err(resp.status, {
        error: "Upstream error from OpenAstro",
        status: resp.status,
        body: text,
      });
    }

    // 正常情況是 JSON
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
    return ok(data);
  } catch (e) {
    console.error("Function crashed:", e);
    return err(500, { error: "Function crashed", detail: String(e) });
  }
};
