"use client";

import { useState } from "react";
import { Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import type { DirectorProfile, VoiceMetadata } from "@/types";
import { EmotionBadge } from "./EmotionBadge";
import { cn } from "@/lib/utils/cn";

const LANGUAGE_FLAG: Record<string, string> = {
  en: "🇬🇧",
  ar: "🇸🇦",
  mixed: "🌐",
};

const CONTEXT_LABELS: Record<string, string> = {
  business: "Business",
  corporate: "Corporate",
  sales: "Sales",
  marketing: "Marketing",
  advertisement: "Advertisement",
  education: "Education",
  news: "News",
  storytelling: "Storytelling",
  documentary: "Documentary",
  romantic: "Romantic",
  flirting: "Flirting",
  friendship: "Friendship",
  comedy: "Comedy",
  motivation: "Motivation",
  customer_service: "Customer Service",
  announcement: "Announcement",
  social_media: "Social Media",
  gaming: "Gaming",
  character: "Character",
  personal_message: "Personal Message",
};

interface DirectorPanelProps {
  analysis: DirectorProfile;
  voice: VoiceMetadata;
  matchReasons: string[];
  onGenerate?: () => void;
  generating?: boolean;
}

export function DirectorPanel({ analysis, voice, matchReasons, onGenerate, generating }: DirectorPanelProps) {
  const [showWhy, setShowWhy] = useState(false);

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted">
        <Sparkles size={14} className="text-accent" />
        AI Voice Director
      </div>

      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Field label="Language">
          <span>
            {LANGUAGE_FLAG[analysis.language] ?? "🌐"} {analysis.language.toUpperCase()}
          </span>
        </Field>
        <Field label="Context">
          <span>{CONTEXT_LABELS[analysis.context] ?? analysis.context}</span>
        </Field>
        <Field label="Emotion">
          <EmotionBadge emotion={analysis.primaryEmotion} />
        </Field>
        {analysis.secondaryEmotion && (
          <Field label="Secondary">
            <EmotionBadge emotion={analysis.secondaryEmotion} />
          </Field>
        )}
        <Field label="Voice">
          <span className="capitalize">
            {voice.gender} / {voice.age.replace("_", " ")}
          </span>
        </Field>
        <Field label="Confidence">
          <span>{Math.round(analysis.confidence * 100)}%</span>
        </Field>
      </dl>

      <p className="mt-4 text-sm text-muted">{analysis.performanceDirection}</p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Bar label="Energy" value={analysis.delivery.energy} />
        <Bar label="Expressiveness" value={analysis.delivery.expressiveness} />
        <Bar label="Intimacy" value={analysis.delivery.intimacy} />
        <Bar label="Formality" value={analysis.delivery.formality} />
      </div>

      <button
        type="button"
        onClick={() => setShowWhy((v) => !v)}
        className="mt-4 flex items-center gap-1 text-sm font-medium text-accent"
      >
        Why this voice?
        {showWhy ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {showWhy && (
        <div className="mt-2 rounded-xl bg-surface-2 p-4 text-sm text-muted">
          <p className="mb-2 text-foreground">{analysis.explanation}</p>
          <ul className="list-inside list-disc space-y-1">
            {matchReasons.map((reason, i) => (
              <li key={i}>{reason}</li>
            ))}
          </ul>
        </div>
      )}

      {onGenerate && (
        <button
          type="button"
          onClick={onGenerate}
          disabled={generating}
          className={cn(
            "mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-accent to-accent-2 px-6 py-3 text-base font-semibold text-white transition-opacity",
            generating ? "opacity-60" : "hover:opacity-90"
          )}
        >
          <Sparkles size={18} />
          {generating ? "Generating…" : "Generate Voice"}
        </button>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">{label}</dt>
      <dd className="text-sm font-medium">{children}</dd>
    </div>
  );
}

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs text-muted">
        <span>{label}</span>
        <span>{Math.round(value * 100)}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full bg-gradient-to-r from-accent to-accent-2"
          style={{ width: `${Math.round(value * 100)}%` }}
        />
      </div>
    </div>
  );
}
