"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause, Download, Heart, RotateCcw, Volume2, VolumeX } from "lucide-react";
import type { GenerationResult } from "@/types";
import { cn } from "@/lib/utils/cn";

interface AudioPlayerProps {
  generation: GenerationResult;
  favorite?: boolean;
  onToggleFavorite?: () => void;
  onRegenerate?: () => void;
}

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 2];
const BAR_COUNT = 56;

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function AudioPlayer({ generation, favorite, onToggleFavorite, onRegenerate }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(generation.duration);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [waveform, setWaveform] = useState<number[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const AudioContextCtor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioContextCtor();
        const res = await fetch(generation.audioUrl);
        const arrayBuffer = await res.arrayBuffer();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        const channel = audioBuffer.getChannelData(0);
        const blockSize = Math.floor(channel.length / BAR_COUNT) || 1;
        const bars: number[] = [];
        for (let i = 0; i < BAR_COUNT; i++) {
          let sum = 0;
          const start = i * blockSize;
          for (let j = 0; j < blockSize && start + j < channel.length; j++) {
            sum += Math.abs(channel[start + j]);
          }
          bars.push(sum / blockSize);
        }
        const max = Math.max(...bars, 0.0001);
        if (!cancelled) setWaveform(bars.map((b) => Math.max(0.08, b / max)));
        ctx.close();
      } catch {
        if (!cancelled) setWaveform(Array.from({ length: BAR_COUNT }, () => 0.15 + Math.random() * 0.6));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [generation.audioUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = muted ? 0 : volume;
    audio.playbackRate = speed;
  }, [volume, muted, speed]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play();
    }
  };

  const seekTo = (fraction: number) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    audio.currentTime = fraction * duration;
  };

  const progress = duration > 0 ? currentTime / duration : 0;

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <audio
        ref={audioRef}
        src={generation.audioUrl}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => {
          if (Number.isFinite(e.currentTarget.duration)) setDuration(e.currentTarget.duration);
        }}
      />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={togglePlay}
          aria-label={playing ? "Pause" : "Play"}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-2 text-white"
        >
          {playing ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
        </button>

        <div
          role="slider"
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") seekTo(Math.min(1, progress + 0.05));
            if (e.key === "ArrowLeft") seekTo(Math.max(0, progress - 0.05));
          }}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            seekTo((e.clientX - rect.left) / rect.width);
          }}
          className="flex h-10 flex-1 cursor-pointer items-center gap-[2px]"
        >
          {(waveform.length > 0 ? waveform : Array.from({ length: BAR_COUNT }, () => 0.2)).map((h, i) => {
            const played = i / BAR_COUNT < progress;
            return (
              <span
                key={i}
                className={cn("w-full rounded-full transition-colors", played ? "bg-accent" : "bg-surface-2")}
                style={{ height: `${Math.max(8, h * 100)}%` }}
              />
            );
          })}
        </div>

        <span className="w-24 shrink-0 text-right text-xs tabular-nums text-muted">
          {formatTime(currentTime)}/{formatTime(duration)}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
        <div>
          <span className="font-medium">Voice: {generation.voice.name}</span>
          <span className="ml-2 capitalize text-muted">
            Style: {generation.analysis.primaryEmotion}
            {generation.analysis.secondaryEmotion ? ` • ${generation.analysis.secondaryEmotion}` : ""}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            aria-label={muted ? "Unmute" : "Mute"}
            className="text-muted hover:text-foreground"
          >
            {muted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={muted ? 0 : volume}
            onChange={(e) => {
              setVolume(Number(e.target.value));
              setMuted(false);
            }}
            aria-label="Volume"
            className="w-20 accent-accent"
          />
          <select
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            aria-label="Playback speed"
            className="rounded-full border border-border bg-surface px-2 py-1 text-xs"
          >
            {SPEED_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}x
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
        {onRegenerate && (
          <button
            type="button"
            onClick={onRegenerate}
            className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm font-medium text-muted hover:text-foreground"
          >
            <RotateCcw size={14} />
            Regenerate
          </button>
        )}
        {onToggleFavorite && (
          <button
            type="button"
            onClick={onToggleFavorite}
            aria-pressed={favorite}
            className={cn(
              "flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm font-medium",
              favorite ? "text-accent-2" : "text-muted hover:text-foreground"
            )}
          >
            <Heart size={14} fill={favorite ? "currentColor" : "none"} />
            Favorite
          </button>
        )}
        <a
          href={generation.audioUrl}
          download
          className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm font-medium text-muted hover:text-foreground"
        >
          <Download size={14} />
          Download
        </a>
      </div>
    </div>
  );
}
