import React, { useState, useRef, useEffect } from "react";
import { UserSettings } from "../types";
import { AVAILABLE_FONTS, applyAppFont } from "../lib/storage";

interface SettingsProps {
  settings: UserSettings;
  onUpdateSettings: (newSettings: UserSettings) => void;
  onClose: () => void;
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
}) => {
  const [activeTab, setActiveTab] = useState<"personalization" | "plugin" | "font">(
    "personalization"
  );
  const [fontSearch, setFontSearch] = useState("");
  const [isFontDropdownOpen, setIsFontDropdownOpen] = useState(false);
  const [isToneDropdownOpen, setIsToneDropdownOpen] = useState(false);

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
    <div className="flex flex-col h-full w-full bg-[#FAF8F5] dark:bg-stone-950 text-stone-800 dark:text-stone-200 overflow-hidden font-sans-clean">
      {/* Header Bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-stone-200/80 dark:border-stone-800/80 bg-white/70 dark:bg-stone-900/70 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-4">
          {/* Transparent Back Button */}
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
              Kelola gaya personalisasi AI, ekstensi plugin, dan tampilan font antarmuka
            </p>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden max-w-6xl w-full mx-auto p-4 md:p-6 gap-6">
        {/* Navigation Sidebar Tabs - Always Vertical */}
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
            onClick={() => setActiveTab("plugin")}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-medium transition-all cursor-pointer whitespace-nowrap text-left ${
              activeTab === "plugin"
                ? "bg-amber-500 text-white shadow-sm shadow-amber-500/20 font-semibold"
                : "text-stone-600 dark:text-stone-400 hover:bg-stone-200/60 dark:hover:bg-stone-800/60"
            }`}
          >
            <i className="fa-solid fa-puzzle-piece text-sm shrink-0"></i>
            <span>Plugin</span>
            <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-stone-200 dark:bg-stone-800 text-stone-500 dark:text-stone-400">
              Soon
            </span>
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
            <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono">
              20
            </span>
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
                    <i className="fa-solid fa-wand-magic-sparkles text-amber-500 text-xs"></i>
                    Gaya dan Nada Dasar
                  </h2>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                    Atur karakter suara dan nada penyampaian AI dalam merespon pesan Anda.
                  </p>
                </div>

                {/* Gaya Bicara AI Dropdown Selector */}
                <div className="space-y-2 max-w-md relative" ref={toneDropdownRef}>
                  <label className="block text-xs font-medium text-stone-700 dark:text-stone-300">
                    Pilih Gaya Bicara AI
                  </label>

                  {/* Trigger Button */}
                  <button
                    type="button"
                    onClick={() => setIsToneDropdownOpen(!isToneDropdownOpen)}
                    className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 text-stone-800 dark:text-stone-200 text-xs font-medium hover:bg-stone-100/80 dark:hover:bg-stone-900 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <i className={`${selectedToneObj.icon} text-amber-500 text-xs shrink-0`}></i>
                      <span className="font-semibold text-stone-900 dark:text-stone-100 truncate">
                        {selectedToneObj.label}
                      </span>
                    </div>
                    <i
                      className={`fa-solid fa-chevron-down text-xs text-stone-400 transition-transform duration-200 ${
                        isToneDropdownOpen ? "rotate-180" : ""
                      }`}
                    ></i>
                  </button>

                  {/* Dropdown Options */}
                  {isToneDropdownOpen && (
                    <div className="absolute left-0 top-full mt-2 w-full rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 shadow-xl z-50 overflow-hidden p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                      {TONE_OPTIONS.map((tone) => {
                        const isSelected = tone.id === currentTone;
                        return (
                          <button
                            key={tone.id}
                            type="button"
                            onClick={() => {
                              handleToneChange(tone.id);
                              setIsToneDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                              isSelected
                                ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold"
                                : "text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <i className={`${tone.icon} text-amber-500 text-xs`}></i>
                              <span className="font-medium text-stone-900 dark:text-stone-100">
                                {tone.label}
                              </span>
                            </div>
                            {isSelected && (
                              <i className="fa-solid fa-check text-xs text-amber-600 dark:text-amber-400"></i>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Live Preview Box for Tone */}
                <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-950/60 border border-stone-200/60 dark:border-stone-800/60 text-xs space-y-2">
                  <div className="text-[11px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider">
                    Contoh Respon AI
                  </div>
                  <p className="text-stone-700 dark:text-stone-300 italic">
                    {currentTone === "Ramah" &&
                      '"Halo! Senang sekali bisa membantu kamu hari ini. Yuk tanyakan apa saja, nanti kita bahas bersama secara ramah dan santai ya!"'}
                    {currentTone === "Profesional" &&
                      '"Tentu. Saya akan memberikan solusi terstruktur dan sistematis sesuai dengan kebutuhan Anda secara efisien dan tepat sasaran."'}
                    {currentTone === "Default" &&
                      '"Tentu! Saya siap membantu Anda mendiskusikan ide, membuat konten, atau memecahkan masalah dengan cepat dan intuitif."'}
                  </p>
                </div>
              </div>

              {/* Custom Instructions */}
              <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-stone-200/80 dark:border-stone-800/80 shadow-xs space-y-5">
                <div>
                  <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                    <i className="fa-solid fa-note-sticky text-amber-500 text-xs"></i>
                    Instruksi Khusus
                  </h2>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                    Masukkan instruksi tetap yang ingin selalu dipatuhi oleh AI pada setiap percakapan.
                  </p>
                </div>

                <div className="space-y-2">
                  <textarea
                    value={currentInstructions}
                    onChange={(e) => handleInstructionsChange(e.target.value)}
                    rows={5}
                    placeholder="Contoh: Selalu jawab dalam Bahasa Indonesia yang ringkas, berikan poin-poin penting, dan hindari kata-kata berbelit-belit."
                    className="w-full px-4 py-3 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 text-stone-800 dark:text-stone-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-amber-500/50 resize-y"
                  ></textarea>
                </div>

                <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
                  <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <i className="fa-solid fa-circle-check text-[10px]"></i>
                    Tersimpan secara otomatis
                  </span>
                  <span>
                    {currentInstructions.length} karakter
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PLUGIN */}
          {activeTab === "plugin" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="bg-white dark:bg-stone-900 rounded-3xl p-8 border border-stone-200/80 dark:border-stone-800/80 shadow-xs text-center space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto text-2xl">
                  <i className="fa-solid fa-puzzle-piece"></i>
                </div>
                <div>
                  <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold uppercase tracking-wider">
                    Coming Soon
                  </span>
                  <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100 mt-3">
                    Ekstensi & Plugin Integrasi
                  </h2>
                  <p className="text-xs text-stone-500 dark:text-stone-400 max-w-md mx-auto mt-2 leading-relaxed">
                    Fitur plugin sedang dalam tahap pengembangan aktif. Mendatang Anda dapat menghubungkan AI ke berbagai alat pihak ketiga.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto pt-4">
                  <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-950/60 border border-stone-200/60 dark:border-stone-800/60 text-left flex items-center gap-3 opacity-60">
                    <i className="fa-solid fa-globe text-amber-500 text-base"></i>
                    <div>
                      <div className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                        Web Browsing Plugin
                      </div>
                      <div className="text-[11px] text-stone-500">
                        Pencarian informasi langsung di internet
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-950/60 border border-stone-200/60 dark:border-stone-800/60 text-left flex items-center gap-3 opacity-60">
                    <i className="fa-solid fa-code text-amber-500 text-base"></i>
                    <div>
                      <div className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                        Code Interpreter
                      </div>
                      <div className="text-[11px] text-stone-500">
                        Eksekusi skrip dan analisis data
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-950/60 border border-stone-200/60 dark:border-stone-800/60 text-left flex items-center gap-3 opacity-60">
                    <i className="fa-solid fa-database text-amber-500 text-base"></i>
                    <div>
                      <div className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                        Supabase DB Plugin
                      </div>
                      <div className="text-[11px] text-stone-500">
                        Penyimpanan database terhubung
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-950/60 border border-stone-200/60 dark:border-stone-800/60 text-left flex items-center gap-3 opacity-60">
                    <i className="fa-solid fa-bolt text-amber-500 text-base"></i>
                    <div>
                      <div className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                        Custom Webhooks
                      </div>
                      <div className="text-[11px] text-stone-500">
                        Integrasi API kustom
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: FONT */}
          {activeTab === "font" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-stone-200/80 dark:border-stone-800/80 shadow-xs space-y-5">
                <div>
                  <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                    <i className="fa-solid fa-font text-amber-500 text-xs"></i>
                    Pilihan Font Antarmuka
                  </h2>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                    Ubah gaya font seluruh antarmuka aplikasi secara langsung dengan 20 pilihan font terbaik.
                  </p>
                </div>

                {/* Searchable Font Selector Dropdown */}
                <div className="space-y-2 max-w-md relative" ref={fontDropdownRef}>
                  <label className="block text-xs font-medium text-stone-700 dark:text-stone-300">
                    Pilih Font Antarmuka
                  </label>

                  {/* Trigger Button */}
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

                  {/* Searchable Dropdown Overlay */}
                  {isFontDropdownOpen && (
                    <div className="absolute left-0 top-full mt-2 w-full rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                      {/* Search Bar */}
                      <div className="p-2 border-b border-stone-100 dark:border-stone-800 flex items-center gap-2 bg-stone-50/50 dark:bg-stone-950/50">
                        <i className="fa-solid fa-magnifying-glass text-xs text-stone-400 pl-2"></i>
                        <input
                          type="text"
                          value={fontSearch}
                          onChange={(e) => setFontSearch(e.target.value)}
                          placeholder="Search font..."
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

                      {/* Font List */}
                      <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5">
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
                    Groky AI — Smart Interactive Assistant
                  </h3>

                  <p
                    style={{ fontFamily: `'${currentFont}', sans-serif` }}
                    className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-relaxed"
                  >
                    Nikmati pengalaman berinteraksi dengan kecerdasan buatan yang responsif, bersih, dan cepat. Font ini akan diterapkan ke seluruh tombol, navigasi, dan teks percakapan.
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
        </main>
      </div>
    </div>
  );
};
