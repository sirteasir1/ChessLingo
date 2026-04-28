"use client";
import { useState } from "react";
import { useStore } from "@/store/useStore";
import { registerWithEmail, loginWithEmail, loginWithGoogle } from "@/lib/auth-actions";

function getAuthError(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e);
  const code = raw.match(/auth\/[\w-]+/)?.[0] ?? "";
  const MAP: Record<string,string> = {
    "auth/email-already-in-use":    "This email is already registered. Try signing in.",
    "auth/invalid-email":           "Invalid email address.",
    "auth/weak-password":           "Password must be at least 6 characters.",
    "auth/user-not-found":          "No account found with this email.",
    "auth/wrong-password":          "Incorrect password.",
    "auth/invalid-credential":      "Incorrect email or password.",
    "auth/too-many-requests":       "Too many attempts. Try again later.",
    "auth/network-request-failed":  "Network error. Check your connection.",
    "auth/configuration-not-found": "Email/Password sign-in not enabled.\n→ Firebase Console → Authentication → Sign-in method → Enable Email/Password",
    "auth/operation-not-allowed":   "This sign-in method is disabled in Firebase Console.",
    "auth/popup-closed-by-user":    "Google sign-in popup was closed.",
    "auth/popup-blocked":           "Popup blocked. Allow popups for this site.",
  };
  if (code && MAP[code]) return MAP[code];
  return raw.replace(/^Firebase:\s*/i,"").replace(/\s*\(auth\/[\w-]+\)\.?\s*$/,"").trim() || "Something went wrong.";
}

export default function AuthModal({ onClose }: { onClose?: () => void }) {
  const { setUser } = useStore();
  const [mode, setMode] = useState<"signin"|"signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!email || !password) { setError("Please fill all fields"); return; }
    if (mode === "signup" && !name) { setError("Enter your name"); return; }
    setLoading(true); setError("");
    try {
      const p = mode === "signup"
        ? await registerWithEmail(email, password, name)
        : await loginWithEmail(email, password);
      setUser(p); onClose?.();
    } catch (e) { setError(getAuthError(e)); }
    finally { setLoading(false); }
  };

  const google = async () => {
    setLoading(true); setError("");
    try { const p = await loginWithGoogle(); setUser(p); onClose?.(); }
    catch (e) { setError(getAuthError(e)); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background:"radial-gradient(ellipse 80% 60% at 50% 0%,rgba(124,58,237,.25),transparent 60%),rgba(5,5,15,.95)" }}>

      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] opacity-20"
          style={{ background:"radial-gradient(ellipse,#7c3aed,transparent 70%)" }} />
      </div>

      <div className="glass-strong rounded-3xl w-full max-w-md overflow-hidden animate-scale-in border border-white/8 shadow-[0_40px_100px_rgba(0,0,0,.9)]">

        {/* Top banner */}
        <div className="relative h-28 flex flex-col items-center justify-center overflow-hidden"
          style={{ background:"linear-gradient(135deg,#0f0420 0%,#1a0a3a 50%,#0a0520 100%)" }}>
          <div className="absolute inset-0"
            style={{ background:"radial-gradient(ellipse 80% 80% at 50% 120%,rgba(124,58,237,.4),transparent)" }} />
          <div className="text-5xl mb-1 animate-float">♟</div>
          <div className="font-display font-black text-xl" style={{
            background:"linear-gradient(135deg,#f5c518,#a855f7)",
            WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
          }}>ChessLingo</div>
        </div>

        <div className="p-6">
          <p className="text-center text-text-muted text-sm mb-5">
            {mode === "signin" ? "Welcome back, Grandmaster 👑" : "Begin your chess journey 🚀"}
          </p>

          {/* Mode toggle */}
          <div className="flex rounded-2xl overflow-hidden border border-white/8 mb-5 p-1 glass">
            {(["signin","signup"] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setError(""); }}
                className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all
                  ${mode === m ? "bg-accent-purple text-white shadow-[0_2px_12px_rgba(124,58,237,.4)]" : "text-white/40 hover:text-white/60"}`}>
                {m === "signin" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          {/* Google */}
          <button onClick={google} disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-2xl glass border border-white/8 hover:border-white/20 transition-all mb-4 text-sm font-semibold disabled:opacity-50 hover:scale-[1.01]">
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"/>
              <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z"/>
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-white/8" />
            <span className="text-text-muted text-xs">or</span>
            <div className="flex-1 h-px bg-white/8" />
          </div>

          <div className="flex flex-col gap-2.5">
            {mode === "signup" && (
              <input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="Your name"
                className="w-full px-4 py-3 rounded-2xl glass border border-white/8 focus:border-accent-purple outline-none text-sm transition-colors placeholder:text-white/20" />
            )}
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email address"
              onKeyDown={e=>e.key==="Enter"&&submit()}
              className="w-full px-4 py-3 rounded-2xl glass border border-white/8 focus:border-accent-purple outline-none text-sm transition-colors placeholder:text-white/20" />
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password (min 6 chars)"
              onKeyDown={e=>e.key==="Enter"&&submit()}
              className="w-full px-4 py-3 rounded-2xl glass border border-white/8 focus:border-accent-purple outline-none text-sm transition-colors placeholder:text-white/20" />
          </div>

          {error && (
            <div className="mt-3 p-3.5 rounded-2xl bg-red-950/60 border border-red-700/40 text-red-300 text-sm whitespace-pre-line leading-relaxed animate-slide-up">
              ⚠️ {error}
            </div>
          )}

          <button onClick={submit} disabled={loading}
            className="mt-4 w-full py-3.5 rounded-2xl font-black text-sm text-white
              bg-gradient-to-r from-accent-purple to-accent-violet
              hover:opacity-90 hover:scale-[1.01] transition-all
              disabled:opacity-50 flex items-center justify-center gap-2
              shadow-[0_8px_24px_rgba(124,58,237,.4)]">
            {loading
              ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin-slow" />
              : mode === "signin" ? "⚔️ Sign In" : "🚀 Create Account"}
          </button>

          <p className="text-center text-text-muted text-xs mt-4">
            {mode === "signin" ? "No account? " : "Have an account? "}
            <button onClick={() => { setMode(mode==="signin"?"signup":"signin"); setError(""); }}
              className="text-accent-violet hover:text-accent-gold transition-colors font-semibold">
              {mode === "signin" ? "Create one" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
