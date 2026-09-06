"use client";

import { useMemo } from "react";

interface TextEditorProps {
  value: string;
  onChange: (value: string) => void;
  maxChars?: number;
}

function estimateDurationLabel(text: string): string {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const totalSeconds = Math.round((words / 150) * 60);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export function TextEditor({ value, onChange, maxChars = 20000 }: TextEditorProps) {
  const duration = useMemo(() => estimateDurationLabel(value), [value]);
  const isRtlHeavy = useMemo(() => {
    const arabicChars = (value.match(/[؀-ۿ]/g) || []).length;
    return arabicChars > value.length * 0.3;
  }, [value]);

  return (
    <div className="rounded-2xl border border-border bg-surface glow-ring">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, maxChars))}
        dir={isRtlHeavy ? "rtl" : "ltr"}
        placeholder="Type or paste your text..."
        aria-label="Text to convert to speech"
        rows={8}
        className="w-full resize-none rounded-2xl bg-transparent p-5 text-lg leading-relaxed placeholder:text-muted focus:outline-none"
      />
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-3 text-sm text-muted">
        <span>{value.length.toLocaleString()} characters</span>
        <span>Estimated duration: ~{duration}</span>
      </div>
    </div>
  );
}
