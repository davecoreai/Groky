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
    const { filename, content, mimeType } = req.body || {};
    if (!content) {
      return res.status(400).json({ error: "Document content is required" });
    }

    const ai = getGenAI();
    const prompt = `Perform an in-depth, structured executive summary and technical extraction of the following document titled "${filename || "Uploaded File"}".
MIME Type: ${mimeType || "text/plain"}
Content:
${content.slice(0, 50000)}

Please return a clear, structured JSON response with the following format:
{
  "summary": "High-level summary of the document",
  "keyPoints": ["bullet point 1", "bullet point 2"],
  "entityTypes": ["identified topics", "languages", "key entities"],
  "insights": "Key analytical findings or actionable suggestions"
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const analysis = JSON.parse(response.text || "{}");
    return res.status(200).json({ status: "success", analysis });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to analyze document" });
  }
}
