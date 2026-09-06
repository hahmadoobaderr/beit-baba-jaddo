"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Wand2 } from "lucide-react";
import type { VoiceMetadata } from "@/types";
import { cn } from "@/lib/utils/cn";

interface VoiceSelectorProps {
  voices: VoiceMetadata[];
  selectedVoiceId: string; // "auto" or a voiceId
  autoRecommendation?: VoiceMetadata;
  onChange: (voiceId: string) => void;
}

export function VoiceSelector({ voices, selectedVoiceId, autoRecommendation, onChange }: VoiceSelectorProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return voices;
    return voices.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.styles.some((s) => s.includes(q)) ||
        v.accents.some((a) => a.includes(q)) ||
        v.languages.some((l) => l.includes(q))
    );
  }, [voices, query]);

  const selected = voices.find((v) => v.voiceId === selectedVoiceId);

  return (
    <div className="rounded-2xl border border-border bg-surface">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-3 text-sm font-medium"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <Wand2 size={15} className="text-accent" />
          Voice: {selected ? selected.name : `Auto${autoRecommendation ? ` (${autoRecommendation.name})` : ""}`}
        </span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {open && (
        <div className="border-t border-border p-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search voices..."
            aria-label="Search voices"
            className="mb-3 w-full rounded-full border border-border bg-surface-2 px-4 py-2 text-sm focus:outline-none"
          />
          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            <button
              type="button"
              onClick={() => {
                onChange("auto");
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-medium",
                selectedVoiceId === "auto" ? "border-accent bg-accent/10" : "border-border hover:border-foreground/20"
              )}
            >
              <Wand2 size={14} className="text-accent" />
              Auto — let AI choose the best voice
            </button>
            {filtered.map((voice) => (
              <button
                key={voice.voiceId}
                type="button"
                onClick={() => {
                  onChange(voice.voiceId);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm",
                  selectedVoiceId === voice.voiceId
                    ? "border-accent bg-accent/10"
                    : "border-border hover:border-foreground/20"
                )}
              >
                <span>
                  <span className="font-medium">{voice.name}</span>{" "}
                  <span className="capitalize text-muted">
                    · {voice.gender} · {voice.age.replace("_", " ")}
                  </span>
                </span>
                <span className="text-xs uppercase text-muted">{voice.languages.join("/")}</span>
              </button>
            ))}
            {filtered.length === 0 && <p className="py-4 text-center text-sm text-muted">No voices match.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
