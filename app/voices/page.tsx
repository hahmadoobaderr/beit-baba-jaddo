"use client";

import { useEffect, useMemo, useState } from "react";
import type { VoiceMetadata } from "@/types";
import { VoiceCard } from "@/components/VoiceCard";
import { getFavoriteVoiceIds, toggleFavoriteVoice } from "@/lib/store/history";
import { cn } from "@/lib/utils/cn";

type FilterKey = "language" | "gender" | "age";

export default function VoicesPage() {
  const [voices, setVoices] = useState<VoiceMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Record<FilterKey, string | null>>({
    language: null,
    gender: null,
    age: null,
  });
  const [favorites, setFavorites] = useState<string[]>([]);
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setFavorites(getFavoriteVoiceIds()));
    fetch("/api/voices")
      .then((r) => r.json())
      .then((data) => setVoices(data.voices ?? []))
      .finally(() => setLoading(false));
  }, []);

  const languages = useMemo(() => Array.from(new Set(voices.flatMap((v) => v.languages))), [voices]);
  const genders = useMemo(() => Array.from(new Set(voices.map((v) => v.gender))), [voices]);
  const ages = useMemo(() => Array.from(new Set(voices.map((v) => v.age))), [voices]);

  const filtered = voices.filter((v) => {
    if (favoritesOnly && !favorites.includes(v.voiceId)) return false;
    if (filters.language && !v.languages.includes(filters.language)) return false;
    if (filters.gender && v.gender !== filters.gender) return false;
    if (filters.age && v.age !== filters.age) return false;
    const q = query.trim().toLowerCase();
    if (q && !`${v.name} ${v.styles.join(" ")} ${v.accents.join(" ")}`.toLowerCase().includes(q)) return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="mb-2 text-2xl font-bold tracking-tight">Voice Library</h1>
      <p className="mb-6 text-muted">Browse, preview and favorite every voice available to VoiceMood AI.</p>

      <div className="mb-6 flex flex-col gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search voices..."
          className="w-full max-w-sm rounded-full border border-border bg-surface px-4 py-2 text-sm focus:outline-none"
        />
        <div className="flex flex-wrap gap-2">
          <FilterGroup
            label="Language"
            options={languages}
            active={filters.language}
            onChange={(v) => setFilters((f) => ({ ...f, language: v }))}
          />
          <FilterGroup
            label="Gender"
            options={genders}
            active={filters.gender}
            onChange={(v) => setFilters((f) => ({ ...f, gender: v }))}
          />
          <FilterGroup
            label="Age"
            options={ages}
            active={filters.age}
            onChange={(v) => setFilters((f) => ({ ...f, age: v }))}
          />
          <button
            onClick={() => setFavoritesOnly((v) => !v)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium",
              favoritesOnly ? "border-accent-2 bg-accent-2/10" : "border-border text-muted"
            )}
          >
            ♡ Favorites only
          </button>
        </div>
      </div>

      {loading && <p className="text-muted">Loading voices...</p>}
      {!loading && filtered.length === 0 && <p className="text-muted">No voices match your filters.</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((voice) => (
          <VoiceCard
            key={voice.voiceId}
            voice={voice}
            favorite={favorites.includes(voice.voiceId)}
            onToggleFavorite={() => setFavorites(toggleFavoriteVoice(voice.voiceId))}
          />
        ))}
      </div>
    </div>
  );
}

function FilterGroup({
  label,
  options,
  active,
  onChange,
}: {
  label: string;
  options: string[];
  active: string | null;
  onChange: (v: string | null) => void;
}) {
  if (options.length === 0) return null;
  return (
    <div className="flex items-center gap-1 rounded-full border border-border bg-surface p-1 text-xs">
      <span className="px-2 text-muted">{label}</span>
      <button
        onClick={() => onChange(null)}
        className={cn("rounded-full px-2 py-1 capitalize", !active ? "bg-accent text-white" : "text-muted")}
      >
        All
      </button>
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={cn(
            "rounded-full px-2 py-1 capitalize",
            active === opt ? "bg-accent text-white" : "text-muted"
          )}
        >
          {opt.replace("_", " ")}
        </button>
      ))}
    </div>
  );
}
