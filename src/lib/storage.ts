import { Conversation, UserSettings, ModelOption, MemoryItem, SubscriptionTier } from "../types";

const STORAGE_KEYS = {
  CONVERSATIONS: "groky_conversations_v3",
  ACTIVE_ID: "groky_active_chat_id_v3",
  SETTINGS: "groky_user_settings_v3",
  THEME: "groky_theme_mode_v3",
};

export function getDeviceId(): string {
  if (typeof window === "undefined") return "dev_server";
  try {
    let id = localStorage.getItem("groky_device_id");
    if (!id) {
      id = "dev_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 8);
      localStorage.setItem("groky_device_id", id);
    }
    return id;
  } catch {
    return "dev_default";
  }
}

function getStorageKeys() {
  const devId = getDeviceId();
  return {
    CONVERSATIONS: `groky_conversations_${devId}`,
    ACTIVE_ID: `groky_active_chat_id_${devId}`,
    SETTINGS: `groky_user_settings_${devId}`,
    THEME: `groky_theme_mode_${devId}`,
  };
}

export interface PurchasedPlanInfo {
  purchasedAt: number;
  expiresAt: number;
}

export interface AccountSubscriptionRecord {
  activeTier: SubscriptionTier;
  purchasedTiers: Record<string, PurchasedPlanInfo>;
}

export function getAccountSubscriptionRecord(userEmail?: string): AccountSubscriptionRecord {
  if (typeof window === "undefined") {
    return { activeTier: "free", purchasedTiers: {} };
  }
  try {
    const devId = getDeviceId();
    const key = userEmail && userEmail.trim()
      ? `groky_sub_rec_${userEmail.trim().toLowerCase()}`
      : `groky_sub_rec_guest_${devId}`;

    const raw = localStorage.getItem(key);
    if (raw) {
      const record: AccountSubscriptionRecord = JSON.parse(raw);
      // Auto expire if 30 days (/bulan) passed
      if (record.activeTier !== "free") {
        const activeInfo = record.purchasedTiers?.[record.activeTier];
        if (activeInfo && Date.now() > activeInfo.expiresAt) {
          record.activeTier = "free";
          localStorage.setItem(key, JSON.stringify(record));
        }
      }
      return record;
    }
  } catch {}

  return { activeTier: "free", purchasedTiers: {} };
}

export function saveAccountSubscriptionRecord(
  record: AccountSubscriptionRecord,
  userEmail?: string
): void {
  if (typeof window === "undefined") return;
  try {
    const devId = getDeviceId();
    const key = userEmail && userEmail.trim()
      ? `groky_sub_rec_${userEmail.trim().toLowerCase()}`
      : `groky_sub_rec_guest_${devId}`;

    localStorage.setItem(key, JSON.stringify(record));

    const legacyKey = userEmail && userEmail.trim()
      ? `groky_subscription_${userEmail.trim().toLowerCase()}`
      : `groky_subscription_guest_${devId}`;
    localStorage.setItem(legacyKey, record.activeTier);
  } catch {}
}

export function purchaseOrActivatePlan(tier: SubscriptionTier, userEmail?: string): AccountSubscriptionRecord {
  const record = getAccountSubscriptionRecord(userEmail);
  record.activeTier = tier;

  if (tier !== "free") {
    const existing = record.purchasedTiers?.[tier];
    if (existing && Date.now() < existing.expiresAt) {
      // Re-activating unexpired 30-day subscription
    } else {
      if (!record.purchasedTiers) record.purchasedTiers = {};
      record.purchasedTiers[tier] = {
        purchasedAt: Date.now(),
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days (1 month)
      };
    }
  }

  saveAccountSubscriptionRecord(record, userEmail);
  return record;
}

export function getSubscriptionPlan(userEmail?: string): SubscriptionTier {
  const rec = getAccountSubscriptionRecord(userEmail);
  return rec.activeTier;
}

export function saveSubscriptionPlan(tier: SubscriptionTier, userEmail?: string): void {
  purchaseOrActivatePlan(tier, userEmail);
}

// Daily Message Quota Tracker based on Active Subscription Tier
export function getDailyMessageQuota(tier: SubscriptionTier = "free"): number {
  switch (tier) {
    case "pro":
      return 1000; // Unlimited / Highest quota
    case "plus":
      return 150;
    case "lite":
      return 30; // 3x of free quota
    default:
      return 10; // Free quota limit
  }
}

export function getDailyMessageCount(userEmail?: string): number {
  if (typeof window === "undefined") return 0;
  try {
    const today = new Date().toISOString().split("T")[0];
    const cleanEmail = userEmail ? userEmail.trim().toLowerCase() : "guest";
    const key = `groky_daily_msgs_${cleanEmail}_${today}`;
    return Number(localStorage.getItem(key) || 0);
  } catch {
    return 0;
  }
}

export function incrementDailyMessageCount(userEmail?: string): number {
  if (typeof window === "undefined") return 0;
  try {
    const today = new Date().toISOString().split("T")[0];
    const cleanEmail = userEmail ? userEmail.trim().toLowerCase() : "guest";
    const key = `groky_daily_msgs_${cleanEmail}_${today}`;
    const current = getDailyMessageCount(userEmail);
    const updated = current + 1;
    localStorage.setItem(key, String(updated));
    return updated;
  } catch {
    return 0;
  }
}

export function getModelsForSubscription(tier: SubscriptionTier = "free"): ModelOption[] {
  const isPlusOrPro = tier === "plus" || tier === "pro";
  const isPro = tier === "pro";

  return [
    {
      id: "openai/gpt-oss-safeguard-20b",
      name: "Groky 3.1 Lite",
      provider: "Groq Cloud",
      badge: "Gratis & Semua Paket",
      description: "Model inferensi ultra-cepat bertenaga Groq API Console dengan pengamanan terintegrasi dan efisiensi tinggi.",
      maxTokens: 131072,
      isLocked: false,
      supportsVision: false,
      supportsCodeArtifacts: true,
    },
    {
      id: "openai/gpt-oss-120b",
      name: "Groky 3.5 Pro",
      provider: "Groq Cloud",
      badge: isPlusOrPro ? (tier === "plus" ? "Plus Aktif" : "Pro Aktif") : "Paket Plus",
      description: "Model skala 120B berperforma tinggi via Groq API Console untuk arsitektur software kompleks, pemrograman, dan reasoning mendalam.",
      maxTokens: 131072,
      isLocked: !isPlusOrPro,
      lockReason: "Terbuka di Paket Plus dan Pro",
      supportsVision: true,
      supportsCodeArtifacts: true,
    },
    {
      id: "gemini-3.5-flash",
      name: "Groky 3.6 Flash",
      provider: "Google Gemini",
      badge: isPro ? "Pro Aktif" : "Paket Pro",
      description: "Model multimodal mutakhir bertenaga Gemini API dengan latensi super rendah, penalaran mendalam, dan dukungan konteks luas.",
      maxTokens: 1048576,
      isLocked: !isPro,
      lockReason: "Terbuka di Paket Pro",
      supportsVision: true,
      supportsCodeArtifacts: true,
    },
    {
      id: "thinkingmachines/inkling:free",
      name: "Groky 3.0 Mini",
      provider: "OpenRouter",
      badge: "Perbaikan",
      description: "Model sedang dalam tahap perbaikan sistem dan sementara tidak dapat digunakan.",
      maxTokens: 131072,
      isLocked: true,
      lockReason: "Sedang dalam tahap pemeliharaan sistem",
      supportsVision: false,
      supportsCodeArtifacts: true,
    },
  ];
}

export const DEFAULT_MODELS: ModelOption[] = getModelsForSubscription("free");

export const AVAILABLE_FONTS = [
  { id: "Plus Jakarta Sans", name: "Plus Jakarta Sans", category: "Sans-Serif" },
  { id: "Inter", name: "Inter", category: "Sans-Serif" },
  { id: "Outfit", name: "Outfit", category: "Sans-Serif" },
  { id: "Poppins", name: "Poppins", category: "Sans-Serif" },
  { id: "Roboto", name: "Roboto", category: "Sans-Serif" },
  { id: "Open Sans", name: "Open Sans", category: "Sans-Serif" },
  { id: "Montserrat", name: "Montserrat", category: "Sans-Serif" },
  { id: "Lato", name: "Lato", category: "Sans-Serif" },
  { id: "Work Sans", name: "Work Sans", category: "Sans-Serif" },
  { id: "DM Sans", name: "DM Sans", category: "Sans-Serif" },
  { id: "Space Grotesk", name: "Space Grotesk", category: "Tech" },
  { id: "Playfair Display", name: "Playfair Display", category: "Serif" },
  { id: "Lora", name: "Lora", category: "Serif" },
  { id: "Merriweather", name: "Merriweather", category: "Serif" },
  { id: "JetBrains Mono", name: "JetBrains Mono", category: "Monospace" },
  { id: "Fira Code", name: "Fira Code", category: "Monospace" },
  { id: "Cinzel", name: "Cinzel", category: "Display" },
  { id: "Cabinet Grotesk", name: "Cabinet Grotesk", category: "Sans-Serif" },
  { id: "Sora", name: "Sora", category: "Sans-Serif" },
  { id: "Manrope", name: "Manrope", category: "Sans-Serif" },
  { id: "Syne", name: "Syne", category: "Display" },
  { id: "Bricolage Grotesque", name: "Bricolage Grotesque", category: "Grotesque" },
  { id: "Instrument Serif", name: "Instrument Serif", category: "Serif" },
  { id: "Cormorant Garamond", name: "Cormorant Garamond", category: "Serif" },
  { id: "Newsreader", name: "Newsreader", category: "Serif" },
  { id: "Space Mono", name: "Space Mono", category: "Monospace" },
  { id: "IBM Plex Mono", name: "IBM Plex Mono", category: "Monospace" },
  { id: "Source Code Pro", name: "Source Code Pro", category: "Monospace" },
  { id: "Ubuntu Sans", name: "Ubuntu Sans", category: "Sans-Serif" },
  { id: "Raleway", name: "Raleway", category: "Sans-Serif" },
  { id: "Nunito", name: "Nunito", category: "Sans-Serif" },
  { id: "Quicksand", name: "Quicksand", category: "Rounded" },
  { id: "Figtree", name: "Figtree", category: "Sans-Serif" },
  { id: "Urbanist", name: "Urbanist", category: "Sans-Serif" },
  { id: "Geologica", name: "Geologica", category: "Tech" },
  { id: "Onest", name: "Onest", category: "Sans-Serif" },
  { id: "Readex Pro", name: "Readex Pro", category: "Geometric" },
  { id: "Albert Sans", name: "Albert Sans", category: "Sans-Serif" },
  { id: "Archivo", name: "Archivo", category: "Sans-Serif" },
  { id: "Epilogue", name: "Epilogue", category: "Sans-Serif" },
  { id: "Fraunces", name: "Fraunces", category: "Serif" },
  { id: "Bodoni Moda", name: "Bodoni Moda", category: "Serif" },
  { id: "Orbitron", name: "Orbitron", category: "Tech" },
  { id: "Rajdhani", name: "Rajdhani", category: "Tech" },
  { id: "Exo 2", name: "Exo 2", category: "Tech" },
  { id: "Chakra Petch", name: "Chakra Petch", category: "Tech" },
  { id: "Cinzel Decorative", name: "Cinzel Decorative", category: "Display" },
  { id: "Righteous", name: "Righteous", category: "Display" },
  { id: "Caveat", name: "Caveat", category: "Handwriting" },
  { id: "Marcellus", name: "Marcellus", category: "Serif" },
];

export function applyAppFont(fontName: string) {
  if (typeof window === "undefined") return;
  const targetFont = fontName || "Plus Jakarta Sans";
  
  // Inject Google Font link dynamically if needed
  if (targetFont !== "Plus Jakarta Sans") {
    const linkId = `google-font-${targetFont.replace(/\s+/g, "-").toLowerCase()}`;
    if (!document.getElementById(linkId)) {
      const link = document.createElement("link");
      link.id = linkId;
      link.rel = "stylesheet";
      const formattedFont = encodeURIComponent(targetFont);
      link.href = `https://fonts.googleapis.com/css2?family=${formattedFont}:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap`;
      document.head.appendChild(link);
    }
  }

  const fontStack = `'${targetFont}', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;

  // Set CSS Custom Properties on root, body, and root elements
  document.documentElement.style.setProperty("--font-sans", fontStack);
  document.documentElement.style.setProperty("--font-serif", fontStack);
  document.documentElement.style.fontFamily = fontStack;
  document.body.style.fontFamily = fontStack;

  const appRoot = document.getElementById("root");
  if (appRoot) {
    appRoot.style.fontFamily = fontStack;
  }
}

export const DEFAULT_SETTINGS: UserSettings = {
  preferredModel: "gemini-3.5-flash",
  theme: "system",
  temperature: 0.7,
  systemPrompt: `Kamu adalah AI Coding Chatbot Yang Bernama Groky AI yang cerdas, teliti, adaptif, dan berorientasi pada pengalaman pengguna.

Pahami konteks, tujuan, dan kebutuhan user sebelum menulis kode. Untuk setiap tugas coding:

- Analisis kebutuhan dan konteks terlebih dahulu.
- Tulis kode yang bersih, modern, aman, modular, scalable, dan mudah dipelihara.
- Gunakan struktur project yang rapi dan pisahkan component, logic, data, style, dan utility jika diperlukan.
- Prioritaskan UX/UI yang nyaman, responsif, cepat, accessible, dan intuitif.
- ATURAN UTAMA ICON & NO EMOJI: Saat membuat website, aplikasi web, komponen UI, atau kode, JANGAN PERNAH MENGGUNAKAN EMOJI (seperti 🚀, 💡, 🔥, 🏠, ⚙️, dll). SELALU GUNAKAN ICON vektor profesional seperti FontAwesome (misal: <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"> lalu gunakan <i class="fa-solid fa-house"></i>), Lucide Icons, atau inline SVG yang presisi dan tajam.
- KEMAMPUAN KODE PANJANG & LENGKAP: Jangan pernah memotong kode di tengah jalan, membuat ringkasan parsial, atau menggunakan placeholder seperti '// ... kode lainnya' atau '/* rest of code */'. Selalu tulis 100% seluruh kode secara lengkap dari baris awal sampai penutup tag/kurung kurawal.
- Hindari kode berulang, solusi asal jadi, desain generik, dan dependency yang tidak diperlukan.
- Periksa edge case, error handling, security, performance, compatibility, dan accessibility.
- Jika kode user memiliki bug, cari akar masalahnya dan berikan perbaikan yang tepat.
- Jangan mengubah bagian yang tidak diperlukan.
- Jika informasi kurang, gunakan konteks yang tersedia dan nyatakan asumsi secara singkat.
- Berikan solusi yang benar-benar dapat digunakan, bukan sekadar contoh pseudocode.
- Saat membuat website, prioritaskan visual hierarchy, responsive design, micro-interactions, loading state, empty state, error state, dan feedback yang jelas.
- Saat membuat aplikasi, pikirkan alur user dari awal sampai selesai.
- Jelaskan keputusan teknis hanya jika memang membantu user.
- Jika ada beberapa pendekatan, pilih berdasarkan kebutuhan dan jelaskan trade-off secara singkat.
- Sebelum memberikan hasil akhir, lakukan pemeriksaan internal terhadap syntax, logic, keamanan, UX, dan kemungkinan error.

Selalu berusaha memahami maksud user, bukan hanya kata-kata yang mereka tulis. Bertindak sebagai partner developer yang proaktif, bukan sekadar generator kode.`,
  enable3DBackground: false,
  autoOpenArtifacts: false,
  codeFontSize: 13,
  groqApiKey: "",
  geminiApiKey: "",
  openRouterApiKey: "",
  supabaseUrl: "",
  supabaseAnonKey: "",
  customEndpoint: "",
  customApiKey: "",
  toneStyle: "Default",
  customInstructions: "",
  selectedFont: "Plus Jakarta Sans",
  thinkingMode: true,
};

const INITIAL_CONVERSATION: Conversation = {
  id: "conv-welcome-init",
  title: "Introduction to Groky AI & Interactive Artifacts",
  createdAt: Date.now() - 3600000,
  updatedAt: Date.now() - 3600000,
  isPinned: false,
  modelId: "thinkingmachines/inkling:free",
  messages: [
    {
      id: "msg-1",
      role: "user",
      content: "Can you introduce Groky AI and demonstrate an interactive HTML canvas artifact with code preview?",
      timestamp: Date.now() - 3500000,
    },
    {
      id: "msg-2",
      role: "assistant",
      model: "thinkingmachines/inkling:free",
      content: `Welcome to **Groky AI** — an advanced, editorial AI Chatbot and 3D Coding environment crafted with aesthetic warmth, fluid streaming, and architectural rigor.

### Architectural Highlights
1. **Real-time High-Velocity Streaming**: Smooth 60fps adaptive token delivery with server-sent events and automated multi-tier failovers.
2. **Interactive 3D Artifacts**: Native support for Three.js, WebGL, shaders, and interactive simulations inside the sandboxed previewer.
3. **Advanced AI Models**: Powered by Groky 3.0 Mini, Groky 3.1 Lite (Groq), Groky 3.5 Pro (Groq 120B), and Groky 3.6 Flash (Gemini 3.5 Flash).
4. **Multimodal Media & File Hub**: Upload documents, photos, audio, and video files with full-screen inspection.

Here is an interactive 3D Three.js artifact with dynamic lighting and mouse orbit interaction:

\`\`\`html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>
  <style>
    body {
      margin: 0;
      background: #0d0d11;
      overflow: hidden;
      color: #e5e5e5;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    #canvas-container {
      width: 100vw;
      height: 100vh;
      display: block;
    }
    .hud {
      position: absolute;
      top: 20px;
      left: 20px;
      background: rgba(18, 18, 24, 0.85);
      backdrop-filter: blur(12px);
      padding: 14px 20px;
      border-radius: 14px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      font-size: 13px;
      z-index: 10;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    }
    .hud strong {
      color: #f59e0b;
      font-size: 14px;
    }
    .tag {
      display: inline-block;
      margin-top: 6px;
      padding: 3px 8px;
      border-radius: 6px;
      background: rgba(245, 158, 11, 0.15);
      color: #f59e0b;
      font-size: 11px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="hud">
    <strong>Groky 3D Quantum Core</strong><br>
    <span style="color:#9ca3af">Drag to rotate • Scroll to zoom</span><br>
    <span class="tag">Three.js WebGL Engine</span>
  </div>
  <div id="canvas-container"></div>

  <script>
    const container = document.getElementById('canvas-container');
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0d0d11, 0.035);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 8);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Ambient & Directional Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const light1 = new THREE.DirectionalLight(0xf59e0b, 2.0);
    light1.position.set(5, 5, 5);
    scene.add(light1);

    const light2 = new THREE.DirectionalLight(0x6366f1, 1.5);
    light2.position.set(-5, -5, -5);
    scene.add(light2);

    // Central Icosahedron Geometry
    const coreGeo = new THREE.IcosahedronGeometry(2, 1);
    const coreMat = new THREE.MeshPhysicalMaterial({
      color: 0x18181b,
      emissive: 0x27272a,
      roughness: 0.1,
      metalness: 0.8,
      clearcoat: 1.0,
      wireframe: false,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    scene.add(coreMesh);

    // Wireframe Outer Cage
    const cageGeo = new THREE.IcosahedronGeometry(2.6, 2);
    const cageMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    });
    const cageMesh = new THREE.Mesh(cageGeo, cageMat);
    scene.add(cageMesh);

    // Orbiting Particles
    const partCount = 400;
    const partGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(partCount * 3);
    for (let i = 0; i < partCount * 3; i += 3) {
      const radius = 3.5 + Math.random() * 4.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      positions[i] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i + 2] = radius * Math.cos(phi);
    }
    partGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const partMat = new THREE.PointsMaterial({
      color: 0xe5e7eb,
      size: 0.05,
      transparent: true,
      opacity: 0.7,
    });
    const particleSystem = new THREE.Points(partGeo, partMat);
    scene.add(particleSystem);

    // Resize Handler
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Animation Loop
    function animate() {
      requestAnimationFrame(animate);
      coreMesh.rotation.y += 0.005;
      coreMesh.rotation.x += 0.003;
      cageMesh.rotation.y -= 0.004;
      cageMesh.rotation.z += 0.002;
      particleSystem.rotation.y += 0.001;
      controls.update();
      renderer.render(scene, camera);
    }
    animate();
  </script>
</body>
</html>
\`\`\`

Feel free to ask questions, request 3D components, or upload files for analysis!`,
      timestamp: Date.now() - 3400000,
    },
  ],
};

export function getAccountStorageKey(accountIdentifier?: string): string {
  if (!accountIdentifier || accountIdentifier === "guest") {
    const devId = getDeviceId();
    return `groky_convs_guest_${devId}`;
  }
  const clean = accountIdentifier.toLowerCase().replace(/[^a-z0-9_@.-]/g, "_");
  return `groky_convs_account_${clean}`;
}

export function loadConversations(accountIdentifier?: string): Conversation[] {
  try {
    const key = getAccountStorageKey(accountIdentifier);
    const raw = localStorage.getItem(key);
    if (!raw) {
      const freshId = `conv-${Date.now()}`;
      const initial: Conversation[] = [
        {
          id: freshId,
          title: "New Chat",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          isPinned: false,
          modelId: "gemini-3.5-flash",
          messages: [],
        },
      ];
      localStorage.setItem(key, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    const freshId = `conv-${Date.now()}`;
    return [
      {
        id: freshId,
        title: "New Chat",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isPinned: false,
        modelId: "gemini-3.5-flash",
        messages: [],
      },
    ];
  } catch (err) {
    console.error("Failed to load conversations from storage", err);
    return [];
  }
}

export function saveConversations(conversations: Conversation[], accountIdentifier?: string): void {
  try {
    const key = getAccountStorageKey(accountIdentifier);
    localStorage.setItem(key, JSON.stringify(conversations));
  } catch (err) {
    console.error("Failed to save conversations", err);
  }
}

export function loadActiveChatId(): string {
  try {
    return localStorage.getItem("groky_active_chat_id_v3") || "conv-welcome-init";
  } catch {
    return "conv-welcome-init";
  }
}

export function saveActiveChatId(id: string): void {
  try {
    localStorage.setItem("groky_active_chat_id_v3", id);
  } catch (err) {
    console.error("Failed to save active chat ID", err);
  }
}

export function loadSettings(userId?: string): UserSettings {
  try {
    const key = userId ? `groky_account_settings_${userId}` : "groky_user_settings_v3";
    const raw = localStorage.getItem(key) || localStorage.getItem("groky_user_settings_v3");
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: UserSettings, userId?: string): void {
  try {
    if (userId) {
      localStorage.setItem(`groky_account_settings_${userId}`, JSON.stringify(settings));
    }
    localStorage.setItem("groky_user_settings_v3", JSON.stringify(settings));
  } catch (err) {
    console.error("Failed to save settings", err);
  }
}

// Account-Based Memory Management (Persists per User Account, Not per Device)
export function getAccountMemoryKey(userId?: string): string {
  if (userId) return `groky_account_memory_${userId}`;
  return "groky_account_memory_global";
}

export function loadDeviceMemory(userId?: string): MemoryItem[] {
  try {
    const key = getAccountMemoryKey(userId);
    const raw = localStorage.getItem(key) || localStorage.getItem("groky_account_memory_global");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveDeviceMemory(items: MemoryItem[], userId?: string): void {
  try {
    const key = getAccountMemoryKey(userId);
    localStorage.setItem(key, JSON.stringify(items));
    localStorage.setItem("groky_account_memory_global", JSON.stringify(items));
  } catch (err) {
    console.error("Failed to save account memory", err);
  }
}

export function addMemoryItem(key: string, value: string, userId?: string): MemoryItem[] {
  const current = loadDeviceMemory(userId);
  const existingIdx = current.findIndex((m) => m.key.toLowerCase() === key.toLowerCase());
  const newItem: MemoryItem = {
    id: `mem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    key: key.trim(),
    value: value.trim(),
    updatedAt: Date.now(),
  };

  let updated: MemoryItem[];
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = newItem;
  } else {
    updated = [newItem, ...current];
  }
  saveDeviceMemory(updated, userId);
  return updated;
}

export function removeMemoryItem(id: string, userId?: string): MemoryItem[] {
  const current = loadDeviceMemory(userId);
  const updated = current.filter((m) => m.id !== id);
  saveDeviceMemory(updated, userId);
  return updated;
}

export function clearDeviceMemory(userId?: string): void {
  try {
    const key = getAccountMemoryKey(userId);
    localStorage.removeItem(key);
    localStorage.removeItem("groky_account_memory_global");
  } catch {}
}

export function getFormattedDeviceMemoryContext(userId?: string): string {
  const items = loadDeviceMemory(userId);
  if (items.length === 0) return "";
  return items.map((m) => `- ${m.key}: ${m.value}`).join("\n");
}

// Account Memory Aliases for clean semantic usage
export const loadAccountMemory = loadDeviceMemory;
export const saveAccountMemory = saveDeviceMemory;
export const clearAccountMemory = clearDeviceMemory;
export const getFormattedAccountMemoryContext = getFormattedDeviceMemoryContext;

