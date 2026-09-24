import React, { useState, useRef, useEffect } from "react";
import { UserSettings } from "../types";
import { AVAILABLE_FONTS, applyAppFont } from "../lib/storage";

interface SettingsProps {
  settings: UserSettings;
  onUpdateSettings: (newSettings: UserSettings) => void;
  onClose: () => void;
  onDeleteHistory?: () => void;
  onClearMemory?: () => void;
  onExportData?: () => void;
}

const TONE_OPTIONS: { id: "Default" | "Ramah" | "Profesional"; label: string; desc: string; icon: string }[] = [
  {
    id: "Default",
    label: "Default",
    desc: "Seimbang & Normal",
    icon: "fa-solid fa-scale-balanced",
  },
  {
    id: "Ramah",
    label: "Ramah",
    desc: "Hangat, Komunikatif & Empatis",
    icon: "fa-solid fa-face-smile",
  },
  {
    id: "Profesional",
    label: "Profesional",
    desc: "Formal, Lugas & Terstruktur",
    icon: "fa-solid fa-briefcase",
  },
];

export const Settings: React.FC<SettingsProps> = ({
  settings,
  onUpdateSettings,
  onClose,
  onDeleteHistory,
  onClearMemory,
  onExportData,
}) => {
  const [activeTab, setActiveTab] = useState<"personalization" | "font" | "data-control">(
    "personalization"
  );
  const [fontSearch, setFontSearch] = useState("");
  const [isFontDropdownOpen, setIsFontDropdownOpen] = useState(false);
  const [isToneDropdownOpen, setIsToneDropdownOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const fontDropdownRef = useRef<HTMLDivElement>(null);
  const toneDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        fontDropdownRef.current &&
        !fontDropdownRef.current.contains(e.target as Node)
      ) {
        setIsFontDropdownOpen(false);
      }
      if (
        toneDropdownRef.current &&
        !toneDropdownRef.current.contains(e.target as Node)
      ) {
        setIsToneDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToneChange = (tone: "Default" | "Ramah" | "Profesional") => {
    const updated = { ...settings, toneStyle: tone };
    onUpdateSettings(updated);
  };

  const handleInstructionsChange = (instructions: string) => {
    const updated = { ...settings, customInstructions: instructions };
    onUpdateSettings(updated);
  };

  const handleFontChange = (fontId: string) => {
    const updated = { ...settings, selectedFont: fontId };
    applyAppFont(fontId);
    onUpdateSettings(updated);
  };

  const showNotification = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => {
      setSuccessToast(null);
    }, 3000);
  };

  const handleConfirmDeleteHistory = () => {
    if (onDeleteHistory) {
      onDeleteHistory();
      setIsDeleteModalOpen(false);
      showNotification("Semua riwayat percakapan berhasil dihapus.");
    }
  };

  const handleClearMemoryClick = () => {
    if (onClearMemory) {
      onClearMemory();
      showNotification("Memori perangkat berhasil dikosongkan.");
    }
  };

  const currentFont = settings.selectedFont || "Plus Jakarta Sans";
  const currentTone = settings.toneStyle || "Default";
  const currentInstructions = settings.customInstructions || "";

  const filteredFonts = AVAILABLE_FONTS.filter(
    (f) =>
      f.name.toLowerCase().includes(fontSearch.toLowerCase()) ||
      f.category.toLowerCase().includes(fontSearch.toLowerCase())
  );

  const selectedFontObj =
    AVAILABLE_FONTS.find((f) => f.id === currentFont) || AVAILABLE_FONTS[0];

  const selectedToneObj =
    TONE_OPTIONS.find((t) => t.id === currentTone) || TONE_OPTIONS[0];

  return (
    <div className="flex flex-col h-full w-full bg-white dark:bg-stone-950 text-stone-800 dark:text-stone-200 overflow-hidden font-sans-clean relative">
      {/* Toast Notification */}
      {successToast && (
        <div className="absolute top-4 right-4 z-50 px-4 py-2.5 rounded-2xl bg-emerald-600 text-white text-xs font-medium shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <i className="fa-solid fa-circle-check text-sm"></i>
          <span>{successToast}</span>
        </div>
      )}

      {/* Header Bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-stone-200/80 dark:border-stone-800/80 bg-white/70 dark:bg-stone-900/70 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-transparent hover:bg-stone-200/50 dark:hover:bg-stone-800/50 text-stone-600 dark:text-stone-300 text-xs font-medium transition-colors cursor-pointer"
          >
            <i className="fa-solid fa-arrow-left text-xs"></i>
            <span className="hidden sm:inline">Back</span>
          </button>
          <div>
            <h1 className="text-base font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <i className="fa-solid fa-gear text-amber-500 text-sm"></i>
              Settings
            </h1>
            <p className="text-xs text-stone-500 dark:text-stone-400 hidden sm:block">
              Kelola personalisasi AI, kontrol data percakapan, dan pilihan font tampilan
            </p>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden max-w-6xl w-full mx-auto p-4 md:p-6 gap-6">
        {/* Navigation Sidebar Tabs */}
        <aside className="w-full md:w-64 shrink-0 flex flex-col gap-1.5 border-b md:border-b-0 md:border-r border-stone-200/70 dark:border-stone-800/70 pb-4 md:pb-0 pr-0 md:pr-6">
          <button
            onClick={() => setActiveTab("personalization")}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-medium transition-all cursor-pointer whitespace-nowrap text-left ${
              activeTab === "personalization"
                ? "bg-amber-500 text-white shadow-sm shadow-amber-500/20 font-semibold"
                : "text-stone-600 dark:text-stone-400 hover:bg-stone-200/60 dark:hover:bg-stone-800/60"
            }`}
          >
            <i className="fa-solid fa-sliders text-sm shrink-0"></i>
            <span>Personalization</span>
          </button>

          <button
            onClick={() => setActiveTab("font")}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-medium transition-all cursor-pointer whitespace-nowrap text-left ${
              activeTab === "font"
                ? "bg-amber-500 text-white shadow-sm shadow-amber-500/20 font-semibold"
                : "text-stone-600 dark:text-stone-400 hover:bg-stone-200/60 dark:hover:bg-stone-800/60"
            }`}
          >
            <i className="fa-solid fa-font text-sm shrink-0"></i>
            <span>Font</span>
            <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
              activeTab === "font" ? "bg-white/20 text-white" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
            }`}>
              50
            </span>
          </button>

          <button
            onClick={() => setActiveTab("data-control")}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-medium transition-all cursor-pointer whitespace-nowrap text-left ${
              activeTab === "data-control"
                ? "bg-amber-500 text-white shadow-sm shadow-amber-500/20 font-semibold"
                : "text-stone-600 dark:text-stone-400 hover:bg-stone-200/60 dark:hover:bg-stone-800/60"
            }`}
          >
            <i className="fa-solid fa-database text-sm shrink-0"></i>
            <span>Kontrol Data</span>
          </button>
        </aside>

        {/* Content Panel Area */}
        <main className="flex-1 overflow-y-auto pr-1 space-y-6">
          {/* TAB 1: PERSONALIZATION */}
          {activeTab === "personalization" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-stone-200/80 dark:border-stone-800/80 shadow-xs space-y-5">
                <div>
                  <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                    <i className="fa-solid fa-sliders text-amber-500 text-xs"></i>
                    Gaya Respon & Nada Bahasa
                  </h2>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                    Pilih bagaimana AI menyampaikan jawaban dan informasi kepada Anda.
                  </p>
                </div>

                {/* Tone Selector Dropdown */}
                <div className="space-y-2 max-w-md relative" ref={toneDropdownRef}>
                  <label className="block text-xs font-medium text-stone-700 dark:text-stone-300">
                    Gaya Percakapan
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsToneDropdownOpen(!isToneDropdownOpen)}
                    className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 text-stone-800 dark:text-stone-200 text-xs font-medium hover:bg-stone-100/80 dark:hover:bg-stone-900 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <i className={`${selectedToneObj.icon} text-amber-500 text-xs shrink-0`}></i>
                      <span className="font-semibold text-stone-900 dark:text-stone-100">
                        {selectedToneObj.label}
                      </span>
                      <span className="text-[11px] text-stone-500 font-normal truncate">
                        • {selectedToneObj.desc}
                      </span>
                    </div>
                    <i
                      className={`fa-solid fa-chevron-down text-xs text-stone-400 transition-transform duration-200 ${
                        isToneDropdownOpen ? "rotate-180" : ""
                      }`}
                    ></i>
                  </button>

                  {isToneDropdownOpen && (
                    <div className="absolute left-0 top-full mt-2 w-full rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-1">
                      {TONE_OPTIONS.map((opt) => {
                        const isSelected = opt.id === currentTone;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              handleToneChange(opt.id);
                              setIsToneDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                              isSelected
                                ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold"
                                : "text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <i className={`${opt.icon} text-xs text-amber-500`}></i>
                              <div>
                                <div className="font-semibold">{opt.label}</div>
                                <div className="text-[11px] text-stone-500">{opt.desc}</div>
                              </div>
                            </div>
                            {isSelected && (
                              <i className="fa-solid fa-check text-amber-600 dark:text-amber-400 text-xs"></i>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Custom Instructions */}
                <div className="space-y-2 pt-2">
                  <label className="block text-xs font-medium text-stone-700 dark:text-stone-300">
                    Instruksi Kustom (Custom Instructions)
                  </label>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">
                    Berikan arahan spesifik tentang bagaimana AI harus bertindak, format output yang disukai, atau latar belakang kerja Anda.
                  </p>
                  <textarea
                    rows={4}
                    value={currentInstructions}
                    onChange={(e) => handleInstructionsChange(e.target.value)}
                    placeholder="Contoh: Saya adalah software engineer, jawab ringkas dan sertakan contoh kode TypeScript tanpa basa-basi."
                    className="w-full p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 text-stone-800 dark:text-stone-200 text-xs focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FONT (50 CURATED FONTS) */}
          {activeTab === "font" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-stone-200/80 dark:border-stone-800/80 shadow-xs space-y-5">
                <div>
                  <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                    <i className="fa-solid fa-font text-amber-500 text-xs"></i>
                    Pilihan Font Antarmuka
                  </h2>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                    Pilih dari 50 koleksi font modern untuk mengubah tipografi seluruh aplikasi secara instan.
                  </p>
                </div>

                {/* Searchable Font Selector Dropdown */}
                <div className="space-y-2 max-w-md relative" ref={fontDropdownRef}>
                  <label className="block text-xs font-medium text-stone-700 dark:text-stone-300">
                    Pilih Font Antarmuka (50 Pilihan)
                  </label>

                  <button
                    type="button"
                    onClick={() => setIsFontDropdownOpen(!isFontDropdownOpen)}
                    className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 text-stone-800 dark:text-stone-200 text-xs font-medium hover:bg-stone-100/80 dark:hover:bg-stone-900 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <i className="fa-solid fa-font text-amber-500 text-xs shrink-0"></i>
                      <span className="font-semibold text-stone-900 dark:text-stone-100 truncate">
                        {selectedFontObj?.name}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-200/80 dark:bg-stone-800 text-stone-600 dark:text-stone-400 font-normal shrink-0">
                        {selectedFontObj?.category}
                      </span>
                    </div>
                    <i
                      className={`fa-solid fa-chevron-down text-xs text-stone-400 transition-transform duration-200 ${
                        isFontDropdownOpen ? "rotate-180" : ""
                      }`}
                    ></i>
                  </button>

                  {isFontDropdownOpen && (
                    <div className="absolute left-0 top-full mt-2 w-full rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                      <div className="p-2 border-b border-stone-100 dark:border-stone-800 flex items-center gap-2 bg-stone-50/50 dark:bg-stone-950/50">
                        <i className="fa-solid fa-magnifying-glass text-xs text-stone-400 pl-2"></i>
                        <input
                          type="text"
                          value={fontSearch}
                          onChange={(e) => setFontSearch(e.target.value)}
                          placeholder="Cari font (50 pilihan)..."
                          className="w-full bg-transparent text-xs text-stone-800 dark:text-stone-200 outline-none py-1.5 px-1 placeholder:text-stone-400"
                          autoFocus
                        />
                        {fontSearch && (
                          <button
                            type="button"
                            onClick={() => setFontSearch("")}
                            className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 pr-2 text-xs cursor-pointer"
                          >
                            <i className="fa-solid fa-xmark"></i>
                          </button>
                        )}
                      </div>

                      <div className="max-h-64 overflow-y-auto p-1.5 space-y-0.5">
                        {filteredFonts.length === 0 ? (
                          <div className="p-4 text-center text-xs text-stone-400">
                            Font tidak ditemukan
                          </div>
                        ) : (
                          filteredFonts.map((font) => {
                            const isSelected = font.id === currentFont;
                            return (
                              <button
                                key={font.id}
                                type="button"
                                onClick={() => {
                                  handleFontChange(font.id);
                                  setIsFontDropdownOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                                  isSelected
                                    ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold"
                                    : "text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
                                }`}
                              >
                                <span
                                  style={{ fontFamily: `'${font.id}', sans-serif` }}
                                  className="truncate pr-2"
                                >
                                  {font.name}
                                </span>
                                <span className="text-[10px] px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800/80 text-stone-500 dark:text-stone-400 shrink-0">
                                  {font.category}
                                </span>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Live Font Typography Preview Box */}
                <div className="mt-6 p-6 rounded-2xl bg-stone-50 dark:bg-stone-950/80 border border-stone-200/80 dark:border-stone-800/80 space-y-3">
                  <div className="flex items-center justify-between text-xs text-stone-400 dark:text-stone-500">
                    <span className="uppercase font-semibold tracking-wider text-[11px]">
                      Preview Tipografi
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono text-[11px]">
                      {currentFont}
                    </span>
                  </div>

                  <h3
                    style={{ fontFamily: `'${currentFont}', sans-serif` }}
                    className="text-lg sm:text-xl font-bold text-stone-900 dark:text-stone-100"
                  >
                    Groky AI — Clean & Intelligent Architecture
                  </h3>

                  <p
                    style={{ fontFamily: `'${currentFont}', sans-serif` }}
                    className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-relaxed"
                  >
                    Setiap interaksi terasa lebih elegan dengan tipografi presisi. Font ini langsung diterapkan ke seluruh elemen antarmuka.
                  </p>

                  <div className="pt-2 flex flex-wrap gap-2">
                    <button
                      style={{ fontFamily: `'${currentFont}', sans-serif` }}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-500 text-white text-xs font-semibold"
                    >
                      Tombol Utama
                    </button>
                    <button
                      style={{ fontFamily: `'${currentFont}', sans-serif` }}
                      className="px-3.5 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-medium"
                    >
                      Tombol Sekunder
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: KONTROL DATA */}
          {activeTab === "data-control" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Delete History Chat Card */}
              <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-stone-200/80 dark:border-stone-800/80 shadow-xs space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h2 className="text-sm font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                      <i className="fa-solid fa-trash-can text-xs"></i>
                      Delete History Chat
                    </h2>
                    <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                      Hapus semua riwayat obrolan dan pesan dari penyimpanan lokal perangkat ini. Tindakan ini akan mengosongkan seluruh riwayat dan menyegarkan percakapan.
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end border-t border-stone-100 dark:border-stone-800">
                  <button
                    type="button"
                    onClick={() => setIsDeleteModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <i className="fa-solid fa-trash-can text-xs"></i>
                    <span>Delete History Chat</span>
                  </button>
                </div>
              </div>

              {/* Clear Device Memory Card */}
              <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-stone-200/80 dark:border-stone-800/80 shadow-xs space-y-4">
                <div className="space-y-1">
                  <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                    <i className="fa-solid fa-memory text-amber-500 text-xs"></i>
                    Bersihkan Memori Perangkat
                  </h2>
                  <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                    Hapus catatan preferensi dan memori jangka panjang yang disimpan oleh AI untuk perangkat Anda.
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-stone-100 dark:border-stone-800">
                  <div className="text-[11px] text-stone-400">
                    Memori kunci-nilai perangkat lokal
                  </div>
                  <button
                    type="button"
                    onClick={handleClearMemoryClick}
                    className="px-4 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <i className="fa-solid fa-broom text-xs"></i>
                    <span>Bersihkan Memori</span>
                  </button>
                </div>
              </div>

              {/* Export Chat History */}
              {onExportData && (
                <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-stone-200/80 dark:border-stone-800/80 shadow-xs space-y-4">
                  <div className="space-y-1">
                    <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                      <i className="fa-solid fa-file-export text-amber-500 text-xs"></i>
                      Ekspor Data Cadangan
                    </h2>
                    <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                      Unduh seluruh berkas riwayat obrolan dalam format JSON untuk cadangan pribadi Anda.
                    </p>
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-stone-100 dark:border-stone-800">
                    <div className="text-[11px] text-stone-400">
                      Cadangan terenkripsi lokal
                    </div>
                    <button
                      type="button"
                      onClick={onExportData}
                      className="px-4 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-2"
                    >
                      <i className="fa-solid fa-download text-xs"></i>
                      <span>Ekspor Riwayat Chat</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* CONFIRMATION MODAL FOR DELETE HISTORY */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-sm rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto text-xl">
              <i className="fa-solid fa-trash-can"></i>
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                Hapus Semua Riwayat Chat?
              </h3>
              <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                Apakah Anda yakin ingin menghapus semua riwayat percakapan secara permanen? Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleConfirmDeleteHistory}
                className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-trash-can text-xs"></i>
                <span>Ya, Hapus Semua Riwayat</span>
              </button>
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="w-full py-2 px-4 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 font-medium text-xs hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors cursor-pointer"
              >
                Batalkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
