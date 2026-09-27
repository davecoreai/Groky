import React, { useState } from "react";
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

type SettingPageId = "personalization" | "font" | "data-control" | "about";

interface SettingMenuCategory {
  id: SettingPageId;
  label: string;
  description: string;
  icon: string;
  badge?: string;
  colorClass: string;
}

const SETTING_CATEGORIES: SettingMenuCategory[] = [
  {
    id: "personalization",
    label: "Personalisasi & Gaya AI",
    description: "Atur gaya respon, nada bahasa, dan instruksi kustom AI",
    icon: "fa-solid fa-sliders",
    colorClass: "text-amber-500 bg-amber-500/10",
  },
  {
    id: "font",
    label: "Tipografi & Font",
    description: "Koleksi 50 font elegan untuk seluruh antarmuka",
    icon: "fa-solid fa-font",
    badge: "50 Font",
    colorClass: "text-indigo-500 bg-indigo-500/10",
  },
  {
    id: "data-control",
    label: "Kontrol Data & Privasi",
    description: "Hapus riwayat obrolan, bersihkan memori, dan ekspor data",
    icon: "fa-solid fa-database",
    colorClass: "text-rose-500 bg-rose-500/10",
  },
  {
    id: "about",
    label: "Tentang Groky AI",
    description: "Informasi versi, arsitektur multi-agent, dan status sistem",
    icon: "fa-solid fa-circle-info",
    colorClass: "text-stone-500 bg-stone-500/10",
  },
];

const TONE_OPTIONS: { id: "Default" | "Ramah" | "Profesional"; label: string; desc: string; icon: string }[] = [
  {
    id: "Default",
    label: "Default & Seimbang",
    desc: "Gaya netral, ringkas, dan fokus pada solusi akurat",
    icon: "fa-solid fa-scale-balanced",
  },
  {
    id: "Ramah",
    label: "Ramah & Interaktif",
    desc: "Hangat, komunikatif, empatis, dan santai",
    icon: "fa-solid fa-face-smile",
  },
  {
    id: "Profesional",
    label: "Profesional & Formal",
    desc: "Lugas, terstruktur, mendalam, dan menggunakan istilah teknis tepat",
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
  // Current view: null means Main Vertical Menu, SettingPageId means Dedicated Fullscreen Page
  const [activeSubpage, setActiveSubpage] = useState<SettingPageId | null>(null);

  // Smooth close & transition states
  const [isClosing, setIsClosing] = useState(false);
  const [isExitingSubpage, setIsExitingSubpage] = useState(false);

  const [fontSearch, setFontSearch] = useState("");
  const [fontCategoryFilter, setFontCategoryFilter] = useState<string>("All");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Animated close handler for returning to chat
  const handleAnimatedClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 200);
  };

  // Animated back to menu handler
  const handleAnimatedBackToMenu = () => {
    if (isExitingSubpage) return;
    setIsExitingSubpage(true);
    setTimeout(() => {
      setActiveSubpage(null);
      setIsExitingSubpage(false);
    }, 150);
  };

  const showNotification = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => {
      setSuccessToast(null);
    }, 3000);
  };

  const handleToneChange = (tone: "Default" | "Ramah" | "Profesional") => {
    const updated = { ...settings, toneStyle: tone };
    onUpdateSettings(updated);
    showNotification(`Gaya respon diubah ke "${tone}"`);
  };

  const handleInstructionsChange = (instructions: string) => {
    const updated = { ...settings, customInstructions: instructions };
    onUpdateSettings(updated);
  };

  const handleFontChange = (fontId: string) => {
    const updated = { ...settings, selectedFont: fontId };
    applyAppFont(fontId);
    onUpdateSettings(updated);
    showNotification(`Font aplikasi diubah ke "${fontId}"`);
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

  const fontCategories = ["All", ...Array.from(new Set(AVAILABLE_FONTS.map((f) => f.category)))];

  const filteredFonts = AVAILABLE_FONTS.filter((f) => {
    const matchesSearch =
      f.name.toLowerCase().includes(fontSearch.toLowerCase()) ||
      f.category.toLowerCase().includes(fontSearch.toLowerCase());
    const matchesCategory =
      fontCategoryFilter === "All" || f.category === fontCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  const selectedToneObj =
    TONE_OPTIONS.find((t) => t.id === currentTone) || TONE_OPTIONS[0];

  const activeCategoryObj = SETTING_CATEGORIES.find((c) => c.id === activeSubpage);

  // =========================================================================
  // VIEW 1: DEDICATED FULLSCREEN SUBPAGE FOR A SPECIFIC SETTING
  // =========================================================================
  if (activeSubpage) {
    return (
      <div
        className={`fixed inset-0 z-50 flex flex-col h-full w-full bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 overflow-hidden font-sans-clean select-none transition-all duration-200 ${
          isClosing
            ? "opacity-0 scale-[0.98] translate-y-3 pointer-events-none ease-in"
            : isExitingSubpage
            ? "opacity-0 translate-x-4 ease-in"
            : "animate-in fade-in zoom-in-[0.99] duration-200 ease-out"
        }`}
      >
        {/* Toast Notification */}
        {successToast && (
          <div className="fixed top-5 right-5 z-50 px-4 py-2.5 rounded-2xl bg-stone-900 text-white text-xs font-semibold shadow-2xl flex items-center gap-2 border border-stone-700 animate-in fade-in slide-in-from-top-2 duration-200">
            <i className="fa-solid fa-circle-check text-amber-400 text-sm"></i>
            <span>{successToast}</span>
          </div>
        )}

        {/* Confirmation Modal for Delete History */}
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="w-full max-w-md rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6 space-y-4 shadow-2xl">
              <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-lg">
                  <i className="fa-solid fa-triangle-exclamation"></i>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                    Hapus Semua Riwayat Chat?
                  </h3>
                  <p className="text-xs text-stone-500">Tindakan ini tidak dapat dibatalkan</p>
                </div>
              </div>

              <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                Semua percakapan yang tersimpan di perangkat ini dan disinkronkan ke akun Anda akan dihapus secara permanen.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteHistory}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  Ya, Hapus Semua
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dedicated Page Top Navbar */}
        <header className="flex items-center justify-between px-4 sm:px-8 py-3.5 border-b border-stone-200/90 dark:border-stone-800/90 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md shrink-0 sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <button
              onClick={handleAnimatedBackToMenu}
              className="flex items-center justify-center w-9 h-9 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-sm font-semibold transition-all cursor-pointer shadow-xs border border-stone-200 dark:border-stone-700 active:scale-95"
              title="Kembali ke Pengaturan"
              aria-label="Kembali ke Pengaturan"
            >
              <i className="fa-solid fa-arrow-left text-xs"></i>
            </button>

            <div className="h-4 w-px bg-stone-200 dark:bg-stone-800"></div>

            <div className="flex items-center gap-2">
              <i className={`${activeCategoryObj?.icon} text-amber-500 text-xs`}></i>
              <h1 className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100">
                {activeCategoryObj?.label}
              </h1>
            </div>
          </div>

          <button
            onClick={handleAnimatedClose}
            className="flex items-center justify-center w-9 h-9 rounded-xl text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 text-sm font-medium transition-all cursor-pointer active:scale-95"
            title="Tutup Pengaturan"
            aria-label="Tutup Pengaturan"
          >
            <i className="fa-solid fa-xmark text-xs"></i>
          </button>
        </header>

        {/* Dedicated Page Fullscreen Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="max-w-3xl mx-auto space-y-6 pb-24">
            {/* SUBPAGE 1: PERSONALISASI & GAYA RESPON AI */}
            {activeSubpage === "personalization" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="space-y-1">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-stone-900 dark:text-stone-100 font-serif-editorial">
                    Personalisasi & Gaya Percakapan
                  </h2>
                  <p className="text-xs sm:text-sm text-stone-500 leading-relaxed">
                    Sesuaikan karakteristik jawaban, nada bahasa, dan instruksi sistem kustom AI.
                  </p>
                </div>

                {/* Gaya Bahasa Cards */}
                <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-stone-200/80 dark:border-stone-800/80 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900 dark:text-stone-100">
                        Gaya & Nada Komunikasi AI
                      </h3>
                      <p className="text-xs text-stone-500 mt-0.5">
                        Pilih nada yang paling sesuai dengan preferensi Anda.
                      </p>
                    </div>
                    <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                      Aktif: {selectedToneObj.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    {TONE_OPTIONS.map((tone) => {
                      const isSelected = tone.id === currentTone;
                      return (
                        <button
                          key={tone.id}
                          type="button"
                          onClick={() => handleToneChange(tone.id)}
                          className={`p-4 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                            isSelected
                              ? "bg-amber-500/10 border-amber-500 text-stone-900 dark:text-stone-100 shadow-xs ring-1 ring-amber-500"
                              : "bg-stone-50 dark:bg-stone-800/50 border-stone-200 dark:border-stone-700/80 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <i className={`${tone.icon} text-lg ${isSelected ? "text-amber-600 dark:text-amber-400" : "text-stone-400"}`}></i>
                            {isSelected && (
                              <i className="fa-solid fa-circle-check text-amber-600 dark:text-amber-400 text-sm"></i>
                            )}
                          </div>
                          <div>
                            <div className="text-xs font-bold">{tone.label}</div>
                            <div className="text-[11px] text-stone-500 mt-0.5 leading-snug">{tone.desc}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Instructions */}
                <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-stone-200/80 dark:border-stone-800/80 shadow-xs space-y-3">
                  <div className="flex items-center gap-2">
                    <i className="fa-solid fa-pen-nib text-amber-500 text-xs"></i>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900 dark:text-stone-100">
                      Instruksi Sistem Kustom
                    </h3>
                  </div>
                  <p className="text-xs text-stone-500 leading-relaxed">
                    Berikan instruksi permanen tentang bagaimana AI harus bertindak, format output yang disukai, atau latar belakang kerja Anda.
                  </p>

                  <textarea
                    rows={5}
                    value={currentInstructions}
                    onChange={(e) => handleInstructionsChange(e.target.value)}
                    placeholder="Tulis instruksi khusus untuk AI di sini..."
                    className="w-full p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 text-xs focus:outline-none focus:border-amber-500 transition-colors leading-relaxed"
                  />
                </div>
              </div>
            )}

            {/* SUBPAGE 2: TIPOGRAFI & 50 PILIHAN FONT */}
            {activeSubpage === "font" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="space-y-1">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-stone-900 dark:text-stone-100 font-serif-editorial">
                    Tipografi & Pilihan Font
                  </h2>
                  <p className="text-xs sm:text-sm text-stone-500 leading-relaxed">
                    Ganti gaya tulisan antarmuka secara instan dari koleksi font profesional pilihan.
                  </p>
                </div>

                {/* Font Search & Category Filter */}
                <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-stone-200/80 dark:border-stone-800/80 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-3.5 text-stone-400 text-xs"></i>
                      <input
                        type="text"
                        value={fontSearch}
                        onChange={(e) => setFontSearch(e.target.value)}
                        placeholder="Cari font..."
                        className="w-full pl-10 pr-4 py-2.5 text-xs rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 focus:outline-none focus:border-amber-500 text-stone-900 dark:text-stone-100"
                      />
                    </div>

                    <div className="flex gap-1.5 overflow-x-auto pb-1 shrink-0">
                      {fontCategories.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setFontCategoryFilter(cat)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                            fontCategoryFilter === cat
                              ? "bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 shadow-xs"
                              : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Font Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[480px] overflow-y-auto p-1">
                    {filteredFonts.map((font) => {
                      const isSelected = font.id === currentFont;
                      return (
                        <button
                          key={font.id}
                          type="button"
                          onClick={() => handleFontChange(font.id)}
                          className={`p-3.5 rounded-2xl text-left border transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? "bg-amber-500/10 border-amber-500 text-stone-900 dark:text-stone-100 shadow-xs ring-1 ring-amber-500"
                              : "bg-stone-50 dark:bg-stone-800/40 border-stone-200/80 dark:border-stone-800 hover:border-amber-500/40 text-stone-700 dark:text-stone-300"
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <div
                              style={{ fontFamily: `'${font.id}', sans-serif` }}
                              className="text-sm font-bold truncate"
                            >
                              {font.name}
                            </div>
                            <div className="text-[10px] text-stone-400 mt-0.5">
                              {font.category} • The quick brown fox jumps over the lazy dog
                            </div>
                          </div>

                          {isSelected ? (
                            <span className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs shrink-0">
                              <i className="fa-solid fa-check"></i>
                            </span>
                          ) : (
                            <span className="text-[11px] text-stone-400 hover:text-amber-500 shrink-0 font-medium">
                              Terapkan
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Live Typography Preview Box */}
                <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-stone-200/80 dark:border-stone-800/80 shadow-xs space-y-3">
                  <div className="flex items-center justify-between text-xs text-stone-400">
                    <span className="uppercase font-bold tracking-wider text-[11px]">
                      Live Typography Preview
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 font-mono text-[11px] font-bold">
                      {currentFont}
                    </span>
                  </div>

                  <h3
                    style={{ fontFamily: `'${currentFont}', sans-serif` }}
                    className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100"
                  >
                    Groky AI — Cerdas, Cepat, dan Presisi
                  </h3>

                  <p
                    style={{ fontFamily: `'${currentFont}', sans-serif` }}
                    className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed"
                  >
                    Antarmuka didesain untuk kenyamanan visual maksimal dalam menulis kode, berdiskusi, dan memecahkan tantangan teknologi setiap hari.
                  </p>
                </div>
              </div>
            )}

            {/* SUBPAGE 3: KONTROL DATA & PRIVASI */}
            {activeSubpage === "data-control" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="space-y-1">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-stone-900 dark:text-stone-100 font-serif-editorial">
                    Kontrol Data & Privasi
                  </h2>
                  <p className="text-xs sm:text-sm text-stone-500 leading-relaxed">
                    Kelola data penyimpanan lokal, bersihkan riwayat obrolan, dan lakukan ekspor data arsip Anda.
                  </p>
                </div>

                {/* Delete History Card */}
                <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-stone-200/80 dark:border-stone-800/80 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                        <i className="fa-solid fa-trash-can text-xs"></i>
                        <span>Hapus Semua Riwayat Chat</span>
                      </h3>
                      <p className="text-xs text-stone-500 leading-relaxed">
                        Menghapus seluruh daftar percakapan dan pesan dari memori perangkat secara permanen.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsDeleteModalOpen(true)}
                      className="px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0"
                    >
                      Hapus Riwayat
                    </button>
                  </div>
                </div>

                {/* Clear Device Memory Card */}
                <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-stone-200/80 dark:border-stone-800/80 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                        <i className="fa-solid fa-memory text-amber-500 text-xs"></i>
                        <span>Bersihkan Memori Jangka Panjang Perangkat</span>
                      </h3>
                      <p className="text-xs text-stone-500 leading-relaxed">
                        Menghapus catatan preferensi, konteks pengguna, dan memori kunci-nilai yang disimpan oleh AI untuk perangkat Anda.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleClearMemoryClick}
                      className="px-4 py-2.5 rounded-2xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-bold transition-colors cursor-pointer shrink-0"
                    >
                      Bersihkan Memori
                    </button>
                  </div>
                </div>

                {/* Export Data Card */}
                {onExportData && (
                  <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-stone-200/80 dark:border-stone-800/80 shadow-xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                          <i className="fa-solid fa-file-export text-emerald-500 text-xs"></i>
                          <span>Ekspor Cadangan Obrolan</span>
                        </h3>
                        <p className="text-xs text-stone-500 leading-relaxed">
                          Unduh seluruh riwayat obrolan dan konfigurasi Anda dalam format berkas JSON untuk arsip offline.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={onExportData}
                        className="px-4 py-2.5 rounded-2xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-bold transition-colors cursor-pointer shrink-0"
                      >
                        Ekspor JSON
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SUBPAGE 4: TENTANG GROKY AI & SISTEM */}
            {activeSubpage === "about" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="space-y-1">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-stone-900 dark:text-stone-100 font-serif-editorial">
                    Tentang Groky AI
                  </h2>
                  <p className="text-xs sm:text-sm text-stone-500 leading-relaxed">
                    Platform asisten kecerdasan buatan cerdas dengan arsitektur multi-agent terintegrasi.
                  </p>
                </div>

                <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-stone-200/80 dark:border-stone-800/80 shadow-xs space-y-5">
                  <div className="flex items-center gap-4">
                    <img
                      src="https://i.imgur.com/qA2EE5o.jpeg"
                      alt="Groky AI"
                      className="w-14 h-14 rounded-2xl object-cover shadow-sm border border-stone-200 dark:border-stone-700"
                    />
                    <div>
                      <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                        Groky AI Assistant
                      </h3>
                      <p className="text-xs text-stone-500 mt-0.5">
                        Versi 3.5.0 • Multi-Agent Gateway Architecture
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                    <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200/80 dark:border-stone-700/80 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-stone-400">Default Model</span>
                      <div className="font-bold text-stone-900 dark:text-stone-100">Qwen 3.8 27B / Claude / Gemini</div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200/80 dark:border-stone-700/80 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-stone-400">Rendering Engine</span>
                      <div className="font-bold text-stone-900 dark:text-stone-100">React 19 + Tailwind CSS</div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200/80 dark:border-stone-700/80 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-stone-400">Streaming Protocol</span>
                      <div className="font-bold text-stone-900 dark:text-stone-100">Server-Sent Events</div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200/80 dark:border-stone-700/80 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-stone-400">Domain Resmi</span>
                      <div className="font-bold text-amber-600 dark:text-amber-400">grokyai.web.id</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: MAIN VERTICAL SETTINGS MENU (CLEAN FULLSCREEN LIST)
  // =========================================================================
  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col h-full w-full bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 overflow-hidden font-sans-clean select-none transition-all duration-200 ${
        isClosing
          ? "opacity-0 scale-[0.98] translate-y-3 pointer-events-none ease-in"
          : "animate-in fade-in zoom-in-[0.99] duration-200 ease-out"
      }`}
    >
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-5 right-5 z-50 px-4 py-2.5 rounded-2xl bg-stone-900 text-white text-xs font-semibold shadow-2xl flex items-center gap-2 border border-stone-700 animate-in fade-in slide-in-from-top-2 duration-200">
          <i className="fa-solid fa-circle-check text-amber-400 text-sm"></i>
          <span>{successToast}</span>
        </div>
      )}

      {/* Top Navbar Header (Clean & Minimalist Icon Only) */}
      <header className="flex items-center justify-between px-4 sm:px-8 py-3.5 border-b border-stone-200/90 dark:border-stone-800/90 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md shrink-0 sticky top-0 z-40">
        <button
          onClick={handleAnimatedClose}
          className="flex items-center justify-center w-9 h-9 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-sm font-semibold transition-all cursor-pointer shadow-xs border border-stone-200 dark:border-stone-700 active:scale-95"
          title="Kembali ke Obrolan"
          aria-label="Kembali ke Obrolan"
        >
          <i className="fa-solid fa-arrow-left text-xs"></i>
        </button>
      </header>

      {/* Main Fullscreen Vertical List Body */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-8">
        <div className="max-w-2xl mx-auto space-y-3 pb-20 pt-2">
          {/* Vertical Settings Cards List */}
          {SETTING_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveSubpage(cat.id)}
              className="w-full flex items-center justify-between p-4 sm:p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800/90 hover:border-amber-500/50 dark:hover:border-amber-500/50 hover:shadow-md transition-all cursor-pointer text-left group active:scale-[0.99]"
            >
              <div className="flex items-center gap-4 min-w-0 pr-3">
                <div
                  className={`flex items-center justify-center w-12 h-12 rounded-2xl text-xl shrink-0 ${cat.colorClass} group-hover:scale-105 transition-transform`}
                >
                  <i className={cat.icon}></i>
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors truncate">
                      {cat.label}
                    </h2>
                    {cat.badge && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 shrink-0">
                        {cat.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 line-clamp-1">
                    {cat.description}
                  </p>
                </div>
              </div>

              {/* Right Action Chevron */}
              <div className="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-400 group-hover:text-stone-900 dark:group-hover:text-white group-hover:bg-amber-500/10 group-hover:translate-x-1 transition-all shrink-0">
                <i className="fa-solid fa-chevron-right text-xs"></i>
              </div>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
};
