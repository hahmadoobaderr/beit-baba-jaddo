import type { VoiceMetadata, ModelTier, AdvancedVoiceControls } from "@/types";

export interface SynthesizeParams {
  text: string;
  voiceId: string;
  modelId: string;
  languageCode?: string;
  advanced?: Partial<AdvancedVoiceControls>;
}

export interface SynthesizeResult {
  audio: Buffer;
  contentType: string;
  characters: number;
}

/**
 * Abstraction over a TTS backend. ElevenLabs is the primary implementation;
 * a mock implementation satisfies the same interface so the app runs fully
 * without credentials. To add a new provider (e.g. a different vendor),
 * implement this interface and register it in lib/tts/index.ts.
 */
export interface TTSProvider {
  readonly name: string;
  isConfigured(): boolean;
  listVoices(): Promise<VoiceMetadata[]>;
  synthesize(params: SynthesizeParams): Promise<SynthesizeResult>;
  synthesizeStream(params: SynthesizeParams): Promise<ReadableStream<Uint8Array>>;
  previewVoice(voiceId: string): Promise<string | null>;
}

/** User-facing quality tiers mapped to actual model IDs. Keep the mapping
 * here so normal users never see raw model identifiers. */
export const MODEL_TIER_MAP: Record<ModelTier, string> = {
  highest_quality: "eleven_v3",
  balanced: "eleven_multilingual_v2",
  fast_preview: "eleven_flash_v2_5",
};

export function resolveModelId(qualityMode: "quick_preview" | "studio_quality" | undefined): string {
  if (qualityMode === "quick_preview") return MODEL_TIER_MAP.fast_preview;
  return MODEL_TIER_MAP.highest_quality;
}
