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
  // CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const {
    messages = [],
    model = "z-ai/glm-5.2:free",
    systemPrompt = "",
    temperature = 0.7,
    files = [],
    customConfig,
  } = req.body || {};

  // SSE Headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.setHeader("Content-Encoding", "none");

  const sendEvent = (data: any) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const openRouterApiKey =
      customConfig?.openRouterApiKey ||
      process.env.OPENROUTER_API_KEY ||
      customConfig?.apiKey ||
      "";

    const defaultSystemPrompt = `You are Groky AI, an elite AI Assistant with exceptional reasoning, 3D engineering, and high-craft coding capabilities.
Key Directives for Code & UI Generation:
1. Modern Aesthetic Craft: Design sleek, contemporary interfaces with refined typography, balanced whitespace, and sophisticated lighting/shadows. Strictly avoid tacky 90s clichés, rigid boxy layouts, and excessive rainbow/purple-blue neon gradients.
2. 3D & Interactive Graphics: When creating 3D graphics, interactive models, or visual simulations, utilize Three.js (THREE is already globally available in the preview sandbox). Implement smooth 60fps render loops, elegant geometries/materials (MeshStandardMaterial, MeshPhysicalMaterial), realistic ambient & directional lighting, responsive window resize handlers, and OrbitControls or mouse-drag interaction.
3. Complete & Self-Contained: Whenever producing HTML/CSS/JS components, ensure the code is 100% complete, executable, and ready for instant rendering in the Artifact Viewer.
4. Clean Markdown & Modular Code: Structure explanations concisely with clear sections and language-tagged code blocks (e.g. \`\`\`html, \`\`\`tsx, \`\`\`python).`;

    const fullSystemInstruction = systemPrompt
      ? `${defaultSystemPrompt}\n\nCustom User Directive:\n${systemPrompt}`
      : defaultSystemPrompt;

    // 1. OpenRouter Flow
    if (openRouterApiKey) {
      const formattedMessages = [
        { role: "system", content: fullSystemInstruction },
        ...messages.map((m: any) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content || "",
        })),
      ];

      if (files && files.length > 0 && formattedMessages.length > 0) {
        const fileContext = files
          .map((f: any) => `\n[Attached Document: ${f.name} (${f.type})]:\n${f.content || "(Attachment)"}`)
          .join("\n\n");
        const lastMsg = formattedMessages[formattedMessages.length - 1];
        lastMsg.content += `\n\n${fileContext}`;
      }

      const candidates: string[] = [
        model || "z-ai/glm-5.2:free",
        "google/gemma-4-31b-it:free",
        "google/gemma-4-26b-a4b-it:free",
        "z-ai/glm-5.2:free",
        "inclusionai/ling-3.0-flash-fin:free",
        "nvidia/nemotron-3-ultra-550b-a55b:free",
        "meta-llama/llama-3.3-70b-instruct:free",
        "google/gemini-2.0-flash-exp:free",
        "mistralai/mistral-small-24b-instruct-2501:free",
        "qwen/qwen-2.5-coder-32b-instruct:free",
        "openrouter/auto",
      ];

      for (const candidateModel of Array.from(new Set(candidates))) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000);

          const orResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${openRouterApiKey}`,
              "HTTP-Referer": "https://groky-seven.vercel.app",
              "X-Title": "Groky AI",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: candidateModel,
              messages: formattedMessages,
              stream: true,
              temperature: Math.min(Math.max(Number(temperature) || 0.7, 0), 1.5),
            }),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!orResponse.ok) {
            if (orResponse.status === 429) break;
            continue;
          }

          if (!orResponse.body) continue;

          const reader = orResponse.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          let streamedAnyChunk = false;

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || trimmed.startsWith(":")) continue;
              if (trimmed === "data: [DONE]") break;
              if (trimmed.startsWith("data: ")) {
                try {
                  const json = JSON.parse(trimmed.slice(6));
                  const delta = json.choices?.[0]?.delta?.content;
                  if (delta) {
                    sendEvent({ text: delta });
                    streamedAnyChunk = true;
                  }
                } catch {
                  // ignore parse error
                }
              }
            }
          }

          if (streamedAnyChunk) {
            sendEvent({ done: true, provider: "OpenRouter", underlyingModel: candidateModel });
            res.write("data: [DONE]\n\n");
            return res.end();
          }
        } catch {
          // try next candidate
        }
      }
    }

    // 2. Fallback to Google Gemini
    const ai = getGenAI();
    let fallbackModel = "gemini-2.5-flash";
    if (model && model.includes("pro")) {
      fallbackModel = "gemini-2.5-pro";
    }

    const contents: any[] = [];
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const parts: any[] = [];

      if (i === messages.length - 1 && files && files.length > 0) {
        for (const file of files) {
          if (file.dataUrl && file.dataUrl.startsWith("data:")) {
            const mimeMatch = file.dataUrl.match(/^data:([^;]+);base64,(.*)$/);
            if (mimeMatch) {
              parts.push({
                inlineData: {
                  mimeType: mimeMatch[1],
                  data: mimeMatch[2],
                },
              });
            }
          } else if (file.content) {
            parts.push({
              text: `[File Content from: ${file.name}]\n\`\`\`${file.extension || ""}\n${file.content}\n\`\`\`\n`,
            });
          }
        }
      }

      if (msg.content) {
        parts.push({ text: msg.content });
      }

      if (parts.length > 0) {
        contents.push({
          role: msg.role === "assistant" ? "model" : "user",
          parts,
        });
      }
    }

    if (contents.length === 0) {
      contents.push({ role: "user", parts: [{ text: "Hello" }] });
    }

    const responseStream = await ai.models.generateContentStream({
      model: fallbackModel,
      contents,
      config: {
        systemInstruction: fullSystemInstruction,
        temperature: Math.min(Math.max(Number(temperature) || 0.7, 0), 1.5),
      },
    });

    for await (const chunk of responseStream) {
      if (chunk.text) {
        sendEvent({ text: chunk.text });
      }
    }

    sendEvent({ done: true, provider: "Gemini", underlyingModel: fallbackModel });
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err: any) {
    console.error("Vercel Serverless Stream Error:", err);
    sendEvent({ error: err?.message || "Internal server error" });
    res.write("data: [DONE]\n\n");
    res.end();
  }
}
