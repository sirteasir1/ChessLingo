import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { MoveRecord, GameAnalysis, PlayerStyle, MoveClassification } from "@/types";
import { PIECE_VALUES } from "@/lib/chess-engine";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

function classifyMove(evalDelta: number): MoveClassification {
  if (evalDelta >= 150)  return "brilliant";
  if (evalDelta >= 50)   return "great";
  if (evalDelta >= 0)    return "best";
  if (evalDelta >= -30)  return "good";
  if (evalDelta >= -100) return "inaccuracy";
  if (evalDelta >= -200) return "mistake";
  return "blunder";
}

function detectPlayerStyle(moves: MoveRecord[]): PlayerStyle {
  let captures = 0, centerMoves = 0, pawnMoves = 0, knightBishop = 0;
  const centerSquares = [27, 28, 35, 36, 26, 29, 34, 37];

  moves.forEach((m) => {
    if (m.captured) captures++;
    if (centerSquares.includes(m.to)) centerMoves++;
    if (m.piece[1] === "P") pawnMoves++;
    if (m.piece[1] === "N" || m.piece[1] === "B") knightBishop++;
  });

  const total = moves.length || 1;
  if (captures / total > 0.4) return "Aggressive Attacker";
  if (knightBishop / total > 0.3) return "Tactical Fighter";
  if (centerMoves / total > 0.4) return "Positional Player";
  if (pawnMoves / total > 0.3)   return "Solid Defender";
  if (captures > 5 && centerMoves > 5) return "Creative Genius";
  return "Endgame Specialist";
}

export async function POST(req: NextRequest) {
  try {
    const { moves, pgn }: { moves: MoveRecord[]; pgn: string } = await req.json();

    const stats = { brilliant: 0, great: 0, best: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 };
    const playerMoves = moves.filter((_, i) => i % 2 === 0); // white moves
    let totalDelta = 0;

    playerMoves.forEach((m) => {
      const delta = (m.evalAfter ?? 0) - (m.evalBefore ?? 0);
      const cls = classifyMove(delta);
      (stats as any)[cls]++;
      totalDelta += Math.max(0, -delta);
    });

    const accuracy = Math.max(40, Math.min(99, 100 - Math.round(totalDelta / (playerMoves.length || 1) / 2)));

    const heatmap: number[] = Array(64).fill(0);
    moves.forEach((m) => {
      heatmap[m.to] = Math.min(1, (heatmap[m.to] ?? 0) + 0.25);
      if (m.thinkMs) heatmap[m.from] = Math.min(1, (heatmap[m.from] ?? 0) + m.thinkMs / 30000);
    });

    const playerStyle = detectPlayerStyle(playerMoves);

    // Gemini coaching analysis
    let coachMessages: string[] = [
      "Play more games for detailed coaching!",
    ];
    let openingName = "Unknown Opening";

    if (process.env.GEMINI_API_KEY && moves.length > 5) {
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const movesList = moves.slice(0, 20).map((m, i) =>
          `${Math.floor(i/2)+1}${i%2===0?'.':'...'} ${m.san || m.uci}`
        ).join(" ");

        const prompt = `You are a chess coach. Analyze this game briefly.
Moves: ${movesList}
Accuracy: ${accuracy}%
Style: ${playerStyle}
Blunders: ${stats.blunder}, Mistakes: ${stats.mistake}

Give 3 short coaching tips (1-2 sentences each) in JSON format:
{
  "opening": "opening name",
  "tips": ["tip1", "tip2", "tip3"],
  "keyMoment": "The most important moment in the game"
}
Respond ONLY with valid JSON, no markdown.`;

        const result = await model.generateContent(prompt);
        const text = result.response.text().replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(text);
        coachMessages = parsed.tips ?? coachMessages;
        openingName = parsed.opening ?? openingName;
      } catch {
        // Fallback messages
        coachMessages = [
          `As a ${playerStyle}, focus on piece activity and king safety.`,
          `You had ${stats.blunder} blunder(s) — take an extra second before each move.`,
          "Try to control the center with pawns and pieces early.",
        ];
      }
    }

    const analysis: GameAnalysis = {
      accuracy: { white: accuracy, black: 100 - accuracy + 20 },
      playerStyle,
      stats,
      thinkHeatmap: heatmap,
      keyMoments: [],
      coachMessages,
      openingName,
    };

    return NextResponse.json({ analysis });
  } catch (err) {
    console.error("Analysis error:", err);
    return NextResponse.json({ error: "analysis failed" }, { status: 500 });
  }
}
