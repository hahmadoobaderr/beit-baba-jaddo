"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { AdvancedVoiceControls } from "@/types";
import { cn } from "@/lib/utils/cn";

interface AdvancedControlsProps {
  value: Partial<AdvancedVoiceControls>;
  onChange: (value: Partial<AdvancedVoiceControls>) => void;
}

const STABILITY_LABELS = ["Creative", "Natural", "Robust"];

export function AdvancedControls({ value, onChange }: AdvancedControlsProps) {
  const [open, setOpen] = useState(false);

  const stability = value.stability ?? 0.5;
  const style = value.style ?? 0.3;
  const speed = value.speed ?? 1.0;
  const speakerBoost = value.speakerBoost ?? true;

  const stabilityLabel =
    stability < 0.34 ? STABILITY_LABELS[0] : stability < 0.67 ? STABILITY_LABELS[1] : STABILITY_LABELS[2];

  return (
    <div className="rounded-2xl border border-border bg-surface">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-3 text-sm font-medium"
        aria-expanded={open}
      >
        Advanced Voice Controls
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {open && (
        <div className="grid grid-cols-1 gap-5 border-t border-border px-5 py-5 sm:grid-cols-2">
          <Slider
            label="Stability"
            sublabel={stabilityLabel}
            min={0}
            max={1}
            step={0.01}
            value={stability}
            onChange={(v) => onChange({ ...value, stability: v })}
          />
          <Slider
            label="Style / Expressiveness"
            sublabel={style < 0.34 ? "Automatic" : style < 0.67 ? "Balanced" : "Custom"}
            min={0}
            max={1}
            step={0.01}
            value={style}
            onChange={(v) => onChange({ ...value, style: v })}
          />
          <Slider
            label="Speed"
            sublabel={`${speed.toFixed(2)}x`}
            min={0.5}
            max={2.0}
            step={0.01}
            value={speed}
            onChange={(v) => onChange({ ...value, speed: v })}
          />
          <div className="flex flex-col justify-center gap-2">
            <span className="text-sm font-medium">Speaker Boost</span>
            <button
              type="button"
              role="switch"
              aria-checked={speakerBoost}
              onClick={() => onChange({ ...value, speakerBoost: !speakerBoost })}
              className={cn(
                "relative h-7 w-12 rounded-full transition-colors",
                speakerBoost ? "bg-accent" : "bg-surface-2"
              )}
            >
              <span
                className={cn(
                  "absolute top-1 h-5 w-5 rounded-full bg-white transition-transform",
                  speakerBoost ? "translate-x-6" : "translate-x-1"
                )}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Slider({
  label,
  sublabel,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  sublabel: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted">{sublabel}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="accent-accent"
      />
    </label>
  );
}
