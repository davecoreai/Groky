import { Conversation, UserSettings, ModelOption, MemoryItem } from "../types";

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

export const DEFAULT_MODELS: ModelOption[] = [
  {
    id: "z-ai/glm-5.2:free",
    name: "Groky 5.2 Astra",
    provider: "Groky Cloud",
    badge: "",
    description: "Model unggulan dengan penalaran kompleks, analisis dokumen mendalam, dan arsitektur software skala besar.",
    maxTokens: 131072,
    isLocked: false,
    supportsVision: true,
    supportsCodeArtifacts: true,
  },
  {
    id: "google/gemma-4-31b-it:free",
    name: "Groky 4 Super",
    provider: "Groky Cloud",
    badge: "Beta",
    description: "Optimal untuk pemrosesan pemrograman tingkat lanjut, refactoring skrip, dan logika algoritma.",
    maxTokens: 131072,
    isLocked: false,
    supportsVision: true,
    supportsCodeArtifacts: true,
  },
  {
    id: "google/gemma-4-26b-a4b-it:free",
    name: "Groky 3.7 Flow",
    provider: "Groky Cloud",
    badge: "Beta",
    description: "Dioptimalkan untuk pembuatan komponen antarmuka interaktif, visualisasi data, dan alur agen.",
    maxTokens: 131072,
    isLocked: false,
    supportsVision: true,
    supportsCodeArtifacts: true,
  },
  {
    id: "inclusionai/ling-3.0-flash-fin:free",
    name: "Groky 2.5 Flash",
    provider: "Groky Cloud",
    badge: "",
    description: "Respon cepat berlatensi rendah untuk percakapan umum, tanya-jawab harian, dan ringkasan kilat.",
    maxTokens: 131072,
    isLocked: false,
    supportsVision: true,
    supportsCodeArtifacts: true,
  },
  {
    id: "nvidia/nemotron-3-ultra-550b-a55b:free",
    name: "Groky 3.5 Flash",
    provider: "Groky Cloud",
    badge: "",
    description: "Model serbaguna untuk pemrosesan teks terstruktur, logika matematika, dan penulisan dokumen.",
    maxTokens: 131072,
    isLocked: false,
    supportsVision: false,
    supportsCodeArtifacts: true,
  },
];

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
      const formattedFont = targetFont.replace(/\s+/g, "+");
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
  preferredModel: "inclusionai/ling-3.0-flash-fin:free",
  theme: "system",
  temperature: 0.7,
  systemPrompt: "You are Groky AI, an exceptionally intelligent AI Chatbot & Coding Assistant. When creating websites, web apps, or UI code, strictly do NOT use emojis anywhere in the code or interface, and always maintain clean, neat, highly-structured, and immaculate layouts.",
  enable3DBackground: false,
  autoOpenArtifacts: false,
  codeFontSize: 13,
  openRouterApiKey: "",
  supabaseUrl: "",
  supabaseAnonKey: "",
  customEndpoint: "",
  customApiKey: "",
  toneStyle: "Default",
  customInstructions: "",
  selectedFont: "Plus Jakarta Sans",
};

const INITIAL_CONVERSATION: Conversation = {
  id: "conv-welcome-init",
  title: "Introduction to Groky AI & Interactive Artifacts",
  createdAt: Date.now() - 3600000,
  updatedAt: Date.now() - 3600000,
  isPinned: false,
  modelId: "inclusionai/ling-3.0-flash-fin:free",
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
      model: "inclusionai/ling-3.0-flash-fin:free",
      content: `Welcome to **Groky AI** — an advanced, editorial AI Chatbot and 3D Coding environment crafted with aesthetic warmth, fluid streaming, and architectural rigor.

### Architectural Highlights
1. **Real-time High-Velocity Streaming**: Smooth 60fps adaptive token delivery with server-sent events and automated multi-tier failovers.
2. **Interactive 3D Artifacts**: Native support for Three.js, WebGL, shaders, and interactive simulations inside the sandboxed previewer.
3. **Advanced AI Models**: Powered by Groky 5.2 Astra, Groky 4 Super [Beta], Groky 3.7 Flow [Beta], Groky 2.5 Flash, and Groky 3.5 Flash.
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

export function loadConversations(): Conversation[] {
  try {
    const keys = getStorageKeys();
    const raw = localStorage.getItem(keys.CONVERSATIONS);
    if (!raw) {
      const devId = getDeviceId();
      const deviceInitialConv: Conversation = {
        ...INITIAL_CONVERSATION,
        id: `conv-${devId}-${Date.now().toString(36)}`,
        modelId: "inclusionai/ling-3.0-flash-fin:free",
      };
      const initial = [deviceInitialConv];
      localStorage.setItem(keys.CONVERSATIONS, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [INITIAL_CONVERSATION];
  } catch (err) {
    console.error("Failed to load conversations from storage", err);
    return [INITIAL_CONVERSATION];
  }
}

export function saveConversations(conversations: Conversation[]): void {
  try {
    const keys = getStorageKeys();
    localStorage.setItem(keys.CONVERSATIONS, JSON.stringify(conversations));
  } catch (err) {
    console.error("Failed to save conversations", err);
  }
}

export function loadActiveChatId(): string {
  try {
    const keys = getStorageKeys();
    return localStorage.getItem(keys.ACTIVE_ID) || "conv-welcome-init";
  } catch {
    return "conv-welcome-init";
  }
}

export function saveActiveChatId(id: string): void {
  try {
    const keys = getStorageKeys();
    localStorage.setItem(keys.ACTIVE_ID, id);
  } catch (err) {
    console.error("Failed to save active chat ID", err);
  }
}

export function loadSettings(): UserSettings {
  try {
    const keys = getStorageKeys();
    const raw = localStorage.getItem(keys.SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: UserSettings): void {
  try {
    const keys = getStorageKeys();
    localStorage.setItem(keys.SETTINGS, JSON.stringify(settings));
  } catch (err) {
    console.error("Failed to save settings", err);
  }
}

// Device Memory Management (Per-Device Persistence)
export function getDeviceMemoryKey(): string {
  const devId = getDeviceId();
  return `groky_device_memory_${devId}`;
}

export function loadDeviceMemory(): MemoryItem[] {
  try {
    const key = getDeviceMemoryKey();
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveDeviceMemory(items: MemoryItem[]): void {
  try {
    const key = getDeviceMemoryKey();
    localStorage.setItem(key, JSON.stringify(items));
  } catch (err) {
    console.error("Failed to save device memory", err);
  }
}

export function addMemoryItem(key: string, value: string): MemoryItem[] {
  const current = loadDeviceMemory();
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
  saveDeviceMemory(updated);
  return updated;
}

export function removeMemoryItem(id: string): MemoryItem[] {
  const current = loadDeviceMemory();
  const updated = current.filter((m) => m.id !== id);
  saveDeviceMemory(updated);
  return updated;
}

export function clearDeviceMemory(): void {
  try {
    const key = getDeviceMemoryKey();
    localStorage.removeItem(key);
  } catch {}
}

export function getFormattedDeviceMemoryContext(): string {
  const items = loadDeviceMemory();
  if (items.length === 0) return "";
  return items.map((m) => `- ${m.key}: ${m.value}`).join("\n");
}
