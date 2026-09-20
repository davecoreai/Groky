import { GoogleGenAI } from "@google/genai";

let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is missing.");
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { text } = req.body || {};
    if (!text) {
      return res.status(400).json({ error: "Text is required for embeddings" });
    }

    const ai = getGenAI();
    const result = await (ai.models as any).embedContent({
      model: "text-embedding-004",
      contents: text,
    });

    const values = result.embedding?.values || [];
    return res.status(200).json({
      status: "success",
      dimensions: values.length,
      values: values.slice(0, 32),
      sampleCount: values.length,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to calculate embeddings" });
  }
}
