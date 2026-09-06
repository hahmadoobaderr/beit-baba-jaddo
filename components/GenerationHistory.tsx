"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import type { GenerationResult } from "@/types";
import { getHistory, clearHistory, getFavoriteGenerationIds, toggleFavoriteGeneration } from "@/lib/store/history";
import { EmotionBadge } from "./EmotionBadge";
import { AudioPlayer } from "./AudioPlayer";

function groupByDay(items: GenerationResult[]): Record<string, GenerationResult[]> {
  const groups: Record<string, GenerationResult[]> = {};
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  for (const item of items) {
    const d = new Date(item.createdAt).toDateString();
    const label = d === today ? "Today" : d === yesterday ? "Yesterday" : new Date(item.createdAt).toLocaleDateString();
    (groups[label] ??= []).push(item);
  }
  return groups;
}

export function GenerationHistory() {
  const [history, setHistory] = useState<GenerationResult[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      setHistory(getHistory());
      setFavorites(getFavoriteGenerationIds());
    });
  }, []);

  if (history.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted">
        No generations yet. Head to the Studio to create your first one.
      </div>
    );
  }

  const groups = groupByDay(history);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => {
            clearHistory();
            setHistory([]);
          }}
          className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
        >
          <Trash2 size={14} />
          Clear history
        </button>
      </div>

      {Object.entries(groups).map(([label, items]) => (
        <div key={label}>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">{label}</h3>
          <div className="flex flex-col gap-3">
            {items.map((item) => (
              <div key={item.id} className="rounded-2xl border border-border bg-surface p-4">
                <button
                  type="button"
                  onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                  className="flex w-full items-start justify-between gap-4 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">&ldquo;{item.text}&rdquo;</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted">
                      <span className="capitalize">{item.voice.gender}</span>
                      <EmotionBadge emotion={item.analysis.primaryEmotion} className="py-0.5 text-xs" />
                      <span>{item.duration}s</span>
                      <span className="uppercase">{item.analysis.language}</span>
                    </div>
                  </div>
                </button>
                {expandedId === item.id && (
                  <div className="mt-3">
                    <AudioPlayer
                      generation={item}
                      favorite={favorites.includes(item.id)}
                      onToggleFavorite={() => setFavorites(toggleFavoriteGeneration(item.id))}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
