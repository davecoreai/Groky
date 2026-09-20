import React, { useState } from "react";
import { MemoryItem } from "../types";

interface DeviceMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  memories: MemoryItem[];
  onAddMemory: (key: string, value: string) => void;
  onRemoveMemory: (id: string) => void;
  onClearMemory: () => void;
}

export const DeviceMemoryModal: React.FC<DeviceMemoryModalProps> = ({
  isOpen,
  onClose,
  memories,
  onAddMemory,
  onRemoveMemory,
  onClearMemory,
}) => {
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim() || !value.trim()) return;
    onAddMemory(key.trim(), value.trim());
    setKey("");
    setValue("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xl p-6 text-stone-900 dark:text-stone-100 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <i className="fa-solid fa-brain text-lg"></i>
            </div>
            <div>
              <h3 className="font-serif-editorial text-lg font-semibold tracking-tight">
                Memori Perangkat AI
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Informasi & preferensi tersimpan khusus di perangkat ini
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
          >
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>

        {/* Add Memory Form */}
        <form onSubmit={handleSubmit} className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200/80 dark:border-stone-700/80 space-y-3">
          <div className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
            <i className="fa-solid fa-plus text-amber-500 text-[10px]"></i>
            <span>Tambah Memori Baru</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Topik / Kunci (misal: Nama User)"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 focus:outline-none focus:border-amber-500"
            />
            <input
              type="text"
              placeholder="Isi Memori (misal: Azha)"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 focus:outline-none focus:border-amber-500"
            />
          </div>
          <button
            type="submit"
            disabled={!key.trim() || !value.trim()}
            className="w-full py-1.5 px-3 rounded-lg bg-stone-900 dark:bg-amber-600 text-white text-xs font-medium hover:bg-stone-800 dark:hover:bg-amber-500 disabled:opacity-40 transition-all cursor-pointer"
          >
            Simpan ke Memori Device
          </button>
        </form>

        {/* Memory List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-medium text-stone-500 dark:text-stone-400">
              Daftar Memori ({memories.length})
            </span>
            {memories.length > 0 && (
              <button
                onClick={onClearMemory}
                className="text-[11px] text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
              >
                Hapus Semua
              </button>
            )}
          </div>

          <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
            {memories.length === 0 ? (
              <div className="p-6 text-center text-xs text-stone-400 border border-dashed border-stone-200 dark:border-stone-800 rounded-xl">
                Belum ada memori tersimpan di perangkat ini. Anda dapat menambahkannya manual di atas atau meminta AI mengingat sesuatu saat berdiskusi.
              </div>
            ) : (
              memories.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200/60 dark:border-stone-800 text-xs"
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <span className="font-semibold text-amber-700 dark:text-amber-400 block truncate">
                      {m.key}
                    </span>
                    <span className="text-stone-600 dark:text-stone-300 block break-words">
                      {m.value}
                    </span>
                  </div>
                  <button
                    onClick={() => onRemoveMemory(m.id)}
                    className="p-1 text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer shrink-0"
                    title="Hapus memori ini"
                  >
                    <i className="fa-solid fa-trash-can text-xs"></i>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-[11px] text-stone-400">
          <span>Tersimpan secara lokal di peramban perangkat ini</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-medium hover:bg-stone-300 dark:hover:bg-stone-700 transition-all cursor-pointer"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};
