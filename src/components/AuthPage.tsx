import React, { useState, useEffect, useRef } from "react";
import { UserAuth, UserSettings } from "../types";
import {
  registerUserToSupabase,
  loginUserWithSupabase,
  resetPasswordWithSupabase,
  signInWithSupabaseGoogle,
  getSupabaseClient,
} from "../lib/supabase";

interface AuthPageProps {
  onSuccessAuth: (user: UserAuth) => void;
  onBackToLanding: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  settings?: UserSettings;
  onUpdateSettings?: (newSettings: UserSettings) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  onSuccessAuth,
  onBackToLanding,
  isDark,
  settings,
  onUpdateSettings,
}) => {
  const [authMode, setAuthMode] = useState<"login" | "register" | "forgot">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Form State
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(true);

  const [forgotEmail, setForgotEmail] = useState("");

  // Check active Supabase Auth session on component mount
  useEffect(() => {
    const client = getSupabaseClient(settings);
    if (!client) return;

    client.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const userName = session.user.user_metadata?.name || session.user.email?.split("@")[0] || "User";
        const avatar = session.user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(session.user.email || "")}`;
        const provider = session.user.app_metadata?.provider || session.user.identities?.[0]?.provider || "google";
        onSuccessAuth({
          isLoggedIn: true,
          name: userName,
          email: session.user.email || "",
          avatarUrl: avatar,
          provider: provider as "google" | "email",
        });
      }
    });

    const { data: authListener } = client.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        const userName = session.user.user_metadata?.name || session.user.email?.split("@")[0] || "User";
        const avatar = session.user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(session.user.email || "")}`;
        const provider = session.user.app_metadata?.provider || session.user.identities?.[0]?.provider || "google";
        onSuccessAuth({
          isLoggedIn: true,
          name: userName,
          email: session.user.email || "",
          avatarUrl: avatar,
          provider: provider as "google" | "email",
        });
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [settings, onSuccessAuth]);

  // Canvas Particle Background Ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Animated Canvas Particle Background Effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);

    // Generate Particles
    const particleCount = Math.min(Math.floor(width / 18), 65);
    const particles: Array<{
      x: number;
      y: number;
      radius: number;
      vx: number;
      vy: number;
      alpha: number;
      pulse: number;
    }> = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 2.5 + 1,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        alpha: Math.random() * 0.5 + 0.25,
        pulse: Math.random() * 0.02 + 0.005,
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const colorBase = isDark ? "245, 158, 11" : "217, 119, 6"; // Amber accent

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        p.alpha += p.pulse;
        if (p.alpha > 0.7 || p.alpha < 0.2) p.pulse *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${colorBase}, ${p.alpha})`;
        ctx.shadowBlur = 12;
        ctx.shadowColor = `rgba(${colorBase}, 0.6)`;
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 110) {
            const lineAlpha = (1 - dist / 110) * 0.22;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(${colorBase}, ${lineAlpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isDark]);

  // LOGIN Handler connected to REAL Supabase Auth
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!loginEmail.trim() || !loginPassword.trim()) {
      setErrorMessage("Silakan isi email dan password Anda.");
      return;
    }

    const res = await loginUserWithSupabase(loginEmail, loginPassword, settings);
    setIsLoading(false);

    if (res.success && res.user) {
      onSuccessAuth(res.user);
    } else {
      setErrorMessage(res.error || "Gagal masuk. Periksa email dan password Anda.");
    }
  };

  // REGISTER Handler connected to REAL Supabase Auth
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!registerName.trim() || !registerEmail.trim() || !registerPassword.trim()) {
      setErrorMessage("Silakan lengkapi semua kolom pendaftaran.");
      return;
    }

    if (registerPassword.length < 6) {
      setErrorMessage("Password minimal harus 6 karakter.");
      return;
    }

    if (registerPassword !== registerConfirmPassword) {
      setErrorMessage("Konfirmasi password tidak cocok dengan password.");
      return;
    }

    if (!agreeTerms) {
      setErrorMessage("Anda harus menyetujui Syarat dan Ketentuan.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await registerUserToSupabase(
        {
          name: registerName,
          email: registerEmail,
          provider: "email",
        },
        registerPassword,
        settings
      );

      setIsLoading(false);

      if (res.success) {
        if (res.user && res.user.isLoggedIn) {
          onSuccessAuth(res.user);
        } else {
          setSuccessMessage(res.message || `Akun berhasil dibuat! Silakan periksa email ${registerEmail} jika verfirmasi diperlukan.`);
        }
      } else {
        setErrorMessage(res.error || "Gagal mendaftar akun.");
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err?.message || "Terjadi kesalahan pendaftaran.");
    }
  };

  // FORGOT PASSWORD Handler via REAL Supabase Auth
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!forgotEmail.trim()) {
      setErrorMessage("Silakan masukkan email Anda untuk mereset password.");
      return;
    }

    setIsLoading(true);
    const res = await resetPasswordWithSupabase(forgotEmail, settings);
    setIsLoading(false);

    if (res.success) {
      setSuccessMessage(res.message || `Tautan reset password telah dikirim ke ${forgotEmail}.`);
      setForgotEmail("");
    } else {
      setErrorMessage(res.error || "Gagal mengirimkan reset password.");
    }
  };

  // GOOGLE AUTH Handler via Supabase OAuth
  const handleGoogleAuth = async () => {
    setErrorMessage("");
    setIsLoading(true);

    const res = await signInWithSupabaseGoogle(settings);
    setIsLoading(false);

    if (res.success && res.user) {
      onSuccessAuth(res.user);
    } else if (!res.success) {
      setErrorMessage(res.error || "Gagal masuk menggunakan Google OAuth.");
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#FAF8F5] dark:bg-stone-950 text-stone-800 dark:text-stone-200 flex flex-col justify-between relative overflow-hidden font-sans-clean select-none">
      
      {/* Interactive Particle Canvas Background */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-70 dark:opacity-80"
      />

      {/* Background Decorative Ambient Glows */}
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-amber-500/10 dark:bg-amber-500/15 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[450px] h-[450px] bg-orange-500/10 dark:bg-orange-500/10 rounded-full blur-[100px] pointer-events-none z-0" />

      {/* Top Header */}
      <header className="relative z-10 w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <button
          onClick={onBackToLanding}
          className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/80 dark:bg-stone-900/80 border border-stone-200/80 dark:border-stone-800/80 hover:border-amber-500/50 text-stone-700 dark:text-stone-300 text-xs font-semibold shadow-2xs backdrop-blur-md transition-all cursor-pointer hover:scale-[1.02]"
        >
          <i className="fa-solid fa-arrow-left text-xs text-amber-500"></i>
          <span className="hidden sm:inline">Landing Page</span>
        </button>

        {/* Brand Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-medium">
          <i className="fa-solid fa-shield-halved text-xs"></i>
          <span>Aman &amp; Terenkripsi</span>
        </div>
      </header>

      {/* Main Form Center Box */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="w-full max-w-md bg-white/85 dark:bg-stone-900/85 backdrop-blur-xl border border-stone-200/90 dark:border-stone-800/90 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
          
          {/* Form Header Title & Fixed Groky AI Logo */}
          <div className="text-center space-y-2">
            <div className="relative w-16 h-16 mx-auto mb-1">
              <img
                src="https://i.imgur.com/0J9yC8T.jpeg"
                alt="Groky AI Logo"
                className="w-16 h-16 rounded-2xl object-cover shadow-md border-2 border-amber-500/40 ring-4 ring-amber-500/10"
                referrerPolicy="no-referrer"
              />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center shadow-xs">
                <i className="fa-solid fa-sparkles"></i>
              </div>
            </div>

            <h1 className="font-serif-editorial text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
              {authMode === "login" && "Selamat Datang Kembali"}
              {authMode === "register" && "Buat Akun Groky AI"}
              {authMode === "forgot" && "Lupa Password"}
            </h1>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {authMode === "login" && "Masuk dengan akun Anda untuk melanjutkan."}
              {authMode === "register" && "Daftar untuk eksplorasi AI cerdas."}
              {authMode === "forgot" && "Masukkan email Anda untuk tautan pemulihan."}
            </p>
          </div>

          {/* Tab Switcher (Login / Register) */}
          {authMode !== "forgot" && (
            <div className="flex rounded-2xl bg-stone-100 dark:bg-stone-950 p-1 border border-stone-200/60 dark:border-stone-800/60">
              <button
                type="button"
                onClick={() => {
                  setAuthMode("login");
                  setErrorMessage("");
                  setSuccessMessage("");
                }}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  authMode === "login"
                    ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs"
                    : "text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200"
                }`}
              >
                Masuk (Login)
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode("register");
                  setErrorMessage("");
                  setSuccessMessage("");
                }}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  authMode === "register"
                    ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs"
                    : "text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200"
                }`}
              >
                Daftar (Register)
              </button>
            </div>
          )}

          {/* Alert Messages */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs flex items-start gap-2.5 animate-in fade-in duration-150">
              <i className="fa-solid fa-circle-exclamation text-sm shrink-0 mt-0.5"></i>
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs flex items-start gap-2.5 animate-in fade-in duration-150">
              <i className="fa-solid fa-circle-check text-sm shrink-0 mt-0.5"></i>
              <span>{successMessage}</span>
            </div>
          )}

          {/* FORM: LOGIN */}
          {authMode === "login" && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-stone-700 dark:text-stone-300">
                  Email Address
                </label>
                <div className="relative">
                  <i className="fa-solid fa-envelope absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-stone-400"></i>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="nama@email.com"
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/70 text-stone-800 dark:text-stone-200 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-stone-700 dark:text-stone-300">
                  Password
                </label>
                <div className="relative">
                  <i className="fa-solid fa-lock absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-stone-400"></i>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-10 pr-10 py-2.5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/70 text-stone-800 dark:text-stone-200 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-amber-500/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer"
                  >
                    <i className={`fa-solid ${showPassword ? "fa-eye-slash" : "fa-eye"}`}></i>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-stone-600 dark:text-stone-400">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-stone-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                  />
                  <span>Ingat saya</span>
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("forgot");
                    setErrorMessage("");
                    setSuccessMessage("");
                  }}
                  className="font-medium text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                >
                  Lupa Password?
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 mt-2"
              >
                {isLoading ? (
                  <>
                    <i className="fa-solid fa-spinner animate-spin text-xs"></i>
                    <span>Otentikasi Supabase Auth...</span>
                  </>
                ) : (
                  <>
                    <span>Masuk Ke Groky AI</span>
                    <i className="fa-solid fa-arrow-right text-xs"></i>
                  </>
                )}
              </button>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-stone-200 dark:border-stone-800"></div>
                <span className="shrink mx-3 text-[11px] text-stone-400 uppercase tracking-wider">
                  atau
                </span>
                <div className="flex-grow border-t border-stone-200 dark:border-stone-800"></div>
              </div>

              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={isLoading}
                className="w-full py-2.5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800/80 text-stone-700 dark:text-stone-200 text-xs font-medium flex items-center justify-center gap-2.5 shadow-2xs transition-all cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Masuk dengan Google (Supabase OAuth)</span>
              </button>
            </form>
          )}

          {/* FORM: REGISTER */}
          {authMode === "register" && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-stone-700 dark:text-stone-300">
                  Nama Lengkap
                </label>
                <div className="relative">
                  <i className="fa-solid fa-user absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-stone-400"></i>
                  <input
                    type="text"
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    placeholder="Nama Anda"
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/70 text-stone-800 dark:text-stone-200 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-stone-700 dark:text-stone-300">
                  Email Address
                </label>
                <div className="relative">
                  <i className="fa-solid fa-envelope absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-stone-400"></i>
                  <input
                    type="email"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    placeholder="nama@email.com"
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/70 text-stone-800 dark:text-stone-200 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-stone-700 dark:text-stone-300">
                  Password
                </label>
                <div className="relative">
                  <i className="fa-solid fa-lock absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-stone-400"></i>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    required
                    className="w-full pl-10 pr-10 py-2.5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/70 text-stone-800 dark:text-stone-200 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-amber-500/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer"
                  >
                    <i className={`fa-solid ${showPassword ? "fa-eye-slash" : "fa-eye"}`}></i>
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-stone-700 dark:text-stone-300">
                  Konfirmasi Password
                </label>
                <div className="relative">
                  <i className="fa-solid fa-lock absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-stone-400"></i>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={registerConfirmPassword}
                    onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                    placeholder="Ulangi password Anda"
                    required
                    className="w-full pl-10 pr-10 py-2.5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/70 text-stone-800 dark:text-stone-200 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-amber-500/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer"
                  >
                    <i className={`fa-solid ${showConfirmPassword ? "fa-eye-slash" : "fa-eye"}`}></i>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="agree-terms"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="rounded border-stone-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
                <label htmlFor="agree-terms" className="text-[11px] text-stone-600 dark:text-stone-400 cursor-pointer">
                  Saya menyetujui Syarat &amp; Ketentuan Layanan Groky AI.
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 mt-2"
              >
                {isLoading ? (
                  <>
                    <i className="fa-solid fa-spinner animate-spin text-xs"></i>
                    <span>Daftar ke Supabase Auth...</span>
                  </>
                ) : (
                  <>
                    <span>Buat Akun Sekarang</span>
                    <i className="fa-solid fa-user-plus text-xs"></i>
                  </>
                )}
              </button>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-stone-200 dark:border-stone-800"></div>
                <span className="shrink mx-3 text-[11px] text-stone-400 uppercase tracking-wider">
                  atau
                </span>
                <div className="flex-grow border-t border-stone-200 dark:border-stone-800"></div>
              </div>

              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={isLoading}
                className="w-full py-2.5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800/80 text-stone-700 dark:text-stone-200 text-xs font-medium flex items-center justify-center gap-2.5 shadow-2xs transition-all cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Daftar dengan Google (Supabase OAuth)</span>
              </button>
            </form>
          )}

          {/* FORM: FORGOT PASSWORD */}
          {authMode === "forgot" && (
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-stone-700 dark:text-stone-300">
                  Email Pemulihan
                </label>
                <div className="relative">
                  <i className="fa-solid fa-envelope absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-stone-400"></i>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="nama@email.com"
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/70 text-stone-800 dark:text-stone-200 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 mt-2"
              >
                {isLoading ? (
                  <>
                    <i className="fa-solid fa-spinner animate-spin text-xs"></i>
                    <span>Sending Reset Link via Supabase...</span>
                  </>
                ) : (
                  <>
                    <span>Kirim Tautan Reset</span>
                    <i className="fa-solid fa-paper-plane text-xs"></i>
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("login");
                    setErrorMessage("");
                    setSuccessMessage("");
                  }}
                  className="text-xs font-semibold text-stone-600 dark:text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <i className="fa-solid fa-arrow-left text-xs"></i>
                  <span>Kembali ke Halaman Login</span>
                </button>
              </div>
            </form>
          )}

        </div>
      </main>

      {/* Footer Disclaimer */}
      <footer className="relative z-10 py-4 text-center text-[11px] text-stone-400 dark:text-stone-500">
        &copy; 2026 Groky AI Assistant. Powered by Supabase Auth &amp; Database.
      </footer>
    </div>
  );
};
