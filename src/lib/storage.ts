import { Conversation, UserSettings, ModelOption } from "../types";

const STORAGE_KEYS = {
  CONVERSATIONS: "groky_conversations_v3",
  ACTIVE_ID: "groky_active_chat_id_v3",
  SETTINGS: "groky_user_settings_v3",
  THEME: "groky_theme_mode_v3",
};

export const DEFAULT_MODELS: ModelOption[] = [
  {
    id: "z-ai/glm-5.2:free",
    name: "Groky 5.2 Astra",
    provider: "Groky Cloud",
    badge: "Free",
    description: "Flagship high-intelligence reasoning and coding model with deep analytical prowess.",
    maxTokens: 131072,
    supportsVision: true,
    supportsCodeArtifacts: true,
  },
  {
    id: "google/gemma-4-31b-it:free",
    name: "Groky 4 Super",
    provider: "Groky Cloud",
    badge: "Beta",
    description: "High-tier reasoning, deep coding, and complex knowledge synthesis.",
    maxTokens: 131072,
    supportsVision: true,
    supportsCodeArtifacts: true,
  },
  {
    id: "google/gemma-4-26b-a4b-it:free",
    name: "Groky 3.7 Flow",
    provider: "Groky Cloud",
    badge: "Beta",
    description: "Dynamic agentic flow and ultra-responsive coding architecture.",
    maxTokens: 131072,
    supportsVision: true,
    supportsCodeArtifacts: true,
  },
  {
    id: "inclusionai/ling-3.0-flash-fin:free",
    name: "Groky 2.5 Flash",
    provider: "Groky Cloud",
    badge: "Free",
    description: "Lightning-fast real-time streaming model optimized for instant response and coding speed.",
    maxTokens: 131072,
    supportsVision: true,
    supportsCodeArtifacts: true,
  },
  {
    id: "nvidia/nemotron-3-ultra-550b-a55b:free",
    name: "Groky 3.5 Flash",
    provider: "Groky Cloud",
    badge: "Free",
    description: "High-capacity reasoning architecture for complex logic and software design.",
    maxTokens: 131072,
    supportsVision: false,
    supportsCodeArtifacts: true,
  },
];

export const DEFAULT_SETTINGS: UserSettings = {
  preferredModel: "z-ai/glm-5.2:free",
  theme: "system",
  temperature: 0.7,
  systemPrompt: "You are Groky AI, an exceptionally intelligent, helpful, and versatile AI Chatbot & Coding Assistant. Provide clean, production-ready code and lucid explanations.",
  enable3DBackground: false,
  autoOpenArtifacts: false,
  codeFontSize: 13,
  openRouterApiKey: "",
  supabaseUrl: "",
  supabaseAnonKey: "",
  customEndpoint: "",
  customApiKey: "",
};

const INITIAL_CONVERSATION: Conversation = {
  id: "conv-welcome-demo",
  title: "Introduction to Groky AI & Interactive Artifacts",
  createdAt: Date.now() - 3600000,
  updatedAt: Date.now() - 3600000,
  isPinned: false,
  modelId: "z-ai/glm-5.2:free",
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
      model: "z-ai/glm-5.2:free",
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
    const raw = localStorage.getItem(STORAGE_KEYS.CONVERSATIONS);
    if (!raw) {
      const initial = [INITIAL_CONVERSATION];
      localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(initial));
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
    localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(conversations));
  } catch (err) {
    console.error("Failed to save conversations", err);
  }
}

export function loadActiveChatId(): string {
  try {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_ID) || "conv-welcome-demo";
  } catch {
    return "conv-welcome-demo";
  }
}

export function saveActiveChatId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_ID, id);
  } catch (err) {
    console.error("Failed to save active chat ID", err);
  }
}

export function loadSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: UserSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (err) {
    console.error("Failed to save settings", err);
  }
}
