"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Wand2 } from "lucide-react";
import type {
  AdvancedVoiceControls,
  DirectorProfile,
  GenerationResult,
  QualityMode,
  RegenerateHint,
  VoiceMetadata,
} from "@/types";
import { TextEditor } from "./TextEditor";
import { StylePresets } from "./StylePresets";
import { AdvancedControls } from "./AdvancedControls";
import { DirectorPanel } from "./DirectorPanel";
import { VoiceSelector } from "./VoiceSelector";
import { AudioPlayer } from "./AudioPlayer";
import { LoadingStages } from "./LoadingStages";
import { DEMO_EXAMPLES } from "@/lib/presets";
import { addToHistory, toggleFavoriteGeneration, getFavoriteGenerationIds } from "@/lib/store/history";
import { cn } from "@/lib/utils/cn";

interface AnalyzeResponse {
  analysis: DirectorProfile;
  voice: VoiceMetadata;
  matchScore: number;
  matchReasons: string[];
  aiProvider: string;
}

const REGENERATE_OPTIONS: { hint: RegenerateHint; label: string }[] = [
  { hint: "more_emotional", label: "More emotional" },
  { hint: "more_natural", label: "More natural" },
  { hint: "more_confident", label: "More confident" },
  { hint: "more_playful", label: "More playful" },
  { hint: "more_serious", label: "More serious" },
  { hint: "slower", label: "Slower" },
  { hint: "faster", label: "Faster" },
  { hint: "different_voice", label: "Different voice" },
];

export function VoiceStudio() {
  const [text, setText] = useState("");
  const [style, setStyle] = useState("auto");
  const [directorOverride, setDirectorOverride] = useState("");
  const [overrideInput, setOverrideInput] = useState("");
  const [voiceId, setVoiceId] = useState("auto");
  const [qualityMode, setQualityMode] = useState<QualityMode>("studio_quality");
  const [advanced, setAdvanced] = useState<Partial<AdvancedVoiceControls>>({});

  const [voices, setVoices] = useState<VoiceMetadata[]>([]);
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [versions, setVersions] = useState<GenerationResult[]>([]);
  const [activeVersion, setActiveVersion] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showRegenMenu, setShowRegenMenu] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    queueMicrotask(() => setFavorites(getFavoriteGenerationIds()));
    fetch("/api/voices")
      .then((r) => r.json())
      .then((data) => setVoices(data.voices ?? []))
      .catch(() => setVoices([]));
  }, []);

  const runAnalysis = useCallback(async () => {
    if (text.trim().length < 3) {
      setAnalysis(null);
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setAnalyzing(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, style, directorOverride: directorOverride || undefined }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      setAnalysis(data);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError((err as Error).message);
      }
    } finally {
      setAnalyzing(false);
    }
  }, [text, style, directorOverride]);

  useEffect(() => {
    const timer = setTimeout(runAnalysis, 600);
    return () => clearTimeout(timer);
  }, [runAnalysis]);

  const generate = useCallback(
    async (regenerateHint?: RegenerateHint) => {
      if (text.trim().length < 1) return;
      setGenerating(true);
      setError(null);
      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            style,
            directorOverride: directorOverride || undefined,
            voiceId: regenerateHint === "different_voice" ? "auto" : voiceId,
            qualityMode,
            advanced,
            previousDirector: analysis?.analysis,
            regenerateHint,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Generation failed");
        const result = data as GenerationResult;
        setVersions((prev) => {
          const next = [...prev, { ...result, version: prev.length + 1 }];
          setActiveVersion(next.length - 1);
          return next;
        });
        addToHistory(result);
        setAnalysis({
          analysis: result.analysis,
          voice: result.voice,
          matchScore: 1,
          matchReasons: analysis?.matchReasons ?? [],
          aiProvider: analysis?.aiProvider ?? "mock",
        });
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setGenerating(false);
        setShowRegenMenu(false);
      }
    },
    [text, style, directorOverride, voiceId, qualityMode, advanced, analysis]
  );

  const loadDemo = (id: string) => {
    const demo = DEMO_EXAMPLES.find((d) => d.id === id);
    if (!demo) return;
    setText(demo.text);
    setStyle(demo.style);
    setVersions([]);
  };

  const currentVersion = versions[activeVersion];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          VOICE MOOD <span className="gradient-text">AI</span>
        </h1>
        <p className="mt-2 text-muted">Give your words a human voice.</p>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {DEMO_EXAMPLES.map((demo) => (
          <button
            key={demo.id}
            onClick={() => loadDemo(demo.id)}
            className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted hover:text-foreground"
          >
            {demo.label}
          </button>
        ))}
      </div>

      <TextEditor value={text} onChange={setText} />

      <StylePresets value={style} onChange={setStyle} />

      <div className="rounded-2xl border border-border bg-surface p-4">
        <label className="mb-2 flex items-center gap-1.5 text-sm font-medium">
          <Wand2 size={14} className="text-accent" />
          Tell the AI how you want it to sound...
        </label>
        <div className="flex gap-2">
          <input
            value={overrideInput}
            onChange={(e) => setOverrideInput(e.target.value)}
            placeholder='e.g. "Make it sound like a confident luxury brand advertisement."'
            className="flex-1 rounded-full border border-border bg-surface-2 px-4 py-2 text-sm focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setDirectorOverride(overrideInput)}
            className="rounded-full bg-surface-2 px-4 py-2 text-sm font-medium hover:bg-border"
          >
            Apply
          </button>
        </div>
      </div>

      {voices.length > 0 && (
        <VoiceSelector
          voices={voices}
          selectedVoiceId={voiceId}
          autoRecommendation={analysis?.voice}
          onChange={setVoiceId}
        />
      )}

      <AdvancedControls value={advanced} onChange={setAdvanced} />

      <div className="flex items-center justify-center gap-2">
        {(["studio_quality", "quick_preview"] as QualityMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setQualityMode(mode)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium",
              qualityMode === mode ? "bg-accent text-white" : "bg-surface-2 text-muted"
            )}
          >
            {mode === "studio_quality" ? "Studio Quality" : "Quick Preview"}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-500">{error}</div>
      )}

      {generating && <LoadingStages />}

      {!generating && analysis && (
        <DirectorPanel
          analysis={analysis.analysis}
          voice={analysis.voice}
          matchReasons={analysis.matchReasons}
          onGenerate={() => generate()}
          generating={generating}
        />
      )}

      {!analysis && !generating && text.trim().length > 0 && analyzing && (
        <p className="text-center text-sm text-muted">Understanding your message...</p>
      )}

      {currentVersion && !generating && (
        <div className="flex flex-col gap-3">
          {versions.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {versions.map((v, i) => (
                <button
                  key={v.id}
                  onClick={() => setActiveVersion(i)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium capitalize",
                    i === activeVersion ? "border-accent bg-accent/10" : "border-border text-muted"
                  )}
                >
                  Version {v.version} — {v.voice.gender} / {v.analysis.primaryEmotion}
                </button>
              ))}
            </div>
          )}

          <AudioPlayer
            key={currentVersion.id}
            generation={currentVersion}
            favorite={favorites.includes(currentVersion.id)}
            onToggleFavorite={() => setFavorites(toggleFavoriteGeneration(currentVersion.id))}
            onRegenerate={() => setShowRegenMenu((v) => !v)}
          />

          {showRegenMenu && (
            <div className="flex flex-wrap gap-2 rounded-2xl border border-border bg-surface p-4">
              <span className="w-full text-sm font-medium text-muted">Try another performance:</span>
              {REGENERATE_OPTIONS.map((opt) => (
                <button
                  key={opt.hint}
                  onClick={() => generate(opt.hint)}
                  className="rounded-full border border-border px-3 py-1.5 text-sm hover:border-accent"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
