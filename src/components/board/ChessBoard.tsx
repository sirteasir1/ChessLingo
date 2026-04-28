"use client";
import { useStore } from "@/store/useStore";
import { UNICODE, row, col, isInCheck } from "@/lib/chess-engine";
import type { Square } from "@/types";
import { useEffect, useRef, useState } from "react";

interface ChessBoardProps {
  onCapturableSquare?: (sq: Square) => void;
  capturableSquares?: Square[];
  disabled?: boolean;
  boardSize?: number;
}

// ─── Board skin colour palettes ──────────────────────────────────────────────
const BOARD_SKINS: Record<string, { light: string; dark: string; lastLight: string; lastDark: string; selLight: string; selDark: string }> = {
  classic_board: {
    light: "#e8d5b0", dark: "#b58863",
    lastLight: "#cdd26a", lastDark: "#aaa23a",
    selLight: "#f6f667", selDark: "#d4d430",
  },
  galaxy_board: {
    light: "#1a1a3e", dark: "#0d0d2b",
    lastLight: "#2a2a6e", lastDark: "#1a1a55",
    selLight: "#3a3aaa", selDark: "#2a2a88",
  },
  marble_board: {
    light: "#f5f0eb", dark: "#c8bfb5",
    lastLight: "#d4edbb", lastDark: "#b2d490",
    selLight: "#ffe680", selDark: "#e6cc00",
  },
  lava_board: {
    light: "#3d1a00", dark: "#2a0a00",
    lastLight: "#7a3000", lastDark: "#5a2000",
    selLight: "#ff6600", selDark: "#cc4400",
  },
  arctic_board: {
    light: "#dff4ff", dark: "#9ac8e0",
    lastLight: "#b8e8ff", lastDark: "#6aaac0",
    selLight: "#80d8ff", selDark: "#40b8e8",
  },
};

// ─── Piece set colour/filter overrides ───────────────────────────────────────
const PIECE_STYLES: Record<string, { white: string; black: string; wShadow?: string; bShadow?: string; filter?: string }> = {
  classic_pieces: {
    white: "#ffffff", black: "#1a1a2e",
    wShadow: "0 2px 8px rgba(0,0,0,.9), 0 0 3px rgba(0,0,0,.6)",
    bShadow: "0 1px 3px rgba(255,255,255,.15)",
  },
  neon_pieces: {
    white: "#00ffff", black: "#ff00ff",
    wShadow: "0 0 10px #00ffff, 0 0 20px #00ffff88",
    bShadow: "0 0 10px #ff00ff, 0 0 20px #ff00ff88",
  },
  oak_pieces: {
    white: "#f5deb3", black: "#3d2010",
    wShadow: "0 2px 6px rgba(0,0,0,.8)",
    bShadow: "0 1px 4px rgba(255,200,100,.2)",
  },
  crystal_pieces: {
    white: "rgba(200,240,255,0.92)", black: "rgba(30,10,80,0.88)",
    filter: "drop-shadow(0 2px 8px rgba(130,200,255,0.6))",
    wShadow: "0 0 12px rgba(150,220,255,.7)",
    bShadow: "0 0 12px rgba(80,40,180,.7)",
  },
  dragon_pieces: {
    white: "#ffd700", black: "#8b0000",
    wShadow: "0 0 10px rgba(255,200,0,.8)",
    bShadow: "0 0 10px rgba(200,0,0,.8)",
  },
  samurai_pieces: {
    white: "#e8e0d0", black: "#1a0000",
    wShadow: "0 2px 8px rgba(0,0,0,.9)",
    bShadow: "0 0 8px rgba(200,50,0,.5)",
  },
};

// ─── Capture effect particle ─────────────────────────────────────────────────
function CaptureEffect({ effect, x, y, sqSize }: { effect: string; x: number; y: number; sqSize: number }) {
  const [alive, setAlive] = useState(true);
  useEffect(() => { const t = setTimeout(() => setAlive(false), 900); return () => clearTimeout(t); }, []);
  if (!alive) return null;

  const configs: Record<string, { particles: string[]; spread: number }> = {
    fx_explosion: { particles: ["💥","🔥","💢","⚡","🔥"], spread: sqSize * 0.7 },
    fx_sparkle:   { particles: ["✨","⭐","💫","🌟","✨"], spread: sqSize * 0.6 },
    fx_lightning: { particles: ["⚡","🌩️","💫","⚡"],      spread: sqSize * 0.65 },
    fx_ghost:     { particles: ["👻","💨","🌀","👻"],       spread: sqSize * 0.55 },
  };
  const cfg = configs[effect];
  if (!cfg) return null;

  return (
    <div className="pointer-events-none absolute z-50" style={{ left: x, top: y }}>
      {cfg.particles.map((p, i) => {
        const angle = (360 / cfg.particles.length) * i * (Math.PI / 180);
        const tx = Math.cos(angle) * cfg.spread;
        const ty = Math.sin(angle) * cfg.spread;
        return (
          <span
            key={i}
            className="absolute text-xl"
            style={{
              transform: "translate(-50%,-50%)",
              animation: `effectParticle 0.8s ease-out ${i * 60}ms forwards`,
              "--tx": `${tx}px`,
              "--ty": `${ty}px`,
            } as React.CSSProperties}
          >
            {p}
          </span>
        );
      })}
    </div>
  );
}

export default function ChessBoard({
  onCapturableSquare,
  capturableSquares = [],
  disabled = false,
  boardSize = 480,
}: ChessBoardProps) {
  const { boardState, displayState, selected, legalTargets, selectSquare, moveHistory, inGame, viewIndex, user } = useStore();
  const shownBoard = viewIndex !== -1 ? displayState : boardState;

  const liveMoveIdx = viewIndex === -1 ? moveHistory.length - 1 : viewIndex;
  const lastMove    = moveHistory[liveMoveIdx];
  const inCheckNow  = inGame && viewIndex === -1 ? isInCheck(boardState.board, boardState.turn) : false;
  const sqSize      = boardSize / 8;

  // Equipped skins
  const equippedBoard  = user?.equipped?.board    ?? "classic_board";
  const equippedPieces = user?.equipped?.pieceSet ?? "classic_pieces";
  const equippedEffect = user?.equipped?.effect   ?? "";

  const skin       = BOARD_SKINS[equippedBoard]  ?? BOARD_SKINS.classic_board;
  const pieceStyle = PIECE_STYLES[equippedPieces] ?? PIECE_STYLES.classic_pieces;

  // Track captures for effects
  const boardRef       = useRef<HTMLDivElement>(null);
  const [effects, setEffects] = useState<{ id: number; x: number; y: number }[]>([]);
  const effectIdRef    = useRef(0);
  const prevHistoryLen = useRef(moveHistory.length);

  useEffect(() => {
    if (!equippedEffect || moveHistory.length <= prevHistoryLen.current) {
      prevHistoryLen.current = moveHistory.length;
      return;
    }
    const last = moveHistory[moveHistory.length - 1];
    prevHistoryLen.current = moveHistory.length;
    if (!last?.captured) return;
    const r = row(last.to), c = col(last.to);
    const x = c * sqSize + sqSize / 2;
    const y = r * sqSize + sqSize / 2;
    const id = ++effectIdRef.current;
    setEffects(prev => [...prev, { id, x, y }]);
    setTimeout(() => setEffects(prev => prev.filter(e => e.id !== id)), 1000);
  }, [moveHistory.length, equippedEffect, sqSize]);

  const handleClick = (s: Square) => {
    if (disabled) return;
    const piece = boardState.board[s];
    if (onCapturableSquare && capturableSquares.includes(s) && piece && piece[0] !== boardState.turn && selected !== null) {
      onCapturableSquare(s);
      return;
    }
    selectSquare(s);
  };

  const isGalaxy = equippedBoard === "galaxy_board";
  const isLava   = equippedBoard === "lava_board";
  const isArctic = equippedBoard === "arctic_board";
  const isMarble = equippedBoard === "marble_board";

  const boardGlow = isGalaxy
    ? "0 0 0 1px rgba(100,60,240,.3), 0 0 60px rgba(80,40,220,.4), 0 40px 100px rgba(0,0,0,.9)"
    : isLava
    ? "0 0 0 1px rgba(255,80,0,.3), 0 0 60px rgba(200,40,0,.35), 0 40px 100px rgba(0,0,0,.9)"
    : isArctic
    ? "0 0 0 1px rgba(100,200,255,.3), 0 0 50px rgba(60,180,255,.25), 0 40px 100px rgba(0,0,0,.7)"
    : isMarble
    ? "0 0 0 1px rgba(200,180,160,.2), 0 0 40px rgba(200,180,160,.1), 0 40px 100px rgba(0,0,0,.7)"
    : "0 0 0 1px rgba(124,58,237,.15), 0 0 60px rgba(124,58,237,.2), 0 40px 100px rgba(0,0,0,.8)";

  const moveDotColor = isGalaxy ? "rgba(180,120,255,0.4)"
    : isLava   ? "rgba(255,120,0,0.45)"
    : isArctic ? "rgba(60,180,255,0.4)"
    : "rgba(0,0,0,0.2)";

  const moveRingStyle = isGalaxy ? { boxShadow: "inset 0 0 0 4px rgba(180,120,255,0.5)" }
    : isLava   ? { boxShadow: "inset 0 0 0 4px rgba(255,120,0,0.5)" }
    : isArctic ? { boxShadow: "inset 0 0 0 4px rgba(60,180,255,0.5)" }
    : {};

  return (
    <div
      ref={boardRef}
      className="board-container no-select relative"
      style={{ width: boardSize, height: boardSize, flexShrink: 0, boxShadow: boardGlow, borderRadius: 4, overflow: "hidden",
        animation: "boardPulse 4s ease-in-out infinite" }}
    >
      {/* Board atmosphere overlays */}
      {isGalaxy && (
        <div className="absolute inset-0 z-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 30% 20%, rgba(120,80,255,0.12) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(60,20,180,0.1) 0%, transparent 60%)" }} />
      )}
      {isLava && (
        <div className="absolute inset-0 z-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 50% 90%, rgba(255,80,0,0.15) 0%, transparent 60%)" }} />
      )}
      {isArctic && (
        <div className="absolute inset-0 z-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(200,240,255,0.12) 0%, transparent 70%)" }} />
      )}

      <div
        className="grid relative z-10"
        style={{ gridTemplateColumns: `repeat(8,${sqSize}px)`, width: boardSize, height: boardSize }}
      >
        {Array.from({ length: 64 }, (_, s) => {
          const r = row(s), c = col(s);
          const isLight = (r + c) % 2 === 0;
          const piece   = shownBoard.board[s];
          const isSel   = selected === s;
          const isLegal = legalTargets.includes(s);
          const isLast  = lastMove?.from === s || lastMove?.to === s;
          const isKingInCheck = piece === `${shownBoard.turn}K` && inCheckNow;
          const isCapturable  = capturableSquares.includes(s as Square) && piece && piece[0] !== boardState.turn;

          let bg = isLight ? skin.light : skin.dark;
          if (isLast) bg = isLight ? skin.lastLight : skin.lastDark;
          if (isSel)  bg = isLight ? skin.selLight  : skin.selDark;

          const isWhitePiece  = piece && piece[0] === "w";
          const pieceColor    = piece ? (isWhitePiece ? pieceStyle.white : pieceStyle.black) : undefined;
          const pieceTxtShad  = piece ? (isWhitePiece ? (pieceStyle.wShadow ?? "") : (pieceStyle.bShadow ?? "")) : undefined;

          return (
            <div
              key={s}
              onClick={() => handleClick(s as Square)}
              className={`sq ${isCapturable ? "sq-capturable" : ""}`}
              style={{ background: bg, width: sqSize, height: sqSize }}
            >
              {isKingInCheck && <div className="absolute inset-0 sq-check pointer-events-none" />}

              {isLegal && !piece && <div className="move-dot" style={{ background: moveDotColor }} />}
              {isLegal && piece   && <div className="move-ring" style={moveRingStyle} />}

              {piece && (
                <span
                  className="piece"
                  style={{
                    fontSize: sqSize * 0.78,
                    color: pieceColor,
                    textShadow: pieceTxtShad,
                    filter: pieceStyle.filter,
                  }}
                >
                  {UNICODE[piece]}
                </span>
              )}

              {c === 0 && (
                <span className="absolute top-0.5 left-1 font-semibold pointer-events-none"
                  style={{ fontSize: sqSize * 0.18, color: isLight ? skin.dark : skin.light, opacity: 0.7 }}>
                  {8 - r}
                </span>
              )}
              {r === 7 && (
                <span className="absolute bottom-0.5 right-1 font-semibold pointer-events-none"
                  style={{ fontSize: sqSize * 0.18, color: isLight ? skin.dark : skin.light, opacity: 0.7 }}>
                  {String.fromCharCode(97 + c)}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Capture effects */}
      {effects.map(e => (
        <CaptureEffect key={e.id} effect={equippedEffect} x={e.x} y={e.y} sqSize={sqSize} />
      ))}
    </div>
  );
}
