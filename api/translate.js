export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end(); // preflight
  }
  
import fs from "fs";
import path from "path";
import fetch from "node-fetch";

const CACHE_FILE = path.join(process.cwd(), "translations.json");
let cache = fs.existsSync(CACHE_FILE) ? JSON.parse(fs.readFileSync(CACHE_FILE)) : {};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    const { text, lang } = req.body;
    if (!text || !lang) {
      return res.status(400).json({ error: "Text and lang are required" });
    }

    // проверка кэша
    if (cache[text + lang]) {
      return res.json({ translated: cache[text + lang] });
    }

    // запрос в OpenAI
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: `Переведи текст на ${lang}, сохраняя смысл.` },
          { role: "user", content: text }
        ]
      })
    });

    const data = await response.json();
    const translated = data.choices[0].message.content.trim();

    // сохраняем в кэш
    cache[text + lang] = translated;
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));

    res.json({ translated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Ошибка перевода" });
  }
}

