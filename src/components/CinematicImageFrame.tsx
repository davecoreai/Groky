import React, { useState, useEffect, useRef } from "react";

export interface CinematicImageProps {
  prompt: string;
  title?: string;
  aspectRatio?: "16:9" | "4:3" | "1:1" | "9:16";
  initialImageUrl?: string;
  seed?: number;
}

// Global in-memory cache to ensure images are NEVER re-generated or reloaded when switching history
const IMAGE_URL_CACHE = new Map<string, string>();

export const CinematicImageFrame: React.FC<CinematicImageProps> = ({
  prompt,
  aspectRatio = "16:9",
  initialImageUrl,
  seed = 42,
}) => {
  const cacheKey = `groky_img_${prompt.trim()}_${seed}_${aspectRatio}`;
  
  // Check if image is already cached in memory or session storage
  const getCachedUrl = (): string => {
    if (initialImageUrl) return initialImageUrl;
    if (IMAGE_URL_CACHE.has(cacheKey)) return IMAGE_URL_CACHE.get(cacheKey)!;
    try {
      if (typeof window !== "undefined") {
        const stored = sessionStorage.getItem(cacheKey);
        if (stored) {
          IMAGE_URL_CACHE.set(cacheKey, stored);
          return stored;
        }
      }
    } catch {}
    return "";
  };

  const cached = getCachedUrl();
  const [imageUrl, setImageUrl] = useState<string>(cached);
  const [isLoading, setIsLoading] = useState<boolean>(!cached);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [shareToast, setShareToast] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Helper to build realistic image URL with soft natural lighting & balanced contrast
  const buildRealisticImageUrl = (rawPrompt: string, s: number, ar: string) => {
    const realismDirectives =
      "photorealistic, natural diffused daylight, balanced dynamic range, soft natural shadows, authentic skin and material textures, 35mm photography, neutral color grade, lifelike composition, zero extreme contrast, highly detailed documentary photography";
    const fullPrompt = `${rawPrompt.trim()}, ${realismDirectives}`;

    let width = 1280;
    let height = 720;
    if (ar === "4:3") {
      width = 1024;
      height = 768;
    } else if (ar === "1:1") {
      width = 1024;
      height = 1024;
    } else if (ar === "9:16") {
      width = 720;
      height = 1280;
    }

    return `https://image.pollinations.ai/prompt/${encodeURIComponent(
      fullPrompt
    )}?width=${width}&height=${height}&seed=${s}&model=flux-realism&nologo=true&enhance=false`;
  };

  // Animated Dots inside Canvas (bergerak ke kanan-kiri & mengecil-membesar)
  useEffect(() => {
    if (!isLoading) {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 640);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 360);

    const dotCount = 65;
    const dots: {
      baseX: number;
      baseY: number;
      radius: number;
      phase: number;
      speed: number;
      amplitude: number;
      color: string;
    }[] = [];

    for (let i = 0; i < dotCount; i++) {
      dots.push({
        baseX: Math.random() * width,
        baseY: Math.random() * height,
        radius: 1.8 + Math.random() * 3.5,
        phase: Math.random() * Math.PI * 2,
        speed: 0.8 + Math.random() * 1.4,
        amplitude: 15 + Math.random() * 35, // Horizontal movement amplitude (kanan - kiri)
        color: Math.random() > 0.4 ? "rgba(245, 158, 11, " : "rgba(217, 119, 6, ",
      });
    }

    let startTime = performance.now();

    const render = (time: number) => {
      const elapsed = (time - startTime) * 0.002;
      ctx.clearRect(0, 0, width, height);

      // Draw dynamic glowing background aura
      const grad = ctx.createRadialGradient(
        width / 2,
        height / 2,
        10,
        width / 2,
        height / 2,
        Math.max(width, height) / 1.5
      );
      grad.addColorStop(0, "rgba(24, 24, 27, 0.95)");
      grad.addColorStop(1, "rgba(9, 9, 11, 0.98)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Render oscillating dots
      for (const d of dots) {
        // Move left and right (bergerak ke kanan dan ke kiri)
        const currentX = d.baseX + Math.sin(elapsed * d.speed + d.phase) * d.amplitude;
        const currentY = d.baseY + Math.cos(elapsed * (d.speed * 0.5) + d.phase) * 6;

        // Pulse / scale size (mengecil membesar)
        const scaleFactor = 0.55 + 0.65 * (0.5 + 0.5 * Math.sin(elapsed * d.speed * 1.5 + d.phase));
        const currentRadius = Math.max(0.6, d.radius * scaleFactor);
        const opacity = 0.25 + 0.65 * scaleFactor;

        ctx.beginPath();
        ctx.arc(currentX, currentY, currentRadius, 0, Math.PI * 2);
        ctx.fillStyle = `${d.color}${opacity.toFixed(2)})`;
        ctx.fill();

        // Subtle glowing halo around larger dots
        if (currentRadius > 2.5) {
          ctx.beginPath();
          ctx.arc(currentX, currentY, currentRadius * 2, 0, Math.PI * 2);
          ctx.fillStyle = `${d.color}${(opacity * 0.25).toFixed(2)})`;
          ctx.fill();
        }
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth || 640;
      height = canvas.height = canvas.parentElement.clientHeight || 360;
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isLoading]);

  // Load and cache image
  useEffect(() => {
    const existing = getCachedUrl();
    if (existing) {
      setImageUrl(existing);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const targetUrl = buildRealisticImageUrl(prompt, seed, aspectRatio);

    const img = new Image();
    img.referrerPolicy = "no-referrer";
    img.src = targetUrl;
    img.onload = () => {
      IMAGE_URL_CACHE.set(cacheKey, targetUrl);
      try {
        sessionStorage.setItem(cacheKey, targetUrl);
      } catch {}
      setImageUrl(targetUrl);
      setIsLoading(false);
    };
    img.onerror = () => {
      const fallbackUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(
        prompt + ", realistic photo, natural light"
      )}?width=1280&height=720&seed=${seed}&nologo=true`;
      IMAGE_URL_CACHE.set(cacheKey, fallbackUrl);
      try {
        sessionStorage.setItem(cacheKey, fallbackUrl);
      } catch {}
      setImageUrl(fallbackUrl);
      setIsLoading(false);
    };
  }, [prompt, seed, aspectRatio, cacheKey]);

  const showToast = (msg: string) => {
    setShareToast(msg);
    setTimeout(() => setShareToast(null), 3000);
  };

  // Simpan / Download handler
  const handleDownload = async () => {
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `groky-image-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      showToast("Gambar berhasil disimpan.");
    } catch {
      window.open(imageUrl, "_blank");
      showToast("Membuka unduhan gambar.");
    }
  };

  // Share handler with native Web Share API and fallback copy
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Gambar Hasil Generasi AI — Groky AI",
          text: prompt,
          url: imageUrl,
        });
        showToast("Gambar berhasil dibagikan.");
        return;
      } catch (err: any) {
        if (err.name === "AbortError") return;
      }
    }

    // Fallback: Copy Image Link to Clipboard
    try {
      await navigator.clipboard.writeText(imageUrl);
      showToast("Tautan gambar berhasil disalin ke clipboard.");
    } catch {
      showToast("Gagal menyalin tautan.");
    }
  };

  const aspectClass =
    aspectRatio === "16:9"
      ? "aspect-video"
      : aspectRatio === "4:3"
      ? "aspect-4/3"
      : aspectRatio === "9:16"
      ? "aspect-9/16"
      : "aspect-square";

  return (
    <>
      <div className="my-3 rounded-2xl overflow-hidden border border-stone-200/80 dark:border-stone-800/80 bg-stone-100 dark:bg-stone-900 shadow-sm select-none group relative font-sans-clean">
        {/* Viewport Container */}
        <div className={`relative w-full ${aspectClass} overflow-hidden flex items-center justify-center bg-stone-950`}>
          {/* Animated Canvas with dots moving left-right and expanding-shrinking */}
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <canvas ref={canvasRef} className="w-full h-full block" />
            </div>
          ) : (
            /* COMPLETED PHOTOREALISTIC IMAGE - Click to open Fullscreen Modal */
            <div
              onClick={() => setIsFullscreen(true)}
              className="relative w-full h-full flex items-center justify-center group/img cursor-pointer"
            >
              <img
                src={imageUrl}
                alt={prompt}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover rounded-2xl transition-all duration-300 group-hover/img:scale-[1.01]"
              />

              {/* Hover overlay hint */}
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                <span className="px-3 py-1.5 rounded-xl bg-black/70 text-white text-xs font-medium backdrop-blur-md flex items-center gap-1.5 shadow-lg">
                  <i className="fa-solid fa-expand text-xs"></i>
                  <span>Buka Layar Penuh</span>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FULLSCREEN LIGHTBOX MODAL DENGAN TOMBOL SIMPAN & SHARE */}
      {isFullscreen && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setIsFullscreen(false)}
        >
          {/* Feedback Toast inside Fullscreen */}
          {shareToast && (
            <div className="absolute top-6 z-50 px-4 py-2 rounded-2xl bg-emerald-600 text-white text-xs font-medium shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-3">
              <i className="fa-solid fa-circle-check"></i>
              <span>{shareToast}</span>
            </div>
          )}

          {/* Top Bar Navigation */}
          <div
            className="w-full max-w-5xl flex items-center justify-between text-stone-200 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="min-w-0 pr-4">
              <p className="text-xs font-medium text-stone-300 truncate max-w-md sm:max-w-xl">
                {prompt}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsZoomed(!isZoomed)}
                className="px-3 py-1.5 rounded-xl bg-stone-800/90 hover:bg-stone-700 text-stone-200 text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                title="Perbesar / Perkecil"
              >
                <i className={`fa-solid ${isZoomed ? "fa-compress" : "fa-magnifying-glass-plus"}`}></i>
                <span className="hidden sm:inline">{isZoomed ? "Fit" : "Zoom"}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                className="p-2 rounded-xl bg-stone-800/90 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors cursor-pointer"
                title="Tutup"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>
          </div>

          {/* Center Image Container */}
          <div
            className="flex-1 w-full max-w-5xl my-4 flex items-center justify-center overflow-auto rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={imageUrl}
              alt={prompt}
              referrerPolicy="no-referrer"
              className={`rounded-2xl shadow-2xl transition-all duration-200 ${
                isZoomed
                  ? "max-w-none w-[150%] object-contain cursor-zoom-out"
                  : "max-h-[75vh] w-auto max-w-full object-contain cursor-zoom-in"
              }`}
              onClick={() => setIsZoomed(!isZoomed)}
            />
          </div>

          {/* Bottom Action Bar: Tombol Simpan & Share */}
          <div
            className="w-full max-w-md flex items-center justify-center gap-3 z-10 pb-2"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Tombol Simpan (Download) */}
            <button
              type="button"
              onClick={handleDownload}
              className="flex-1 py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
            >
              <i className="fa-solid fa-download text-sm"></i>
              <span>Simpan</span>
            </button>

            {/* Tombol Share (Bagikan) */}
            <button
              type="button"
              onClick={handleShare}
              className="flex-1 py-2.5 px-4 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-100 font-semibold text-xs border border-stone-700 shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
            >
              <i className="fa-solid fa-share-nodes text-sm"></i>
              <span>Share</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};
