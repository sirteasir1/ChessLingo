"use client";
import { useState, useEffect } from "react";
import type { Challenge } from "@/lib/english-challenges";

interface Props {
  challenge: Challenge;
  onCorrect: () => void;
  onWrong: () => void;
  capturedPieceName: string;
  timeLimit?: number;
}

const LEVEL_COLORS: Record<string, string> = {
  A1: "text-emerald-400 bg-emerald-900/40",
  A2: "text-blue-400 bg-blue-900/40",
  B1: "text-yellow-400 bg-yellow-900/40",
  B2: "text-orange-400 bg-orange-900/40",
  C1: "text-red-400 bg-red-900/40",
};

const TYPE_ICONS: Record<string, string> = {
  translate: "🔤",
  fill_blank: "✏️",
  grammar: "📝",
  definition: "📖",
  choose: "🎯",
};

export default function EnglishChallenge({ challenge, onCorrect, onWrong, capturedPieceName, timeLimit = 20 }: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (answered) return;
    const t = setInterval(() => {
      setTimeLeft(p => {
        if (p <= 1) { clearInterval(t); handleAnswer(-1); return 0; }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [answered]);

  const handleAnswer = (idx: number) => {
    if (answered) return;
    setSelected(idx);
    setAnswered(true);
    if (idx === challenge.correct) {
      setTimeout(onCorrect, 900);
    } else {
      setShake(true);
      setTimeout(() => setShake(false), 400);
      setTimeout(onWrong, 1200);
    }
  };

  const timerPct = (timeLeft / timeLimit) * 100;
  const timerColor = timeLeft > 10 ? "#10b981" : timeLeft > 5 ? "#f5c518" : "#ef4444";

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in p-4">
      <div className={`glass-strong rounded-3xl w-full max-w-md overflow-hidden shadow-[0_32px_100px_rgba(0,0,0,.9)] ${shake ? "animate-wrong" : ""}`}>

        {/* Header */}
        <div className="relative px-6 pt-5 pb-4 border-b border-white/5">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{TYPE_ICONS[challenge.type]}</span>
              <span className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
                English Challenge
              </span>
            </div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${LEVEL_COLORS[challenge.level]}`}>
              {challenge.level}
            </span>
          </div>

          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-text-muted">
              ⚔️ Capture <span className="text-accent-gold font-semibold">{capturedPieceName}</span>? Answer correctly first!
            </span>
          </div>

          {/* Timer bar */}
          <div className="mt-3 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{ width: `${timerPct}%`, background: timerColor }}
            />
          </div>
          <div className="text-right text-xs mt-1" style={{ color: timerColor }}>
            {timeLeft}s
          </div>
        </div>

        {/* Question */}
        <div className="px-6 py-5">
          {challenge.word && (
            <div className="text-3xl font-display font-bold text-center mb-3 grad-gold">
              "{challenge.word}"
            </div>
          )}
          <p className="text-base font-semibold text-text-primary leading-relaxed text-center mb-5">
            {challenge.question}
          </p>

          {/* Options */}
          <div className="grid grid-cols-2 gap-2.5">
            {challenge.options.map((opt, i) => {
              let variant = "bg-bg-elevated border-border-subtle hover:border-accent-purple hover:bg-[#1a1030]";
              if (answered) {
                if (i === challenge.correct) variant = "bg-emerald-900/60 border-emerald-500 text-emerald-300";
                else if (i === selected && i !== challenge.correct) variant = "bg-red-900/60 border-red-500 text-red-300";
                else variant = "bg-bg-elevated border-border-subtle opacity-40";
              }
              return (
                <button
                  key={i}
                  onClick={() => handleAnswer(i)}
                  disabled={answered}
                  className={`relative px-4 py-3.5 rounded-xl border text-sm font-semibold text-left transition-all duration-150
                    ${variant} ${!answered ? "cursor-pointer active:scale-95" : "cursor-default"}`}
                >
                  <span className="text-xs opacity-50 mr-1.5 font-mono">
                    {String.fromCharCode(65 + i)}.
                  </span>
                  {opt}
                  {answered && i === challenge.correct && (
                    <span className="absolute top-2 right-2 text-lg">✅</span>
                  )}
                  {answered && i === selected && i !== challenge.correct && (
                    <span className="absolute top-2 right-2 text-lg">❌</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Explanation */}
        {answered && (
          <div className={`mx-5 mb-5 px-4 py-3 rounded-xl text-sm leading-relaxed animate-slide-up
            ${selected === challenge.correct
              ? "bg-emerald-900/30 border border-emerald-700/50 text-emerald-200"
              : "bg-red-900/30 border border-red-700/50 text-red-200"}`}>
            {selected === challenge.correct ? "✅ Correct! " : "❌ Wrong. "}
            {challenge.explanation}
          </div>
        )}
      </div>
    </div>
  );
}
