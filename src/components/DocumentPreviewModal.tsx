import React from "react";
import { AttachedFile } from "../types";

interface DocumentPreviewModalProps {
  file: AttachedFile | null;
  onClose: () => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({ file, onClose }) => {
  if (!file) return null;

  const isImage = file.dataUrl && file.dataUrl.startsWith("data:image/");
  const lineCount = file.lineCount || (file.content ? file.content.split("\n").length : 0);
  const tokenEstimate = file.tokenCount || (file.content ? Math.ceil(file.content.length / 4) : Math.ceil(file.size / 4));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex flex-col w-full max-w-2xl max-h-[85vh] bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl overflow-hidden text-stone-100">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800 bg-stone-950/70">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
              {isImage ? (
                <i className="fa-solid fa-image text-sm"></i>
              ) : (
                <i className="fa-solid fa-file-lines text-sm"></i>
              )}
            </div>
            <div>
              <h3 className="font-semibold text-sm text-stone-200 leading-snug">{file.name}</h3>
              <p className="text-xs text-stone-400">
                {(file.size / 1024).toFixed(1)} KB · {file.type || "Document"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-800 hover:text-stone-200 transition-colors cursor-pointer"
          >
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>

        {/* Metrics Pill Grid */}
        <div className="grid grid-cols-3 gap-2 p-4 bg-stone-950/40 border-b border-stone-800/80 text-xs">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-stone-800/40 border border-stone-800">
            <i className="fa-solid fa-hashtag text-amber-400 text-sm"></i>
            <div>
              <span className="text-stone-400 block text-[10px]">Estimated Tokens</span>
              <span className="font-mono font-medium text-stone-200">~{tokenEstimate.toLocaleString()}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-stone-800/40 border border-stone-800">
            <i className="fa-solid fa-code text-emerald-400 text-sm"></i>
            <div>
              <span className="text-stone-400 block text-[10px]">Line Count</span>
              <span className="font-mono font-medium text-stone-200">{lineCount.toLocaleString()}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-stone-800/40 border border-stone-800">
            <i className="fa-solid fa-file-circle-check text-sky-400 text-sm"></i>
            <div>
              <span className="text-stone-400 block text-[10px]">Parser Status</span>
              <span className="font-mono font-medium text-stone-200">Parsed &amp; Inlined</span>
            </div>
          </div>
        </div>

        {/* Content Preview */}
        <div className="flex-1 overflow-y-auto p-5 bg-stone-950/20 font-mono text-xs leading-relaxed text-stone-300">
          {isImage ? (
            <div className="flex flex-col items-center justify-center p-4">
              <img
                src={file.dataUrl}
                alt={file.name}
                className="max-h-[50vh] max-w-full rounded-lg border border-stone-800 object-contain shadow-lg"
              />
            </div>
          ) : file.content ? (
            <pre className="whitespace-pre-wrap break-words">{file.content}</pre>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-stone-500">
              <i className="fa-solid fa-database text-2xl mb-2 opacity-40"></i>
              <p>Binary or structured document attached. Ready for multi-modal analysis in conversation.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-5 py-3 border-t border-stone-800 bg-stone-950/60">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-stone-800 text-stone-200 hover:bg-stone-700 text-xs font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
