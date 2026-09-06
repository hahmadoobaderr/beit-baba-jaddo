import type { Emotion } from "@/types";
import { cn } from "@/lib/utils/cn";

export const EMOTION_EMOJI: Record<Emotion, string> = {
  neutral: "😐",
  happy: "😄",
  sad: "😢",
  angry: "😠",
  excited: "🤩",
  fearful: "😨",
  romantic: "❤️",
  flirty: "😏",
  calm: "😌",
  serious: "🧐",
  confident: "😎",
  playful: "😜",
  sarcastic: "🙃",
  curious: "🤔",
  mysterious: "🕵️",
  inspirational: "✨",
  dramatic: "🎭",
  nostalgic: "🌇",
  empathetic: "🤗",
  urgent: "⚡",
};

export function EmotionBadge({ emotion, className }: { emotion: Emotion; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-3 py-1 text-sm font-medium capitalize",
        className
      )}
    >
      <span aria-hidden>{EMOTION_EMOJI[emotion] ?? "🙂"}</span>
      {emotion}
    </span>
  );
}
