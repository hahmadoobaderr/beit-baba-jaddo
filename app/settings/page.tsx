"use client";

import { useEffect, useState } from "react";
import { RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import type { VoiceMetadata } from "@/types";
import { cn } from "@/lib/utils/cn";

interface AdminStatus {
  elevenLabsConnected: boolean;
  aiConnected: boolean;
  provider: string;
  defaultModel: string;
  availableModels: Record<string, string>;
  voiceCount: number;
  cachedAt: number;
  usage: {
    totalGenerations: number;
    totalCharactersAnalyzed: number;
    totalCharactersSynthesized: number;
    totalEstimatedCostUsd: number;
  };
}

export default function SettingsPage() {
  const [status, setStatus] = useState<AdminStatus | null>(null);
  const [voices, setVoices] = useState<VoiceMetadata[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async (refresh = false) => {
    setRefreshing(true);
    const [statusRes, voicesRes] = await Promise.all([
      fetch("/api/admin/status").then((r) => r.json()),
      fetch(`/api/voices${refresh ? "?refresh=true" : ""}`).then((r) => r.json()),
    ]);
    setStatus(statusRes);
    setVoices(voicesRes.voices ?? []);
    setRefreshing(false);
  };

  useEffect(() => {
    queueMicrotask(() => {
      load();
    });
  }, []);

  const saveVoice = async (voice: VoiceMetadata, styles: string) => {
    setSavingId(voice.voiceId);
    await fetch("/api/admin/voice-metadata", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ voiceId: voice.voiceId, styles: styles.split(",").map((s) => s.trim()).filter(Boolean) }),
    });
    setSavingId(null);
    setEditingId(null);
    load();
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Admin / Settings</h1>

      {status && (
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatusCard label="ElevenLabs" ok={status.elevenLabsConnected} okLabel="Connected" badLabel="Using mock provider" />
          <StatusCard label="AI Director" ok={status.aiConnected} okLabel="Connected" badLabel="Using rule-based mock" />
          <InfoCard label="Default model" value={status.defaultModel} />
          <InfoCard label="Available voices" value={String(status.voiceCount)} />
          <InfoCard label="Cached" value={status.cachedAt ? new Date(status.cachedAt).toLocaleTimeString() : "—"} />
          <InfoCard label="Total generations" value={String(status.usage.totalGenerations)} />
          <InfoCard label="Characters synthesized" value={status.usage.totalCharactersSynthesized.toLocaleString()} />
          <InfoCard label="Estimated cost" value={`$${status.usage.totalEstimatedCostUsd.toFixed(4)}`} />
        </div>
      )}

      <button
        onClick={() => load(true)}
        disabled={refreshing}
        className="mb-8 flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-surface-2 disabled:opacity-50"
      >
        <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
        Refresh Voices
      </button>

      <h2 className="mb-3 text-lg font-semibold">Voice Metadata Editor</h2>
      <div className="flex flex-col gap-2">
        {voices.map((voice) => (
          <div key={voice.voiceId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4">
            <div>
              <div className="font-medium">{voice.name}</div>
              <div className="text-xs capitalize text-muted">
                {voice.gender} • {voice.age.replace("_", " ")} • {voice.languages.join("/")}
              </div>
            </div>
            {editingId === voice.voiceId ? (
              <EditRow voice={voice} onSave={(styles) => saveVoice(voice, styles)} saving={savingId === voice.voiceId} />
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex flex-wrap gap-1">
                  {voice.styles.map((s) => (
                    <span key={s} className="rounded-full bg-surface-2 px-2 py-0.5 text-xs capitalize">
                      {s}
                    </span>
                  ))}
                </div>
                <button
                  onClick={() => setEditingId(voice.voiceId)}
                  className="rounded-full border border-border px-3 py-1 text-xs font-medium hover:bg-surface-2"
                >
                  Edit
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function EditRow({ voice, onSave, saving }: { voice: VoiceMetadata; onSave: (styles: string) => void; saving: boolean }) {
  const [styles, setStyles] = useState(voice.styles.join(", "));
  return (
    <div className="flex items-center gap-2">
      <input
        value={styles}
        onChange={(e) => setStyles(e.target.value)}
        className="rounded-full border border-border bg-surface-2 px-3 py-1 text-xs"
      />
      <button
        onClick={() => onSave(styles)}
        disabled={saving}
        className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save"}
      </button>
    </div>
  );
}

function StatusCard({ label, ok, okLabel, badLabel }: { label: string; ok: boolean; okLabel: string; badLabel: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-muted">{label}</div>
      <div className={cn("mt-1 flex items-center gap-1.5 text-sm font-semibold", ok ? "text-emerald-500" : "text-amber-500")}>
        {ok ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
        {ok ? okLabel : badLabel}
      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}
