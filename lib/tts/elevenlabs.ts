import type { VoiceMetadata } from "@/types";
import type { TTSProvider, SynthesizeParams, SynthesizeResult } from "./provider";
import { classifyVoice } from "@/lib/voices/metadata";

const BASE_URL = "https://api.elevenlabs.io";

function apiKey(): string {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error("ELEVENLABS_API_KEY is not configured");
  return key;
}

interface ElevenLabsVoiceApi {
  voice_id: string;
  name: string;
  category?: string;
  labels?: Record<string, string>;
  preview_url?: string | null;
  description?: string | null;
  verified_languages?: { language: string; accent?: string }[];
}

/**
 * Real ElevenLabs implementation. Talks directly to the documented REST
 * API (never invented endpoints) so the app doesn't depend on an SDK's
 * exact version drifting out from under it:
 *  - GET  /v1/voices                              list available voices
 *  - POST /v1/text-to-speech/{voice_id}           synthesize (non-streaming)
 *  - POST /v1/text-to-speech/{voice_id}/stream     synthesize (streaming)
 * All requests are made server-side only; ELEVENLABS_API_KEY never
 * reaches the browser.
 */
export class ElevenLabsProvider implements TTSProvider {
  readonly name = "elevenlabs";

  isConfigured(): boolean {
    return Boolean(process.env.ELEVENLABS_API_KEY);
  }

  async listVoices(): Promise<VoiceMetadata[]> {
    const res = await fetch(`${BASE_URL}/v1/voices`, {
      headers: { "xi-api-key": apiKey() },
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`ElevenLabs listVoices failed: ${res.status} ${await safeText(res)}`);
    }
    const data = (await res.json()) as { voices: ElevenLabsVoiceApi[] };
    return data.voices.map((v) => toVoiceMetadata(v));
  }

  async previewVoice(voiceId: string): Promise<string | null> {
    const voices = await this.listVoices();
    return voices.find((v) => v.voiceId === voiceId)?.previewUrl ?? null;
  }

  async synthesize(params: SynthesizeParams): Promise<SynthesizeResult> {
    const res = await fetch(
      `${BASE_URL}/v1/text-to-speech/${encodeURIComponent(params.voiceId)}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildRequestBody(params)),
      }
    );
    if (!res.ok) {
      throw new Error(`ElevenLabs synthesize failed: ${res.status} ${await safeText(res)}`);
    }
    const arrayBuffer = await res.arrayBuffer();
    return {
      audio: Buffer.from(arrayBuffer),
      contentType: "audio/mpeg",
      characters: params.text.length,
    };
  }

  async synthesizeStream(params: SynthesizeParams): Promise<ReadableStream<Uint8Array>> {
    const res = await fetch(
      `${BASE_URL}/v1/text-to-speech/${encodeURIComponent(params.voiceId)}/stream?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildRequestBody(params)),
      }
    );
    if (!res.ok || !res.body) {
      throw new Error(`ElevenLabs stream failed: ${res.status} ${await safeText(res)}`);
    }
    return res.body;
  }
}

function buildRequestBody(params: SynthesizeParams) {
  const advanced = params.advanced || {};
  return {
    text: params.text,
    model_id: params.modelId,
    ...(params.languageCode ? { language_code: params.languageCode } : {}),
    voice_settings: {
      stability: advanced.stability ?? 0.5,
      similarity_boost: advanced.similarityBoost ?? 0.75,
      style: advanced.style ?? 0.3,
      use_speaker_boost: advanced.speakerBoost ?? true,
      ...(advanced.speed ? { speed: clampSpeed(advanced.speed) } : {}),
    },
  };
}

function clampSpeed(speed: number): number {
  // ElevenLabs accepts a narrower practical range than our UI's 0.5-2.0.
  return Math.min(1.2, Math.max(0.7, speed));
}

function toVoiceMetadata(v: ElevenLabsVoiceApi): VoiceMetadata {
  return classifyVoice({
    voiceId: v.voice_id,
    name: v.name,
    previewUrl: v.preview_url ?? null,
    description: v.description ?? undefined,
    labels: v.labels ?? {},
    verifiedLanguages: v.verified_languages?.map((l) => l.language) ?? [],
  });
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "<no body>";
  }
}
