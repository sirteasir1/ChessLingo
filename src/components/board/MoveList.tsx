"use client";
import { useRef, useEffect } from "react";
import { useStore } from "@/store/useStore";

const CLS_COLOR: Record<string,string> = {
  brilliant:"text-cyan-400", great:"text-emerald-400", best:"text-emerald-300",
  good:"text-text-primary", inaccuracy:"text-yellow-400", mistake:"text-orange-400", blunder:"text-red-400",
};
const CLS_ICON: Record<string,string> = {
  brilliant:"💎", great:"✨", best:"✓", good:"", inaccuracy:"?!", mistake:"?", blunder:"??",
};

const PIECE_VAL: Record<string,number> = { P:1, N:3, B:3, R:5, Q:9 };

export default function MoveList() {
  const { moveHistory, boardState, displayState, viewIndex, goToMove, goToStart, goToEnd, goBack, goForward, inGame, gameOver } = useStore();
  const endRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when live
  useEffect(() => {
    if (viewIndex === -1) endRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [moveHistory.length, viewIndex]);

  // Material count from live board
  const material = (() => {
    let w = 0, b = 0;
    for (let s = 0; s < 64; s++) {
      const p = boardState.board[s];
      if (p && p[1] !== "K") {
        const v = PIECE_VAL[p[1]] ?? 0;
        if (p[0] === "w") w += v;
        else b += v;
      }
    }
    return { w, b, diff: w - b };
  })();

  // Eval bar from displayed board
  const evalScore = (() => {
    let s = 0;
    for (let sq = 0; sq < 64; sq++) {
      const p = displayState.board[sq];
      if (p && p[1] !== "K") s += (p[0]==="w"?1:-1) * (PIECE_VAL[p[1]]??0);
    }
    return s;
  })();
  const evalPct = Math.min(93, Math.max(7, 50 + evalScore * 4));

  const pairs: Array<[typeof moveHistory[0], typeof moveHistory[0]|undefined]> = [];
  for (let i = 0; i < moveHistory.length; i += 2) pairs.push([moveHistory[i], moveHistory[i+1]]);

  const activeIdx = viewIndex; // -1 = last move

  return (
    <div className="flex flex-col h-full">
      {/* Eval bar */}
      <div className="px-3 pt-3 pb-2 flex items-center gap-2 shrink-0">
        <span className="text-[10px] text-text-muted font-semibold">W</span>
        <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-white rounded-full transition-all duration-500"
            style={{ width:`${evalPct}%` }} />
        </div>
        <span className="text-[10px] text-text-muted font-semibold">B</span>
        <span className="text-xs font-mono font-bold text-text-secondary min-w-[36px] text-right">
          {evalScore===0 ? "0.0" : (evalScore>0?"+":"")+evalScore.toFixed(1)}
        </span>
      </div>

      {/* Material advantage */}
      {(material.w > 0 || material.b > 0) && (
        <div className="px-3 pb-2 flex items-center gap-2 text-xs shrink-0">
          <span className="text-white/60">♙</span>
          <span className={material.diff > 0 ? "text-white font-bold" : "text-text-muted"}>
            {material.w}pts {material.diff > 0 && <span className="text-emerald-400">(+{material.diff})</span>}
          </span>
          <span className="flex-1 text-center text-white/20">·</span>
          <span className={material.diff < 0 ? "text-white font-bold" : "text-text-muted"}>
            {material.b}pts {material.diff < 0 && <span className="text-emerald-400">(+{Math.abs(material.diff)})</span>}
          </span>
          <span className="text-white/60">♟</span>
        </div>
      )}

      {/* Move list */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {pairs.length === 0 ? (
          <p className="text-xs text-text-muted text-center py-6 leading-relaxed">
            {inGame ? "Make your first move…" : "Start a game to see moves here"}
          </p>
        ) : (
          <div className="flex flex-col gap-0.5">
            {pairs.map(([white, black], i) => {
              const wIdx = i * 2;
              const bIdx = i * 2 + 1;
              const wActive = viewIndex === wIdx || (viewIndex === -1 && wIdx === moveHistory.length - 1 && !black);
              const bActive = black && (viewIndex === bIdx || (viewIndex === -1 && bIdx === moveHistory.length - 1));
              return (
                <div key={i} className="grid grid-cols-[28px_1fr_1fr] items-center gap-0.5 text-sm">
                  <span className="text-[10px] text-text-muted font-mono pl-1">{i+1}.</span>
                  <MoveBtn move={white} active={!!wActive} onClick={() => goToMove(wIdx)} />
                  {black ? <MoveBtn move={black} active={!!bActive} onClick={() => goToMove(bIdx)} /> : <div />}
                </div>
              );
            })}
            <div ref={endRef} />
          </div>
        )}
      </div>

      {/* Navigation controls */}
      <div className="shrink-0 border-t border-white/5 px-2 py-2 flex gap-1">
        {[
          { icon:"⏮", fn:goToStart, tip:"First move"   },
          { icon:"◀",  fn:goBack,    tip:"Previous"     },
          { icon:"▶",  fn:goForward, tip:"Next"         },
          { icon:"⏭", fn:goToEnd,   tip:"Last move"    },
        ].map((b,i) => (
          <button key={i} onClick={b.fn} title={b.tip}
            className="flex-1 py-1.5 text-sm rounded-lg glass border border-white/5 hover:border-white/15 hover:text-white text-white/50 transition-all active:scale-95">
            {b.icon}
          </button>
        ))}
        {viewIndex !== -1 && (
          <button onClick={() => goToMove(-1)} title="Back to live"
            className="px-2 py-1.5 text-xs rounded-lg bg-accent-purple/20 border border-accent-purple/40 text-accent-violet hover:bg-accent-purple/30 transition-all">
            Live
          </button>
        )}
      </div>
    </div>
  );
}

function MoveBtn({ move, active, onClick }: { move: any; active: boolean; onClick: () => void }) {
  const cls = move.classification ?? "good";
  return (
    <button onClick={onClick}
      className={`px-2 py-1 rounded-lg text-left font-mono text-sm transition-all
        ${active
          ? "bg-accent-purple/30 text-white border border-accent-purple/50"
          : `hover:bg-white/5 ${CLS_COLOR[cls] ?? "text-text-primary"}`}`}>
      {move.san ?? move.uci ?? `${move.from}-${move.to}`}
      {CLS_ICON[cls] && <span className="ml-0.5 text-[10px] opacity-70">{CLS_ICON[cls]}</span>}
    </button>
  );
}
