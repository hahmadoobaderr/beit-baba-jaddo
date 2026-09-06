"use client";

import { STYLE_PRESETS } from "@/lib/presets";
import { cn } from "@/lib/utils/cn";

interface StylePresetsProps {
  value: string;
  onChange: (value: string) => void;
}

export function StylePresets({ value, onChange }: StylePresetsProps) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Style preset">
      <PresetButton active={value === "auto"} onClick={() => onChange("auto")} icon="✨" label="Auto" />
      {STYLE_PRESETS.map((preset) => (
        <PresetButton
          key={preset.id}
          active={value === preset.id}
          onClick={() => onChange(preset.id)}
          icon={preset.icon}
          label={preset.label}
        />
      ))}
    </div>
  );
}

function PresetButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all",
        active
          ? "border-accent bg-accent/10 text-foreground shadow-[0_0_0_1px_var(--accent)]"
          : "border-border text-muted hover:text-foreground hover:border-foreground/30"
      )}
    >
      <span aria-hidden>{icon}</span>
      {label}
    </button>
  );
}
