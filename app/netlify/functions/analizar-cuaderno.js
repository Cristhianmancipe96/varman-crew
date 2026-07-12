// Función de Netlify: recibe la foto del cuaderno desde la app y la reenvía a
// la API de Anthropic usando la clave secreta (guardada en variables de entorno
// de Netlify, NUNCA en el navegador).
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Método no permitido" }) };
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ error: "Falta configurar ANTHROPIC_API_KEY en Netlify." }),
    };
  }

  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: event.body, // se reenvía tal cual lo que armó la app (modelo + imagen + prompt)
    });
    const text = await resp.text();
    return {
      statusCode: resp.status,
      headers: { "content-type": "application/json" },
      body: text,
    };
  } catch (e) {
    return {
      statusCode: 502,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ error: "No se pudo contactar la IA: " + (e && e.message ? e.message : String(e)) }),
    };
  }
};
