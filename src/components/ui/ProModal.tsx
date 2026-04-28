"use client";
import { useState } from "react";
import { useStore } from "@/store/useStore";

const FEATURES = [
  { icon:"🔍", text:"Advanced game analysis — 20+ metrics per move" },
  { icon:"🤖", text:"Real-time AI Coach with personalized tips"     },
  { icon:"🎨", text:"Exclusive Pro-only piece skins & board themes"  },
  { icon:"📊", text:"Opening repertoire builder & explorer"          },
  { icon:"⚡", text:"Unlimited puzzles & custom training plans"      },
  { icon:"🌍", text:"Priority matchmaking + city leaderboard"        },
  { icon:"📜", text:"Full game history with deep analysis replay"    },
];

const PLANS = [
  {
    id: "monthly",
    label: "Monthly",
    price: "$4.00",
    sub: "per month",
    badge: null,
    savings: null,
  },
  {
    id: "annual",
    label: "Annual",
    price: "$29.99",
    sub: "per year · only $2.50/mo",
    badge: "BEST VALUE",
    savings: "Save 37%",
  },
];

export default function ProModal() {
  const { proModalOpen, setProModalOpen, user } = useStore();
  const [plan, setPlan] = useState<"monthly"|"annual">("annual");
  const [loading, setLoading] = useState(false);

  if (!proModalOpen) return null;

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, userId: user?.uid ?? "demo", email: user?.email ?? "demo@example.com" }),
      });
      const { url } = await res.json();
      if (url) window.location.href = url;
      else alert("Demo mode — add STRIPE_SECRET_KEY to .env to enable payments.");
    } catch {
      alert("Demo mode — configure Stripe in .env.local to enable real payments.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in"
      onClick={e => e.target === e.currentTarget && setProModalOpen(false)}>

      <div className="glass-strong rounded-3xl w-full max-w-md overflow-hidden border border-white/8 shadow-[0_40px_100px_rgba(0,0,0,.9)] animate-scale-in">

        {/* Header */}
        <div className="relative px-6 pt-7 pb-5 text-center overflow-hidden"
          style={{ background:"linear-gradient(135deg,#1a0d2e,#0d1a2e)" }}>
          <div className="absolute inset-0 pointer-events-none"
            style={{ background:"radial-gradient(ellipse at 50% -20%,rgba(245,197,24,.2),transparent 70%)" }} />
          <button onClick={() => setProModalOpen(false)}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full glass border border-white/10 text-text-muted hover:text-white transition-colors">
            ✕
          </button>
          <div className="text-5xl mb-2 animate-float">✨</div>
          <h2 className="font-display text-2xl font-black mb-1 shimmer-gold">ChessLingo Pro</h2>
          <p className="text-text-muted text-sm">Unlock your full chess potential</p>
        </div>

        {/* Features */}
        <div className="px-6 py-4 flex flex-col gap-2.5">
          {FEATURES.map(f => (
            <div key={f.icon} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl glass border border-white/8 flex items-center justify-center text-sm shrink-0">
                {f.icon}
              </div>
              <span className="text-sm text-text-secondary">{f.text}</span>
            </div>
          ))}
        </div>

        {/* Plan cards */}
        <div className="px-6 pb-2 grid grid-cols-2 gap-3">
          {PLANS.map(p => (
            <button key={p.id} onClick={() => setPlan(p.id as "monthly"|"annual")}
              className={`relative border rounded-2xl p-4 text-center transition-all hover:scale-[1.02]
                ${plan === p.id
                  ? "border-accent-gold bg-[#1a1500] shadow-[0_0_20px_rgba(245,197,24,.2)]"
                  : "border-white/8 glass hover:border-white/20"}`}>
              {p.badge && (
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] px-3 py-0.5 rounded-full font-black text-black whitespace-nowrap"
                  style={{ background:"linear-gradient(90deg,#f5c518,#f97316)" }}>
                  {p.badge}
                </div>
              )}
              <div className="text-xs text-text-muted mt-1 mb-1.5">{p.label}</div>
              <div className="text-3xl font-black text-white">{p.price}</div>
              <div className="text-[11px] text-text-muted mt-1 leading-snug">{p.sub}</div>
              {p.savings && (
                <div className="mt-1.5 text-[10px] font-black text-emerald-400">{p.savings}</div>
              )}
            </button>
          ))}
        </div>

        {/* CTA */}
        <div className="px-6 pb-6 pt-4">
          <button onClick={handleCheckout} disabled={loading}
            className="w-full py-4 rounded-2xl font-black text-base text-black
              bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400
              hover:opacity-90 hover:scale-[1.01] transition-all
              disabled:opacity-60 shadow-[0_8px_24px_rgba(245,197,24,.4)]">
            {loading
              ? <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin-slow" />
                  Redirecting…
                </span>
              : `💳 Get Pro — ${plan === "monthly" ? "$4.00/mo" : "$29.99/yr"}`}
          </button>
          <p className="text-center text-[11px] text-text-muted mt-3">
            🔒 Secure payment via Stripe · Cancel anytime
          </p>
        </div>
      </div>
    </div>
  );
}
