"use client";

import type { GenerationResult } from "@/types";

// Client-side history/favorites persistence for the MVP (see README for
// the Prisma schema this is designed to be swapped for once accounts
// exist). Deliberately isolated behind this module so callers never touch
// localStorage directly.

const HISTORY_KEY = "voicemood.history.v1";
const FAVORITE_VOICES_KEY = "voicemood.favoriteVoices.v1";
const FAVORITE_GENERATIONS_KEY = "voicemood.favoriteGenerations.v1";
const MAX_HISTORY = 100;

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function getHistory(): GenerationResult[] {
  if (typeof window === "undefined") return [];
  return safeParse<GenerationResult[]>(localStorage.getItem(HISTORY_KEY), []);
}

export function addToHistory(result: GenerationResult): void {
  if (typeof window === "undefined") return;
  const history = getHistory();
  history.unshift(result);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
}

export function clearHistory(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(HISTORY_KEY);
}

export function getFavoriteVoiceIds(): string[] {
  if (typeof window === "undefined") return [];
  return safeParse<string[]>(localStorage.getItem(FAVORITE_VOICES_KEY), []);
}

export function toggleFavoriteVoice(voiceId: string): string[] {
  const favorites = new Set(getFavoriteVoiceIds());
  if (favorites.has(voiceId)) favorites.delete(voiceId);
  else favorites.add(voiceId);
  const next = Array.from(favorites);
  localStorage.setItem(FAVORITE_VOICES_KEY, JSON.stringify(next));
  return next;
}

export function getFavoriteGenerationIds(): string[] {
  if (typeof window === "undefined") return [];
  return safeParse<string[]>(localStorage.getItem(FAVORITE_GENERATIONS_KEY), []);
}

export function toggleFavoriteGeneration(id: string): string[] {
  const favorites = new Set(getFavoriteGenerationIds());
  if (favorites.has(id)) favorites.delete(id);
  else favorites.add(id);
  const next = Array.from(favorites);
  localStorage.setItem(FAVORITE_GENERATIONS_KEY, JSON.stringify(next));
  return next;
}
