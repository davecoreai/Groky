import express, { Request, Response } from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

// Server-side Supabase client singleton
let serverSupabaseClient: any = null;
function getServerSupabase() {
  if (!serverSupabaseClient) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;
    if (url && key) {
      try {
        serverSupabaseClient = createClient(url, key);
      } catch (e) {
        console.warn("Failed to create server-side Supabase client:", e);
      }
    }
  }
  return serverSupabaseClient;
}

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
    supabaseConfigured: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY),
    openRouterConfigured: Boolean(process.env.OPENROUTER_API_KEY),
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// Supabase Backend Configuration Endpoint
apiRouter.get("/config/supabase", (_req: Request, res: Response) => {
  res.json({
    supabaseUrl: process.env.SUPABASE_URL || "",
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || "",
    isConfigured: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY),
  });
});

// Backend Auth: Login
apiRouter.post("/auth/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: "Email and password are required." });
    }

    const supabase = getServerSupabase();
    if (supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        return res.status(400).json({ success: false, error: error.message });
      }
      const userObj = data.user;
      const userName = userObj?.user_metadata?.name || email.split("@")[0];
      const avatarUrl = userObj?.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(email)}`;

      return res.json({
        success: true,
        user: {
          isLoggedIn: true,
          name: userName,
          email: userObj?.email || email,
          avatarUrl,
          provider: "email",
        },
      });
    }

    // Backend Fallback Auth (if env variables not set yet in container environment)
    const namePart = email.split("@")[0] || "User";
    const formattedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
    return res.json({
      success: true,
      user: {
        isLoggedIn: true,
        name: formattedName,
        email,
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(email)}`,
        provider: "email",
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || "Backend login error" });
  }
});

// Backend Auth: Register
apiRouter.post("/auth/register", async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: "Email and password are required." });
    }

    const supabase = getServerSupabase();
    if (supabase) {
      const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(email)}`;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name, avatar_url: avatar } },
      });

      if (error) {
        return res.status(400).json({ success: false, error: error.message });
      }

      if (data.user) {
        try {
          await supabase.from("users").upsert([
            {
              id: data.user.id,
              email: data.user.email || email,
              name: name || email.split("@")[0],
              avatar_url: avatar,
              provider: "email",
              created_at: Date.now(),
            },
          ]);
        } catch {}
      }

      const isEmailConfirmNeeded = !data.session;
      return res.json({
        success: true,
        message: isEmailConfirmNeeded
          ? `Akun berhasil dibuat di Supabase Auth! Tautan verifikasi telah dikirim ke ${email}.`
          : "Pendaftaran berhasil!",
        user: {
          isLoggedIn: !isEmailConfirmNeeded,
          name: name || email.split("@")[0],
          email,
          avatarUrl: avatar,
          provider: "email",
        },
      });
    }

    // Backend Fallback Auth
    return res.json({
      success: true,
      message: "Pendaftaran berhasil!",
      user: {
        isLoggedIn: true,
        name: name || email.split("@")[0],
        email,
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(email)}`,
        provider: "email",
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || "Backend registration error" });
  }
});

// Backend Auth: Reset Password
apiRouter.post("/auth/reset-password", async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: "Email wajib diisi." });
    }

    const supabase = getServerSupabase();
    if (supabase) {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) {
        return res.status(400).json({ success: false, error: error.message });
      }
    }

    return res.json({
      success: true,
      message: `Tautan reset password Supabase telah dikirim ke ${email}. Silakan periksa kotak masuk Anda.`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || "Password reset error" });
  }
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

// Visitor Device & IP Logger to Supabase endpoint
apiRouter.post("/visitor-log", async (req: Request, res: Response) => {
  try {
    const rawIp =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "127.0.0.1";
    const ipAddress =
      rawIp === "::1" || rawIp === "::ffff:127.0.0.1" ? "127.0.0.1" : rawIp;
    const { deviceName, userAgent } = req.body;

    const supabaseUrl =
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseAnonKey =
      process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseAnonKey) {
      try {
        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        await supabase.from("device_logs").insert([
          {
            id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            device_name: deviceName || "Unknown Device",
            ip_address: ipAddress,
            user_agent: userAgent || "",
            created_at: Date.now(),
          },
        ]);
      } catch (dbErr: any) {
        console.warn("Server Supabase device log notice:", dbErr?.message);
      }
    }

    res.json({ success: true, ip: ipAddress, deviceName: deviceName || "Unknown Device" });
  } catch (err: any) {
    console.warn("Visitor log error:", err?.message);
    res.status(500).json({ error: err?.message || "Failed to log visitor device" });
  }
});

// Available Models (User Specified Free Models)
apiRouter.get("/models", (_req: Request, res: Response) => {
  res.json({
    defaultModel: "inclusionai/ling-3.0-flash-fin:free",
    openRouterConfigured: Boolean(process.env.OPENROUTER_API_KEY),
    supabaseConfigured: Boolean(process.env.SUPABASE_URL),
    models: [
      {
        id: "z-ai/glm-5.2:free",
        name: "Groky 5.2 Astra",
        provider: "OpenRouter",
        badge: "Super 2jt",
        description: "Model unggulan dengan penalaran kompleks, analisis dokumen mendalam, dan arsitektur software skala besar (Eksklusif Paket Super Rp 2jt/Bulan).",
        maxTokens: 128000,
        isLocked: true,
        supportsVision: true,
        supportsCodeArtifacts: true,
      },
      {
        id: "google/gemma-4-31b-it:free",
        name: "Groky 4 Super",
        provider: "OpenRouter",
        badge: "Plus & Super",
        description: "Optimal untuk pemrosesan pemrograman tingkat lanjut, refactoring skrip, dan logika algoritma.",
        maxTokens: 128000,
        isLocked: true,
        supportsVision: true,
        supportsCodeArtifacts: true,
      },
      {
        id: "google/gemma-4-26b-a4b-it:free",
        name: "Groky 3.7 Flow",
        provider: "OpenRouter",
        badge: "Plus & Super",
        description: "Dioptimalkan untuk pembuatan komponen antarmuka interaktif, visualisasi data, dan alur agen.",
        maxTokens: 128000,
        isLocked: true,
        supportsVision: true,
        supportsCodeArtifacts: true,
      },
      {
        id: "inclusionai/ling-3.0-flash-fin:free",
        name: "Groky 2.5 Flash",
        provider: "OpenRouter",
        badge: "Gratis",
        description: "Respon cepat berlatensi rendah untuk percakapan umum, tanya-jawab harian, dan ringkasan kilat.",
        maxTokens: 128000,
        isLocked: false,
        supportsVision: false,
        supportsCodeArtifacts: true,
      },
      {
        id: "nvidia/nemotron-3-ultra-550b-a55b:free",
        name: "Groky 3.5 Flash",
        provider: "OpenRouter",
        badge: "Gratis",
        description: "Model serbaguna untuk pemrosesan teks terstruktur, logika matematika, dan penulisan dokumen.",
        maxTokens: 128000,
        isLocked: false,
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
1. NO EMOJIS IN WEB/APPS & UI: When creating web applications, HTML/CSS/JS components, dashboards, buttons, headers, or user interfaces, strictly DO NOT use emojis anywhere in the code or interface. Maintain clean, professional typography and sleek vector icons instead.
2. Immaculate & Neat Formatting: Always ensure all generated code, applications, and documents are exceptionally clean, neat, beautifully structured, properly indented, and visually balanced.
3. 3D & Interactive Graphics: When creating 3D graphics or interactive models, utilize Three.js (THREE is globally available in the preview sandbox). Implement smooth 60fps render loops, elegant materials (MeshStandardMaterial, MeshPhysicalMaterial), realistic lighting, and OrbitControls.
4. Complete & Self-Contained: Whenever producing HTML/CSS/JS components, ensure the code is 100% complete, executable, and ready for instant rendering in the Artifact Viewer.
5. Device Memory & Learning: You have access to persistent device memory context. If the user asks you to remember a fact or preference (e.g. "ingat bahwa nama saya Azha", "simpan memori preferensi saya React"), acknowledge it warmly and append \`[MEMORY_SAVE: Key | Value]\` at the end of your response so it is saved to the user's device memory.`;

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

    let fallbackModel = "gemini-2.5-flash"; // Ultra-fast, highly reliable 1M context Gemini 2.5 Flash
    if (model.includes("pro")) {
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

// Embeddings endpoint for RAG feature
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
