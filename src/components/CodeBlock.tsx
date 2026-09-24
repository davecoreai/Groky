import React, { useState, useEffect, useRef } from "react";
import Prism from "prismjs";
import "prismjs/themes/prism-tomorrow.css"; // Clean dark code styling
import { CinematicImageFrame } from "./CinematicImageFrame";

interface CodeBlockProps {
  language: string;
  code: string;
  title?: string;
  onOpenArtifact?: (code: string, language: string, title?: string) => void;
  fontSize?: number;
}

// Get appropriate file icon and formatted title for code blocks
function getCodeDetails(lang: string, customTitle?: string, codeContent: string = "") {
  let clean = (lang || "text").toLowerCase().replace(/^(language-|lang-)/, "").trim();
  let explicitTitle = customTitle?.trim() || "";

  // If language tag was written as ```javascript:script.js or ```js:index.js
  if (clean.includes(":")) {
    const [l, t] = clean.split(":");
    clean = l.trim();
    if (!explicitTitle && t) explicitTitle = t.trim();
  } else if (clean.includes(" ")) {
    const [l, ...rest] = clean.split(" ");
    clean = l.trim();
    if (!explicitTitle && rest.length > 0) explicitTitle = rest.join(" ").trim();
  }

  // Filter out invalid titles that are actually code snippets (e.g. document.addEventListener...)
  if (
    explicitTitle &&
    (explicitTitle.includes("(") ||
      explicitTitle.includes(")") ||
      explicitTitle.includes("=") ||
      explicitTitle.includes(";") ||
      explicitTitle.includes("{") ||
      explicitTitle.includes("}") ||
      explicitTitle.includes("=>") ||
      explicitTitle.length > 35)
  ) {
    explicitTitle = "";
  }

  // Check for 3D simulation
  const is3D =
    codeContent.includes("THREE.") ||
    codeContent.includes("OrbitControls") ||
    codeContent.includes("webgl") ||
    codeContent.includes("PCFSoftShadowMap");

  // Format default filename/title if none given
  let displayTitle = explicitTitle;
  let iconClass = "fa-solid fa-code text-amber-500";

  if (!displayTitle) {
    if (is3D) {
      displayTitle = "3D Simulation (Three.js)";
      iconClass = "fa-solid fa-cube text-amber-400";
    } else {
      switch (clean) {
        case "javascript":
        case "js":
          displayTitle = "script.js";
          iconClass = "fa-brands fa-js text-amber-400";
          break;
        case "html":
        case "htm":
          displayTitle = "index.html";
          iconClass = "fa-brands fa-html5 text-orange-400";
          break;
        case "css":
          displayTitle = "style.css";
          iconClass = "fa-brands fa-css3-alt text-sky-400";
          break;
        case "typescript":
        case "ts":
          displayTitle = "script.ts";
          iconClass = "fa-solid fa-file-code text-blue-400";
          break;
        case "tsx":
        case "jsx":
          displayTitle = clean === "tsx" ? "App.tsx" : "App.jsx";
          iconClass = "fa-brands fa-react text-cyan-400";
          break;
        case "python":
        case "py":
          displayTitle = "main.py";
          iconClass = "fa-brands fa-python text-yellow-400";
          break;
        case "json":
          displayTitle = "data.json";
          iconClass = "fa-solid fa-brackets-curly text-emerald-400";
          break;
        case "sql":
          displayTitle = "query.sql";
          iconClass = "fa-solid fa-database text-purple-400";
          break;
        case "bash":
        case "sh":
        case "shell":
          displayTitle = "terminal";
          iconClass = "fa-solid fa-terminal text-stone-400";
          break;
        case "markdown":
        case "md":
          displayTitle = "README.md";
          iconClass = "fa-solid fa-file-lines text-stone-300";
          break;
        default:
          displayTitle = clean || "code";
          iconClass = "fa-solid fa-file-code text-stone-400";
          break;
      }
    }
  } else {
    // Determine icon from explicit title extension
    if (displayTitle.endsWith(".js")) iconClass = "fa-brands fa-js text-amber-400";
    else if (displayTitle.endsWith(".html")) iconClass = "fa-brands fa-html5 text-orange-400";
    else if (displayTitle.endsWith(".css")) iconClass = "fa-brands fa-css3-alt text-sky-400";
    else if (displayTitle.endsWith(".ts")) iconClass = "fa-solid fa-file-code text-blue-400";
    else if (displayTitle.endsWith(".tsx") || displayTitle.endsWith(".jsx"))
      iconClass = "fa-brands fa-react text-cyan-400";
    else if (displayTitle.endsWith(".py")) iconClass = "fa-brands fa-python text-yellow-400";
    else if (displayTitle.endsWith(".json")) iconClass = "fa-solid fa-brackets-curly text-emerald-400";
    else if (displayTitle.endsWith(".sql")) iconClass = "fa-solid fa-database text-purple-400";
    else if (is3D) iconClass = "fa-solid fa-cube text-amber-400";
  }

  return { cleanLang: clean, displayTitle, iconClass, is3D };
}

export const CodeBlock: React.FC<CodeBlockProps> = ({
  language,
  code,
  title,
  onOpenArtifact,
  fontSize = 13.5,
}) => {
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLElement>(null);
  const rafRef = useRef<number | null>(null);

  const { cleanLang, displayTitle, iconClass, is3D } = getCodeDetails(language, title, code);

  // Check if this is a cinematic image generation block
  const isImageGen = ["image", "image-generator", "cinematic-image", "flux-image"].includes(cleanLang);

  if (isImageGen) {
    let parsedPrompt = code.trim();
    let aspectRatio: "16:9" | "4:3" | "1:1" | "9:16" = "16:9";
    let imgTitle = title || "Cinematic Frame — Photorealistic";
    let initUrl = "";

    try {
      const json = JSON.parse(code);
      if (json.prompt) parsedPrompt = json.prompt;
      if (json.aspectRatio) aspectRatio = json.aspectRatio;
      if (json.title) imgTitle = json.title;
      if (json.url || json.imageUrl) initUrl = json.url || json.imageUrl;
    } catch {}

    return (
      <CinematicImageFrame
        prompt={parsedPrompt}
        title={imgTitle}
        aspectRatio={aspectRatio}
        initialImageUrl={initUrl}
      />
    );
  }

  // Smooth, non-blocking syntax highlighting
  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const timer = setTimeout(() => {
      rafRef.current = requestAnimationFrame(() => {
        if (codeRef.current) {
          try {
            Prism.highlightElement(codeRef.current);
          } catch {}
        }
      });
    }, 40);

    return () => {
      clearTimeout(timer);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [code, cleanLang]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy code", err);
    }
  };

  const isPreviewable = ["html", "htm"].includes(cleanLang) || is3D;
  const lineCount = code.trim().split("\n").length;

  return (
    <div className="group relative my-3 overflow-hidden rounded-xl border border-stone-200/80 bg-[#141418] text-stone-100 shadow-sm dark:border-stone-800 transition-all font-sans-clean">
      {/* Code Header Bar */}
      <div className="flex items-center justify-between border-b border-stone-800/90 bg-[#0d0d11] px-4 py-2 text-xs select-none">
        <div className="flex items-center gap-2 min-w-0">
          <i className={`${iconClass} text-xs shrink-0`}></i>
          <span className="font-mono text-stone-200 font-medium text-xs truncate">
            {displayTitle}
          </span>
          <span className="text-stone-500 text-[11px] shrink-0">
            • {lineCount} {lineCount === 1 ? "line" : "lines"}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {isPreviewable && onOpenArtifact && (
            <button
              id={`preview-artifact-${cleanLang}`}
              type="button"
              onClick={() => onOpenArtifact(code, cleanLang || "html", displayTitle)}
              className="flex items-center gap-1.5 rounded-md bg-amber-600/20 px-2.5 py-1 text-xs font-medium text-amber-400 hover:bg-amber-600/30 transition-colors cursor-pointer"
              title="Open and run in 3D Artifact Viewer"
            >
              <i className={`fa-solid ${is3D ? "fa-cube" : "fa-play"} text-[10px]`}></i>
              <span>{is3D ? "3D Preview" : "Preview"}</span>
            </button>
          )}

          <button
            id="copy-code-btn"
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs text-stone-400 hover:bg-stone-800 hover:text-stone-200 transition-colors cursor-pointer"
            title="Copy code snippet"
          >
            {copied ? (
              <>
                <i className="fa-solid fa-check text-xs text-emerald-400"></i>
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <i className="fa-regular fa-copy text-xs"></i>
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code Content */}
      <div
        className="relative overflow-x-auto p-4 font-mono leading-relaxed select-text"
        style={{ fontSize: `${fontSize}px`, tabSize: 2, fontVariantNumeric: "tabular-nums" }}
      >
        <pre className="!m-0 !p-0 !bg-transparent font-mono whitespace-pre text-stone-100 will-change-contents">
          <code ref={codeRef} className={`language-${cleanLang}`}>
            {code}
          </code>
        </pre>
      </div>
    </div>
  );
};
