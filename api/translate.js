import fs from "fs";
import path from "path";
import fetch from "node-fetch";

const CACHE_FILE = path.join(process.cwd(), "translations.json");
let cache = fs.existsSync(CACHE_FILE) ? JSON.parse(fs.readFileSync(CACHE_FILE)) : {};

export default async function handler(req, res) {
  const allowedOrigin = "https://sprightly-choux-7031ef.netlify.app"; // твой фронтенд
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    // Парсим тело запроса
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { text } = body;

    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    // Разбиваем на элементы
    const items = text.split("\n---\n").map(t => JSON.parse(t));

    const translatedItems = [];

    for (let item of items) {
      const cacheKey = JSON.stringify(item) + "|" + (body.lang || "ky");
      if (cache[cacheKey]) {
        translatedItems.push(cache[cacheKey]);
        continue;
      }

      // Формируем один текст для перевода — все поля одного элемента
      const prompt = `Переведи на ${body.lang || "ky"} следующие поля JSON, сохраняя их ключи: ${JSON.stringify(item)}`;

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: `Ты переводчик.` },
            { role: "user", content: prompt }
          ]
        })
      });

      const data = await response.json();
      const translated = data.choices?.[0]?.message?.content?.trim();

      if (!translated) {
        translatedItems.push(item); // оставляем оригинал при ошибке
      } else {
        try {
          const translatedJSON = JSON.parse(translated);
          translatedItems.push(translatedJSON);
          cache[cacheKey] = translatedJSON;
        } catch {
          // если OpenAI вернул невалидный JSON, оставляем оригинал
          translatedItems.push(item);
        }
      }
    }

    // Сохраняем кэш
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));

    // Отправляем обратно
    res.json({ translated: translatedItems.map(i => JSON.stringify(i)).join("\n---\n") });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Ошибка перевода" });
  }
}
