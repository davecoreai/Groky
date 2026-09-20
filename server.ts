import express, { Request, Response } from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Initialize Express
const app = express();
const PORT = 3000;

// Enable CORS for Vercel Serverless & local previews
app.use((_req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "X-Requested-With,content-type,Authorization");
  if (_req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Middleware for body parsing
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// Lazy GoogleGenAI client singleton
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("WARNING: GEMINI_API_KEY is not set in environment.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || "",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// In-memory sliding window rate limiter
interface RateLimitRecord {
  count: number;
  resetTime: number;
}
const ipLimits = new Map<string, RateLimitRecord>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 60; // 60 requests/min

function checkRateLimit(req: Request, res: Response, next: () => void) {
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0] || req.socket.remoteAddress || "anonymous";
  const now = Date.now();
  const record = ipLimits.get(ip);

  if (!record || now > record.resetTime) {
    ipLimits.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    res.setHeader("X-RateLimit-Limit", MAX_REQUESTS_PER_WINDOW);
    res.setHeader("X-RateLimit-Remaining", MAX_REQUESTS_PER_WINDOW - 1);
    return next();
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    res.setHeader("X-RateLimit-Limit", MAX_REQUESTS_PER_WINDOW);
    res.setHeader("X-RateLimit-Remaining", 0);
    res.setHeader("Retry-After", Math.ceil((record.resetTime - now) / 1000));
    return res.status(429).json({
      error: "Rate limit exceeded. Please wait a moment before sending another message.",
    });
  }

  record.count += 1;
  res.setHeader("X-RateLimit-Limit", MAX_REQUESTS_PER_WINDOW);
  res.setHeader("X-RateLimit-Remaining", MAX_REQUESTS_PER_WINDOW - record.count);
  next();
}

// ==========================================
// API ROUTER (Mountable at /api & /)
// ==========================================
const apiRouter = express.Router();

// Health Check
apiRouter.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    app: "Groky AI",
    version: "2.4.0",
    url: "https://groky-seven.vercel.app",
    openRouterConfigured: Boolean(process.env.OPENROUTER_API_KEY),
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// Helper to sanitize and unpack nested API error payloads into clear human text
function extractCleanErrorMessage(err: any): string {
  if (!err) return "An unexpected error occurred.";
  let raw = typeof err === "string" ? err : err.message || String(err);
  try {
    const parsed = JSON.parse(raw);
    if (parsed.error?.metadata?.raw) {
      raw = parsed.error.metadata.raw;
    } else if (parsed.error?.message) {
      raw = parsed.error.message;
    } else if (parsed.message) {
      raw = parsed.message;
    }
  } catch {
    // Check if error contains embedded json string
    const jsonMatch = raw.match(/\{.*"message":\s*"([^"]+)".*\}/);
    if (jsonMatch && jsonMatch[1]) {
      raw = jsonMatch[1];
    }
  }

  // Provide helpful context if temporary capacity or rate limit issue
  if (
    raw.includes("rate-limited") ||
    raw.includes("429") ||
    raw.includes("quota") ||
    raw.includes("overloaded")
  ) {
    return "The selected model is momentarily rate-limited upstream. Please retry in a few seconds or switch models.";
  }
  if (raw.includes("high demand") || raw.includes("UNAVAILABLE") || raw.includes("503")) {
    return "This model is currently experiencing temporary high demand. Please try again in a few moments.";
  }

  return raw;
}

// Resilient multi-tier streaming with automatic fallback for high-demand spikes
async function executeStreamWithFallback({
  ai,
  preferredModel,
  contents,
  config,
  sendEvent,
}: {
  ai: ReturnType<typeof getGenAI>;
  preferredModel: string;
  contents: any[];
  config: any;
  sendEvent: (data: any) => void;
}): Promise<string> {
  // Ordered sequence of fallback models based on Google Gemini recommended models
  const candidateList = [
    preferredModel || "gemini-3.8-flash",
    "gemini-3.8-flash",
    "gemini-3.1-flash-lite",
    "gemini-flash-latest",
  ];
  const candidates = candidateList.filter((m, idx, self) => self.indexOf(m) === idx);

  let streamResponse: any = null;
  let modelUsed = preferredModel;
  let lastError: any = null;

  for (const candidate of candidates) {
    try {
      streamResponse = await ai.models.generateContentStream({
        model: candidate,
        contents: contents.length ? contents : [{ role: "user", parts: [{ text: "Hello" }] }],
        config,
      });
      modelUsed = candidate;
      break;
    } catch (err: any) {
      console.warn(
        `[Groky Model Engine] Model '${candidate}' temporarily unavailable (${err?.status || err?.code || "unavailable"}). Shifting to fallback...`
      );
      lastError = err;
    }
  }

  if (!streamResponse) {
    throw lastError || new Error("All AI intelligence models are momentarily unavailable. Please retry in a few moments.");
  }

  for await (const chunk of streamResponse) {
    if (chunk.text) {
      sendEvent({ text: chunk.text });
    }
  }

  return modelUsed;
}

// Available Models (User Specified Free Models)
apiRouter.get("/models", (_req: Request, res: Response) => {
  res.json({
    defaultModel: "z-ai/glm-5.2:free",
    openRouterConfigured: Boolean(process.env.OPENROUTER_API_KEY),
    supabaseConfigured: Boolean(process.env.SUPABASE_URL),
    models: [
      {
        id: "z-ai/glm-5.2:free",
        name: "Groky 5.2 Astra",
        provider: "OpenRouter",
        badge: "Free",
        description: "Versatile, advanced reasoning and multilingual intelligence model with deep analytical precision.",
        maxTokens: 128000,
        supportsVision: true,
        supportsCodeArtifacts: true,
      },
      {
        id: "inclusionai/ling-3.0-flash-fin:free",
        name: "Groky 2.5 Flash",
        provider: "OpenRouter",
        badge: "Free",
        description: "Ultra-fast response generation tailored for coding, swift analysis, and general chat speed.",
        maxTokens: 128000,
        supportsVision: false,
        supportsCodeArtifacts: true,
      },
      {
        id: "nvidia/nemotron-3-ultra-550b-a55b:free",
        name: "Groky 3.5 Flash",
        provider: "OpenRouter",
        badge: "Free",
        description: "High-parameter deep reasoning architecture powered by Nemotron for complex logic and mathematics.",
        maxTokens: 128000,
        supportsVision: false,
        supportsCodeArtifacts: true,
      },
    ],
  });
});

// Real-time Chat Streaming API via SSE (OpenRouter First Architecture)
apiRouter.post("/chat/stream", checkRateLimit, async (req: Request, res: Response) => {
  const {
    messages = [],
    model = "z-ai/glm-5.2:free",
    systemPrompt = "",
    temperature = 0.7,
    files = [],
    customConfig,
  } = req.body;

  // Set SSE Headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.setHeader("Content-Encoding", "none");
  res.flushHeaders?.();

  // Helper to send SSE data
  const sendEvent = (data: any) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // Helper to send error and terminate
  const sendError = (err: any) => {
    const cleanMsg = extractCleanErrorMessage(err);
    sendEvent({ error: cleanMsg });
    res.write("data: [DONE]\n\n");
    res.end();
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

    // 1. If OpenRouter API Key is provided, stream via OpenRouter with intelligent fallbacks
    if (openRouterApiKey) {
      console.log(`[Groky Engine] Attempting streaming via OpenRouter model: ${model}`);

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

      // Candidate models to try in case of 404 No Endpoints, 429 Rate limits, 503, or slug deprecation
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

      let orSuccess = false;

      for (const candidateModel of Array.from(new Set(candidates))) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 6000);

          const orResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${openRouterApiKey}`,
              "HTTP-Referer": process.env.APP_URL || "https://groky-seven.vercel.app",
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
            // If rate-limited upstream on OpenRouter free pool, break out immediately to the high-speed Gemini engine
            if (orResponse.status === 429) {
              break;
            }
            continue;
          }

          if (!orResponse.body) {
            continue;
          }

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
              if (trimmed === "data: [DONE]") {
                break;
              }
              if (trimmed.startsWith("data: ")) {
                try {
                  const json = JSON.parse(trimmed.slice(6));
                  const delta = json.choices?.[0]?.delta?.content;
                  if (delta) {
                    sendEvent({ text: delta });
                    streamedAnyChunk = true;
                  }
                } catch (e) {
                  // chunk boundary
                }
              }
            }
          }

          if (streamedAnyChunk) {
            sendEvent({ done: true, provider: "OpenRouter", underlyingModel: candidateModel });
            res.write("data: [DONE]\n\n");
            orSuccess = true;
            return res.end();
          }
        } catch {
          // Silent fallback to next candidate or Gemini
        }
      }
    }

    // 2. High-Speed Fallback Engine (Immediate ultra-fast low TTFT)
    const ai = getGenAI();

    let fallbackModel = "gemini-3.8-flash"; // Fast, resilient Gemini 3.8 Flash model
    if (model.includes("lite")) {
      fallbackModel = "gemini-3.1-flash-lite";
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

    const activeModel = await executeStreamWithFallback({
      ai,
      preferredModel: fallbackModel,
      contents,
      config: {
        systemInstruction: fullSystemInstruction,
        temperature: Math.min(Math.max(Number(temperature) || 0.7, 0), 1),
      },
      sendEvent,
    });

    sendEvent({ done: true, provider: "Groky Engine", underlyingModel: activeModel });
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err: any) {
    console.error("Chat Stream Error:", err);
    sendError(err);
  }
});

// Document & File Parsing Analyzer endpoint
apiRouter.post("/documents/analyze", async (req: Request, res: Response) => {
  try {
    const { filename, content, mimeType } = req.body;
    if (!content) {
      return res.status(400).json({ error: "No content provided" });
    }

    // Fast heuristic inspection: line count, word count, code language estimation
    const lines = content.split("\n").length;
    const words = content.split(/\s+/).filter(Boolean).length;
    const charCount = content.length;
    const estimatedTokens = Math.ceil(charCount / 4);

    res.json({
      filename: filename || "document.txt",
      mimeType: mimeType || "text/plain",
      lines,
      words,
      charCount,
      estimatedTokens,
      summary: `Analyzed document (${lines} lines, ~${estimatedTokens} tokens). Ready for multi-turn Q&A and coding operations.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to analyze document" });
  }
});

// Embeddings endpoint for RAG demo
apiRouter.post("/embeddings", async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Text is required for embeddings" });
    }
    const ai = getGenAI();
    // Use gemini-embedding-2-preview as recommended in gemini-api skill
    const response = await ai.models.embedContent({
      model: "gemini-embedding-2-preview",
      contents: text,
    });

    const values = response.embeddings?.[0]?.values || [];
    res.json({
      dimension: values.length || 768,
      vectorPreview: values.slice(0, 5),
      model: "gemini-embedding-2-preview",
    });
  } catch (err: any) {
    console.error("Embeddings error:", err);
    res.status(500).json({ error: err?.message || "Failed to calculate embeddings" });
  }
});

// Mount API Router for both /api/* and root Serverless invocation
app.use("/api", apiRouter);
app.use("/", apiRouter);

// ==========================================
// VITE OR STATIC SERVING
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Groky AI server running on http://0.0.0.0:${PORT}`);
  });
}

// Export Express app for Vercel Serverless Function compatibility
export default app;

// Only start standalone HTTP server when not running in Vercel Serverless environment
if (!process.env.VERCEL) {
  startServer();
}
