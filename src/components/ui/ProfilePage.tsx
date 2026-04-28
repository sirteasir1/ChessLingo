"use client";
import { useState, useEffect, useCallback } from "react";
import { useStore } from "@/store/useStore";
import { getUserGames } from "@/lib/auth-actions";
import type { RankTier } from "@/types";

// ─── Constants ────────────────────────────────────────────────────────────────
const RANK_JOURNEY: { tier: RankTier; icon: string; color: string; min: number }[] = [
  { tier: "Pawn",   icon: "♟", color: "#9d9bb8", min: 0    },
  { tier: "Knight", icon: "♞", color: "#60a5fa", min: 400  },
  { tier: "Bishop", icon: "♝", color: "#34d399", min: 800  },
  { tier: "Rook",   icon: "♜", color: "#f97316", min: 1200 },
  { tier: "Queen",  icon: "♛", color: "#c084fc", min: 1800 },
  { tier: "King",   icon: "♚", color: "#f5c518", min: 2500 },
];
const RANK_MAX: Record<string, number> = {
  Pawn: 400, Knight: 800, Bishop: 1200, Rook: 1800, Queen: 2500, King: 9999,
};

// Chess opening book — first few moves → opening name
const OPENING_BOOK: Record<string, string> = {
  "e2e4 e7e5":             "Open Game",
  "e2e4 e7e5 g1f3":        "King's Knight Opening",
  "e2e4 e7e5 g1f3 b8c6":   "Ruy López / Italian",
  "e2e4 c7c5":             "Sicilian Defense",
  "e2e4 c7c6":             "Caro-Kann Defense",
  "e2e4 e7e6":             "French Defense",
  "e2e4 d7d5":             "Scandinavian Defense",
  "d2d4 d7d5":             "Queen's Gambit",
  "d2d4 g8f6":             "Indian Defense",
  "d2d4 g8f6 c2c4 e7e6":   "Queen's Indian / Nimzo",
  "d2d4 g8f6 c2c4 g7g6":   "King's Indian Defense",
  "c2c4":                  "English Opening",
  "g1f3":                  "Réti Opening",
};

function detectOpening(moveHistory: { from: number; to: number; san?: string }[]): string {
  const uciMoves = moveHistory.slice(0, 4).map(m => {
    const fc = m.from % 8, fr = 7 - Math.floor(m.from / 8);
    const tc = m.to   % 8, tr = 7 - Math.floor(m.to   / 8);
    return `${String.fromCharCode(97 + fc)}${fr + 1}${String.fromCharCode(97 + tc)}${tr + 1}`;
  }).join(" ");

  let best = "";
  for (const key of Object.keys(OPENING_BOOK)) {
    if (uciMoves.startsWith(key) && key.length > best.length) best = key;
  }
  return OPENING_BOOK[best] ?? "Custom Opening";
}

// ─── Coach tips per result / phase ───────────────────────────────────────────
function generateCoachTips(game: GameRecord): CoachSection[] {
  const moves    = (game.moveHistory as MoveRec[] | undefined) ?? [];
  const result   = game.result as string;
  const accuracy = game.accuracy as number ?? 70;
  const diff     = game.difficulty as string ?? "medium";
  const isWin    = result === "win";
  const isDraw   = result === "draw";

  const tips: CoachSection[] = [];

  // Opening phase (first 10 moves)
  const openingMoves = moves.slice(0, 10);
  const opening = detectOpening(moves);
  const openingTips: string[] = [`You opened with the ${opening}.`];

  const centerMoves = openingMoves.filter(m => {
    const tc = m.to % 8, tr = Math.floor(m.to / 8);
    return tc >= 2 && tc <= 5 && tr >= 2 && tr <= 5;
  });
  if (centerMoves.length >= 3) {
    openingTips.push("✅ Great center control in the opening — you fought for the key e4/d4/e5/d5 squares.");
  } else {
    openingTips.push("💡 Tip: In the opening, prioritize controlling the center (e4, d4, e5, d5). Central control gives your pieces maximum mobility.");
  }
  if (moves.length >= 6 && moves[4]) {
    openingTips.push("📖 Principle: Develop all minor pieces (knights & bishops) before moving the same piece twice or launching attacks.");
  }
  tips.push({ phase: "Opening", icon: "📖", color: "#60a5fa", tips: openingTips });

  // Middlegame phase
  const midMoves = moves.slice(10, moves.length - 10);
  const midTips: string[] = [];
  if (midMoves.length > 5) {
    midTips.push(`The middlegame lasted ${midMoves.length} moves — ${midMoves.length > 20 ? "a long strategic battle" : "a sharp tactical fight"}.`);
  }
  if (accuracy >= 80) {
    midTips.push("✅ Your accuracy was strong in the middlegame. You made purposeful moves.");
  } else if (accuracy >= 65) {
    midTips.push("⚠️ A few inaccuracies crept in during the middlegame. Before each move ask: does this move have a clear purpose?");
  } else {
    midTips.push("🔴 Several mistakes in the middlegame hurt your position. Practice tactics puzzles daily — most middlegame errors are tactical oversights.");
  }
  midTips.push("💡 Middlegame principle: Always check if your opponent has any threats BEFORE making your move. Reactive chess prevents blunders.");
  if (!isWin && !isDraw) {
    midTips.push("🎯 After a loss, find the exact move where things went wrong. Replaying that moment is the fastest way to improve.");
  }
  if (midMoves.length > 0) tips.push({ phase: "Middlegame", icon: "⚔️", color: "#f97316", tips: midTips });

  // Endgame phase
  const endMoves = moves.slice(-10);
  if (endMoves.length > 3) {
    const endTips: string[] = [];
    if (isWin) {
      endTips.push("✅ You converted the endgame successfully. Endgame technique is what separates club players from masters.");
    } else if (isDraw) {
      endTips.push("🤝 The game ended in a draw — sometimes that's the best outcome from a difficult position.");
    } else {
      endTips.push("⚠️ The endgame didn't go your way. The #1 endgame rule: activate your king! The king is a powerful piece in endgames.");
    }
    endTips.push("📐 Key endgame principle: Passed pawns must be pushed! They create unstoppable threats and force the opponent to react.");
    tips.push({ phase: "Endgame", icon: "🏁", color: "#34d399", tips: endTips });
  }

  // Overall assessment
  const overallTips: string[] = [];
  if (diff === "easy" && isWin) overallTips.push("💪 Easy level conquered. Try Medium next — it will expose new patterns you haven't seen yet.");
  if (diff === "hard" || diff === "master") overallTips.push("🔥 Playing against Hard/Master-level AI is the fastest way to improve. Each loss is a lesson.");
  overallTips.push(`📊 Your accuracy was ${accuracy}%. Aim for 85%+ consistently. Grandmasters average 95%+ even in rapid games.`);
  overallTips.push("🧩 Daily improvement formula: 20 min tactics puzzles + 1-2 full games + review your mistakes. Consistency beats intensity.");
  tips.push({ phase: "Overall", icon: "🤖", color: "#a855f7", tips: overallTips });

  return tips;
}

// ─── Key moment detection ─────────────────────────────────────────────────────
function detectKeyMoments(moves: MoveRec[]): KeyMoment[] {
  const moments: KeyMoment[] = [];

  for (let i = 0; i < moves.length; i++) {
    const m = moves[i];
    const moveNum = Math.floor(i / 2) + 1;
    const isWhite = i % 2 === 0;
    const san = m.san ?? `${squareName(m.from)}-${squareName(m.to)}`;

    // Check moves
    if (m.isCheck) {
      moments.push({
        moveNum, san, isWhite,
        type: "check",
        icon: "♔",
        color: "#f97316",
        label: "Check!",
        desc: `${isWhite ? "White" : "Black"} delivers check — forcing the opponent's king to move and possibly gaining tempo.`,
      });
    }
    // Captures
    if (m.captured) {
      const capturedName = PIECE_NAMES[m.captured[1]] ?? m.captured[1];
      const capturingName = PIECE_NAMES[m.piece?.[1]] ?? "Piece";
      moments.push({
        moveNum, san, isWhite,
        type: "capture",
        icon: "⚔️",
        color: "#60a5fa",
        label: `${capturingName} takes ${capturedName}`,
        desc: `Material is exchanged. Evaluate: are you trading equal value, winning material, or making a positional concession?`,
      });
    }
    // Promotions (pawn reaches last rank)
    const toRow = Math.floor(m.to / 8);
    if (m.piece?.[1] === "P" && (toRow === 0 || toRow === 7)) {
      moments.push({
        moveNum, san, isWhite,
        type: "promotion",
        icon: "👑",
        color: "#f5c518",
        label: "Pawn Promotion!",
        desc: "A pawn reaches the final rank and promotes — usually to a Queen. This is often a decisive moment that ends the game.",
      });
    }
  }

  return moments.slice(0, 8); // max 8 key moments
}

function squareName(sq: number): string {
  const c = sq % 8, r = Math.floor(sq / 8);
  return `${String.fromCharCode(97 + c)}${8 - r}`;
}

const PIECE_NAMES: Record<string, string> = {
  K: "King", Q: "Queen", R: "Rook", B: "Bishop", N: "Knight", P: "Pawn",
};

// ─── Move annotation ──────────────────────────────────────────────────────────
function annotateMoves(moves: MoveRec[]): AnnotatedMove[] {
  return moves.map((m, i) => {
    const san = m.san ?? `${squareName(m.from)}-${squareName(m.to)}`;
    const piece = PIECE_NAMES[m.piece?.[1]] ?? "Piece";
    const isWhite = i % 2 === 0;

    let explanation = "";
    const toRow = Math.floor(m.to / 8);
    const toCol = m.to % 8;
    const isCentral = toRow >= 2 && toRow <= 5 && toCol >= 2 && toCol <= 5;

    if (m.piece?.[1] === "P" && i < 6) {
      explanation = isCentral
        ? "Opening pawn move — fights for central control. ✅"
        : "Pawn move to flank. Consider central pawns first in the opening.";
    } else if (m.piece?.[1] === "N" && i < 10) {
      explanation = isCentral
        ? `${piece} developed to an active central square. ✅ Good development!`
        : `${piece} developed. Knights are strongest near the center.`;
    } else if (m.piece?.[1] === "B" && i < 14) {
      explanation = `${piece} developed — bishops love open diagonals. ✅`;
    } else if (m.piece?.[1] === "K" && Math.abs(m.from - m.to) === 2) {
      explanation = "Castling! King safety secured. ✅ Excellent — now your rook is also activated.";
    } else if (m.captured) {
      const capturedName = PIECE_NAMES[m.captured[1]] ?? m.captured[1];
      explanation = `${piece} captures ${capturedName}. Always verify you're not leaving a piece hanging after this trade.`;
    } else if (m.isCheck) {
      explanation = `Check! The opponent's king is under attack — they must respond. This may gain tempo.`;
    } else if (m.piece?.[1] === "Q" && i < 8) {
      explanation = "Early queen development. ⚠️ The queen can be chased away easily early on — develop minor pieces first.";
    } else {
      explanation = isWhite
        ? `${piece} repositioned. Ask: does this move improve your position or create a threat?`
        : `Opponent's ${piece} move. Try to identify their plan and counter it.`;
    }

    return { moveNum: Math.floor(i / 2) + 1, san, isWhite, piece, explanation };
  });
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface MoveRec {
  from: number;
  to: number;
  san?: string;
  piece?: string;
  captured?: string;
  isCheck?: boolean;
}

interface GameRecord {
  id?: string;
  result: string;
  accuracy?: number;
  ratingDelta?: number;
  mode?: string;
  difficulty?: string;
  moveHistory?: MoveRec[];
  timestamp?: { seconds: number };
  pgn?: string;
  analysis?: {
    coachMessages?: string[];
    playerStyle?: string;
    accuracy?: { white: number; black: number };
    stats?: Record<string, number>;
  };
}

interface CoachSection {
  phase: string;
  icon: string;
  color: string;
  tips: string[];
}

interface KeyMoment {
  moveNum: number;
  san: string;
  isWhite: boolean;
  type: string;
  icon: string;
  color: string;
  label: string;
  desc: string;
}

interface AnnotatedMove {
  moveNum: number;
  san: string;
  isWhite: boolean;
  piece: string;
  explanation: string;
}

// ─── Game Detail Modal ────────────────────────────────────────────────────────
function GameDetailModal({ game, onClose }: { game: GameRecord; onClose: () => void }) {
  const [tab, setTab] = useState<"overview" | "moves" | "coach" | "moments">("overview");

  const result   = game.result as string;
  const isWin    = result === "win";
  const isDraw   = result === "draw";
  const moves    = (game.moveHistory as MoveRec[] | undefined) ?? [];
  const accuracy = game.accuracy ?? 70;
  const delta    = game.ratingDelta ?? 0;
  const opening  = detectOpening(moves);
  const coachTips = generateCoachTips(game);
  const keyMoments = detectKeyMoments(moves);
  const annotatedMoves = annotateMoves(moves);

  const resultEmoji = isWin ? "🏆" : isDraw ? "🤝" : "😔";
  const resultText  = isWin ? "Victory" : isDraw ? "Draw" : "Defeat";
  const resultColor = isWin ? "#10b981" : isDraw ? "#60a5fa" : "#ef4444";
  const mode  = game.mode ?? "ai";
  const diff  = game.difficulty ?? "medium";
  const ts    = game.timestamp?.seconds;
  const date  = ts ? new Date(ts * 1000).toLocaleString() : "—";

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl overflow-hidden border border-white/10 shadow-[0_40px_120px_rgba(0,0,0,.95)]"
        style={{ background: "linear-gradient(180deg,#0d0d20 0%,#07070f 100%)" }}>

        {/* Header */}
        <div className="relative px-6 py-5 border-b border-white/5 shrink-0"
          style={{ background: `linear-gradient(135deg, ${isWin ? "#061a0e" : isDraw ? "#06080f" : "#180606"}, transparent)` }}>
          <div className="absolute inset-0 opacity-20"
            style={{ background: `radial-gradient(ellipse at 30% 50%, ${resultColor}44, transparent 60%)` }} />
          <div className="relative flex items-center gap-4">
            <div className="text-4xl">{resultEmoji}</div>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xl font-black" style={{ color: resultColor }}>{resultText}</span>
                <span className="text-sm glass px-3 py-1 rounded-full border border-white/10 text-text-muted capitalize">
                  {mode === "ai" ? `vs AI · ${diff}` : mode === "friend" ? "vs Friend" : mode}
                </span>
                <span className="text-xs text-text-muted">{date}</span>
              </div>
              <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                <span className="text-sm font-semibold text-text-secondary">📖 {opening}</span>
                <span className="text-sm font-mono">{moves.length} moves</span>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className={`text-lg font-black ${isWin ? "text-emerald-400" : isDraw ? "text-blue-400" : "text-red-400"}`}>
                {delta > 0 ? "+" : ""}{delta}
              </div>
              <button onClick={onClose}
                className="w-8 h-8 rounded-full glass border border-white/10 flex items-center justify-center text-text-muted hover:text-white hover:border-white/30 transition-all text-lg">
                ×
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/5 shrink-0">
          {(["overview", "moves", "coach", "moments"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-all
                ${tab === t
                  ? "text-white border-b-2 border-accent-purple bg-white/3"
                  : "text-white/30 hover:text-white/60"}`}>
              {t === "overview" ? "📊 Stats" : t === "moves" ? "♟ Moves" : t === "coach" ? "🤖 Coach" : "⚡ Moments"}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* ── Overview ── */}
          {tab === "overview" && (
            <div className="space-y-4">
              {/* Accuracy bar */}
              <div className="glass rounded-2xl p-4 border border-white/5">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-text-muted">Your accuracy</span>
                  <span className="text-2xl font-black" style={{
                    color: accuracy >= 85 ? "#10b981" : accuracy >= 65 ? "#f5c518" : "#ef4444"
                  }}>{accuracy}%</span>
                </div>
                <div className="h-3 bg-white/8 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-1000"
                    style={{
                      width: `${accuracy}%`,
                      background: accuracy >= 85
                        ? "linear-gradient(90deg,#10b981,#34d399)"
                        : accuracy >= 65
                        ? "linear-gradient(90deg,#f5c518,#fbbf24)"
                        : "linear-gradient(90deg,#ef4444,#f97316)"
                    }} />
                </div>
                <div className="flex justify-between text-xs text-text-muted mt-2">
                  <span>Beginner 50%</span>
                  <span>Club 70%</span>
                  <span>Expert 85%</span>
                  <span>GM 95%+</span>
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Moves",    val: moves.length,    icon: "♟", color: "#a855f7" },
                  { label: "Rating Δ", val: `${delta > 0 ? "+" : ""}${delta}`, icon: "⚡", color: isWin ? "#10b981" : isDraw ? "#60a5fa" : "#ef4444" },
                  { label: "Opening",  val: opening.split(" ").slice(0,2).join(" "), icon: "📖", color: "#60a5fa" },
                ].map(s => (
                  <div key={s.label} className="glass rounded-xl p-3 text-center border border-white/5">
                    <div className="text-xl mb-1">{s.icon}</div>
                    <div className="text-sm font-bold" style={{ color: s.color }}>{s.val}</div>
                    <div className="text-xs text-text-muted mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Move stats from analysis */}
              {game.analysis?.stats && Object.entries(game.analysis.stats).some(([, v]) => (v as number) > 0) && (
                <div className="glass rounded-2xl p-4 border border-white/5">
                  <div className="text-xs font-bold text-text-muted tracking-wider mb-3">MOVE QUALITY</div>
                  <div className="grid grid-cols-4 gap-2">
                    {Object.entries(game.analysis.stats)
                      .filter(([, v]) => (v as number) > 0)
                      .map(([k, v]) => {
                        const colors: Record<string, string> = {
                          brilliant: "#06b6d4", great: "#10b981", best: "#34d399", good: "#60a5fa",
                          inaccuracy: "#f5c518", mistake: "#f97316", blunder: "#ef4444",
                        };
                        const icons: Record<string, string> = {
                          brilliant: "💎", great: "✨", best: "✅", good: "👍",
                          inaccuracy: "⚠️", mistake: "❌", blunder: "💣",
                        };
                        return (
                          <div key={k} className="bg-white/3 rounded-xl p-2 text-center">
                            <div>{icons[k] ?? "•"}</div>
                            <div className="text-lg font-black mt-0.5" style={{ color: colors[k] ?? "#fff" }}>{v as number}</div>
                            <div className="text-[9px] text-text-muted capitalize mt-0.5">{k}</div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Player style */}
              {game.analysis?.playerStyle && (
                <div className="glass rounded-xl p-4 border border-accent-purple/20 flex items-center gap-3">
                  <span className="text-2xl">🎭</span>
                  <div>
                    <div className="text-xs text-text-muted">Play Style This Game</div>
                    <div className="font-bold text-accent-violet">{game.analysis.playerStyle}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Moves ── */}
          {tab === "moves" && (
            <div className="space-y-2">
              <div className="text-xs text-text-muted mb-3 leading-relaxed glass rounded-xl px-3 py-2 border border-white/5">
                💡 Every move annotated — hover to understand the idea behind each decision.
              </div>
              <div className="grid gap-1.5">
                {annotatedMoves.map((m, i) => (
                  <div key={i}
                    className="glass rounded-xl p-3 border border-white/5 hover:border-white/15 transition-all group cursor-default">
                    <div className="flex items-start gap-3">
                      <div className="shrink-0 flex items-center gap-1.5">
                        <span className="text-xs text-text-muted font-mono w-6 text-right">{m.moveNum}{m.isWhite ? "." : "…"}</span>
                        <span className={`text-xs font-black px-2 py-0.5 rounded-md font-mono
                          ${m.isWhite ? "bg-white/10 text-white" : "bg-white/5 text-text-secondary"}`}>
                          {m.san}
                        </span>
                      </div>
                      <p className="text-xs text-text-muted group-hover:text-text-secondary leading-relaxed transition-colors flex-1">
                        {m.explanation}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              {moves.length === 0 && (
                <div className="text-center py-8 text-text-muted text-sm">Move data not available for this game.</div>
              )}
            </div>
          )}

          {/* ── Coach ── */}
          {tab === "coach" && (
            <div className="space-y-4">
              <div className="glass rounded-xl px-4 py-3 border border-white/5 text-xs text-text-muted leading-relaxed">
                🤖 AI Coach analyzes your game by phase — opening, middlegame, and endgame — giving you actionable advice to improve.
              </div>
              {coachTips.map((section, i) => (
                <div key={i} className="glass rounded-2xl overflow-hidden border border-white/5">
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5"
                    style={{ background: `${section.color}12` }}>
                    <span className="text-lg">{section.icon}</span>
                    <span className="font-bold text-sm" style={{ color: section.color }}>{section.phase} Analysis</span>
                  </div>
                  <div className="p-4 space-y-2.5">
                    {section.tips.map((tip, j) => (
                      <div key={j} className="flex gap-3 items-start">
                        <div className="w-1 h-1 rounded-full mt-2 shrink-0" style={{ background: section.color }} />
                        <p className="text-sm text-text-secondary leading-relaxed">{tip}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {/* Saved coach messages from AI */}
              {game.analysis?.coachMessages && game.analysis.coachMessages.length > 0 && (
                <div className="glass rounded-2xl overflow-hidden border border-accent-violet/20">
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-accent-violet/10">
                    <span className="text-lg">🔮</span>
                    <span className="font-bold text-sm text-accent-violet">Post-Game AI Notes</span>
                  </div>
                  <div className="p-4 space-y-2.5">
                    {game.analysis.coachMessages.map((msg, j) => (
                      <div key={j} className="flex gap-3 items-start">
                        <div className="w-1 h-1 rounded-full mt-2 shrink-0 bg-accent-violet" />
                        <p className="text-sm text-text-secondary leading-relaxed">{msg}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Key Moments ── */}
          {tab === "moments" && (
            <div className="space-y-3">
              <div className="glass rounded-xl px-4 py-3 border border-white/5 text-xs text-text-muted leading-relaxed">
                ⚡ Key turning points detected in this game — checks, captures, and decisive moments.
              </div>
              {keyMoments.length === 0 ? (
                <div className="text-center py-8 text-text-muted text-sm">No key moments detected in this game.</div>
              ) : (
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-[19px] top-4 bottom-4 w-px bg-white/10" />
                  <div className="space-y-3">
                    {keyMoments.map((moment, i) => (
                      <div key={i} className="flex gap-4 items-start">
                        {/* Timeline dot */}
                        <div className="relative z-10 shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg border border-white/10"
                          style={{ background: `${moment.color}22`, borderColor: `${moment.color}44` }}>
                          {moment.icon}
                        </div>
                        <div className="flex-1 glass rounded-xl p-3 border border-white/5 hover:border-white/15 transition-all">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className="text-xs font-mono bg-white/8 px-2 py-0.5 rounded-md text-text-secondary">
                              Move {moment.moveNum}{moment.isWhite ? "." : "…"} {moment.san}
                            </span>
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                              style={{ background: `${moment.color}22`, color: moment.color }}>
                              {moment.label}
                            </span>
                          </div>
                          <p className="text-xs text-text-muted leading-relaxed">{moment.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Game History Card ────────────────────────────────────────────────────────
function GameHistoryCard({ game, onClick }: { game: GameRecord; onClick: () => void }) {
  const result  = game.result;
  const isWin   = result === "win";
  const isDraw  = result === "draw";
  const moves   = (game.moveHistory as MoveRec[] | undefined) ?? [];
  const delta   = game.ratingDelta ?? 0;
  const mode    = game.mode ?? "ai";
  const diff    = game.difficulty ?? "medium";
  const ts      = game.timestamp?.seconds;
  const date    = ts ? new Date(ts * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—";
  const time    = ts ? new Date(ts * 1000).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : "";
  const opening = detectOpening(moves);
  const acc     = game.accuracy ?? 70;

  return (
    <button
      onClick={onClick}
      className="w-full text-left glass rounded-2xl border border-white/5 hover:border-white/20 transition-all hover:shadow-[0_4px_20px_rgba(124,58,237,.15)] hover:scale-[1.01] group overflow-hidden"
    >
      <div className="flex items-stretch gap-0">
        {/* Result stripe */}
        <div className={`w-1.5 shrink-0 ${isWin ? "bg-emerald-500" : isDraw ? "bg-blue-500" : "bg-red-500"}`} />

        <div className="flex-1 p-4 flex items-center gap-4">
          {/* Result badge */}
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-base font-black shrink-0
            ${isWin ? "bg-emerald-900/60 text-emerald-400" : isDraw ? "bg-blue-900/60 text-blue-400" : "bg-red-900/60 text-red-400"}`}>
            {isWin ? "W" : isDraw ? "D" : "L"}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold capitalize text-text-primary">
                {mode === "ai" ? `vs AI (${diff})` : mode === "friend" ? "vs Friend" : mode}
              </span>
              <span className="text-xs text-text-muted bg-white/5 px-2 py-0.5 rounded-full">{opening.split(" ").slice(0, 3).join(" ")}</span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-text-muted">{moves.length} moves</span>
              <span className="text-xs text-text-muted">·</span>
              <span className="text-xs text-text-muted">{date} {time}</span>
              <span className="text-xs text-text-muted">·</span>
              <span className="text-xs" style={{ color: acc >= 80 ? "#10b981" : acc >= 65 ? "#f5c518" : "#ef4444" }}>
                {acc}% acc
              </span>
            </div>
          </div>

          {/* Rating change */}
          <div className="text-right shrink-0">
            <div className={`text-base font-black ${isWin ? "text-emerald-400" : isDraw ? "text-blue-400" : "text-red-400"}`}>
              {delta > 0 ? "+" : ""}{delta}
            </div>
            <div className="text-[10px] text-text-muted">rating</div>
          </div>

          {/* Arrow */}
          <div className="text-text-muted group-hover:text-text-secondary transition-colors text-sm shrink-0">→</div>
        </div>
      </div>
    </button>
  );
}

// ─── Main ProfilePage ─────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { user } = useStore();
  const [games, setGames] = useState<GameRecord[]>([]);
  const [loadingGames, setLoadingGames] = useState(true);
  const [selectedGame, setSelectedGame] = useState<GameRecord | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const loadGames = useCallback(async () => {
    if (!user) return;
    setLoadingGames(true);
    setHistoryError(null);
    try {
      const g = await getUserGames(user.uid, 30);
      setGames(g as GameRecord[]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load";
      setHistoryError(msg);
    } finally {
      setLoadingGames(false);
    }
  }, [user?.uid]);

  useEffect(() => { loadGames(); }, [loadGames]);

  if (!user) return null;

  const { stats, rating, rank, streak } = user;
  const winRate = stats.gamesPlayed > 0
    ? Math.round((stats.wins / stats.gamesPlayed) * 100) : 0;

  const rankData = RANK_JOURNEY.find(r => r.tier === rank);
  const rankMax  = RANK_MAX[rank] ?? 2500;
  const rankMin  = rankData?.min ?? 0;
  const ratingProgress = Math.min(1, (rating - rankMin) / (rankMax - rankMin));
  const currentRankIndex = RANK_JOURNEY.findIndex(r => r.tier === rank);
  const initials = user.displayName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  const statsGrid = [
    { label: "Games",    val: stats.gamesPlayed,           color: "text-accent-violet" },
    { label: "Rating",   val: rating.toLocaleString(),      color: "text-accent-gold"   },
    { label: "Win Rate", val: `${winRate}%`,                color: "text-emerald-400"   },
    { label: "Wins",     val: stats.wins,                   color: "text-emerald-400"   },
    { label: "Accuracy", val: `${stats.avgAccuracy ?? 0}%`, color: "text-blue-400"      },
    { label: "Streak 🔥",val: streak,                       color: "text-orange-400"    },
  ];

  return (
    <div className="overflow-y-auto h-full p-6">
      <div className="max-w-lg mx-auto flex flex-col gap-6">

        {/* ── Avatar + name ── */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold text-white overflow-hidden shadow-[0_0_30px_rgba(124,58,237,.4)]"
              style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)" }}>
              {user.photoURL
                ? <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" />
                : initials}
            </div>
            {streak >= 3 && (
              <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-orange-500 rounded-full flex items-center justify-center text-sm">🔥</div>
            )}
          </div>
          <div className="text-center">
            <div className="text-2xl font-display font-bold">{user.displayName}</div>
            <div className="text-text-muted text-sm">{user.email}</div>
            <div className="flex items-center justify-center gap-2 mt-1">
              <span className="text-sm font-semibold" style={{ color: rankData?.color }}>
                {rankData?.icon} {rank}
              </span>
              {user.isPro && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-gradient-to-r from-accent-gold to-accent-gold2 text-black font-bold">PRO</span>
              )}
            </div>
          </div>

          {/* Rating progress */}
          <div className="w-full max-w-xs">
            <div className="flex justify-between text-xs text-text-muted mb-1.5">
              <span>{rank}: {rating}</span>
              <span>Next: {rankMax === 9999 ? "MAX" : rankMax}</span>
            </div>
            <div className="h-2.5 bg-bg-elevated rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${ratingProgress * 100}%`,
                  background: `linear-gradient(90deg,${rankData?.color ?? "#7c3aed"},${rankData?.color ?? "#a855f7"}aa)`,
                }} />
            </div>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-3 gap-3">
          {statsGrid.map(s => (
            <div key={s.label} className="bg-bg-surface border border-border-subtle rounded-2xl p-4 text-center hover:border-border-default transition-colors">
              <div className={`text-2xl font-bold ${s.color}`}>{s.val}</div>
              <div className="text-xs text-text-muted mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Rank Journey ── */}
        <div>
          <div className="text-xs font-bold text-text-muted tracking-wider mb-3">RANK JOURNEY</div>
          <div className="flex gap-2 flex-wrap">
            {RANK_JOURNEY.map((r, i) => {
              const done    = i < currentRankIndex;
              const current = i === currentRankIndex;
              return (
                <div key={r.tier}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm border transition-all
                    ${done    ? "border-border-default bg-bg-elevated" :
                      current ? "border-accent-gold bg-[#1a1500] shadow-glow-gold" :
                      "border-border-subtle bg-bg-surface text-text-muted"}`}>
                  <span style={{ color: done || current ? r.color : undefined }}>{r.icon}</span>
                  <span style={{ color: done || current ? r.color : undefined }}>{r.tier}</span>
                  {done    && <span className="text-xs text-emerald-400">✓</span>}
                  {current && <span className="text-xs text-accent-gold">Current</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Equipped ── */}
        {user.inventory.length > 0 && (
          <div>
            <div className="text-xs font-bold text-text-muted tracking-wider mb-3">EQUIPPED</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Piece Set", val: user.equipped.pieceSet?.replace("_pieces","").replace(/_/g," ") ?? "Classic" },
                { label: "Board",     val: user.equipped.board?.replace("_board","").replace(/_/g," ") ?? "Classic"     },
                { label: "Avatar",    val: user.equipped.avatar ? user.equipped.avatar.replace("av_","").replace(/_/g," ") : "None" },
                { label: "Effect",    val: user.equipped.effect ? user.equipped.effect.replace("fx_","").replace(/_/g," ") : "None" },
              ].map(e => (
                <div key={e.label} className="bg-bg-elevated border border-border-subtle rounded-xl px-3 py-2.5">
                  <div className="text-xs text-text-muted">{e.label}</div>
                  <div className="text-sm font-semibold capitalize">{e.val}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Game History ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-bold text-text-muted tracking-wider">GAME HISTORY</div>
            <button onClick={loadGames} className="text-xs text-text-muted hover:text-text-secondary transition-colors px-2 py-1 rounded-lg hover:bg-white/5">
              ↻ Refresh
            </button>
          </div>

          {loadingGames ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <div className="w-8 h-8 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-text-muted">Loading your game history…</span>
            </div>
          ) : historyError ? (
            <div className="glass rounded-2xl p-5 border border-red-500/20 text-center space-y-2">
              <div className="text-red-400 font-semibold text-sm">⚠️ Could not load history</div>
              <div className="text-xs text-text-muted">{historyError}</div>
              {historyError.includes("index") && (
                <div className="text-xs text-text-muted mt-2 bg-white/5 rounded-xl px-3 py-2 text-left">
                  <strong className="text-text-secondary">Fix:</strong> Go to Firebase Console → Firestore → Indexes → Add composite index:<br />
                  Collection: <code className="text-accent-violet">games</code> | Fields: <code className="text-accent-violet">uid ASC, timestamp DESC</code>
                </div>
              )}
              <button onClick={loadGames} className="text-xs text-accent-purple hover:text-accent-violet mt-1">Try again →</button>
            </div>
          ) : games.length === 0 ? (
            <div className="glass rounded-2xl p-8 text-center border border-white/5 space-y-2">
              <div className="text-3xl mb-3">♟️</div>
              <div className="text-text-secondary font-semibold text-sm">No games yet</div>
              <div className="text-text-muted text-xs">Play your first game and your full analysis will appear here!</div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-xs text-text-muted mb-2">{games.length} games found — tap any to see full analysis</div>
              {games.map((g, i) => (
                <GameHistoryCard key={(g as GameRecord & { id?: string }).id ?? i} game={g} onClick={() => setSelectedGame(g)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Game Detail Modal ── */}
      {selectedGame && (
        <GameDetailModal game={selectedGame} onClose={() => setSelectedGame(null)} />
      )}
    </div>
  );
}
