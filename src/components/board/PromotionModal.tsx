"use client";
import { useStore } from "@/store/useStore";
import type { PieceType } from "@/types";

const PROMO_PIECES: { type: PieceType; icon: string; label: string }[] = [
  { type: "Q", icon: "♛", label: "Queen"  },
  { type: "R", icon: "♜", label: "Rook"   },
  { type: "B", icon: "♝", label: "Bishop" },
  { type: "N", icon: "♞", label: "Knight" },
];

export default function PromotionModal() {
  const { promotionPending, promotePawn } = useStore();
  if (!promotionPending) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
      <div className="bg-bg-surface border border-accent-gold rounded-2xl p-6 text-center max-w-xs w-full shadow-2xl">
        <div className="text-xl font-bold mb-1">♟️ Promote Pawn!</div>
        <div className="text-sm text-text-muted mb-4">Choose a piece:</div>
        <div className="grid grid-cols-4 gap-3">
          {PROMO_PIECES.map((p) => (
            <button
              key={p.type}
              onClick={() => promotePawn(p.type)}
              className="flex flex-col items-center gap-1 p-3 rounded-xl border border-border-subtle bg-bg-elevated hover:border-accent-gold hover:bg-[#1a1500] transition-all"
            >
              <span className="text-4xl" style={{ color: promotionPending.color === "w" ? "#fff" : "#1a1a2e",
                textShadow: "0 1px 4px rgba(0,0,0,.9)" }}>
                {p.icon}
              </span>
              <span className="text-xs text-text-muted">{p.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
