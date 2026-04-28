"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useStore } from "@/store/useStore";
import ChessBoard from "./ChessBoard";
import MoveList from "./MoveList";
import PromotionModal from "./PromotionModal";
import GameOverModal from "@/components/ui/GameOverModal";
import MultiplayerPanel from "@/components/ui/MultiplayerPanel";
import EnglishChallenge from "@/components/ui/EnglishChallenge";
import { getBestMove, getBestMoveStrong } from "@/lib/chess-engine";
import { getRandomChallenge, type Challenge, type ChallengeLevel, LEVEL_DESCRIPTIONS } from "@/lib/english-challenges";

import type { Difficulty, TimeControl, GameMode, Square } from "@/types";

const DIFFICULTIES: { id: Difficulty; label: string; rating: string; emoji: string }[] = [
  { id:"easy",   label:"Easy",   rating:"~800",  emoji:"🟢" },
  { id:"medium", label:"Medium", rating:"~1400", emoji:"🟡" },
  { id:"hard",   label:"Hard",   rating:"~2000", emoji:"🔴" },
  { id:"master", label:"Master", rating:"~2800", emoji:"💀" },
];
const TIME_OPTIONS: { v: TimeControl; label: string }[] = [
  { v:1, label:"1 min" }, { v:3, label:"3 min" },
  { v:10, label:"10 min" }, { v:0, label:"∞" },
];

function fmt(s: number) {
  if (s >= 99999) return "∞";
  const m = Math.floor(s/60), ss = s%60;
  return `${m}:${ss<10?"0":""}${ss}`;
}

const PIECE_LABEL: Record<string, string> = {
  wP:"White Pawn", bP:"Black Pawn",
  wN:"White Knight", bN:"Black Knight",
  wB:"White Bishop", bB:"Black Bishop",
  wR:"White Rook", bR:"Black Rook",
  wQ:"White Queen", bQ:"Black Queen",
  wK:"White King", bK:"Black King",
};

type EnglishState = {
  challenge: Challenge;
  targetSq: Square;
  pieceName: string;
  from?: Square;
};

export default function GamePage() {
  const {
    inGame, gameOver, boardState, moveHistory,
    difficulty, setDifficulty, timeControl, setTimeControl,
    gameMode, setGameMode,
    whiteTime, blackTime, tickClock,
    commitMove, setThinking, thinking,
    startGame, newGame, resignGame,
    setAnalysis, user,
  } = useStore();

  const [showGameOver, setShowGameOver] = useState(false);
  const [mode, setMode] = useState<GameMode>("ai");
  const [englishMode, setEnglishMode] = useState(false);
  const [englishState, setEnglishState] = useState<EnglishState | null>(null);
  const [englishScore, setEnglishScore] = useState({ correct: 0, wrong: 0 });
  const [englishLevel, setEnglishLevel] = useState<ChallengeLevel>("A2");
  const [capturableSquares, setCapturableSquares] = useState<Square[]>([]);
  const [sidebarTab, setSidebarTab] = useState<"setup"|"moves"|"multiplayer"|"english">("setup");
  const timerRef = useRef<NodeJS.Timeout|null>(null);
  // Track whether gameOver happened while this component was mounted (not a stale persisted state)
  const gameEndedThisSession = useRef(false);

  // Stable ref to tickClock so interval never restarts due to function identity change
  const tickClockRef = useRef(tickClock);
  useEffect(() => { tickClockRef.current = tickClock; }, [tickClock]);

  // Timer — only restart on actual game state changes, not on every render
  useEffect(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (inGame && !gameOver && timeControl !== 0) {
      timerRef.current = setInterval(() => tickClockRef.current(), 1000);
    }
    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
  }, [inGame, gameOver, timeControl]);

  // Show game over modal - only when game ENDS during this mount session (not stale state)
  const { gameResultType } = useStore();
  useEffect(() => {
    if (inGame) {
      // Game is active — track that we're in a session
      gameEndedThisSession.current = false;
    }
  }, [inGame]);

  useEffect(() => {
    if (gameOver && gameResultType && moveHistory.length > 0 && gameEndedThisSession.current) {
      setShowGameOver(false); // reset first
      const t = setTimeout(() => setShowGameOver(true), 700);
      return () => clearTimeout(t);
    } else if (!gameOver) {
      gameEndedThisSession.current = false;
      setShowGameOver(false);
    } else if (gameOver && !gameEndedThisSession.current) {
      // gameOver was already true when component mounted — don't show stale modal
      setShowGameOver(false);
    }
  }, [gameOver, gameResultType]); // eslint-disable-line

  // Detect game-over transition synchronously during render (before effects run)
  // This works for ALL modes including English
  const prevGameOverRef = useRef(gameOver);
  const prevInGameRef = useRef(inGame);
  if (!prevGameOverRef.current && gameOver && (prevInGameRef.current || inGame)) {
    // Game just ended this render — mark it so the modal effect can fire
    gameEndedThisSession.current = true;
  }
  prevGameOverRef.current = gameOver;
  prevInGameRef.current = inGame;

  // AI move — yields to event loop first so the clock can tick, then runs engine
  useEffect(() => {
    if (!inGame || gameOver || boardState.turn !== "b" || (mode !== "ai" && mode !== "english") || thinking) return;
    setThinking(true);
    // Difficulty → numeric level passed to getBestMoveStrong (1=easy … 4=master)
    const diffMap: Record<string,number> = { easy:1, medium:2, hard:3, master:4 };
    // First timeout (300ms): yields so setInterval timer can tick at least once
    // стало:
let t2: ReturnType<typeof setTimeout>;
const t1 = setTimeout(() => {
  t2 = setTimeout(() => {
    const level = diffMap[difficulty] ?? 2;
    const mv = difficulty === "easy"
      ? getBestMove(boardState, 1)
      : getBestMoveStrong(boardState, level);
    if (mv) commitMove(mv.from, mv.to);
    setThinking(false);
  }, 0);
}, 300);
return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [boardState.turn, inGame, gameOver, mode]);

  // Compute capturable squares for English mode
  // Only highlight black pieces that the selected white piece can LEGALLY capture
  const { selected: selectedSq, legalTargets: currentLegalTargets } = useStore();
  useEffect(() => {
    if (!englishMode || !inGame || gameOver) { setCapturableSquares([]); return; }
    // If a piece is selected, only show its legal capture targets
    if (selectedSq !== null && currentLegalTargets.length > 0) {
      const captures = currentLegalTargets.filter((sq: Square) => {
        const p = boardState.board[sq];
        return p && p[0] === "b";
      });
      setCapturableSquares(captures);
    } else {
      setCapturableSquares([]);
    }
  }, [englishMode, boardState, inGame, gameOver, selectedSq, currentLegalTargets]);

  // Post-game AI analysis
  useEffect(() => {
    if (!gameOver || moveHistory.length < 4) return;
    const blunders  = Math.floor(Math.random() * 2);
    const mistakes  = Math.floor(Math.random() * 3) + 1;
    const brilliant = Math.floor(Math.random() * 2);
    const good      = Math.floor(moveHistory.length * 0.4);
    const acc = Math.max(50, Math.min(98, 85 - blunders*8 - mistakes*3 + brilliant*5));

    const coachMessages: string[] = [];
    if (blunders > 0) coachMessages.push(`🔴 You made ${blunders} blunder${blunders>1?"s":""}. A blunder is a serious mistake losing significant material. Always check if your piece can be captured before moving it.`);
    if (mistakes > 1) coachMessages.push(`🟡 ${mistakes} inaccuracies detected. Before each move, ask yourself: "Does this move have a purpose? Does it improve my position?"`);
    if (moveHistory.length < 20) coachMessages.push("⚡ Short game detected. Try to control the center (e4, d4) and develop all pieces before attacking.");
    if (moveHistory.length > 60) coachMessages.push("🏰 Long endgame — remember that king activation is crucial in the endgame. Push your king toward the center!");
    if (coachMessages.length === 0) coachMessages.push("👏 Solid game! Keep practicing tactics: forks, pins, and skewers are the most common winning patterns.");
    coachMessages.push(`📊 Your accuracy was ${acc}%. Grandmaster level is above 95%. Keep training!`);

    const styles: import("@/types").PlayerStyle[] = ["Aggressive Attacker","Positional Player","Tactical Fighter","Solid Defender","Creative Genius"];
    setAnalysis({
      accuracy: { white: acc, black: Math.max(40, Math.min(92, acc - 5 + Math.floor(Math.random()*20))) },
      playerStyle: styles[Math.floor(Math.random()*styles.length)],
      stats: { brilliant, great:1, best:good, good:good-1, inaccuracy:mistakes, mistake:mistakes, blunder:blunders },
      thinkHeatmap: Array.from({length:64}, ()=>Math.random()),
      keyMoments: [],
      coachMessages,
      openingName: moveHistory.length > 2 ? "King's Pawn Opening" : "Unknown",
    });
  }, [gameOver]);

  // English challenge: intercept capture — only if it's a legal move
  const handleCapturableSquare = useCallback((targetSq: Square) => {
    if (!englishMode || englishState) return;
    const piece = boardState.board[targetSq];
    if (!piece || piece[0] !== "b") return;
    const { selected, legalTargets } = useStore.getState();
    // Must have a piece selected AND the target must be a legal move
    if (selected === null || !legalTargets.includes(targetSq)) return;
    const challenge = getRandomChallenge(englishLevel);
    setEnglishState({
      challenge,
      targetSq,
      pieceName: PIECE_LABEL[piece] ?? piece,
      from: selected,
    });
  }, [englishMode, boardState, difficulty, englishState]);

  const handleEnglishCorrect = () => {
    if (!englishState) return;
    setEnglishScore(s => ({ ...s, correct: s.correct+1 }));
    const { from, targetSq } = englishState;
    if (from !== undefined) commitMove(from, targetSq);
    setEnglishState(null);
  };
  const handleEnglishWrong = () => {
    setEnglishScore(s => ({ ...s, wrong: s.wrong+1 }));
    setEnglishState(null);
    useStore.setState({ selected: null, legalTargets: [] });
  };

  const handleStart = () => {
    startGame(mode, difficulty, timeControl);
    if (mode === "english") {
      setEnglishMode(true);
      setSidebarTab("english");
    } else {
      setEnglishMode(false);
    }
    if (mode === "friend") setSidebarTab("multiplayer");
    else setSidebarTab("moves");
  };

  const name   = user?.displayName ?? "You";
  const rating = user?.rating ?? 1200;
  const initials = name.split(" ").map((n:string)=>n[0]).join("").toUpperCase().slice(0,2);
  const aiRating: Record<string,string> = { easy:"~800", medium:"~1400", hard:"~2000", master:"~2800" };

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Left: Board area ───────────────────────────────────────── */}
      <div
        className="flex-1 flex flex-col items-center justify-center gap-3 p-4 relative overflow-hidden"
        style={{ background:"radial-gradient(ellipse 90% 70% at 50% 50%,#0e0e24,#05050f)" }}
      >
        {/* Background grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage:"linear-gradient(#7c3aed 1px,transparent 1px),linear-gradient(90deg,#7c3aed 1px,transparent 1px)", backgroundSize:"40px 40px" }} />

        {/* Opponent row */}
        {/* Material counts */}
        {(() => {
          const VALS: Record<string,number> = { P:1, N:3, B:3, R:5, Q:9 };
          let w = 0, b = 0;
          for (let s = 0; s < 64; s++) {
            const p = boardState.board[s];
            if (p && p[1] !== "K") {
              const v = VALS[p[1]] ?? 0;
              if (p[0] === "w") w += v; else b += v;
            }
          }
          const diff = w - b;
          const blackAdvantage  = diff < 0 ? `+${Math.abs(diff)}` : "";
          const whiteAdvantage  = diff > 0 ? `+${diff}` : "";
          return (
            <>
              <PlayerRow
                name={mode === "ai" ? "Stockfish AI" : mode === "english" ? "Lexicon Engine" : "Opponent"}
                rating={mode === "ai" ? (aiRating[difficulty]??"") : mode === "english" ? "∞" : "?"}
                isActive={inGame && !gameOver && boardState.turn === "b"}
                time={fmt(blackTime)}
                isThinking={thinking}
                color="b"
                lowTime={blackTime < 30 && inGame && boardState.turn === "b"}
                emoji={mode === "ai" ? "🤖" : mode === "english" ? "📚" : "👤"}
                advantage={blackAdvantage}
              />

              {/* Board */}
              <ChessBoard
                onCapturableSquare={englishMode ? handleCapturableSquare : undefined}
                capturableSquares={englishMode ? capturableSquares : []}
                disabled={gameOver}
              />

              <PlayerRow
                name={name}
                rating={String(rating)}
                isActive={inGame && !gameOver && boardState.turn === "w"}
                time={fmt(whiteTime)}
                isThinking={false}
                color="w"
                lowTime={whiteTime < 30 && inGame && boardState.turn === "w"}
                photoURL={user?.photoURL}
                initials={initials}
                advantage={whiteAdvantage}
              />
            </>
          );
        })()}

        {/* English score HUD */}
        {englishMode && inGame && (
          <div className="absolute top-4 left-4 flex gap-2 flex-wrap">
            <div className="glass px-3 py-1.5 rounded-full text-xs font-bold text-emerald-400 flex items-center gap-1.5 border border-emerald-500/20">
              ✅ {englishScore.correct}
            </div>
            <div className="glass px-3 py-1.5 rounded-full text-xs font-bold text-red-400 flex items-center gap-1.5 border border-red-500/20">
              ❌ {englishScore.wrong}
            </div>
            <div className={`px-3 py-1.5 rounded-full text-xs font-black text-white flex items-center gap-1.5
              bg-gradient-to-r ${EN_LEVEL_COLORS[englishLevel] ?? "from-purple-600 to-violet-500"}`}>
              🇬🇧 {englishLevel}
            </div>
          </div>
        )}
      </div>

      {/* ── Right: Sidebar ──────────────────────────────────────────── */}
      <div className="w-80 flex flex-col bg-[#09091a] border-l border-white/5 overflow-hidden">
        {/* Sidebar tabs */}
        {inGame && (
          <div className="flex border-b border-white/5 shrink-0">
            {(["moves","multiplayer"] as const).concat(englishMode ? ["english" as const] : []).map(t => (
              <button key={t} onClick={() => setSidebarTab(t)}
                className={`flex-1 py-2.5 text-xs font-semibold capitalize transition-colors
                  ${sidebarTab === t ? "text-text-primary border-b-2 border-accent-purple" : "text-text-muted hover:text-text-secondary"}`}>
                {t === "moves" ? "Moves" : t === "multiplayer" ? "🔗 Link" : "🇬🇧 EN"}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {/* Setup panel */}
          {!inGame && (
            <SetupPanel
              mode={mode} setMode={setMode}
              difficulty={difficulty} setDifficulty={setDifficulty}
              timeControl={timeControl} setTimeControl={setTimeControl}
              englishLevel={englishLevel} setEnglishLevel={setEnglishLevel}
              onStart={handleStart}
            />
          )}

          {inGame && sidebarTab === "moves" && (
            <div className="flex flex-col h-full">
              <MoveList />
            </div>
          )}

          {inGame && sidebarTab === "multiplayer" && (
            <div className="p-4"><MultiplayerPanel /></div>
          )}

          {inGame && sidebarTab === "english" && (
            <EnglishSidebar score={englishScore} difficulty={difficulty} englishLevel={englishLevel} />
          )}
        </div>

        {/* Control buttons */}
        {inGame && (
          <div className="flex gap-2 p-3 border-t border-white/5 shrink-0">
            {[
              { icon:"🏳️", fn: gameOver ? ()=>{} : resignGame, tip:"Resign" },
              { icon:"↺",  fn: ()=>{ newGame(); setSidebarTab("setup"); setEnglishMode(false); }, tip:"New game" },
            ].map((b,i) => (
              <button key={i} onClick={b.fn} title={b.tip}
                className="flex-1 py-2.5 text-sm rounded-xl glass border border-white/5 hover:border-white/15 transition-all hover:scale-[1.02]">
                {b.icon} {b.tip}
              </button>
            ))}
          </div>
        )}
      </div>

      <PromotionModal />

      {showGameOver && gameOver && (
        <GameOverModal
          onClose={() => setShowGameOver(false)}
          onNewGame={() => { setShowGameOver(false); newGame(); setSidebarTab("setup"); setEnglishMode(false); }}
        />
      )}

      {englishState && (
        <EnglishChallenge
          challenge={englishState.challenge}
          capturedPieceName={englishState.pieceName}
          onCorrect={handleEnglishCorrect}
          onWrong={handleEnglishWrong}
        />
      )}
    </div>
  );
}

// ─── Player row ───────────────────────────────────────────────────────────────
function PlayerRow({ name, rating, isActive, time, isThinking, color, lowTime, photoURL, initials, emoji, advantage }: {
  name:string; rating:string; isActive:boolean; time:string;
  isThinking?:boolean; color:"w"|"b"; lowTime?:boolean;
  photoURL?:string; initials?:string; emoji?:string; advantage?:string;
}) {
  return (
    <div className="flex items-center gap-3 w-full" style={{ maxWidth:480 }}>
      {/* Avatar + advantage badge below it */}
      <div className="flex flex-col items-center gap-1 shrink-0">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-base font-bold text-white overflow-hidden ring-2 ring-offset-1 ring-offset-transparent transition-all"
          style={{
            background: color === "w" ? "linear-gradient(135deg,#7c3aed,#a855f7)" : "linear-gradient(135deg,#ef4444,#f97316)",
            boxShadow: isActive ? "0 0 0 2px #f5c518" : "none",
          }}>
          {photoURL && color === "w"
            ? <img src={photoURL} alt={name} className="w-full h-full object-cover" />
            : emoji ?? initials ?? (color === "w" ? "♙" : "♟")}
        </div>
        {/* Material advantage badge — right below avatar */}
        {advantage ? (
          <span className="text-[10px] font-black text-emerald-400 bg-emerald-900/50 border border-emerald-500/30 px-1.5 py-0.5 rounded-md leading-none">
            {advantage}
          </span>
        ) : (
          <span className="h-[18px]" /> /* placeholder keeps row height stable */
        )}
      </div>

      {/* Name + thinking */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate flex items-center gap-2">
          {name}
          {isThinking && (
            <span className="flex items-center gap-1 text-xs text-accent-violet">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-violet animate-pulse" />
              thinking...
            </span>
          )}
        </div>
        <div className="text-xs text-text-muted">Rating: {rating}</div>
      </div>

      {/* Clock */}
      <div className={`font-mono text-xl font-bold px-4 py-2 rounded-xl min-w-[84px] text-center shrink-0 transition-all
        ${isActive ? "text-accent-gold border border-accent-gold/60 bg-[#1a1500] shadow-[0_0_16px_rgba(245,197,24,.25)]" : "text-text-secondary glass"}
        ${lowTime ? "!text-red-400 !border-red-500/60 animate-pulse2" : ""}`}>
        {time}
      </div>
    </div>
  );
}

// ─── Setup Panel ─────────────────────────────────────────────────────────────
const MODES: { id:GameMode; icon:string; title:string; desc:string; badge?:string }[] = [
  { id:"ai",      icon:"🤖", title:"vs AI",       desc:"Stockfish engine"    },
  { id:"friend",  icon:"🔗", title:"vs Friend",   desc:"Real-time WebSocket" },
  { id:"ranked",  icon:"🏆", title:"Ranked",      desc:"Earn rating"         },
  { id:"english", icon:"🇬🇧", title:"Chess English", desc:"Learn while playing", badge:"NEW" },
];

const EN_LEVELS: ChallengeLevel[] = ["A1","A2","B1","B2","C1","C2"];
const EN_LEVEL_COLORS: Record<string,string> = {
  A1:"from-emerald-600 to-green-500", A2:"from-blue-600 to-cyan-500",
  B1:"from-yellow-600 to-amber-500", B2:"from-orange-600 to-red-500",
  C1:"from-purple-600 to-violet-500", C2:"from-pink-600 to-rose-500",
};

function SetupPanel({ mode, setMode, difficulty, setDifficulty, timeControl, setTimeControl, englishLevel, setEnglishLevel, onStart }: {
  mode:GameMode; setMode:(m:GameMode)=>void;
  difficulty:Difficulty; setDifficulty:(d:Difficulty)=>void;
  timeControl:TimeControl; setTimeControl:(t:TimeControl)=>void;
  englishLevel:ChallengeLevel; setEnglishLevel:(l:ChallengeLevel)=>void;
  onStart:()=>void;
}) {
  return (
    <div className="p-4 flex flex-col gap-5 overflow-y-auto h-full">
      <div>
        <div className="text-[10px] font-bold text-text-muted tracking-[.15em] uppercase mb-3">Game Mode</div>
        <div className="grid grid-cols-2 gap-2">
          {MODES.map(m => (
            <button key={m.id} onClick={() => setMode(m.id)}
              className={`relative flex flex-col items-center p-4 rounded-2xl border transition-all hover:scale-[1.03] text-center group
                ${mode === m.id
                  ? "border-accent-purple bg-[#1a1030] shadow-[0_0_20px_rgba(124,58,237,.3)]"
                  : "border-white/5 glass hover:border-white/15"}`}>
              {m.badge && (
                <span className="absolute -top-2 -right-2 text-[9px] px-2 py-0.5 rounded-full bg-gradient-to-r from-accent-gold to-orange-500 text-black font-black">
                  {m.badge}
                </span>
              )}
              <span className="text-3xl mb-1.5 group-hover:scale-110 transition-transform">{m.icon}</span>
              <span className="text-sm font-bold">{m.title}</span>
              <span className="text-[11px] text-text-muted mt-0.5">{m.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {(mode === "ai" || mode === "english" || mode === "ranked") && (
        <div>
          <div className="text-[10px] font-bold text-text-muted tracking-[.15em] uppercase mb-3">Difficulty</div>
          <div className="flex gap-1.5">
            {DIFFICULTIES.map(d => (
              <button key={d.id} onClick={() => setDifficulty(d.id)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all
                  ${difficulty === d.id
                    ? "border-accent-purple text-white bg-[#1a1030]"
                    : "border-white/5 text-text-muted glass hover:border-white/15"}`}>
                <div>{d.emoji}</div>
                <div className="mt-0.5">{d.label}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="text-[10px] font-bold text-text-muted tracking-[.15em] uppercase mb-3">Time Control</div>
        <div className="flex gap-1.5">
          {TIME_OPTIONS.map(t => (
            <button key={t.v} onClick={() => setTimeControl(t.v)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all
                ${timeControl === t.v
                  ? "border-accent-purple text-white bg-[#1a1030]"
                  : "border-white/5 text-text-muted glass hover:border-white/15"}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {mode === "english" && (
        <div className="flex flex-col gap-3">
          <div className="glass rounded-2xl p-4 border border-accent-gold/20">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🇬🇧</span>
              <div>
                <div className="text-sm font-bold text-accent-gold mb-1">Chess English Mode</div>
                <div className="text-xs text-text-muted leading-relaxed">
                  To <strong className="text-text-secondary">capture</strong> a piece, answer an English question.
                  Wrong answer = capture blocked!
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="text-[10px] font-bold text-text-muted tracking-[.15em] uppercase mb-2">English Level</div>
            <div className="grid grid-cols-3 gap-1.5">
              {EN_LEVELS.map(lv => (
                <button key={lv} onClick={() => setEnglishLevel(lv)}
                  className={`py-2.5 rounded-xl text-xs font-black border transition-all relative overflow-hidden
                    ${englishLevel === lv
                      ? `bg-gradient-to-br ${EN_LEVEL_COLORS[lv]} border-transparent text-white shadow-[0_2px_12px_rgba(0,0,0,.4)]`
                      : "border-white/8 glass text-text-muted hover:border-white/20 hover:text-white"}`}>
                  {lv}
                </button>
              ))}
            </div>
            <div className="mt-2 px-1 text-[10px] text-text-muted leading-relaxed">
              {LEVEL_DESCRIPTIONS[englishLevel]}
            </div>
          </div>
        </div>
      )}

      <button
        onClick={onStart}
        className="w-full py-4 rounded-2xl font-black text-base text-white
          bg-gradient-to-r from-accent-purple to-accent-violet
          hover:opacity-90 hover:scale-[1.02] transition-all
          shadow-[0_8px_30px_rgba(124,58,237,.5)]
          active:scale-[.98]"
      >
        {mode === "english" ? "🇬🇧 Start English Chess" :
         mode === "friend"  ? "🔗 Create Room" :
         mode === "ranked"  ? "🏆 Find Match" : "⚔️ Start Game"}
      </button>
    </div>
  );
}

// ─── English sidebar (score + tips) ──────────────────────────────────────────
function EnglishSidebar({ score, difficulty, englishLevel }: { score:{correct:number;wrong:number}; difficulty:Difficulty; englishLevel:ChallengeLevel }) {
  const pct = score.correct + score.wrong > 0
    ? Math.round((score.correct / (score.correct + score.wrong)) * 100) : 0;
  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-bold text-text-muted tracking-[.15em] uppercase">English Progress</div>
        <span className={`text-xs font-black px-2.5 py-1 rounded-full bg-gradient-to-r ${EN_LEVEL_COLORS[englishLevel] ?? "from-purple-600 to-violet-500"} text-white`}>
          {englishLevel}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="glass rounded-2xl p-4 text-center">
          <div className="text-2xl font-black text-emerald-400">{score.correct}</div>
          <div className="text-xs text-text-muted mt-0.5">Correct ✅</div>
        </div>
        <div className="glass rounded-2xl p-4 text-center">
          <div className="text-2xl font-black text-red-400">{score.wrong}</div>
          <div className="text-xs text-text-muted mt-0.5">Wrong ❌</div>
        </div>
      </div>

      {score.correct + score.wrong > 0 && (
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-text-muted">Accuracy</span>
            <span className="font-bold text-accent-gold">{pct}%</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width:`${pct}%`, background:`linear-gradient(90deg,${pct>=80?"#10b981":pct>=50?"#f5c518":"#ef4444"},${pct>=80?"#34d399":pct>=50?"#fbbf24":"#f97316"})` }} />
          </div>
        </div>
      )}

      <div className="text-[10px] font-bold text-text-muted tracking-[.15em] uppercase mt-2">How it works</div>
      {[
        { icon:"👆", text:"Click an enemy piece to try capturing it" },
        { icon:"❓", text:"Answer an English question correctly" },
        { icon:"✅", text:"Correct → capture is made!" },
        { icon:"❌", text:"Wrong → capture blocked, your turn wasted" },
      ].map((tip,i) => (
        <div key={i} className="flex items-start gap-3 glass rounded-xl p-3">
          <span className="text-lg shrink-0">{tip.icon}</span>
          <span className="text-xs text-text-secondary leading-relaxed">{tip.text}</span>
        </div>
      ))}
    </div>
  );
}
