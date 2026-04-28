"use client";
import { useStore } from "@/store/useStore";

export default function AnalysisPanel() {
  const { analysis, gameOver } = useStore();

  if (!gameOver || !analysis) {
    return (
      <div className="p-4 text-center text-text-muted text-sm py-10">
        <div className="text-4xl mb-3">📊</div>
        Complete a game to see analysis
      </div>
    );
  }

  const { accuracy, playerStyle, stats, thinkHeatmap } = analysis;

  const statItems = [
    { label: "✨ Brilliant", val: stats.brilliant, color: "text-purple-400" },
    { label: "✓ Best",       val: stats.best,      color: "text-emerald-400" },
    { label: "? Mistake",    val: stats.mistake,   color: "text-orange-400" },
    { label: "?? Blunder",   val: stats.blunder,   color: "text-red-400" },
  ];

  const accuracyColor =
    accuracy.white >= 85 ? "from-emerald-400 to-cyan-400" :
    accuracy.white >= 70 ? "from-yellow-400 to-amber-400" :
    "from-orange-400 to-red-400";

  return (
    <div className="p-4 flex flex-col gap-4">
      {/* Accuracy */}
      <div className="text-center">
        <div className={`text-5xl font-bold font-display bg-gradient-to-br ${accuracyColor} bg-clip-text text-transparent`}>
          {accuracy.white}
        </div>
        <div className="text-xs text-text-muted mt-1">Accuracy %</div>
      </div>

      {/* Player style badge */}
      <div className="text-center">
        <span className="inline-block px-4 py-2 rounded-full bg-[#1e1030] text-accent-violet font-semibold text-sm border border-accent-purple/30">
          🧠 {playerStyle}
        </span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2">
        {statItems.map((s) => (
          <div key={s.label} className="bg-bg-elevated rounded-xl p-3 text-center">
            <div className={`text-2xl font-bold ${s.color}`}>{s.val}</div>
            <div className="text-xs text-text-muted mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Heatmap */}
      <div className="bg-bg-elevated rounded-xl p-3">
        <div className="text-xs text-text-muted mb-2">⏱ Think Time Heatmap</div>
        <div className="grid gap-0.5" style={{ gridTemplateColumns: "repeat(8,1fr)" }}>
          {thinkHeatmap.map((v, i) => {
            const r = Math.floor(v * 200);
            const g = Math.floor((1 - v) * 140);
            return (
              <div
                key={i}
                className="rounded-sm"
                style={{ height: 20, background: `rgba(${r},${g},50,0.85)` }}
                title={`Square ${i}: ${(v * 100).toFixed(0)}%`}
              />
            );
          })}
        </div>
      </div>

      {/* Opening */}
      {analysis.openingName && (
        <div className="bg-bg-elevated rounded-xl p-3 text-sm">
          <span className="text-text-muted text-xs">Opening: </span>
          <span className="font-semibold">{analysis.openingName}</span>
        </div>
      )}
    </div>
  );
}
