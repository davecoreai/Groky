import React, { useState, useEffect, useMemo } from "react";
import { Artifact } from "../types";
import { CodeBlock } from "./CodeBlock";

interface ArtifactViewerProps {
  artifact: Artifact | null;
  onClose: () => void;
  isMobile?: boolean;
}

export const ArtifactViewer: React.FC<ArtifactViewerProps> = ({ artifact, onClose, isMobile = false }) => {
  const [activeTab, setActiveTab] = useState<"preview" | "code">("preview");
  const [copied, setCopied] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [deviceViewport, setDeviceViewport] = useState<"desktop" | "mobile">("desktop");

  useEffect(() => {
    // Default to preview tab when opening previewable artifacts
    if (artifact && ["html", "svg", "react"].includes(artifact.type)) {
      setActiveTab("preview");
    } else {
      setActiveTab("code");
    }
  }, [artifact?.id]);

  const handleCopy = async () => {
    if (!artifact) return;
    await navigator.clipboard.writeText(artifact.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!artifact) return;
    const ext = artifact.type === "html" ? "html" : artifact.type === "svg" ? "svg" : artifact.language || "txt";
    const blob = new Blob([artifact.code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${artifact.title.toLowerCase().replace(/\s+/g, "_")}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Safe sandbox preview document
  const previewHtml = useMemo(() => {
    if (!artifact) return "";
    if (artifact.type === "svg") {
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #0f0f12; color: #fff; }
            svg { max-width: 90%; max-height: 90vh; }
          </style>
        </head>
        <body>${artifact.code}</body>
        </html>
      `;
    }

    // HTML / CSS / JS Sandbox with Three.js & Tailwind support
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script src="https://cdn.tailwindcss.com"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/RGBELoader.js"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
        <style>
          * { box-sizing: border-box; }
          html, body { margin: 0; padding: 0; width: 100%; height: 100%; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #0d0d11; color: #f3f4f6; overflow: hidden; }
          canvas { display: block; width: 100% !important; height: 100% !important; outline: none; }
        </style>
      </head>
      <body>
        ${artifact.code}
      </body>
      </html>
    `;
  }, [artifact?.code, artifact?.type]);

  if (!artifact) return null;

  return (
    <div
      id="groky-artifact-panel"
      className={`flex flex-col bg-stone-900 border-l border-stone-800 text-stone-100 z-30 transition-all duration-300 ${
        isFullscreen
          ? "fixed inset-0 z-50"
          : isMobile
          ? "fixed inset-0 z-40"
          : "w-[480px] lg:w-[560px] xl:w-[620px] shrink-0 h-full"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-stone-800 bg-stone-950/80">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-600/20 text-amber-400">
            <i className="fa-solid fa-code text-xs"></i>
          </div>
          <div className="truncate">
            <h3 className="text-xs font-semibold text-stone-200 truncate">{artifact.title}</h3>
            <span className="text-[10px] uppercase font-mono tracking-wider text-amber-500/80 font-medium">
              {artifact.language} Artifact
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1">
          {/* Tab Switcher */}
          <div className="flex items-center rounded-lg bg-stone-800/80 p-0.5 text-xs mr-2">
            <button
              id="artifact-tab-preview"
              onClick={() => setActiveTab("preview")}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 transition-colors cursor-pointer ${
                activeTab === "preview"
                  ? "bg-stone-700 text-stone-100 font-medium shadow-xs"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <i className="fa-regular fa-eye text-xs"></i>
              <span>Preview</span>
            </button>
            <button
              id="artifact-tab-code"
              onClick={() => setActiveTab("code")}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 transition-colors cursor-pointer ${
                activeTab === "code"
                  ? "bg-stone-700 text-stone-100 font-medium shadow-xs"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <i className="fa-solid fa-code text-xs"></i>
              <span>Code</span>
            </button>
          </div>

          {activeTab === "preview" && (
            <>
              <button
                onClick={() => setDeviceViewport(deviceViewport === "desktop" ? "mobile" : "desktop")}
                className="hidden sm:flex p-1.5 rounded-md text-stone-400 hover:bg-stone-800 hover:text-stone-200 cursor-pointer"
                title={`Switch to ${deviceViewport === "desktop" ? "mobile" : "desktop"} viewport`}
              >
                {deviceViewport === "desktop" ? <i className="fa-solid fa-mobile-screen text-xs"></i> : <i className="fa-solid fa-desktop text-xs"></i>}
              </button>
              <button
                onClick={() => setReloadKey((k) => k + 1)}
                className="p-1.5 rounded-md text-stone-400 hover:bg-stone-800 hover:text-stone-200 cursor-pointer"
                title="Reload Sandbox"
              >
                <i className="fa-solid fa-rotate-right text-xs"></i>
              </button>
            </>
          )}

          <button
            onClick={handleCopy}
            className="p-1.5 rounded-md text-stone-400 hover:bg-stone-800 hover:text-stone-200 cursor-pointer"
            title="Copy artifact code"
          >
            {copied ? <i className="fa-solid fa-check text-xs text-emerald-400"></i> : <i className="fa-regular fa-copy text-xs"></i>}
          </button>

          <button
            onClick={handleDownload}
            className="p-1.5 rounded-md text-stone-400 hover:bg-stone-800 hover:text-stone-200 cursor-pointer"
            title="Download file"
          >
            <i className="fa-solid fa-download text-xs"></i>
          </button>

          {!isMobile && (
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 rounded-md text-stone-400 hover:bg-stone-800 hover:text-stone-200 cursor-pointer"
              title={isFullscreen ? "Restore size" : "Expand fullscreen"}
            >
              {isFullscreen ? <i className="fa-solid fa-compress text-xs"></i> : <i className="fa-solid fa-expand text-xs"></i>}
            </button>
          )}

          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-stone-400 hover:bg-stone-800 hover:text-stone-200 ml-1 cursor-pointer"
            title="Close artifact panel"
          >
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>
      </div>

      {/* Main Panel Content */}
      <div className="flex-1 overflow-hidden relative flex flex-col items-center justify-center bg-stone-950">
        {activeTab === "preview" ? (
          <div
            className={`h-full w-full flex items-center justify-center p-2 sm:p-4 transition-all duration-200 ${
              deviceViewport === "mobile" ? "max-w-[380px]" : "w-full"
            }`}
          >
            <div
              className={`w-full h-full rounded-lg overflow-hidden border border-stone-800 bg-white shadow-2xl transition-all ${
                deviceViewport === "mobile" ? "border-stone-700 shadow-amber-950/20 max-h-[720px]" : ""
              }`}
            >
              <iframe
                key={reloadKey}
                srcDoc={previewHtml}
                title={artifact.title}
                sandbox="allow-scripts allow-modals allow-forms allow-same-origin"
                className="w-full h-full border-0 bg-stone-900"
              />
            </div>
          </div>
        ) : (
          <div className="h-full w-full overflow-y-auto p-4">
            <CodeBlock
              language={artifact.language}
              code={artifact.code}
              title={artifact.title}
              fontSize={13}
            />
          </div>
        )}
      </div>
    </div>
  );
};
