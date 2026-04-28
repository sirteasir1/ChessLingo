"use client";
import { useState, useEffect } from "react";
import { useStore } from "@/store/useStore";

const CITIES = ["all","Almaty","Astana","Taldykorgan","Moscow","Istanbul","Dubai","Bishkek","Shymkent"];

interface LeaderboardEntry {
  rank: number;
  uid: string;
  displayName: string;
  city: string;
  country: string;
  rating: number;
  wins: number;
  streak: number;
  rankTier: string;
}

const TIER_ICON: Record<string, string> = {
  King: "♚", Queen: "♛", Rook: "♜", Bishop: "♝", Knight: "♞", Pawn: "♟",
};
const TIER_COLOR: Record<string, string> = {
  King: "text-amber-400", Queen: "text-purple-400", Rook: "text-orange-400",
  Bishop: "text-emerald-400", Knight: "text-blue-400", Pawn: "text-gray-400",
};

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

const COLORS = ["#7c3aed","#ef4444","#10b981","#f97316","#06b6d4","#f5c842","#84cc16","#ec4899","#a855f7","#8b5cf6"];

export default function LeaderboardPage() {
  const [city, setCity] = useState("all");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useStore();

  useEffect(() => {
    setLoading(true);
    fetch(`/api/leaderboard?city=${city}&limit=50`)
      .then(r => r.json())
      .then(data => {
        setEntries(data.entries ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [city]);

  const top3 = entries.slice(0, 3);
  const rest  = entries.slice(3);

  const MEDAL  = ["🥇","🥈","🥉"];
  const BORDERS = ["border-accent-gold bg-[#1a1500]","border-gray-400 bg-[#141420]","border-amber-700 bg-[#1a1108]"];

  return (
    <div className="overflow-y-auto h-full p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold">🏆 Global Leaderboard</h1>
          <p className="text-text-muted text-sm mt-0.5">Real players, real ratings</p>
        </div>
        <select
          value={city}
          onChange={e => setCity(e.target.value)}
          className="px-4 py-2 rounded-full border border-border-subtle bg-bg-elevated text-sm text-text-primary outline-none focus:border-accent-purple transition-colors"
        >
          {CITIES.map(c => (
            <option key={c} value={c}>{c === "all" ? "🌍 Worldwide" : c}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" />
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">🏆</div>
          <div className="text-text-muted text-lg font-semibold">No players from {city} yet</div>
          <p className="text-text-muted text-sm mt-2">Be the first to make the leaderboard!</p>
        </div>
      ) : (
        <>
          {/* Podium */}
          {top3.length >= 2 && (
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[top3[1], top3[0], top3[2]].map((p, i) => {
                if (!p) return <div key={i} />;
                const realIdx = i === 0 ? 1 : i === 1 ? 0 : 2;
                const color = COLORS[entries.indexOf(p) % COLORS.length];
                const initials = getInitials(p.displayName);
                const isCurrentUser = user?.uid === p.uid;
                return (
                  <div key={p.uid}
                    className={`bg-bg-surface border rounded-2xl p-5 text-center transition-all ${BORDERS[realIdx]}
                      ${isCurrentUser ? "ring-2 ring-accent-violet" : ""}`}>
                    <div className="text-3xl mb-2">{MEDAL[realIdx]}</div>
                    <div className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-xl mx-auto mb-2"
                      style={{ background: color + "25", color }}>
                      {initials}
                    </div>
                    <div className="font-semibold text-sm">
                      {p.displayName}{isCurrentUser ? " 👤" : ""}
                    </div>
                    <div className="text-accent-gold font-bold">{p.rating}</div>
                    <div className="text-xs text-text-muted">{p.city}</div>
                    {p.streak > 0 && (
                      <div className="text-xs text-orange-400 mt-1">🔥 {p.streak}</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Table */}
          <div className="bg-bg-surface rounded-2xl overflow-hidden border border-border-subtle">
            <div className="grid grid-cols-[40px_44px_1fr_80px_80px_70px] px-4 py-2.5 text-xs text-text-muted font-bold bg-bg-elevated">
              <span>#</span><span></span><span>PLAYER</span><span>RATING</span><span>WINS</span><span>STREAK</span>
            </div>
            {entries.map((p, i) => {
              const color = COLORS[i % COLORS.length];
              const initials = getInitials(p.displayName);
              const isCurrentUser = user?.uid === p.uid;
              return (
                <div key={p.uid}
                  className={`grid grid-cols-[40px_44px_1fr_80px_80px_70px] items-center px-4 py-3 border-t border-border-subtle text-sm transition-colors
                    ${isCurrentUser ? "bg-[#1e1030] border-l-2 border-l-accent-purple" : "hover:bg-bg-elevated"}`}>
                  <span className="text-text-muted font-semibold">{i+1}</span>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: color + "25", color }}>
                    {initials}
                  </div>
                  <div>
                    <div className="font-semibold flex items-center gap-1">
                      {p.displayName}
                      {isCurrentUser && <span className="text-[10px] text-accent-violet">(you)</span>}
                    </div>
                    <div className="text-xs text-text-muted flex items-center gap-1">
                      {TIER_ICON[p.rankTier]}
                      <span className={TIER_COLOR[p.rankTier]}>{p.rankTier}</span>
                      · {p.city}
                    </div>
                  </div>
                  <span className="font-bold text-accent-gold">{p.rating}</span>
                  <span className="text-emerald-400 font-semibold">{p.wins}W</span>
                  <span className="flex items-center gap-1 text-orange-400">
                    {p.streak > 0 ? `🔥 ${p.streak}` : "—"}
                  </span>
                </div>
              );
            })}
          </div>

          {entries.length === 0 && (
            <div className="px-4 py-8 text-center text-text-muted text-sm">No players yet</div>
          )}
        </>
      )}
    </div>
  );
}
