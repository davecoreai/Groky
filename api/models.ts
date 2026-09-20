export default function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  return res.status(200).json({
    defaultModel: "z-ai/glm-5.2:free",
    openRouterConfigured: Boolean(process.env.OPENROUTER_API_KEY),
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    models: [
      {
        id: "z-ai/glm-5.2:free",
        name: "GLM-5.2 (Free Tier)",
        provider: "OpenRouter (Zhipu AI)",
        description: "Model flagship multimodal berkecepatan tinggi dengan nalar mendalam",
        free: true,
        contextWindow: 128000,
        badge: "Recommended",
      },
      {
        id: "meta-llama/llama-3.3-70b-instruct:free",
        name: "Llama 3.3 70B Instruct",
        provider: "OpenRouter (Meta)",
        description: "Model open-source terkuat untuk penalaran, coding, dan analisis teks panjang",
        free: true,
        contextWindow: 128000,
        badge: "Top Coder",
      },
      {
        id: "deepseek/deepseek-r1:free",
        name: "DeepSeek R1 (Free)",
        provider: "OpenRouter (DeepSeek)",
        description: "Model penalaran bertaraf o1 dengan pemikiran mendalam (CoT reasoning)",
        free: true,
        contextWindow: 64000,
        badge: "Reasoning",
      },
      {
        id: "deepseek/deepseek-chat:free",
        name: "DeepSeek V3 (Free)",
        provider: "OpenRouter (DeepSeek)",
        description: "Model percakapan umum yang sangat cerdas, responsif, dan hemat latensi",
        free: true,
        contextWindow: 64000,
        badge: "Fast & Smart",
      },
      {
        id: "google/gemini-2.5-flash",
        name: "Gemini 2.5 Flash",
        provider: "Google AI Studio",
        description: "Model multimodal generasi terbaru dari Google dengan latensi rendah",
        free: true,
        contextWindow: 1000000,
        badge: "1M Context",
      },
      {
        id: "google/gemini-2.5-pro",
        name: "Gemini 2.5 Pro",
        provider: "Google AI Studio",
        description: "Model penalaran paling canggih dari Google untuk coding kompleks & riset",
        free: false,
        contextWindow: 2000000,
        badge: "Google Pro",
      },
    ],
  });
}
