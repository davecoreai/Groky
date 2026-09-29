import React, { useState, useRef } from "react";
import { UserSettings, UserAuth, SubscriptionTier } from "../types";
import { AVAILABLE_FONTS, applyAppFont, getDeviceId, getSubscriptionPlan, saveSubscriptionPlan, getAccountSubscriptionRecord } from "../lib/storage";
import { updateUserAvatar } from "../lib/firebase";
import { SubscriptionCheckout, PlanItem } from "./SubscriptionCheckout";

interface SettingsProps {
  settings: UserSettings;
  onUpdateSettings: (newSettings: UserSettings) => void;
  onClose: () => void;
  onDeleteHistory?: () => void;
  onClearMemory?: () => void;
  onExportData?: () => void;
  userAuth?: UserAuth | null;
  onUpdateUserAuth?: (newUser: UserAuth) => void;
  onLogin?: () => void;
  onLogout?: () => void;
  subscriptionTier?: SubscriptionTier;
  onUpdateSubscription?: (tier: SubscriptionTier) => void;
  initialSubpage?: SettingPageId | null;
}

type SettingPageId = "subscription" | "personalization" | "font" | "data-control";

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
    id: "subscription",
    label: "Langganan",
    description: "Tingkatkan ke Paket Lite, Plus, atau Pro",
    icon: "fa-solid fa-crown",
    colorClass: "text-amber-500 bg-amber-500/10",
  },
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
    description: "Hapus riwayat obrolan, bersihkan memori akun, dan ekspor data",
    icon: "fa-solid fa-database",
    colorClass: "text-rose-500 bg-rose-500/10",
  },
];

const SUBSCRIPTION_PLANS: PlanItem[] = [
  {
    id: "lite",
    name: "Paket Lite",
    price: "Rp 2.000",
    rawPrice: 2000,
    period: "/ bulan",
    headline: "Inferensi Cepat dan Efisien untuk Kebutuhan AI Harian",
    unlockedModelBadge: "Groky 3.1 Lite",
    modelHighlight: "Akses prioritas penuh ke Groky 3.1 Lite",
    aiEngineCriteria: {
      title: "Kriteria AI & Kemampuan Komputasi",
      modelUnlocked: "Groky 3.1 Lite",
      description: "Dioptimalkan untuk tanya jawab cepat, pencarian ide, dan penulisan teks instan tanpa jeda antrean server.",
      features: [
        "Akses jalur prioritas ke model Groky 3.1 Lite",
        "Batas kuota percakapan harian 3x lebih banyak dibanding akun gratis",
        "Pengiriman dan analisis berkas teks, dokumen ringkas, serta skrip kode",
        "Penyimpanan riwayat obrolan cloud tanpa batas",
        "Format teks kaya responsif dengan Markdown dan KaTeX formula",
      ],
    },
  },
  {
    id: "plus",
    name: "Paket Plus",
    badge: "Paling Populer",
    isPopular: true,
    price: "Rp 10.000",
    rawPrice: 10000,
    period: "/ bulan",
    headline: "Membuka Model Groky 3.5 Pro untuk Pemrograman Kompleks",
    unlockedModelBadge: "Groky 3.5 Pro",
    modelHighlight: "Membuka Groky 3.5 Pro dan Groky 3.1 Lite",
    aiEngineCriteria: {
      title: "Kriteria AI & Kemampuan Komputasi",
      modelUnlocked: "Groky 3.5 Pro High Performance",
      description: "Dirancang khusus untuk programmer, insinyur software, dan akademisi yang membutuhkan penalaran logika mendalam serta debugging kode kompleks.",
      features: [
        "Terbuka: Model Groky 3.5 Pro High Performance",
        "Termasuk seluruh akses ke model Groky 3.1 Lite",
        "Penalaran arsitektur sistem, refactoring kode, dan algoritma kompleks",
        "Multimodal Vision untuk analisis gambar, diagram teknis, dan screenshot UI",
        "Eksekusi interaktif Sandbox Artifacts dan pratinjau kode HTML CSS JS",
        "Jendela konteks luas 131K Token untuk penulisan kode panjang",
        "Prioritas komputasi tinggi tanpa batasan kuota standar",
      ],
    },
  },
  {
    id: "pro",
    name: "Paket Pro",
    badge: "Kekuatan Penuh AI",
    price: "Rp 15.000",
    rawPrice: 15000,
    period: "/ bulan",
    headline: "Membuka Model Unggulan Groky 3.6 Flash dan Seluruh Fitur Flagship",
    unlockedModelBadge: "Groky 3.6 Flash",
    modelHighlight: "Membuka SEMUA Model Termasuk Groky 3.6 Flash",
    aiEngineCriteria: {
      title: "Kriteria AI & Kemampuan Komputasi",
      modelUnlocked: "Groky 3.6 Flash Multimodal dan Semua Model",
      description: "Akses tanpa kompromi ke model multimodal tercanggih bertenaga Gemini API dengan kapasitas konteks raksasa 1.000.000+ Token untuk riset mendalam.",
      features: [
        "Terbuka: Model Unggulan Groky 3.6 Flash Google Gemini Next-Gen",
        "Akses penuh tanpa terkecuali ke SEMUA model: Groky 3.6 Flash, Groky 3.5 Pro, dan Groky 3.1 Lite",
        "Jendela Konteks Raksasa hingga 1.000.000+ Token untuk riset mendalam",
        "Multimodal Vision resolusi tinggi untuk pemrosesan dokumen PDF masif",
        "Dukungan penuh Orkestrasi Multi-Agent terintegrasi dan eksekusi tool otomatis",
        "Bandwidth prioritas VIP eksklusif dengan latensi inferensi ultra-rendah",
      ],
    },
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
  userAuth,
  onUpdateUserAuth,
  onLogin,
  onLogout,
  subscriptionTier,
  onUpdateSubscription,
  initialSubpage,
}) => {
  // Current view: null means Main Vertical Menu, SettingPageId means Dedicated Fullscreen Page
  const [activeSubpage, setActiveSubpage] = useState<SettingPageId | null>(initialSubpage || null);

  // Active Subscription Plan State (synced with user storage)
  const [currentTier, setCurrentTier] = useState<SubscriptionTier>(() => {
    return subscriptionTier || userAuth?.subscriptionTier || settings.subscriptionTier || getSubscriptionPlan(userAuth?.email);
  });

  const [selectedPlanForPayment, setSelectedPlanForPayment] = useState<PlanItem | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"qris" | "va" | "instant">("qris");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Smooth close & transition states
  const [isClosing, setIsClosing] = useState(false);
  const [isExitingSubpage, setIsExitingSubpage] = useState(false);

  const [fontSearch, setFontSearch] = useState("");
  const [fontCategoryFilter, setFontCategoryFilter] = useState<string>("All");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Handler for activating subscription plan
  const handleActivatePlan = (planId: SubscriptionTier) => {
    setIsProcessingPayment(true);
    setTimeout(() => {
      setCurrentTier(planId);
      saveSubscriptionPlan(planId, userAuth?.email);
      if (onUpdateSubscription) {
        onUpdateSubscription(planId);
      }
      if (userAuth && onUpdateUserAuth) {
        onUpdateUserAuth({ ...userAuth, subscriptionTier: planId });
      }
      onUpdateSettings({ ...settings, subscriptionTier: planId });

      setIsProcessingPayment(false);
      setSelectedPlanForPayment(null);

      const planObj = SUBSCRIPTION_PLANS.find((p) => p.id === planId);
      const planName = planObj?.name || "Paket Baru";
      const modelUnlocked =
        planId === "pro"
          ? "Groky 3.6 Flash dan Groky 3.5 Pro"
          : planId === "plus"
          ? "Groky 3.5 Pro"
          : "Groky 3.1 Lite";

      if (planId === "free") {
        showNotification("Paket akun diubah ke Gratis.");
      } else {
        showNotification(`${planName} Aktif! Model ${modelUnlocked} kini terbuka.`);
      }
    }, 600);
  };

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

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showNotification("Ukuran foto maksimal 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      if (userAuth) {
        const updatedUser: UserAuth = {
          ...userAuth,
          avatarUrl: dataUrl,
        };
        if (onUpdateUserAuth) {
          onUpdateUserAuth(updatedUser);
        }
        try {
          await updateUserAvatar(dataUrl);
          const devId = getDeviceId();
          localStorage.setItem(`groky_user_auth_${devId}`, JSON.stringify(updatedUser));
          localStorage.setItem("groky_user_auth", JSON.stringify(updatedUser));
        } catch (err) {
          console.warn("Avatar sync error:", err);
        }
        showNotification("Foto profil berhasil diperbarui!");
      }
    };
    reader.readAsDataURL(file);
    // Reset value so same file can be chosen again if needed
    e.target.value = "";
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

        {/* Full Screen Menu Pembayaran Midtrans Langganan */}
        {selectedPlanForPayment && (
          <SubscriptionCheckout
            selectedPlan={selectedPlanForPayment}
            allPlans={SUBSCRIPTION_PLANS}
            userAuth={userAuth}
            onClose={() => setSelectedPlanForPayment(null)}
            onSelectPlan={(newPlan) => setSelectedPlanForPayment(newPlan)}
            onSuccess={(tier) => {
              handleActivatePlan(tier);
            }}
          />
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
        </header>

        {/* Dedicated Page Fullscreen Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className={`${activeSubpage === "subscription" ? "max-w-5xl" : "max-w-3xl"} mx-auto space-y-6 pb-24`}>
            {/* SUBPAGE 0: MENU LANGGANAN & PAKET AI */}
            {activeSubpage === "subscription" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* Header Subtitle & Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-stone-900 rounded-3xl p-5 sm:p-6 border border-stone-200/80 dark:border-stone-800/80 shadow-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <h2 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                        Status Paket Akun Anda
                      </h2>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 font-serif-editorial">
                        {currentTier === "pro"
                          ? "Paket Pro"
                          : currentTier === "plus"
                          ? "Paket Plus"
                          : currentTier === "lite"
                          ? "Paket Lite"
                          : "Paket Gratis"}
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-stone-950">
                        {currentTier.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 leading-relaxed">
                      {currentTier === "pro"
                        ? "Seluruh model termasuk Groky 3.6 Flash dan Groky 3.5 Pro terbuka penuh."
                        : currentTier === "plus"
                        ? "Model Groky 3.5 Pro dan Groky 3.1 Lite terbuka penuh. Upgrade ke Pro untuk membuka Groky 3.6 Flash."
                        : currentTier === "lite"
                        ? "Model Groky 3.1 Lite terbuka prioritas. Upgrade ke Plus untuk Groky 3.5 Pro, atau Pro untuk Groky 3.6 Flash."
                        : "Model Groky 3.1 Lite terbuka. Upgrade ke Paket Plus atau Pro untuk membuka model unggulan."}
                    </p>
                  </div>

                  {currentTier !== "free" && (
                    <button
                      type="button"
                      onClick={() => {
                        handleActivatePlan("free");
                        setSuccessToast("Berhasil beralih ke Paket Gratis. Paket langganan yang telah dibeli tetap tersimpan dan dapat digunakan kembali kapan saja selama masa aktif belum habis.");
                        setTimeout(() => setSuccessToast(null), 5000);
                      }}
                      className="px-3.5 py-2 rounded-xl text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 text-xs font-medium border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors shrink-0 cursor-pointer"
                    >
                      Ubah ke Paket Gratis
                    </button>
                  )}
                </div>

                {/* 3 Pricing Cards Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  {SUBSCRIPTION_PLANS.map((plan) => {
                    const isCurrent = currentTier === plan.id;
                    const accountSubRec = getAccountSubscriptionRecord(userAuth?.email);
                    const purchasedInfo = accountSubRec.purchasedTiers?.[plan.id];
                    const isPurchasedAndActive = Boolean(purchasedInfo && Date.now() < purchasedInfo.expiresAt);

                    return (
                      <div
                        key={plan.id}
                        className={`relative rounded-3xl p-6 flex flex-col justify-between transition-all ${
                          isCurrent
                            ? "bg-white dark:bg-stone-900 border-2 border-emerald-500 shadow-lg shadow-emerald-500/10"
                            : plan.isPopular
                            ? "bg-white dark:bg-stone-900 border-2 border-amber-500 shadow-lg shadow-amber-500/10"
                            : "bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800/90 shadow-xs"
                        }`}
                      >
                        <div className="space-y-4">
                          {/* Plan Name & Tagline */}
                          <div>
                            <div className="flex items-center justify-between">
                              <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">
                                {plan.name}
                              </h3>
                              <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                                {plan.unlockedModelBadge}
                              </span>
                            </div>
                            <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                              {plan.headline}
                            </p>
                          </div>

                          {/* Pricing Display */}
                          <div className="py-2 border-y border-stone-100 dark:border-stone-800">
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-stone-100">
                                {plan.price}
                              </span>
                              <span className="text-xs font-semibold text-stone-400">
                                {plan.period}
                              </span>
                            </div>
                            <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 mt-0.5">
                              {plan.modelHighlight}
                            </p>
                          </div>

                          {/* AI Criteria & Features */}
                          <div className="space-y-2.5 pt-1">
                            <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                              {plan.aiEngineCriteria.title}
                            </div>
                            <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                              {plan.aiEngineCriteria.description}
                            </p>

                            <ul className="space-y-2 pt-1 text-xs text-stone-600 dark:text-stone-300">
                              {plan.aiEngineCriteria.features.map((feat, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <i className="fa-solid fa-circle-check text-amber-500 text-xs mt-0.5 shrink-0"></i>
                                  <span className="leading-snug">{feat}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        {/* Action Button */}
                        <div className="pt-6">
                          {isCurrent ? (
                            <div className="w-full py-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-xs font-bold text-center flex flex-col items-center justify-center gap-1">
                              <div className="flex items-center gap-1.5">
                                <i className="fa-solid fa-circle-check text-xs"></i>
                                <span>Paket Sedang Aktif</span>
                              </div>
                              {purchasedInfo && (
                                <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                                  Masa aktif s/d {new Date(purchasedInfo.expiresAt).toLocaleDateString("id-ID")}
                                </span>
                              )}
                            </div>
                          ) : isPurchasedAndActive ? (
                            <button
                              type="button"
                              onClick={() => {
                                handleActivatePlan(plan.id);
                                setSuccessToast(`Berhasil beralih kembali ke ${plan.name}. Paket ini masih aktif s/d ${new Date(purchasedInfo!.expiresAt).toLocaleDateString("id-ID")}.`);
                                setTimeout(() => setSuccessToast(null), 4000);
                              }}
                              className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold text-center flex flex-col items-center justify-center gap-1 transition-all cursor-pointer shadow-md active:scale-98"
                            >
                              <div className="flex items-center gap-1.5">
                                <i className="fa-solid fa-bolt text-xs"></i>
                                <span>Gunakan Kembali Paket Ini</span>
                              </div>
                              <span className="text-[10px] font-medium text-emerald-100">
                                Tanpa bayar lagi (Aktif s/d {new Date(purchasedInfo!.expiresAt).toLocaleDateString("id-ID")})
                              </span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setSelectedPlanForPayment(plan)}
                              className={`w-full py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98 shadow-none ${
                                plan.isPopular
                                  ? "bg-amber-500 hover:bg-amber-400 text-stone-950"
                                  : "bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-white text-white dark:text-stone-900"
                              }`}
                            >
                              <i className="fa-solid fa-crown text-xs"></i>
                              <span>Langganan {plan.name}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

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

                {/* Mode Berpikir Cepat (Thinking Mode) Toggle */}
                <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-stone-200/80 dark:border-stone-800/80 shadow-xs flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center text-sm">
                        <i className="fa-solid fa-brain"></i>
                      </div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900 dark:text-stone-100">
                        Thinking Mode DeepSeek Style
                      </h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400">
                        Cepat & Responsif
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 leading-relaxed pt-1">
                      Menampilkan penalaran mendalam di awal sebelum respon jawaban, berpikir cepat dan merespon secepat kilat.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const next = !(settings.thinkingMode ?? true);
                      onUpdateSettings({ ...settings, thinkingMode: next });
                      showNotification(next ? "Thinking Mode diaktifkan" : "Thinking Mode dinonaktifkan");
                    }}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      (settings.thinkingMode ?? true) ? "bg-amber-500" : "bg-stone-300 dark:bg-stone-700"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        (settings.thinkingMode ?? true) ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Gaya Bahasa Cards */}
                <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-stone-200/80 dark:border-stone-800/80 shadow-xs space-y-4">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900 dark:text-stone-100">
                      Gaya & Nada Komunikasi AI
                    </h3>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Pilih nada yang paling sesuai dengan preferensi Anda.
                    </p>
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
                        <span>Bersihkan Memori Akun</span>
                      </h3>
                      <p className="text-xs text-stone-500 leading-relaxed">
                        Menghapus catatan preferensi, konteks pengguna, dan memori kunci-nilai yang disimpan untuk akun Anda.
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
        <div className="max-w-2xl mx-auto space-y-4 pb-20 pt-2">
          {/* Centered User Profile Card (Flat Minimalist, No Box Shadow) */}
          <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 sm:p-7 border border-stone-200/90 dark:border-stone-800/90 shadow-none flex flex-col items-center justify-center text-center">
            {/* Hidden Photo File Input for Custom Profile Photo */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />

            {userAuth?.isLoggedIn ? (
              <div className="flex flex-col items-center">
                <div className="relative mb-3 group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <img
                    src={userAuth.avatarUrl || "https://api.dicebear.com/7.x/avataaars/svg?seed=user"}
                    alt={userAuth.name || "Foto Profil"}
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover shadow-none border-2 border-amber-500/40 p-0.5 bg-stone-100 dark:bg-stone-800 transition-opacity group-hover:opacity-90"
                  />
                  {/* Camera Icon Badge replacing Google logo */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-stone-900 text-amber-400 border border-stone-700 hover:bg-amber-500 hover:text-stone-950 transition-all flex items-center justify-center text-xs cursor-pointer shadow-none active:scale-95 group-hover:scale-105"
                    title="Ganti Foto Profil (Pilih Foto)"
                  >
                    <i className="fa-solid fa-camera text-[11px]"></i>
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100">
                    {userAuth.name || "Pengguna"}
                  </h3>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[11px] text-amber-500 hover:text-amber-400 font-medium cursor-pointer"
                    title="Ganti Foto Profil"
                  >
                    <i className="fa-solid fa-pen text-[10px]"></i>
                  </button>
                </div>
                
                <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 font-medium mt-0.5 select-all">
                  {userAuth.email}
                </p>

                <div className="flex items-center gap-2 mt-3.5">
                  <button
                    type="button"
                    onClick={() => setActiveSubpage("subscription")}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-none active:scale-95"
                  >
                    <i className="fa-solid fa-crown text-[11px]"></i>
                    <span>Langganan</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 hover:border-amber-500/50 dark:hover:border-amber-500/50 text-stone-700 dark:text-stone-300 hover:text-amber-600 dark:hover:text-amber-400 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-none"
                  >
                    <i className="fa-solid fa-camera text-[11px]"></i>
                    <span>Ubah Foto</span>
                  </button>

                  {onLogout && (
                    <button
                      type="button"
                      onClick={onLogout}
                      className="px-3.5 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 hover:border-rose-300 dark:hover:border-rose-900 text-stone-600 dark:text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-none"
                    >
                      <i className="fa-solid fa-right-from-bracket text-[11px]"></i>
                      <span>Log Out</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-stone-100 dark:bg-stone-800 border-2 border-dashed border-stone-300 dark:border-stone-700 flex items-center justify-center text-stone-400 text-3xl mb-3 shadow-none cursor-pointer"
                  onClick={onLogin}
                >
                  <i className="fa-solid fa-user"></i>
                </div>
                <h3 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100">
                  Belum Masuk Akun
                </h3>
                <p className="text-xs text-stone-500 mt-1 max-w-xs">
                  Masuk dengan akun Anda untuk menyinkronkan obrolan antar-perangkat Anda
                </p>
                <div className="flex items-center gap-2 mt-3.5">
                  <button
                    type="button"
                    onClick={() => setActiveSubpage("subscription")}
                    className="px-4 py-2 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold shadow-none transition-transform active:scale-95 flex items-center gap-2 cursor-pointer"
                  >
                    <i className="fa-solid fa-crown text-xs"></i>
                    <span>Langganan</span>
                  </button>
                  {onLogin && (
                    <button
                      type="button"
                      onClick={onLogin}
                      className="px-4 py-2 rounded-2xl border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-semibold shadow-none transition-transform active:scale-95 flex items-center gap-2 cursor-pointer"
                    >
                      <i className="fa-solid fa-arrow-right-to-bracket text-xs"></i>
                      <span>Masuk Akun</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Dedicated Langganan Banner Card (Appears ONLY when Logged In) */}
          {userAuth?.isLoggedIn && (
            <div className="bg-gradient-to-r from-amber-500/15 via-amber-400/10 to-orange-500/15 dark:from-amber-500/20 dark:to-orange-500/20 rounded-3xl p-5 sm:p-6 border border-amber-500/30 shadow-none flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-amber-500 text-stone-950 flex items-center justify-center text-xl shrink-0 shadow-xs">
                  <i className="fa-solid fa-crown"></i>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100">
                      Langganan
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-stone-950">
                      {currentTier === "pro" ? "Pro Aktif" : currentTier === "plus" ? "Plus Aktif" : currentTier === "lite" ? "Lite Aktif" : "Mulai Rp 5.000"}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveSubpage("subscription")}
                className="px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold transition-transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer shadow-none shrink-0"
              >
                <i className="fa-solid fa-crown text-xs"></i>
                <span>Langganan</span>
              </button>
            </div>
          )}

          {/* Vertical Settings Cards List (Langganan Category Appears ONLY when Logged In) */}
          {SETTING_CATEGORIES.filter((cat) => (cat.id === "subscription" ? Boolean(userAuth?.isLoggedIn) : true)).map((cat) => (
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
