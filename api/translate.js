import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { text, lang } = req.body;
  if (!text || !lang) return res.status(400).json({ error: "Missing text or lang" });

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Переведи следующий текст на язык ${lang}: ${text}`
        }
      ]
    });

    const translated = response.choices[0].message.content;
    res.status(200).json({ translated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Translation failed" });
  }
}
