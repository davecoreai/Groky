import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

interface HeroOrbProps {
  isDark?: boolean;
}

export const HeroOrb: React.FC<HeroOrbProps> = ({ isDark = true }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [orbMode, setOrbMode] = useState<"cosmic" | "aurora" | "solar">("cosmic");

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Generate Procedural Celestial Texture
    const createCelestialCanvas = (mode: string) => {
      const canvas = document.createElement("canvas");
      canvas.width = 1024;
      canvas.height = 512;
      const ctx = canvas.getContext("2d");
      if (!ctx) return canvas;

      // Base cosmic gradient
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      if (mode === "cosmic") {
        grad.addColorStop(0, "#0b0f19");
        grad.addColorStop(0.3, "#1e1b4b");
        grad.addColorStop(0.5, "#0284c7");
        grad.addColorStop(0.7, "#312e81");
        grad.addColorStop(1, "#070a13");
      } else if (mode === "aurora") {
        grad.addColorStop(0, "#064e3b");
        grad.addColorStop(0.3, "#047857");
        grad.addColorStop(0.6, "#0f766e");
        grad.addColorStop(1, "#022c22");
      } else {
        grad.addColorStop(0, "#7c2d12");
        grad.addColorStop(0.3, "#c2410c");
        grad.addColorStop(0.6, "#ea580c");
        grad.addColorStop(1, "#451a03");
      }

      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Atmospheric Gas Bands & Turbulence
      for (let i = 0; i < 40; i++) {
        const y = Math.random() * canvas.height;
        const h = Math.random() * 25 + 5;
        const alpha = Math.random() * 0.25 + 0.05;
        ctx.fillStyle = mode === "cosmic"
          ? `rgba(56, 189, 248, ${alpha})`
          : mode === "aurora"
          ? `rgba(52, 211, 153, ${alpha})`
          : `rgba(251, 146, 60, ${alpha})`;

        ctx.beginPath();
        ctx.ellipse(canvas.width / 2, y, canvas.width / 2 + 50, h, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Celestial crater & star dust noise
      ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
      for (let i = 0; i < 800; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const r = Math.random() * 1.8 + 0.4;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      return canvas;
    };

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      42,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 4.2;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    renderer.domElement.style.touchAction = "pan-y";
    container.appendChild(renderer.domElement);

    // Textures
    const celestialCanvas = createCelestialCanvas(orbMode);
    const planetTexture = new THREE.CanvasTexture(celestialCanvas);
    planetTexture.wrapS = THREE.RepeatWrapping;
    planetTexture.wrapT = THREE.ClampToEdgeWrapping;

    // Lighting (Space Lights)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff7ed, 3.2);
    sunLight.position.set(6, 4, 5);
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(
      orbMode === "cosmic" ? 0x38bdf8 : orbMode === "aurora" ? 0x34d399 : 0xfb923c,
      2.2
    );
    rimLight.position.set(-6, -3, -4);
    scene.add(rimLight);

    // 1. Core Planet Body
    const planetGeo = new THREE.SphereGeometry(1.25, 64, 64);
    const planetMat = new THREE.MeshStandardMaterial({
      map: planetTexture,
      bumpMap: planetTexture,
      bumpScale: 0.04,
      roughness: 0.45,
      metalness: 0.15,
    });
    const planet = new THREE.Mesh(planetGeo, planetMat);
    scene.add(planet);

    // 2. Atmospheric Cloud Shell
    const cloudGeo = new THREE.SphereGeometry(1.28, 64, 64);
    const cloudMat = new THREE.MeshStandardMaterial({
      map: planetTexture,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      roughness: 0.8,
    });
    const cloudShell = new THREE.Mesh(cloudGeo, cloudMat);
    scene.add(cloudShell);

    // 3. Atmosphere Halo Glow
    const haloGeo = new THREE.SphereGeometry(1.35, 32, 32);
    const haloMat = new THREE.MeshBasicMaterial({
      color: orbMode === "cosmic" ? 0x0ea5e9 : orbMode === "aurora" ? 0x10b981 : 0xf97316,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
    });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    scene.add(halo);

    // 4. Planetary Stardust Ring
    const ringGeo = new THREE.RingGeometry(1.65, 2.2, 64);
    const ringMat = new THREE.MeshStandardMaterial({
      color: orbMode === "cosmic" ? 0x38bdf8 : orbMode === "aurora" ? 0x6ee7b7 : 0xfed7aa,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.65,
      roughness: 0.3,
      metalness: 0.5,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2.3;
    ring.rotation.y = -Math.PI / 8;
    scene.add(ring);

    // 5. Space Dust Particles
    const starCount = 350;
    const starGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const scales = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      const r = 2.0 + Math.random() * 2.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      scales[i] = Math.random() * 0.03 + 0.01;
    }

    starGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.03,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // Subtle Gyro Mouse Parallax
    let targetRotationX = 0;
    let targetRotationY = 0;

    const handlePointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      targetRotationY = x * 0.4;
      targetRotationX = -y * 0.4;
    };

    container.addEventListener("pointermove", handlePointerMove);

    // Resize Observer
    const handleResize = () => {
      if (!container) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // Animation Render Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Planet axial rotation
      planet.rotation.y = elapsedTime * 0.08;
      cloudShell.rotation.y = elapsedTime * 0.12;
      cloudShell.rotation.x = elapsedTime * 0.03;
      ring.rotation.z = elapsedTime * 0.02;
      stars.rotation.y = elapsedTime * 0.015;

      // Mouse inertia
      planet.rotation.y += (targetRotationY - planet.rotation.y) * 0.03;
      planet.rotation.x += (targetRotationX - planet.rotation.x) * 0.03;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      container.removeEventListener("pointermove", handlePointerMove);
      resizeObserver.disconnect();
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      scene.clear();
      renderer.dispose();
    };
  }, [orbMode, isDark]);

  return (
    <div
      className="relative w-full h-full flex flex-col items-center justify-center select-none"
      style={{ touchAction: "pan-y" }}
    >
      <div
        ref={containerRef}
        style={{ touchAction: "pan-y" }}
        className="w-full h-72 sm:h-96 md:h-[420px] relative flex items-center justify-center pointer-events-auto"
      />

      {/* Celestial Preset Mode Selector */}
      <div className="absolute bottom-2 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-900/80 dark:bg-stone-900/90 backdrop-blur-md border border-stone-800 shadow-md text-xs text-white z-10">
        <span className="text-[11px] font-mono text-stone-400 mr-1 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
          Celestial Space:
        </span>
        <button
          onClick={() => setOrbMode("cosmic")}
          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition-all cursor-pointer ${
            orbMode === "cosmic" ? "bg-sky-500 text-white shadow-xs" : "text-stone-400 hover:text-white"
          }`}
        >
          Cosmic
        </button>
        <button
          onClick={() => setOrbMode("aurora")}
          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition-all cursor-pointer ${
            orbMode === "aurora" ? "bg-emerald-500 text-white shadow-xs" : "text-stone-400 hover:text-white"
          }`}
        >
          Aurora
        </button>
        <button
          onClick={() => setOrbMode("solar")}
          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition-all cursor-pointer ${
            orbMode === "solar" ? "bg-orange-500 text-white shadow-xs" : "text-stone-400 hover:text-white"
          }`}
        >
          Solar
        </button>
      </div>
    </div>
  );
};
