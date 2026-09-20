import React, { useState, useRef, useEffect } from "react";
import { ModelOption } from "../types";

interface ModelSelectorProps {
  models: ModelOption[];
  selectedModelId: string;
  onSelectModel: (modelId: string) => void;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  models,
  selectedModelId,
  onSelectModel,
}) => {
  const [isOpen, setIsOpen] = useState(false);
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

  return (
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
          {selectedModel.badge === "Beta" && (
            <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400">
              Beta
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
          <div className="px-3 py-2 text-[10px] font-semibold text-stone-400 uppercase tracking-wider border-b border-stone-100 dark:border-stone-800">
            Groky AI Engines
          </div>
          <div className="space-y-0.5 pt-1">
            {models.map((model) => {
              const isSelected = model.id === selectedModelId;
              return (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => {
                    onSelectModel(model.id);
                    setIsOpen(false);
                  }}
                  className={`flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-left transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-amber-500/10 text-stone-900 dark:text-stone-100"
                      : "text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800/70"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <img
                      src="https://i.imgur.com/0J9yC8T.jpeg"
                      alt="Groky AI"
                      className="w-6 h-6 rounded-lg object-cover border border-stone-200/60 dark:border-stone-700/60 shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold truncate">{model.name}</span>
                        {model.badge === "Beta" && (
                          <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400">
                            Beta
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-stone-400 truncate max-w-[200px]">
                        {model.description}
                      </p>
                    </div>
                  </div>
                  {isSelected && (
                    <i className="fa-solid fa-check text-xs text-amber-600 dark:text-amber-400 shrink-0"></i>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

