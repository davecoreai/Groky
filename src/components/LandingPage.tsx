import React, { useState } from "react";
import { HeroOrb } from "./HeroOrb";
import { ParticleBackground } from "./ParticleBackground";

interface LandingPageProps {
  onStartChat: () => void;
  onOpenAuth?: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onStartChat,
  isDark,
  onToggleTheme,
}) => {
  const [selectedPlanModal, setSelectedPlanModal] = useState<{
    name: string;
    price: string;
    features: string[];
  } | null>(null);

  const [faqOpenIndex, setFaqOpenIndex] = useState<number | null>(0);
  const [activeTab, setActiveTab] = useState<"text" | "vision" | "code" | "reasoning">("reasoning");

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const plans = [
    {
      id: "go",
      name: "Go",
      price: "25k",
      period: "/bulan",
      fullPrice: "Rp 25.000 / Bulan",
      description: "Untuk eksplorasi esensial, tanya jawab umum, dan pemrosesan teks harian.",
      isPopular: false,
      buttonText: "Coming Soon",
      features: [
        "Akses Groky 2.5 Flash & Groky 3.5 Flash",
        "100+ Pesan AI per Hari",
        "Kapasitas Konteks 32.000 Token",
        "Preview Komponen UI & Sintesis Kode",
        "Dukungan Penulisan Matematika KaTeX & Markdown",
        "Akses Komunitas Pengguna Groky AI",
      ],
    },
    {
      id: "plus",
      name: "Plus",
      badge: "Paling Populer",
      price: "263k",
      period: "/bulan",
      fullPrice: "Rp 263.000 / Bulan",
      description: "Daya komputasi lebih tinggi untuk developer dan profesional yang butuh analisis mendalam.",
      isPopular: true,
      buttonText: "Coming Soon",
      features: [
        "Akses Groky 3.7 Flow & Groky 4 Super",
        "Chat Tanpa Batas Kuota Harian (Unlimited)",
        "Kapasitas Konteks Luas 128.000 Token",
        "Mesin Eksekusi Kode Berkecepatan Tinggi",
        "Analisis Berkas PDF, DOCX, CSV & Multimodal Vision",
        "Prioritas Respon Server Cepat",
      ],
    },
    {
      id: "super",
      name: "Super",
      badge: "Flagship 2jt",
      price: "2jt",
      period: "/bulan",
      fullPrice: "Rp 2.000.000 / Bulan",
      description: "Infrastruktur komputasi penuh untuk riset skala besar dan akses eksklusif model flagship Groky 5.2 Astra.",
      isPopular: false,
      buttonText: "Coming Soon",
      features: [
        "Akses Eksklusif Groky 5.2 Astra (Model Rp 2 Juta)",
        "Akses Seluruh Seri Model Groky tanpa batas",
        "Prioritas Utama Server & Latensi Ultra-Rendah",
        "Kapasitas Konteks Ekstrem hingga 2 Juta Token",
        "Penyimpanan Cloud Dedicated & Sinkronisasi Supabase",
        "24/7 Priority Support & Konsultasi Khusus",
      ],
    },
  ];

  const grokyModels = [
    {
      name: "Groky 5.2 Astra",
      badge: "Khusus Super 2jt",
      badgeColor: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30",
      description: "Model unggulan dengan penalaran kompleks, analisis dokumen mendalam, dan arsitektur software skala besar (Eksklusif Paket Super Rp 2jt/Bulan).",
      context: "128k Tokens",
      speed: "Sangat Cepat",
      reasoning: 98,
      codeQuality: 96,
    },
    {
      name: "Groky 4 Super",
      badge: "Plus & Super",
      badgeColor: "bg-blue-500/15 text-blue-800 dark:text-blue-300 border-blue-500/30",
      description: "Optimal untuk pemrosesan pemrograman tingkat lanjut, refactoring skrip, dan logika algoritma.",
      context: "128k Tokens",
      speed: "Cepat",
      reasoning: 95,
      codeQuality: 99,
    },
    {
      name: "Groky 3.7 Flow",
      badge: "Plus & Super",
      badgeColor: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30",
      description: "Dioptimalkan untuk pembuatan komponen antarmuka interaktif, visualisasi data, dan alur agen.",
      context: "128k Tokens",
      speed: "Cepat",
      reasoning: 92,
      codeQuality: 94,
    },
    {
      name: "Groky 2.5 Flash",
      badge: "Gratis",
      badgeColor: "bg-purple-500/15 text-purple-800 dark:text-purple-300 border-purple-500/30",
      description: "Respon cepat berlatensi rendah untuk percakapan umum, tanya-jawab harian, dan ringkasan kilat.",
      context: "128k Tokens",
      speed: "Ultra Cepat",
      reasoning: 88,
      codeQuality: 90,
    },
    {
      name: "Groky 3.5 Flash",
      badge: "Gratis",
      badgeColor: "bg-stone-500/15 text-stone-800 dark:text-stone-300 border-stone-500/30",
      description: "Model serbaguna untuk pemrosesan teks terstruktur, logika matematika, dan penulisan dokumen.",
      context: "128k Tokens",
      speed: "Sangat Cepat",
      reasoning: 90,
      codeQuality: 91,
    },
  ];

  const aiCapabilities = {
    reasoning: {
      title: "Penalaran Berpikir Multi-Langkah",
      desc: "Groky AI memecahkan soal kompleks dengan merinci masalah menjadi langkah-langkah logika terstruktur sebelum menghasilkan jawaban final.",
      icon: "fa-brain",
      badge: "Logical Thinking",
      metrics: ["Accuracy Rate: 99.2%", "Chain of Thought Verification", "Zero-shot Problem Solving"],
    },
    vision: {
      title: "Pemahaman Multimodal & Analisis Dokumen",
      desc: "Unggah grafik, arsitektur sistem, bagan data, atau dokumen PDF/DOCX untuk diuraikan menjadi wawasan ringkas secara rinci.",
      icon: "fa-eye",
      badge: "Visual Intelligence",
      metrics: ["OCR High Precision", "Chart & Diagram Parser", "Multi-page PDF Extraction"],
    },
    code: {
      title: "Sintesis Kode Presisi Tinggi",
      desc: "Menghasilkan skrip Python, komponen React, query SQL, serta refactoring algoritma dengan penjelasan yang mudah dipahami.",
      icon: "fa-code",
      badge: "Full-Stack Coding",
      metrics: ["Multi-language Syntax", "Bug Auto-Detection", "Optimization Suggestions"],
    },
    text: {
      title: "Sintesis Bahasa & Ringkasan Cerdas",
      desc: "Mengolah naskah panjang, laporan bisnis, dan artikel ilmiah menjadi ringkasan bernilai tinggi dalam hitungan detik.",
      icon: "fa-pen-nib",
      badge: "Natural Language",
      metrics: ["Context Window: 128k+", "Tone & Style Adaptation", "Multi-language Translation"],
    },
  };

  const faqs = [
    {
      q: "Bagaimana cara mulai menggunakan Groky AI?",
      a: "Anda dapat langsung menekan tombol 'Get Started' pada halaman ini untuk masuk ke ruang obrolan tanpa perlu konfigurasi rumit.",
    },
    {
      q: "Apa saja model yang tersedia di dalam Groky AI?",
      a: "Groky AI menyediakan rangkaian model cerdas: Groky 5.2 Astra, Groky 4 Super, Groky 3.7 Flow, Groky 2.5 Flash, dan Groky 3.5 Flash yang dapat dipilih langsung melalui Model Selector pada ruang chat.",
    },
    {
      q: "Bagaimana visualisasi Space Orb 3D bekerja?",
      a: "Space Orb 3D dirender secara interaktif menggunakan teknologi WebGL Three.js dengan rotasi dinamis, simulasi partikel bintang, dan atmosfer angkasa real-time.",
    },
    {
      q: "Apakah riwayat obrolan saya aman dan tersimpan?",
      a: "Ya, seluruh sesi percakapan tersimpan secara privat pada browser Anda dan tersinkronisasi aman dengan enkripsi lokal.",
    },
  ];

  return (
    <div
      style={{ touchAction: "pan-y" }}
      className="fixed inset-0 w-full h-full overflow-y-auto bg-[#FAF8F5] dark:bg-stone-950 text-stone-900 dark:text-stone-100 font-sans-clean selection:bg-amber-200 selection:text-amber-950 dark:selection:bg-amber-900/60 dark:selection:text-amber-100 z-50"
    >
      {/* Particle background */}
      <ParticleBackground isDark={isDark} />

      {/* TOP HEADER */}
      <header className="sticky top-0 z-30 w-full bg-[#FAF8F5]/90 dark:bg-stone-950/90 backdrop-blur-md border-b border-stone-200/70 dark:border-stone-800/70 transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div
            className="flex items-center gap-3 cursor-pointer select-none"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            <img
              src="https://i.imgur.com/0J9yC8T.jpeg"
              alt="Groky AI"
              className="w-8 h-8 rounded-xl object-cover shadow-xs border border-stone-200/80 dark:border-stone-700/80"
              referrerPolicy="no-referrer"
            />
            <span className="font-serif-editorial text-lg font-bold tracking-tight text-stone-900 dark:text-stone-100">
              Groky AI
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-stone-600 dark:text-stone-400">
            <button
              onClick={() => scrollToSection("ai-tech")}
              className="hover:text-stone-900 dark:hover:text-stone-100 transition-colors cursor-pointer"
            >
              Teknologi AI
            </button>
            <button
              onClick={() => scrollToSection("features")}
              className="hover:text-stone-900 dark:hover:text-stone-100 transition-colors cursor-pointer"
            >
              Kemampuan
            </button>
            <button
              onClick={() => scrollToSection("models")}
              className="hover:text-stone-900 dark:hover:text-stone-100 transition-colors cursor-pointer"
            >
              Model Groky
            </button>
            <button
              onClick={() => scrollToSection("pricing")}
              className="hover:text-stone-900 dark:hover:text-stone-100 transition-colors cursor-pointer"
            >
              Paket
            </button>
            <button
              onClick={() => scrollToSection("faq")}
              className="hover:text-stone-900 dark:hover:text-stone-100 transition-colors cursor-pointer"
            >
              FAQ
            </button>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={onStartChat}
              className="hidden md:inline-flex px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-2xs transition-all cursor-pointer items-center gap-2"
            >
              <i className="fa-solid fa-sparkles text-xs"></i>
              <span>Mulai Buka Groky</span>
            </button>
            <button
              onClick={onToggleTheme}
              className="w-9 h-9 rounded-xl bg-stone-200/60 dark:bg-stone-800/60 text-stone-600 dark:text-stone-300 hover:text-amber-500 transition-colors cursor-pointer flex items-center justify-center"
              title="Toggle Theme"
            >
              <i className={`fa-solid ${isDark ? "fa-sun text-amber-400" : "fa-moon"}`}></i>
            </button>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-10 pb-16 sm:pt-16 sm:pb-24 px-4 sm:px-6 max-w-5xl mx-auto text-center z-10">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs font-medium">
            <i className="fa-solid fa-sparkles text-amber-500"></i>
            <span>Generasi Baru Kecerdasan Artifisial</span>
          </div>

          <h1 className="font-serif-editorial text-4xl sm:text-5xl md:text-6xl font-normal tracking-tight leading-[1.18] text-stone-900 dark:text-stone-50 max-w-3xl mx-auto">
            Kecerdasan AI Modern untuk Berpikir, Coding, &amp;{" "}
            <span className="italic font-semibold text-amber-600 dark:text-amber-400">
              Eksplorasi Kosmis
            </span>
          </h1>

          <p className="text-base sm:text-lg text-stone-600 dark:text-stone-300 leading-relaxed max-w-2xl mx-auto">
            Ruang kerja kecerdasan terpadu dengan respon berkecepatan tinggi, eksekusi kode interaktif, simulasi visual Space Orb 3D, dan pemahaman dokumen mendalam.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
            <button
              onClick={onStartChat}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm shadow-md transition-all cursor-pointer hover:scale-[1.01]"
            >
              <i className="fa-solid fa-bolt text-xs"></i>
              <span>Mulai Sekarang</span>
            </button>

            <button
              onClick={() => scrollToSection("pricing")}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-stone-200/80 dark:bg-stone-800/80 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-semibold text-sm transition-all cursor-pointer"
            >
              <span>Lihat Paket Premium</span>
              <i className="fa-solid fa-chevron-down text-xs"></i>
            </button>
          </div>
        </div>

        {/* REALISTIC COSMIC SPACE ORB DISPLAY */}
        <div className="mt-10 sm:mt-14 w-full max-w-3xl mx-auto rounded-3xl p-2.5 bg-gradient-to-b from-stone-200/60 to-transparent dark:from-stone-800/60 dark:to-transparent border border-stone-200/80 dark:border-stone-800/80 shadow-lg relative">
          <div className="w-full rounded-2xl bg-white/90 dark:bg-stone-900/90 border border-stone-200/60 dark:border-stone-800 p-3 sm:p-5 relative overflow-hidden backdrop-blur-xs">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800 text-xs text-stone-400">
              <span className="font-medium text-stone-600 dark:text-stone-300 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Simulasi Celestial Space Orb 3D
              </span>
              <span className="font-mono text-[11px]">WebGL 60 FPS</span>
            </div>
            <HeroOrb isDark={isDark} />
          </div>
        </div>
      </section>

      {/* AI ARCHITECTURE & TECHNOLOGY SHOWCASE */}
      <section id="ai-tech" className="py-16 sm:py-20 bg-stone-100/60 dark:bg-stone-900/50 border-y border-stone-200/70 dark:border-stone-800/70 relative z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <h2 className="font-serif-editorial text-3xl sm:text-4xl font-semibold text-stone-900 dark:text-stone-50">
              Arsitektur Kecerdasan AI
            </h2>
            <p className="text-stone-600 dark:text-stone-400 text-sm">
              Dibangun dengan fondasi model bahasa tingkat lanjut untuk pemrosesan informasi berlatensi rendah dan akurasi tinggi.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-xs space-y-2">
              <div className="text-amber-500 text-xl font-bold font-mono">128k+</div>
              <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Kapasitas Konteks</h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                Mengingat detail percakapan dan dokumen panjang dalam satu sesi penuh.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-xs space-y-2">
              <div className="text-amber-500 text-xl font-bold font-mono">&lt; 200ms</div>
              <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Latensi Streaming</h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                Output kata demi kata secara real-time dengan kecepatan tinggi.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-xs space-y-2">
              <div className="text-amber-500 text-xl font-bold font-mono">99.4%</div>
              <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Akurasi Sintesis</h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                Dihasilkan dari pengujian benchmark penalaran logika dan sintesis skrip.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-xs space-y-2">
              <div className="text-amber-500 text-xl font-bold font-mono">256-bit</div>
              <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Enkripsi Privat</h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                Penyimpanan data lokal yang terlindungi secara aman pada perangkat Anda.
              </p>
            </div>
          </div>

          {/* INTERACTIVE TAB SHOWCASE */}
          <div className="rounded-3xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-wrap items-center justify-center gap-2 border-b border-stone-100 dark:border-stone-800 pb-4">
              <button
                onClick={() => setActiveTab("reasoning")}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "reasoning"
                    ? "bg-amber-500 text-white shadow-xs"
                    : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
                }`}
              >
                <i className="fa-solid fa-brain mr-2"></i>Penalaran Logika
              </button>
              <button
                onClick={() => setActiveTab("vision")}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "vision"
                    ? "bg-amber-500 text-white shadow-xs"
                    : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
                }`}
              >
                <i className="fa-solid fa-eye mr-2"></i>Multimodal &amp; Visi
              </button>
              <button
                onClick={() => setActiveTab("code")}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "code"
                    ? "bg-amber-500 text-white shadow-xs"
                    : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
                }`}
              >
                <i className="fa-solid fa-code mr-2"></i>Generasi Kode
              </button>
              <button
                onClick={() => setActiveTab("text")}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "text"
                    ? "bg-amber-500 text-white shadow-xs"
                    : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
                }`}
              >
                <i className="fa-solid fa-pen-nib mr-2"></i>Sintesis Bahasa
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="space-y-4">
                <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[11px] font-semibold">
                  {aiCapabilities[activeTab].badge}
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100 font-serif-editorial">
                  {aiCapabilities[activeTab].title}
                </h3>
                <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
                  {aiCapabilities[activeTab].desc}
                </p>

                <ul className="space-y-2 pt-2 text-xs text-stone-700 dark:text-stone-300">
                  {aiCapabilities[activeTab].metrics.map((m, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <i className="fa-solid fa-check text-amber-500 text-[10px]" />
                      <span>{m}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-5 rounded-2xl bg-stone-50 dark:bg-stone-950 border border-stone-200/80 dark:border-stone-800 font-mono text-xs space-y-3">
                <div className="flex items-center justify-between text-stone-400 text-[11px] border-b border-stone-200 dark:border-stone-800 pb-2">
                  <span>GROKY AI ENGINE PROMPT</span>
                  <span className="text-amber-500">LIVE EVALUATION</span>
                </div>
                <div className="text-stone-600 dark:text-stone-300 leading-relaxed">
                  {activeTab === "reasoning" && (
                    <p>&gt; Menganalisis pola logika algoritma Dijkstra... Memverifikasi batasan memori dan estimasi konteks 128k tokens.</p>
                  )}
                  {activeTab === "vision" && (
                    <p>&gt; Mengekstraksi struktur tabel PDF 48 halaman... Mengidentifikasi nilai tren kuartal dan grafik pertumbuhan.</p>
                  )}
                  {activeTab === "code" && (
                    <p>&gt; Mengompilasi skrip React TypeScript... Menghasilkan penanganan state yang efisien tanpa memory leak.</p>
                  )}
                  {activeTab === "text" && (
                    <p>&gt; Menyusun ringkasan eksekutif laporan bisnis... Menyelaraskan nada bahasa secara profesional dan presisi.</p>
                  )}
                </div>
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-[11px]">
                  ✓ Diproses oleh seri model Groky AI dengan respon instan.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* KEY CAPABILITIES */}
      <section id="features" className="py-16 sm:py-20 max-w-5xl mx-auto px-4 sm:px-6 space-y-12 z-10">
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <h2 className="font-serif-editorial text-3xl sm:text-4xl font-semibold text-stone-900 dark:text-stone-50">
            Kemampuan Utama
          </h2>
          <p className="text-stone-600 dark:text-stone-400 text-sm">
            Dibangun untuk mendukung alur kerja kreatif, analitis, dan teknis Anda.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center text-lg">
              <i className="fa-solid fa-code"></i>
            </div>
            <h3 className="text-base font-semibold text-stone-900 dark:text-stone-100">
              Sintesis Kode &amp; UI
            </h3>
            <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
              Pembuatan kode otomatis untuk React, skrip Python, visual HTML, serta eksekusi instan di panel Viewer.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center text-lg">
              <i className="fa-solid fa-planet-ringed"></i>
            </div>
            <h3 className="text-base font-semibold text-stone-900 dark:text-stone-100">
              Simulasi Space Orb 3D
            </h3>
            <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
              Visualisasi ruang angkasa interaktif dengan rotasi celestial, pencahayaan realistis, dan partikel bintang dinamis.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-lg">
              <i className="fa-solid fa-file-lines"></i>
            </div>
            <h3 className="text-base font-semibold text-stone-900 dark:text-stone-100">
              Analisis Dokumen
            </h3>
            <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
              Ekstraksi poin penting dari dokumen PDF, berkas DOCX, tabel CSV, serta analisis gambar beresolusi tinggi.
            </p>
          </div>
        </div>
      </section>

      {/* MODEL INTELLIGENCE MATRIX WITH BENCHMARKS */}
      <section id="models" className="py-16 sm:py-20 bg-stone-100/60 dark:bg-stone-900/50 border-y border-stone-200/70 dark:border-stone-800/70 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-10">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <h2 className="font-serif-editorial text-3xl sm:text-4xl font-semibold text-stone-900 dark:text-stone-50">
              Pilihan Model Groky
            </h2>
            <p className="text-stone-600 dark:text-stone-400 text-sm">
              Model cerdas yang dapat Anda ganti langsung kapan saja pada Model Selector.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {grokyModels.map((m, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 space-y-4 shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-stone-900 dark:text-stone-100">
                    {m.name}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${m.badgeColor}`}>
                    {m.badge}
                  </span>
                </div>
                <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                  {m.description}
                </p>

                {/* Benchmarks meters */}
                <div className="space-y-2 pt-1 border-t border-stone-100 dark:border-stone-800/80 text-[11px]">
                  <div className="space-y-1">
                    <div className="flex justify-between text-stone-500">
                      <span>Penalaran Logika</span>
                      <span className="font-mono font-medium">{m.reasoning}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: `${m.reasoning}%` }} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-stone-500">
                      <span>Kualitas Kode</span>
                      <span className="font-mono font-medium">{m.codeQuality}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${m.codeQuality}%` }} />
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-stone-100 dark:border-stone-800/80 flex items-center justify-between text-[11px] text-stone-500 font-mono">
                  <span>{m.context}</span>
                  <span>{m.speed}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PAKET PREMIUM (GO, PLUS, SUPER) WITH COMING SOON BUTTONS */}
      <section id="pricing" className="py-16 sm:py-20 max-w-5xl mx-auto px-4 sm:px-6 space-y-12 z-10">
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <h2 className="font-serif-editorial text-3xl sm:text-4xl font-semibold text-stone-900 dark:text-stone-50">
            Paket Berlangganan
          </h2>
          <p className="text-stone-600 dark:text-stone-400 text-sm">
            Tingkatkan produktivitas sesuai dengan intensitas kebutuhan Anda.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-3xl p-6 sm:p-7 flex flex-col justify-between transition-all ${
                plan.isPopular
                  ? "bg-white dark:bg-stone-900 border-2 border-amber-500 shadow-lg shadow-amber-500/10 -translate-y-1"
                  : "bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-xs"
              }`}
            >
              {plan.isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-amber-500 text-white font-semibold text-[11px] uppercase tracking-wider">
                  {plan.badge}
                </div>
              )}

              <div className="space-y-5">
                <div>
                  <h3 className="font-serif-editorial text-2xl font-bold text-stone-900 dark:text-stone-100">
                    {plan.name}
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                    {plan.description}
                  </p>
                </div>

                <div className="flex items-baseline gap-1 py-3 border-y border-stone-100 dark:border-stone-800">
                  <span className="text-4xl font-extrabold text-stone-900 dark:text-stone-50">
                    {plan.price}
                  </span>
                  <span className="text-xs font-medium text-stone-500">
                    {plan.period}
                  </span>
                </div>

                <ul className="space-y-3 text-xs sm:text-sm text-stone-700 dark:text-stone-300">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <i className="fa-solid fa-check text-amber-500 mt-0.5 shrink-0 text-xs"></i>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-6">
                <button
                  disabled
                  onClick={() =>
                    setSelectedPlanModal({
                      name: plan.name,
                      price: plan.fullPrice,
                      features: plan.features,
                    })
                  }
                  className="w-full py-3 px-4 rounded-xl font-semibold text-xs sm:text-sm transition-all cursor-not-allowed text-center bg-stone-200 dark:bg-stone-800 text-stone-500 dark:text-stone-400 border border-stone-300/60 dark:border-stone-700/60 flex items-center justify-center gap-2"
                >
                  <i className="fa-solid fa-clock text-xs"></i>
                  <span>{plan.buttonText}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="faq" className="py-16 sm:py-20 bg-stone-100/60 dark:bg-stone-900/50 border-y border-stone-200/70 dark:border-stone-800/70 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="font-serif-editorial text-3xl font-semibold text-stone-900 dark:text-stone-50">
              Tanya Jawab
            </h2>
            <p className="text-stone-600 dark:text-stone-400 text-xs sm:text-sm">
              Informasi praktis tentang penggunaan Groky AI.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, index) => {
              const isOpen = faqOpenIndex === index;
              return (
                <div
                  key={index}
                  className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 overflow-hidden shadow-xs"
                >
                  <button
                    onClick={() => setFaqOpenIndex(isOpen ? null : index)}
                    className="w-full px-5 py-4 flex items-center justify-between text-left font-semibold text-xs sm:text-sm text-stone-900 dark:text-stone-100 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <i
                      className={`fa-solid fa-chevron-down text-xs transition-transform duration-200 ${
                        isOpen ? "rotate-180 text-amber-600" : "text-stone-400"
                      }`}
                    ></i>
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-4 pt-1 text-xs sm:text-sm text-stone-600 dark:text-stone-400 leading-relaxed border-t border-stone-100 dark:border-stone-800">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-10 max-w-5xl mx-auto px-4 sm:px-6 z-10 relative">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
          <div className="flex items-center gap-2.5">
            <img
              src="https://i.imgur.com/0J9yC8T.jpeg"
              alt="Groky AI"
              className="w-6 h-6 rounded-lg object-cover"
              referrerPolicy="no-referrer"
            />
            <span className="font-semibold text-stone-800 dark:text-stone-200">
              Groky AI
            </span>
          </div>

          <div className="flex items-center gap-6">
            <button onClick={() => scrollToSection("ai-tech")} className="hover:text-stone-800 dark:hover:text-stone-200 cursor-pointer">
              Teknologi
            </button>
            <button onClick={() => scrollToSection("features")} className="hover:text-stone-800 dark:hover:text-stone-200 cursor-pointer">
              Fitur
            </button>
            <button onClick={() => scrollToSection("models")} className="hover:text-stone-800 dark:hover:text-stone-200 cursor-pointer">
              Model
            </button>
            <button onClick={() => scrollToSection("pricing")} className="hover:text-stone-800 dark:hover:text-stone-200 cursor-pointer">
              Paket
            </button>
            <button onClick={onStartChat} className="text-amber-600 font-semibold cursor-pointer">
              Get Started
            </button>
          </div>

          <div>&copy; 2026 Groky AI.</div>
        </div>
      </footer>

      {/* PLAN DETAIL MODAL */}
      {selectedPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-medium text-stone-500">Info Paket</span>
                <h3 className="text-xl font-bold text-stone-900 dark:text-stone-100 font-serif-editorial">
                  {selectedPlanModal.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedPlanModal(null)}
                className="w-7 h-7 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-500 flex items-center justify-center cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-xs"></i>
              </button>
            </div>

            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {selectedPlanModal.price}
            </div>

            <ul className="space-y-2 text-xs text-stone-600 dark:text-stone-300 border-y border-stone-100 dark:border-stone-800 py-3">
              {selectedPlanModal.features.map((f, i) => (
                <li key={i} className="flex items-center gap-2">
                  <i className="fa-solid fa-check text-emerald-500 text-[10px]"></i>
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <div className="p-3 rounded-xl bg-stone-100 dark:bg-stone-800 text-center text-xs font-semibold text-stone-500">
              Status Paket: Coming Soon
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
