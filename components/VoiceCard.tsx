"use client";

import { useRef, useState } from "react";
import { Play, Pause, Heart } from "lucide-react";
import type { VoiceMetadata } from "@/types";
import { cn } from "@/lib/utils/cn";

interface VoiceCardProps {
  voice: VoiceMetadata;
  selected?: boolean;
  favorite?: boolean;
  onSelect?: () => void;
  onToggleFavorite?: () => void;
  compact?: boolean;
}

export function VoiceCard({ voice, selected, favorite, onSelect, onToggleFavorite, compact }: VoiceCardProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  const handlePreview = () => {
    if (!voice.previewUrl) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(voice.previewUrl);
      audioRef.current.addEventListener("ended", () => setPlaying(false));
    }
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl border bg-surface p-4 transition-colors",
        selected ? "border-accent shadow-[0_0_0_1px_var(--accent)]" : "border-border hover:border-foreground/20"
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="font-semibold">{voice.name}</div>
          <div className="text-sm capitalize text-muted">
            {voice.gender} • {voice.age.replace("_", " ")}
          </div>
        </div>
        <button
          type="button"
          onClick={onToggleFavorite}
          aria-label={favorite ? "Remove favorite" : "Add favorite"}
          aria-pressed={favorite}
          className={cn("rounded-full p-1.5", favorite ? "text-accent-2" : "text-muted hover:text-foreground")}
        >
          <Heart size={16} fill={favorite ? "currentColor" : "none"} />
        </button>
      </div>

      <div className="flex flex-wrap gap-1 text-xs text-muted">
        {voice.languages.map((l) => (
          <span key={l} className="rounded-full bg-surface-2 px-2 py-0.5 uppercase">
            {l}
          </span>
        ))}
      </div>

      {!compact && (
        <div className="flex flex-wrap gap-1">
          {voice.styles.slice(0, 4).map((s) => (
            <span key={s} className="rounded-full border border-border px-2 py-0.5 text-xs capitalize text-muted">
              {s}
            </span>
          ))}
        </div>
      )}

      <div className="mt-1 flex items-center gap-2">
        <button
          type="button"
          onClick={handlePreview}
          disabled={!voice.previewUrl}
          className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm font-medium text-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
        >
          {playing ? <Pause size={14} /> : <Play size={14} />}
          Preview
        </button>
        {onSelect && (
          <button
            type="button"
            onClick={onSelect}
            className={cn(
              "flex-1 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              selected ? "bg-accent text-white" : "bg-surface-2 text-foreground hover:bg-border"
            )}
          >
            {selected ? "Selected" : "Use this voice"}
          </button>
        )}
      </div>
    </div>
  );
}
