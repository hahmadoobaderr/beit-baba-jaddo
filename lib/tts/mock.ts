import type { VoiceMetadata } from "@/types";
import type { TTSProvider, SynthesizeParams, SynthesizeResult } from "./provider";

/**
 * Isolated mock TTS provider. Used only when ELEVENLABS_API_KEY is absent
 * so the whole product remains demoable without credentials. It never
 * shares code paths with the real ElevenLabs client and never claims to
 * produce real speech — it synthesizes a short audible tone whose length
 * and pitch reflect the requested delivery, purely so the audio player has
 * something real to play, seek and download.
 */
export class MockTTSProvider implements TTSProvider {
  readonly name = "mock";

  isConfigured(): boolean {
    return true;
  }

  async listVoices(): Promise<VoiceMetadata[]> {
    return MOCK_VOICES;
  }

  async previewVoice(voiceId: string): Promise<string | null> {
    void voiceId;
    return null;
  }

  async synthesize(params: SynthesizeParams): Promise<SynthesizeResult> {
    const durationSeconds = estimateDuration(params.text, params.advanced?.speed ?? 1.0);
    const audio = generateToneWav(durationSeconds);
    return { audio, contentType: "audio/wav", characters: params.text.length };
  }

  async synthesizeStream(params: SynthesizeParams): Promise<ReadableStream<Uint8Array>> {
    const { audio } = await this.synthesize(params);
    return new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(audio));
        controller.close();
      },
    });
  }
}

export function estimateDuration(text: string, speed = 1.0): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const wordsPerMinute = 150 * speed;
  const seconds = (words / wordsPerMinute) * 60;
  return Math.max(1, Math.min(120, seconds));
}

/** Generates a small, valid 16-bit PCM WAV tone — real playable audio bytes. */
function generateToneWav(durationSeconds: number, frequency = 220): Buffer {
  const sampleRate = 22050;
  const numSamples = Math.floor(sampleRate * durationSeconds);
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const envelope = Math.min(1, t * 8) * Math.min(1, (durationSeconds - t) * 8);
    const sample = Math.sin(2 * Math.PI * frequency * t) * 0.2 * Math.max(0, envelope);
    buffer.writeInt16LE(Math.round(sample * 32767), 44 + i * 2);
  }

  return buffer;
}

export const MOCK_VOICES: VoiceMetadata[] = [
  {
    voiceId: "mock-sarah",
    name: "Sarah",
    gender: "female",
    age: "young_adult",
    languages: ["en", "ar"],
    accents: ["neutral"],
    styles: ["warm", "friendly", "expressive", "romantic", "playful"],
    previewUrl: null,
    source: "mock",
    description: "Warm and expressive, great for personal messages and social content.",
  },
  {
    voiceId: "mock-omar",
    name: "Omar",
    gender: "male",
    age: "adult",
    languages: ["ar", "en"],
    accents: ["gulf", "saudi"],
    styles: ["confident", "professional", "authoritative"],
    previewUrl: null,
    source: "mock",
    description: "Confident Gulf Arabic voice, suited to business and announcements.",
  },
  {
    voiceId: "mock-layla",
    name: "Layla",
    gender: "female",
    age: "young_adult",
    languages: ["ar"],
    accents: ["msa", "levantine"],
    styles: ["soft", "romantic", "narration", "expressive"],
    previewUrl: null,
    source: "mock",
    description: "Soft, emotive Arabic voice for storytelling and intimate messages.",
  },
  {
    voiceId: "mock-james",
    name: "James",
    gender: "male",
    age: "middle_aged",
    languages: ["en"],
    accents: ["american"],
    styles: ["authoritative", "deep", "narration", "professional"],
    previewUrl: null,
    source: "mock",
    description: "Deep, authoritative voice for news and documentary narration.",
  },
  {
    voiceId: "mock-mia",
    name: "Mia",
    gender: "female",
    age: "young_adult",
    languages: ["en"],
    accents: ["american"],
    styles: ["energetic", "playful", "confident", "social_media"],
    previewUrl: null,
    source: "mock",
    description: "Bright and energetic, great for social media and advertisements.",
  },
  {
    voiceId: "mock-khalid",
    name: "Khalid",
    gender: "male",
    age: "young_adult",
    languages: ["ar", "en"],
    accents: ["gulf"],
    styles: ["playful", "warm", "conversational"],
    previewUrl: null,
    source: "mock",
    description: "Natural, conversational Gulf Arabic voice for casual and playful content.",
  },
];
