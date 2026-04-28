import { NextRequest, NextResponse } from "next/server";
import type { BoardState, Difficulty } from "@/types";
import { getBestMoveStrong, applyMove, evaluateStrong, getLegalMoves } from "@/lib/chess-engine";

export async function POST(req: NextRequest) {
  try {
    const { state, difficulty }: { state: BoardState; difficulty: Difficulty } = await req.json();

    // Map difficulty to strength level (1=easy, 2=medium, 3=hard, 4=master)
    // Using getBestMoveStrong which has iterative deepening + quiescence search + MVV-LVA
    const difficultyMap: Record<Difficulty, number> = {
      bullet: 2,   // was 1 (depth 1) → now medium strength, fast
      easy:   2,   // was 1 (depth 1) → now medium, still beatable
      medium: 3,   // was 2           → now hard
      hard:   4,   // was 3           → now master-level
      master: 4,   // was 4           → stays at max, but with proper strong search
    };
    const strengthLevel = difficultyMap[difficulty] ?? 3;

    // For easy mode: inject some randomness so beginners can still win occasionally
    let move = null;
    if (difficulty === "easy" && Math.random() < 0.15) {
      // 15% chance: play a random legal move (makes easy actually easy)
      const allMoves: { from: number; to: number }[] = [];
      for (let s = 0; s < 64; s++) {
        if (state.board[s]?.[0] === state.turn) {
          for (const to of getLegalMoves(state, s)) allMoves.push({ from: s, to });
        }
      }
      if (allMoves.length > 0) {
        move = allMoves[Math.floor(Math.random() * allMoves.length)];
      }
    }

    if (!move) {
      move = getBestMoveStrong(state, strengthLevel);
    }

    if (!move) {
      // Fallback: pick any legal move
      for (let s = 0; s < 64; s++) {
        if (state.board[s]?.[0] === state.turn) {
          const targets = getLegalMoves(state, s);
          if (targets.length) { move = { from: s, to: targets[0] }; break; }
        }
      }
    }

    if (!move) return NextResponse.json({ error: "no moves" }, { status: 200 });

    const { next } = applyMove(state, move);
    const evalScore = evaluateStrong(next.board, next.turn);

    return NextResponse.json({ move, evalScore });
  } catch (err) {
    console.error("AI move error:", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
