"use client";
import { useStore } from "@/store/useStore";

export function CoachPanel() {
  const { analysis, gameOver, setProModalOpen } = useStore();

  if (!gameOver || !analysis) {
    return (
      <div className="p-4 flex flex-col gap-3">
        <div className="bg-bg-elevated border-l-4 border-accent-purple rounded-r-xl p-4">
          <div className="text-2xl mb-2">🤖</div>
          <div className="font-semibold mb-2">AI Coach</div>
          <p className="text-sm text-text-secondary leading-relaxed">
            Complete a game to receive personalized coaching. I'll analyze every move
            and explain your mistakes in plain language.
          </p>
          <button
            onClick={() => setProModalOpen(true)}
            className="mt-3 text-xs text-accent-violet underline"
          >
            Pro: Real-time coaching during game →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 flex flex-col gap-3">
      <div className="bg-bg-elevated border-l-4 border-accent-purple rounded-r-xl p-4">
        <div className="text-2xl mb-2">🤖</div>
        <div className="font-semibold mb-2">AI Coach Analysis</div>
        <div className="flex flex-col gap-2">
          {analysis.coachMessages.map((msg, i) => (
            <p key={i} className="text-sm text-text-secondary leading-relaxed">
              {i + 1}. {msg}
            </p>
          ))}
        </div>
      </div>

      <button
        onClick={() => setProModalOpen(true)}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-accent-purple to-accent-violet text-white text-sm font-bold hover:opacity-90 transition-opacity"
      >
        ✨ Unlock Full Analysis (Pro)
      </button>
    </div>
  );
}

export default CoachPanel;
