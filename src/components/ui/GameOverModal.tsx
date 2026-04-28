"use client";
import { useEffect, useRef, useState } from "react";
import { useStore } from "@/store/useStore";
import { saveGameResult } from "@/lib/auth-actions";

const STAT_ICONS: Record<string,string> = {
  brilliant:"💎", great:"✨", best:"✅", good:"👍", inaccuracy:"⚠️", mistake:"❌", blunder:"💣",
};
const STAT_COLORS: Record<string,string> = {
  brilliant:"text-cyan-400", great:"text-emerald-400", best:"text-green-400",
  good:"text-blue-400", inaccuracy:"text-yellow-400", mistake:"text-orange-400", blunder:"text-red-400",
};

export default function GameOverModal({ onClose, onNewGame }: { onClose:()=>void; onNewGame:()=>void }) {
  const { gameResult, gameResultType, analysis, user, moveHistory, difficulty, gameMode, setUser, gameSaved } = useStore();
  const [tab, setTab] = useState<"result"|"analysis"|"coach">("result");
  const [saveStatus, setSaveStatus] = useState<"idle"|"saving"|"saved"|"error">("idle");

  const type   = gameResultType ?? "loss";
  const isWin  = type === "win";
  const isDraw = type === "draw";
  const emoji  = isWin ? "🏆" : isDraw ? "🤝" : "😔";
  const title  = isWin ? "Victory!" : isDraw ? "Draw" : "Defeat";

  // Compute reward based on actual result type — stable across re-renders via ref
  // We initialise lazily: first time type is set to a real value
  const rewardRef = useRef<{ delta: number; coins: number } | null>(null);
  if (!rewardRef.current && gameResultType) {
    rewardRef.current = {
      delta:  isWin ? Math.floor(8  + Math.random()*15) : isDraw ? 0 : -Math.floor(6+Math.random()*10),
      coins:  isWin ? Math.floor(80 + Math.random()*40) : Math.floor(10+Math.random()*15),
    };
  }
  const delta  = rewardRef.current?.delta  ?? 0;
  const coins  = rewardRef.current?.coins  ?? 10;

  useEffect(() => {
    // Guard: only save if we have a real result, user, moves, and haven't saved yet
    if (!user || gameSaved || !gameResultType || moveHistory.length === 0) return;
    // Mark as saved in store immediately to prevent double-save across remounts
    useStore.setState({ gameSaved: true });
    setSaveStatus("saving");

    const pgn = moveHistory.map((m: any, i: number) =>
      `${Math.floor(i/2)+1}${i%2===0?".":"..."} ${m.san ?? `${m.from}-${m.to}`}`
    ).join(" ");

    saveGameResult(
      user.uid,
      type,
      analysis?.accuracy?.white ?? 72,
      moveHistory.length,
      delta,
      coins,
      {
        mode: gameMode,
        difficulty,
        pgn,
        moveHistory,
        whitePlayer: user.displayName,
        blackPlayer: gameMode === "ai" ? `AI (${difficulty})` : "Friend",
        analysis,
      }
    ).then(updated => {
      setSaveStatus("saved");
      if (updated && user) {
        setUser({
          ...user,
          rating: updated.newRating,
          coins:  updated.newCoins,
          streak: updated.newStreak,
          xp:     updated.newXp,
          rank:   updated.newRank as typeof user.rank,
          stats:  updated.stats,
        });
      }
    }).catch(err => {
      console.error("saveGameResult failed:", err);
      setSaveStatus("error");
    });
  }, [gameResultType, gameSaved, user?.uid]); // eslint-disable-line

  const acc = analysis?.accuracy?.white ?? 72;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in p-4">
      <div className="glass-strong rounded-3xl w-full max-w-md overflow-hidden border border-white/8 shadow-[0_40px_100px_rgba(0,0,0,.95)]">

        {/* Header */}
        <div className="relative py-6 px-6 text-center overflow-hidden"
          style={{ background: isWin
            ? "linear-gradient(135deg,#0a1f0a,#1a3d10)"
            : isDraw ? "linear-gradient(135deg,#1a1a0a,#0d0d20)"
            : "linear-gradient(135deg,#2a0808,#0d0520)" }}>
          <div className="absolute inset-0 pointer-events-none"
            style={{ background:"radial-gradient(ellipse at 50% 0%,rgba(124,58,237,.3),transparent 70%)" }} />

          <div className="text-5xl mb-2 animate-float">{emoji}</div>
          <h2 className="font-display text-3xl font-black mb-1">{title}</h2>
          <p className="text-text-muted text-sm">{gameResult}</p>

          <div className="flex justify-center gap-3 mt-4 flex-wrap">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold
              ${isWin ? "bg-emerald-900/60 text-emerald-400" : isDraw ? "bg-blue-900/60 text-blue-400" : "bg-red-900/60 text-red-400"}`}>
              ⚡ {delta > 0 ? "+" : ""}{delta} Rating
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-900/40 text-amber-400 text-sm font-bold">
              🪙 +{coins} Coins
            </div>
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold
              ${saveStatus === "saved"  ? "bg-emerald-900/40 text-emerald-400" :
                saveStatus === "saving" ? "bg-white/5 text-text-muted" :
                saveStatus === "error"  ? "bg-red-900/40 text-red-400" : "bg-white/5 text-text-muted"}`}>
              {saveStatus === "saving" && <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin-slow" />}
              {saveStatus === "saved"  ? "✓ Saved" :
               saveStatus === "saving" ? "Saving…" :
               saveStatus === "error"  ? "⚠ Save failed" : ""}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/5">
          {(["result","analysis","coach"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors
                ${tab === t ? "text-white border-b-2 border-accent-purple" : "text-white/30 hover:text-white/60"}`}>
              {t === "result" ? "📊 Stats" : t === "analysis" ? "🔍 Analysis" : "🤖 AI Coach"}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-5 max-h-60 overflow-y-auto">
          {tab === "result" && (
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-text-muted">Your accuracy</span>
                  <span className="font-bold text-accent-gold">{acc}%</span>
                </div>
                <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-1000"
                    style={{ width:`${acc}%`,
                      background: acc>=85?"linear-gradient(90deg,#10b981,#34d399)"
                        : acc>=65?"linear-gradient(90deg,#f5c518,#fbbf24)"
                        : "linear-gradient(90deg,#ef4444,#f97316)" }} />
                </div>
              </div>
              {analysis?.stats && (
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(analysis.stats).filter(([,v]) => (v as number) > 0).map(([k,v]) => (
                    <div key={k} className="glass rounded-xl p-2.5 text-center">
                      <div className="text-xl">{STAT_ICONS[k]}</div>
                      <div className={`text-sm font-black ${STAT_COLORS[k]}`}>{v as number}</div>
                      <div className="text-[9px] text-text-muted capitalize mt-0.5">{k}</div>
                    </div>
                  ))}
                </div>
              )}
              {analysis?.playerStyle && (
                <div className="glass rounded-xl p-3 text-center">
                  <div className="text-xs text-text-muted mb-1">Play Style</div>
                  <div className="font-bold text-accent-violet">{analysis.playerStyle}</div>
                </div>
              )}
              <div className="text-xs text-text-muted text-center">{moveHistory.length} moves played</div>
            </div>
          )}

          {tab === "analysis" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="glass rounded-xl p-3 text-center">
                  <div className="text-xs text-text-muted mb-1">Your Accuracy</div>
                  <div className="text-2xl font-black text-accent-gold">{analysis?.accuracy?.white ?? acc}%</div>
                </div>
                <div className="glass rounded-xl p-3 text-center">
                  <div className="text-xs text-text-muted mb-1">Opponent</div>
                  <div className="text-2xl font-black text-text-secondary">{analysis?.accuracy?.black ?? 80}%</div>
                </div>
              </div>
              {analysis?.openingName && (
                <div className="glass rounded-xl p-3">
                  <div className="text-xs text-text-muted mb-1">Opening</div>
                  <div className="font-semibold text-sm">{analysis.openingName}</div>
                </div>
              )}
            </div>
          )}

          {tab === "coach" && (
            <div className="space-y-2.5">
              {(analysis?.coachMessages ?? [
                "Control the center with e4/d4 in the opening.",
                "Develop all pieces before launching attacks.",
                "Castle early to keep your king safe.",
              ]).map((msg: string, i: number) => (
                <div key={i} className="flex gap-3 glass rounded-xl p-3">
                  <span className="text-lg shrink-0">🤖</span>
                  <p className="text-sm text-text-secondary leading-relaxed">{msg}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-4 border-t border-white/5">
          <button onClick={onNewGame}
            className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-accent-purple to-accent-violet text-white font-black text-sm
              hover:opacity-90 transition-all shadow-[0_4px_20px_rgba(124,58,237,.4)] hover:scale-[1.02]">
            ⚔️ New Game
          </button>
          <button onClick={onClose}
            className="px-5 py-3 rounded-2xl glass border border-white/8 hover:border-white/20 text-sm font-semibold transition-all">
            Review
          </button>
        </div>
      </div>
    </div>
  );
}
