// api/translate.js
export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { texts, targetLang = "ky", sourceLang = "auto" } = req.body || {};
    if (!Array.isArray(texts) || texts.length === 0) {
      return res.status(400).json({ error: "Body must be { texts: string[] }" });
    }
    if (texts.length > 500) {
      return res.status(400).json({ error: "Too many items; max 500 per request" });
    }

    const systemPrompt =
      `You are a professional translator. Translate each input string to ${
        targetLang === "ky" ? "Kyrgyz" : targetLang
      }. Return ONLY JSON with a key "translations" as an array of strings with the SAME length and order as the input.
Keep numbers, URLs, email addresses, and placeholders like {name}, {{token}}, %s unchanged. Do not add comments.`;

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        temperature: 0.2,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: JSON.stringify({ sourceLang, targetLang, texts }) }
        ]
      })
    });

    const data = await r.json();
    if (!r.ok) {
      console.error("OpenAI error", data);
      return res.status(r.status).json({ error: "OpenAI error", detail: data });
    }

    let parsed;
    try { parsed = JSON.parse(data?.choices?.[0]?.message?.content || "{}"); } catch (e) {}
    const translations = parsed?.translations;

    if (!Array.isArray(translations) || translations.length !== texts.length) {
      return res.status(500).json({ error: "Bad translation format", raw: data });
    }

    return res.status(200).json({ translations });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}
