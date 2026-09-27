import React, { useState, useMemo } from "react";
import Prism from "prismjs";
import "prismjs/themes/prism-tomorrow.css";
// Preload common Prism language highlighters
import "prismjs/components/prism-markup";
import "prismjs/components/prism-css";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-python";
import "prismjs/components/prism-json";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-markdown";

interface CodeBlockProps {
  language: string;
  code: string;
  title?: string;
  onOpenArtifact?: (code: string, language: string, title?: string) => void;
  fontSize?: number;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Sanitize and resolve accurate file names and icons for code blocks
function getCodeDetails(lang: string, customTitle?: string, codeContent: string = "") {
  let clean = (lang || "").toLowerCase().replace(/^(language-|lang-)/, "").trim();
  let explicitTitle = (customTitle || "").trim();

  // Strip accidental DOCTYPE or HTML tags that might be in language tag or title
  clean = clean.replace(/^[<>/!]+/, "").replace(/[<>/!]+$/, "").trim();
  if (clean.includes("doctype") || clean.includes("html")) {
    clean = "html";
  }

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

  // Detect HTML / 3D from code content if language is generic or missing
  const trimmedCode = codeContent.trim().toLowerCase();
  const isHtmlCode =
    clean === "html" ||
    clean === "htm" ||
    trimmedCode.startsWith("<!doctype html") ||
    trimmedCode.startsWith("<html") ||
    trimmedCode.includes("<head>") ||
    trimmedCode.includes("<body");

  if (isHtmlCode) {
    clean = "html";
  }

  // Filter out invalid titles that are actually code snippets or tag fragments
  if (
    explicitTitle &&
    (explicitTitle.includes("<") ||
      explicitTitle.includes(">") ||
      explicitTitle.includes("!") ||
      explicitTitle.toLowerCase().includes("doctype") ||
      explicitTitle.includes("(") ||
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

  // Format clean filename for display
  let displayTitle = explicitTitle;
  let iconClass = "fa-solid fa-code text-amber-500";

  if (!displayTitle) {
    if (is3D) {
      displayTitle = "3D Simulation (Three.js)";
      iconClass = "fa-solid fa-cube text-amber-400";
    } else {
      switch (clean) {
        case "html":
        case "htm":
          displayTitle = "index.html";
          iconClass = "fa-brands fa-html5 text-orange-400";
          break;
        case "javascript":
        case "js":
          displayTitle = "script.js";
          iconClass = "fa-brands fa-js text-amber-400";
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
          displayTitle = "terminal.sh";
          iconClass = "fa-solid fa-terminal text-stone-400";
          break;
        case "markdown":
        case "md":
          displayTitle = "README.md";
          iconClass = "fa-solid fa-file-lines text-stone-300";
          break;
        case "svg":
          displayTitle = "graphic.svg";
          iconClass = "fa-solid fa-bezier-curve text-amber-400";
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
    else if (displayTitle.endsWith(".html") || displayTitle.endsWith(".htm"))
      iconClass = "fa-brands fa-html5 text-orange-400";
    else if (displayTitle.endsWith(".css")) iconClass = "fa-brands fa-css3-alt text-sky-400";
    else if (displayTitle.endsWith(".ts")) iconClass = "fa-solid fa-file-code text-blue-400";
    else if (displayTitle.endsWith(".tsx") || displayTitle.endsWith(".jsx"))
      iconClass = "fa-brands fa-react text-cyan-400";
    else if (displayTitle.endsWith(".py")) iconClass = "fa-brands fa-python text-yellow-400";
    else if (displayTitle.endsWith(".json"))
      iconClass = "fa-solid fa-brackets-curly text-emerald-400";
    else if (displayTitle.endsWith(".sql")) iconClass = "fa-solid fa-database text-purple-400";
    else if (is3D) iconClass = "fa-solid fa-cube text-amber-400";
  }

  return { cleanLang: clean, displayTitle, iconClass, is3D };
}

const COLLAPSE_LINE_THRESHOLD = 14;

export const CodeBlock: React.FC<CodeBlockProps> = ({
  language,
  code,
  title,
  onOpenArtifact,
  fontSize = 13.5,
}) => {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const { cleanLang, displayTitle, iconClass, is3D } = getCodeDetails(language, title, code);
  const lineCount = code.trim().split("\n").length;
  const isCollapsible = lineCount > COLLAPSE_LINE_THRESHOLD;

  // Ultra-smooth, synchronous, zero-flicker syntax highlighting with Prism
  const highlightedHtml = useMemo(() => {
    let langKey = cleanLang;
    if (langKey === "html" || langKey === "htm" || langKey === "svg") langKey = "markup";
    else if (langKey === "js") langKey = "javascript";
    else if (langKey === "ts") langKey = "typescript";
    else if (langKey === "py") langKey = "python";
    else if (langKey === "sh" || langKey === "shell") langKey = "bash";

    const grammar = Prism.languages[langKey] || Prism.languages.markup || Prism.languages.javascript;
    if (grammar) {
      try {
        return Prism.highlight(code, grammar, langKey);
      } catch {
        return escapeHtml(code);
      }
    }
    return escapeHtml(code);
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

  return (
    <div className="group relative my-3 overflow-hidden rounded-2xl border border-stone-800/80 bg-[#121216] text-stone-100 shadow-md font-sans-clean">
      {/* Code Header Bar */}
      <div className="flex items-center justify-between border-b border-stone-800/90 bg-[#0d0d11] px-4 py-2.5 text-xs select-none">
        <div className="flex items-center gap-2 min-w-0">
          <i className={`${iconClass} text-xs shrink-0`}></i>
          <span className="font-mono text-stone-200 font-semibold text-xs truncate">
            {displayTitle}
          </span>
          <span className="text-stone-500 text-[11px] font-mono shrink-0">
            • {lineCount} baris
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Quick Expand/Collapse Button in Header for long code */}
          {isCollapsible && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-stone-400 hover:bg-stone-800 hover:text-stone-200 transition-colors cursor-pointer"
              title={isExpanded ? "Ciutkan tampilan kode" : "Perluas tampilan kode"}
            >
              <i className={`fa-solid ${isExpanded ? "fa-compress" : "fa-expand"} text-[10px]`}></i>
              <span className="hidden sm:inline">{isExpanded ? "Ciutkan" : "Perluas"}</span>
            </button>
          )}

          {/* Interactive Preview Artifact Button */}
          {isPreviewable && onOpenArtifact && (
            <button
              id={`preview-artifact-${cleanLang}`}
              type="button"
              onClick={() => onOpenArtifact(code, cleanLang || "html", displayTitle)}
              className="flex items-center gap-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 text-xs font-semibold text-amber-400 hover:bg-amber-500/25 transition-colors cursor-pointer"
              title="Buka pratinjau interaktif di Artifact Viewer"
            >
              <i className={`fa-solid ${is3D ? "fa-cube" : "fa-play"} text-[10px]`}></i>
              <span>{is3D ? "3D Preview" : "Preview"}</span>
            </button>
          )}

          {/* Copy Full Code Button */}
          <button
            id="copy-code-btn"
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs text-stone-400 hover:bg-stone-800 hover:text-stone-200 transition-colors cursor-pointer"
            title="Salin seluruh kode"
          >
            {copied ? (
              <>
                <i className="fa-solid fa-check text-xs text-emerald-400"></i>
                <span className="text-emerald-400 font-medium">Tersalin</span>
              </>
            ) : (
              <>
                <i className="fa-regular fa-copy text-xs"></i>
                <span>Salin</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code Content Container (Compact Viewport when not expanded) */}
      <div className="relative">
        <div
          className={`relative overflow-x-auto p-4 font-mono leading-relaxed select-text ${
            isCollapsible && !isExpanded
              ? "max-h-60 sm:max-h-64 overflow-y-auto"
              : "max-h-none overflow-y-visible"
          }`}
          style={{ fontSize: `${fontSize}px`, tabSize: 2, fontVariantNumeric: "tabular-nums" }}
        >
          <pre className="!m-0 !p-0 !bg-transparent font-mono whitespace-pre text-stone-100">
            <code
              className={`language-${cleanLang}`}
              dangerouslySetInnerHTML={{ __html: highlightedHtml }}
            />
          </pre>
        </div>

        {/* Collapsed Bottom Gradient Overlay & Expand Toggle */}
        {isCollapsible && !isExpanded && (
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-center bg-gradient-to-t from-[#121216] via-[#121216]/90 to-transparent pt-12 pb-2.5 pointer-events-none">
            <button
              type="button"
              onClick={() => setIsExpanded(true)}
              className="pointer-events-auto flex items-center gap-2 px-4 py-1.5 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold shadow-xl border border-stone-700 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <i className="fa-solid fa-chevron-down text-[10px] text-amber-400"></i>
              <span>Tampilkan Lebih Banyak</span>
            </button>
          </div>
        )}

        {/* Expanded Bottom Collapse Bar */}
        {isCollapsible && isExpanded && (
          <div className="flex items-center justify-center border-t border-stone-800/60 bg-[#0e0e12] py-2 px-4">
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="flex items-center gap-2 px-3.5 py-1 rounded-full text-stone-400 hover:text-stone-200 hover:bg-stone-800/60 text-xs font-medium transition-colors cursor-pointer"
            >
              <i className="fa-solid fa-chevron-up text-[10px]"></i>
              <span>Ciutkan Kode</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
