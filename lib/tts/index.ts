import type { VoiceMetadata } from "@/types";
import { ElevenLabsProvider } from "./elevenlabs";
import { MockTTSProvider } from "./mock";
import type { TTSProvider } from "./provider";
import { getCached, setCached, invalidate } from "@/lib/cache/memory";
import { applyOverrides } from "@/lib/voices/store";

const elevenLabs = new ElevenLabsProvider();
const mock = new MockTTSProvider();

/** The active provider — ElevenLabs when configured, otherwise the
 * isolated mock. Switching providers in the future means implementing
 * TTSProvider and swapping the export here (or making this env-driven). */
export function getTTSProvider(): TTSProvider {
  return elevenLabs.isConfigured() ? elevenLabs : mock;
}

const VOICES_CACHE_KEY = "list";
const VOICES_TTL_MS = 1000 * 60 * 30;

export async function getVoices(forceRefresh = false): Promise<{ voices: VoiceMetadata[]; provider: string; cachedAt: number }> {
  if (!forceRefresh) {
    const cached = getCached<{ voices: VoiceMetadata[]; provider: string; cachedAt: number }>("voices", VOICES_CACHE_KEY);
    if (cached) return cached;
  } else {
    invalidate("voices", VOICES_CACHE_KEY);
  }

  const provider = getTTSProvider();
  const rawVoices = await provider.listVoices();
  const voices = applyOverrides(rawVoices);
  const result = { voices, provider: provider.name, cachedAt: Date.now() };
  setCached("voices", VOICES_CACHE_KEY, result, VOICES_TTL_MS);
  return result;
}

export { MODEL_TIER_MAP, resolveModelId } from "./provider";
export type { TTSProvider, SynthesizeParams, SynthesizeResult } from "./provider";
