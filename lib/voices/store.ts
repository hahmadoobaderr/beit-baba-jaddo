import fs from "node:fs";
import path from "node:path";
import type { VoiceMetadata } from "@/types";

// Simple JSON-file-backed store for admin voice metadata overrides.
// Deliberately not a database — the app is architected to swap this for
// Prisma/Postgres (see README) without touching callers, since everything
// here is behind getOverrides/saveOverride.

const DATA_DIR = path.join(process.cwd(), "data");
const FILE_PATH = path.join(DATA_DIR, "voice-metadata-overrides.json");

export type VoiceOverride = Partial<
  Pick<VoiceMetadata, "gender" | "age" | "languages" | "accents" | "styles" | "description">
>;

function readAll(): Record<string, VoiceOverride> {
  try {
    const raw = fs.readFileSync(FILE_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writeAll(data: Record<string, VoiceOverride>): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2), "utf-8");
}

export function getOverrides(): Record<string, VoiceOverride> {
  return readAll();
}

export function saveOverride(voiceId: string, override: VoiceOverride): void {
  const all = readAll();
  all[voiceId] = { ...all[voiceId], ...override };
  writeAll(all);
}

export function applyOverrides(voices: VoiceMetadata[]): VoiceMetadata[] {
  const overrides = readAll();
  if (Object.keys(overrides).length === 0) return voices;
  return voices.map((v) => (overrides[v.voiceId] ? { ...v, ...overrides[v.voiceId] } : v));
}
