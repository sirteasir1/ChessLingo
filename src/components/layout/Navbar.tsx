"use client";
import { useState } from "react";
import { useStore } from "@/store/useStore";
import { logout } from "@/lib/auth-actions";

const PAGES = [
  { id:"game",        label:"Play",        icon:"⚔️" },
  { id:"leaderboard", label:"Leaderboard", icon:"🏆" },
  { id:"shop",        label:"Shop",        icon:"🎨" },
  { id:"profile",     label:"Profile",     icon:"👤" },
];

const TIER_GRAD: Record<string,string> = {
  King:"from-amber-500 to-yellow-400", Queen:"from-purple-500 to-violet-400",
  Rook:"from-orange-500 to-amber-400", Bishop:"from-emerald-500 to-green-400",
  Knight:"from-blue-500 to-cyan-400",  Pawn:"from-gray-500 to-gray-400",
};

export default function Navbar() {
  const { activePage, setActivePage, setProModalOpen, user, setUser } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const coins    = user?.coins ?? 0;
  const rank     = user?.rank ?? "Pawn";
  const name     = user?.displayName ?? "Player";
  const initials = name.split(" ").map((n:string)=>n[0]).join("").toUpperCase().slice(0,2);
  const grad     = TIER_GRAD[rank] ?? TIER_GRAD.Pawn;

  const handleLogout = async () => {
    setLoggingOut(true);
    try { await logout(); setUser(null); }
    finally { setLoggingOut(false); setMenuOpen(false); }
  };

  return (
    <nav className="flex items-center h-14 px-4 gap-3 border-b border-white/5 bg-[#09091a]/95 backdrop-blur-xl shrink-0 z-50 relative">

      {/* Logo */}
      <button onClick={() => setActivePage("game")} className="flex items-center gap-2 mr-2 hover:opacity-80 transition-opacity">
        <span className="text-2xl">♟</span>
        <span className="font-display font-bold text-base hidden sm:block" style={{
          background:"linear-gradient(135deg,#f5c518,#a855f7)",
          WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
        }}>ChessLingo</span>
      </button>

      {/* Nav links */}
      <div className="flex gap-1 flex-1">
        {PAGES.map(p => (
          <button
            key={p.id}
            onClick={() => setActivePage(p.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all
              ${activePage === p.id
                ? "bg-white/8 text-white"
                : "text-white/40 hover:text-white/70 hover:bg-white/5"}`}
          >
            <span className="text-base">{p.icon}</span>
            <span className="hidden sm:inline">{p.label}</span>
          </button>
        ))}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 ml-auto">
        {/* Coins */}
        <div className="flex items-center gap-1.5 glass px-3 py-1.5 rounded-full text-sm font-bold text-amber-400 border border-amber-500/20">
          🪙 {coins.toLocaleString()}
        </div>

        {/* Rank pill */}
        <div className={`px-3 py-1.5 rounded-full text-xs font-black bg-gradient-to-r ${grad} text-white hidden sm:flex`}>
          {rank}
        </div>

        {/* Pro */}
        <button
          onClick={() => setProModalOpen(true)}
          className="px-3 py-1.5 rounded-full text-xs font-black text-black hidden md:flex
            bg-gradient-to-r from-amber-400 to-yellow-300 hover:opacity-90 transition-opacity
            shadow-[0_2px_12px_rgba(245,197,24,.4)]"
        >
          ✨ Pro
        </button>

        {/* Avatar + menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(v => !v)}
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white
              overflow-hidden bg-gradient-to-br ${grad}
              ring-2 ring-offset-2 ring-offset-[#09091a] ring-white/10
              hover:ring-accent-purple/60 transition-all`}
          >
            {user?.photoURL
              ? <img src={user.photoURL} alt={name} className="w-full h-full object-cover" />
              : initials}
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-11 w-56 glass-strong rounded-2xl overflow-hidden z-50 animate-slide-up border border-white/8 shadow-[0_24px_60px_rgba(0,0,0,.8)]">
                <div className="px-4 py-3.5 border-b border-white/5">
                  <div className="font-bold text-sm truncate">{name}</div>
                  <div className="text-text-muted text-xs truncate">{user?.email}</div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-gradient-to-r ${grad} text-white`}>{rank}</span>
                    <span className="text-xs text-amber-400 font-semibold">{user?.rating ?? 1200} ⚡</span>
                  </div>
                </div>
                {[
                  { label:"👤 My Profile", page:"profile" },
                  { label:"🎨 Shop",       page:"shop"    },
                  { label:"🏆 Rankings",   page:"leaderboard" },
                ].map(item => (
                  <button key={item.page}
                    onClick={() => { setActivePage(item.page); setMenuOpen(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-white/5 transition-colors text-white/60 hover:text-white">
                    {item.label}
                  </button>
                ))}
                <div className="border-t border-white/5">
                  <button onClick={handleLogout} disabled={loggingOut}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-red-900/20 text-red-400/80 hover:text-red-400 transition-colors disabled:opacity-40">
                    {loggingOut ? "Signing out..." : "🚪 Sign Out"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
