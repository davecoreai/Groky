import React, { useState, useRef, useEffect } from "react";
import { ModelOption } from "../types";

interface ModelSelectorProps {
  models: ModelOption[];
  selectedModelId: string;
  onSelectModel: (modelId: string) => void;
  onOpenPricing?: () => void;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  models,
  selectedModelId,
  onSelectModel,
  onOpenPricing,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [lockedModalModel, setLockedModalModel] = useState<ModelOption | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedModel = models.find((m) => m.id === selectedModelId) || models[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleModelClick = (model: ModelOption) => {
    if (model.isLocked) {
      setLockedModalModel(model);
      return;
    }
    onSelectModel(model.id);
    setIsOpen(false);
  };

  return (
    <>
      <div className="relative inline-block" ref={dropdownRef}>
        <button
          id="model-selector-btn"
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-stone-100/80 dark:bg-stone-800/80 text-xs font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-200/80 dark:hover:bg-stone-700/80 transition-all cursor-pointer select-none"
          title="Select AI Model"
        >
          <img
            src="https://i.imgur.com/0J9yC8T.jpeg"
            alt="Groky AI"
            className="h-4 w-4 rounded-md object-cover"
            referrerPolicy="no-referrer"
          />
          <span className="font-semibold text-stone-800 dark:text-stone-200 text-[11px] sm:text-xs flex items-center gap-1.5">
            {selectedModel.name}
            {selectedModel.isLocked && (
              <i className="fa-solid fa-lock text-[10px] text-amber-500" title="Model Terkunci"></i>
            )}
            {selectedModel.badge && (
              <span
                className={`text-[9px] font-semibold px-1.5 py-0.2 rounded-md ${
                  selectedModel.isLocked || selectedModel.badge.includes("2jt") || selectedModel.badge.includes("Super")
                    ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                    : selectedModel.badge.includes("Plus")
                    ? "bg-blue-500/15 text-blue-700 dark:text-blue-300"
                    : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                }`}
              >
                {selectedModel.badge}
              </span>
            )}
          </span>
          <i
            className={`fa-solid fa-chevron-up text-[9px] text-stone-400 transition-transform duration-150 ${
              isOpen ? "rotate-180" : ""
            }`}
          ></i>
        </button>

        {isOpen && (
          <div className="absolute left-0 bottom-full mb-2 w-72 sm:w-80 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-3 py-2 text-[10px] font-semibold text-stone-400 uppercase tracking-wider border-b border-stone-100 dark:border-stone-800">
              <span>Groky AI Engines</span>
              <span className="text-[9px] text-amber-600 dark:text-amber-400 normal-case flex items-center gap-1">
                <i className="fa-solid fa-lock text-[9px]"></i> Premium Locked
              </span>
            </div>
            <div className="space-y-0.5 pt-1">
              {models.map((model) => {
                const isSelected = model.id === selectedModelId;
                const isLocked = model.isLocked;
                return (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => handleModelClick(model)}
                    className={`flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-left transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-amber-500/10 text-stone-900 dark:text-stone-100"
                        : isLocked
                        ? "text-stone-500 dark:text-stone-400 hover:bg-amber-500/5"
                        : "text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800/70"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <div className="relative shrink-0">
                        <img
                          src="https://i.imgur.com/0J9yC8T.jpeg"
                          alt="Groky AI"
                          className={`w-6 h-6 rounded-lg object-cover border ${
                            isLocked ? "opacity-60 border-amber-500/40" : "border-stone-200/60 dark:border-stone-700/60"
                          }`}
                          referrerPolicy="no-referrer"
                        />
                        {isLocked && (
                          <div className="absolute -top-1 -right-1 bg-amber-500 text-stone-950 rounded-full w-3.5 h-3.5 flex items-center justify-center text-[8px] font-bold shadow-xs">
                            <i className="fa-solid fa-lock"></i>
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-semibold truncate ${isLocked ? "text-stone-700 dark:text-stone-200" : ""}`}>
                            {model.name}
                          </span>
                          {model.badge && (
                            <span
                              className={`text-[9px] font-semibold px-1.5 py-0.2 rounded-md ${
                                isLocked || model.badge.includes("2jt") || model.badge.includes("Super")
                                  ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                                  : model.badge.includes("Plus")
                                  ? "bg-blue-500/15 text-blue-700 dark:text-blue-300"
                                  : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                              }`}
                            >
                              {model.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-stone-400 truncate max-w-[200px]">
                          {model.description}
                        </p>
                      </div>
                    </div>
                    {isSelected ? (
                      <i className="fa-solid fa-check text-xs text-amber-600 dark:text-amber-400 shrink-0"></i>
                    ) : isLocked ? (
                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 flex items-center gap-1 shrink-0">
                        <i className="fa-solid fa-lock text-[8px]"></i> Lock
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* LOCKED MODEL MODAL */}
      {lockedModalModel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto text-xl shadow-inner">
              <i className="fa-solid fa-lock"></i>
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 font-serif-editorial">
                Model {lockedModalModel.name} Terkunci
              </h3>
              <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                Model ini merupakan fitur eksklusif untuk <strong className="text-amber-600 dark:text-amber-400">{lockedModalModel.badge}</strong>. Silakan upgrade paket Anda untuk membuka akses penuh ke engine ini.
              </p>
            </div>
            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setLockedModalModel(null);
                  setIsOpen(false);
                  if (onOpenPricing) onOpenPricing();
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-sparkles text-xs"></i>
                <span>Lihat Paket Premium</span>
              </button>
              <button
                type="button"
                onClick={() => setLockedModalModel(null)}
                className="w-full py-2 px-4 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 font-medium text-xs hover:bg-stone-200 dark:hover:bg-stone-700 transition-all cursor-pointer"
              >
                Gunakan Model Gratis
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

