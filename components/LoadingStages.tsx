"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

const STAGES = [
  "Understanding your message...",
  "Choosing the right performance...",
  "Directing the voice...",
  "Generating your voice...",
  "Almost ready...",
];

/** Cycles through stage copy on a timer that approximates — but never
 * claims to precisely track — real pipeline progress. No fake percentages. */
export function LoadingStages() {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const timers = [1400, 1600, 1800, 2200].map((delay, i) =>
      setTimeout(() => setStage(i + 1), delay + (i > 0 ? [1400, 1600, 1800, 2200].slice(0, i).reduce((a, b) => a + b, 0) : 0))
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-surface p-10 text-center">
      <Loader2 size={28} className="animate-spin text-accent" />
      <p className="text-base font-medium">{STAGES[Math.min(stage, STAGES.length - 1)]}</p>
      <div className="flex gap-1">
        {STAGES.map((_, i) => (
          <span
            key={i}
            className="h-1.5 w-6 rounded-full transition-colors"
            style={{ backgroundColor: i <= stage ? "var(--accent)" : "var(--color-surface-2)" }}
          />
        ))}
      </div>
    </div>
  );
}
