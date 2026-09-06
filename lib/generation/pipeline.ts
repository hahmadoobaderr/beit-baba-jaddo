import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { DirectorProfile, GenerationRequest, GenerationResult, VoiceMetadata } from "@/types";
import { runVoiceDirector } from "@/lib/ai/director";
import { selectVoice } from "@/lib/voices/matcher";
import { getVoices, getTTSProvider, resolveModelId } from "@/lib/tts";
import { buildTTSMarkup } from "@/lib/tts/markup";
import { chunkText } from "@/lib/audio/chunker";
import { estimateDuration } from "@/lib/tts/mock";
import { recordUsage, estimateCost } from "@/lib/usage/tracker";
import { getCached, setCached } from "@/lib/cache/memory";

const GENERATED_DIR = path.join(process.cwd(), "public", "generated");
const MAX_CHARS_PER_TTS_CALL = 2500;

export interface AnalyzeOutcome {
  profile: DirectorProfile;
  provider: "anthropic" | "mock";
  selectedVoice: { voice: VoiceMetadata; matchScore: number; matchReasons: string[] };
}

/** Runs Director analysis + voice matching WITHOUT calling TTS. Powers the
 * pre-generation "AI Voice Director" analysis panel. */
export async function analyzeText(req: {
  text: string;
  style?: string;
  directorOverride?: string;
  voiceId?: string;
  previousDirector?: DirectorProfile;
  regenerateHint?: GenerationRequest["regenerateHint"];
}): Promise<AnalyzeOutcome> {
  const { profile, provider } = await runVoiceDirector(req);
  const { voices } = await getVoices();
  const selectedVoice = selectVoice(profile, voices, req.voiceId);
  return { profile, provider, selectedVoice };
}

function generationCacheKey(req: GenerationRequest): string {
  return JSON.stringify({
    text: req.text,
    style: req.style,
    override: req.directorOverride,
    voiceId: req.voiceId,
    quality: req.qualityMode,
    advanced: req.advanced,
    hint: req.regenerateHint,
  });
}

export async function generateVoice(req: GenerationRequest): Promise<GenerationResult> {
  const cacheKey = generationCacheKey(req);
  const cached = getCached<GenerationResult>("generation", cacheKey);
  if (cached) return cached;

  const { profile, selectedVoice } = await analyzeText(req);
  const modelId = resolveModelId(req.qualityMode);
  const provider = getTTSProvider();

  const chunks = chunkText(req.text, MAX_CHARS_PER_TTS_CALL);
  const markup = buildTTSMarkup(profile);

  // Single-call path covers the overwhelming majority of real usage (short
  // messages, social captions, ad copy). Multi-chunk long-form text is
  // synthesized chunk-by-chunk with the same voice/settings for
  // consistency; audio buffers are concatenated in order. Sequential MP3
  // concatenation is a pragmatic MVP choice — swap for a proper audio
  // muxer (ffmpeg) if gapless precision matters across chunk boundaries.
  let audioBuffer: Buffer;
  let charactersSynthesized = 0;

  if (chunks.length <= 1) {
    const result = await provider.synthesize({
      text: markup,
      voiceId: selectedVoice.voice.voiceId,
      modelId,
      languageCode: profile.language === "mixed" ? undefined : profile.language,
      advanced: req.advanced,
    });
    audioBuffer = result.audio;
    charactersSynthesized = result.characters;
  } else {
    const buffers: Buffer[] = [];
    for (const chunk of chunks) {
      const chunkProfile = await runVoiceDirector({
        text: chunk.text,
        style: req.style,
        directorOverride: req.directorOverride,
      });
      const chunkMarkup = buildTTSMarkup(chunkProfile.profile);
      const result = await provider.synthesize({
        text: chunkMarkup,
        voiceId: selectedVoice.voice.voiceId,
        modelId,
        languageCode: profile.language === "mixed" ? undefined : profile.language,
        advanced: req.advanced,
      });
      buffers.push(result.audio);
      charactersSynthesized += result.characters;
    }
    audioBuffer = Buffer.concat(buffers);
  }

  const id = randomUUID();
  const extension = provider.name === "mock" ? "wav" : "mp3";
  fs.mkdirSync(GENERATED_DIR, { recursive: true });
  const filePath = path.join(GENERATED_DIR, `${id}.${extension}`);
  fs.writeFileSync(filePath, audioBuffer);

  const duration = estimateDuration(req.text, profile.delivery.speed);
  const cost = estimateCost(modelId, charactersSynthesized);
  recordUsage({
    charactersAnalyzed: req.text.length,
    charactersSynthesized,
    model: modelId,
    provider: provider.name,
    estimatedCostUsd: cost,
  });

  const result: GenerationResult = {
    id,
    audioUrl: `/generated/${id}.${extension}`,
    analysis: profile,
    voice: selectedVoice.voice,
    duration: Math.round(duration),
    createdAt: new Date().toISOString(),
    text: req.text,
    model: modelId,
    provider: provider.name,
    version: 1,
  };

  setCached("generation", cacheKey, result, 1000 * 60 * 15);
  return result;
}
