// netlify/functions/proxy.js
export async function handler(event, context) {
  try {
    const response = await fetch("https://api.openastro.io/chart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: event.body,
    });

    const data = await response.json();

    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
}
