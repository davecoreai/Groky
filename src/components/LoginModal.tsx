import React, { useState } from "react";
import { signInWithGoogle, signInWithEmail, signUpWithEmail } from "../lib/firebase";
import { UserAuth } from "../types";
import { GrokyLogo } from "./GrokyLogo";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserAuth) => void;
}

type AuthViewMode = "login" | "register";

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [mode, setMode] = useState<AuthViewMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);
    try {
      const user = await signInWithGoogle();
      if (user) {
        onSuccess(user);
        onClose();
      }
    } catch (err: any) {
      console.error("Google sign in error:", err);
      if (err.code === "auth/popup-closed-by-user") {
        setError(null);
      } else if (err.code === "auth/unauthorized-domain") {
        setError("Domain belum diizinkan di Firebase Console. Pastikan authDomain telah terdaftar.");
      } else {
        setError(err.message || "Gagal masuk dengan Google.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Silakan isi email dan password.");
      return;
    }
    if (password.length < 6) {
      setError("Password minimal 6 karakter.");
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);
    try {
      if (mode === "login") {
        try {
          const user = await signInWithEmail(email, password);
          onSuccess(user);
          onClose();
        } catch (firebaseErr: any) {
          // Attempt backend server login fallback if Firebase user not found or offline
          const serverRes = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });
          const serverData = await serverRes.json();
          if (serverRes.ok && serverData.success && serverData.user) {
            onSuccess(serverData.user);
            onClose();
            return;
          }
          throw firebaseErr;
        }
      } else {
        try {
          const user = await signUpWithEmail(email, password, name || undefined);
          onSuccess(user);
          onClose();
        } catch (firebaseErr: any) {
          // Attempt backend server register fallback
          const serverRes = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, name }),
          });
          const serverData = await serverRes.json();
          if (serverRes.ok && serverData.success && serverData.user) {
            onSuccess(serverData.user);
            onClose();
            return;
          }
          throw firebaseErr;
        }
      }
    } catch (err: any) {
      console.error("Email auth error:", err);
      if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        setError("Email atau password tidak sesuai.");
      } else if (err.code === "auth/email-already-in-use") {
        setError("Email ini sudah terdaftar. Silakan masuk.");
      } else if (err.code === "auth/invalid-email") {
        setError("Format email tidak valid.");
      } else if (err.code === "auth/operation-not-allowed") {
        setError("Metode Email/Password belum diaktifkan di Firebase Console.");
      } else {
        setError(err.message || "Terjadi kesalahan saat memproses akun.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 sm:p-6 bg-stone-100/95 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto select-none font-sans-clean text-stone-900">
      
      {/* Background Subtle Ambient Aura (Light Mode) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-32 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl" />
        {/* Subtle dot pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(#d6d3d1_1px,transparent_1px)] [background-size:20px_20px] opacity-40" />
      </div>

      {/* Main Full-Screen Login Card (Light Theme, Zero Box Shadows) */}
      <div className="relative z-10 w-full max-w-md my-auto rounded-3xl bg-white border border-stone-200 p-6 sm:p-8 backdrop-blur-none animate-in zoom-in-95 duration-200 shadow-none">
        
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-block p-1 rounded-2xl bg-stone-50 border border-stone-200 shadow-none">
            <GrokyLogo className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover shadow-none" />
          </div>

          <h1 className="mt-3.5 text-xl sm:text-2xl font-bold tracking-tight text-stone-900 flex items-center justify-center gap-2">
            <span>Groky AI</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-700 border border-amber-500/30">
              v3.0
            </span>
          </h1>
          <p className="text-xs text-stone-500 mt-1 leading-relaxed max-w-xs mx-auto">
            {mode === "login" 
              ? "Masuk ke akun Anda untuk menyinkronkan obrolan cloud" 
              : "Buat akun baru untuk menikmati seluruh fitur cerdas Groky AI"}
          </p>
        </div>

        {/* Global Success Notification */}
        {successMessage && (
          <div className="mb-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs leading-relaxed flex items-start gap-2.5 animate-in fade-in duration-150 shadow-none">
            <i className="fa-solid fa-circle-check text-xs mt-0.5 shrink-0 text-emerald-600"></i>
            <span>{successMessage}</span>
          </div>
        )}

        {/* Global Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs leading-relaxed flex items-start gap-2.5 animate-in fade-in duration-150 shadow-none">
            <i className="fa-solid fa-circle-exclamation text-xs mt-0.5 shrink-0 text-rose-600"></i>
            <span>{error}</span>
          </div>
        )}

        {/* Login / Register Clean Form */}
        <div className="space-y-4">
          <form onSubmit={handleEmailAuth} className="space-y-3.5">
            {mode === "register" && (
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider">
                  Nama Lengkap
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nama Lengkap Anda"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-stone-50 border border-stone-200 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors shadow-none"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider">
                Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  required
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-stone-50 border border-stone-200 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors shadow-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  required
                  className="w-full px-3.5 py-2.5 pr-11 rounded-2xl bg-stone-50 border border-stone-200 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors shadow-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 text-xs cursor-pointer p-1 shadow-none"
                  title={showPassword ? "Sembunyikan password" : "Lihat password"}
                >
                  <i className={`fa-solid ${showPassword ? "fa-eye-slash" : "fa-eye"}`}></i>
                </button>
              </div>
            </div>

            {/* Primary Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50 shadow-none"
            >
              {isLoading ? (
                <i className="fa-solid fa-spinner fa-spin text-xs"></i>
              ) : (
                <i className="fa-solid fa-arrow-right text-xs"></i>
              )}
              <span>{mode === "login" ? "Masuk ke Akun" : "Daftar Akun Sekarang"}</span>
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center my-3">
            <div className="flex-1 h-px bg-stone-200"></div>
            <span className="px-3 text-[11px] text-stone-400 uppercase tracking-widest font-semibold">
              atau
            </span>
            <div className="flex-1 h-px bg-stone-200"></div>
          </div>

          {/* Google Login Button (Light Theme, Zero Box Shadow, at the bottom) */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-2xl border border-stone-200 hover:border-stone-300 bg-stone-50 hover:bg-stone-100 text-stone-800 text-xs font-semibold transition-all flex items-center justify-center gap-3 cursor-pointer active:scale-98 disabled:opacity-50 shadow-none group"
          >
            <i className="fa-brands fa-google text-amber-600 text-sm group-hover:scale-110 transition-transform"></i>
            <span>Lanjutkan dengan Akun Google</span>
          </button>

          {/* Toggle between Login and Register */}
          <div className="pt-2 text-center">
            <p className="text-xs text-stone-500">
              {mode === "login" ? "Belum memiliki akun?" : "Sudah memiliki akun?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === "login" ? "register" : "login");
                  setError(null);
                  setSuccessMessage(null);
                }}
                className="text-amber-600 font-bold hover:underline cursor-pointer ml-1 shadow-none"
              >
                {mode === "login" ? "Daftar akun di sini" : "Masuk di sini"}
              </button>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
