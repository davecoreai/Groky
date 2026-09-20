import React, { useState, useEffect, useRef } from "react";
import Prism from "prismjs";
import "prismjs/themes/prism-tomorrow.css"; // Clean dark code styling

interface CodeBlockProps {
  language: string;
  code: string;
  title?: string;
  onOpenArtifact?: (code: string, language: string, title?: string) => void;
  fontSize?: number;
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
  const cleanLang = (language || "text").toLowerCase().replace(/^(language-|lang-)/, "");

  useEffect(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    // Debounce highlighting during rapid token streaming to prevent DOM thrashing & jitter
    const timer = setTimeout(() => {
      rafRef.current = requestAnimationFrame(() => {
        if (codeRef.current) {
          try {
            Prism.highlightElement(codeRef.current);
          } catch {
            // Fallback if language grammar is not found
          }
        }
      });
    }, 100);

    return () => {
      clearTimeout(timer);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
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

  // Requirement 6: Preview khusus buat HTML saja
  const isPreviewable = ["html", "htm"].includes(cleanLang);
  const lineCount = code.trim().split("\n").length;

  return (
    <div className="group relative my-3 overflow-hidden rounded-xl border border-stone-200/80 bg-[#141418] text-stone-100 shadow-sm dark:border-stone-800 transition-all">
      {/* Code Header Bar */}
      <div className="flex items-center justify-between border-b border-stone-800 bg-[#0d0d11] px-4 py-2 text-xs select-none">
        <div className="flex items-center gap-2">
          {isPreviewable ? (
            <i className="fa-solid fa-code text-xs text-amber-500"></i>
          ) : (
            <i className="fa-solid fa-terminal text-xs text-stone-400"></i>
          )}
          <span className="font-mono text-stone-300 font-medium tracking-wide uppercase">
            {title || cleanLang}
          </span>
          <span className="text-stone-500 text-[11px]">
            {lineCount} {lineCount === 1 ? "line" : "lines"}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {isPreviewable && onOpenArtifact && (
            <button
              id={`preview-artifact-${cleanLang}`}
              type="button"
              onClick={() => onOpenArtifact(code, cleanLang, title)}
              className="flex items-center gap-1.5 rounded-md bg-amber-600/20 px-2.5 py-1 text-xs font-medium text-amber-400 hover:bg-amber-600/30 transition-colors cursor-pointer"
              title="Open and run in Artifact Viewer"
            >
              <i className="fa-solid fa-play text-[10px]"></i>
              <span>Preview</span>
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
