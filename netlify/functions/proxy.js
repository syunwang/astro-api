// netlify/functions/proxy.js
export async function handler(event, context) {
  try {
    console.log("== proxy invoked ==");
    console.log("event.httpMethod:", event.httpMethod);
    console.log("event.headers:", event.headers);
    console.log("event.body (raw):", event.body);

    // Netlify sends the body as a string; parse it
    let body;
    try {
      body = event.body ? JSON.parse(event.body) : {};
    } catch (e) {
      console.error("JSON parse error:", e);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid JSON body" }),
      };
    }

    console.log("parsed body:", body);

    const resp = await fetch("https://api.openastro.io/chart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    // Log non-2xx immediately
    console.log("upstream status:", resp.status, resp.statusText);

    const text = await resp.text();  // read raw first for better logging
    console.log("upstream raw response:", text);

    // Try to JSON-parse the upstream response, but return raw if not JSON
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    return {
      statusCode: resp.status,
      body: typeof data === "string" ? data : JSON.stringify(data),
      headers: { "Content-Type": "application/json" },
    };
  } catch (err) {
    console.error("proxy fatal error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: String(err && err.message || err) }),
    };
  }
}
