import { z } from "zod";

// Runtime validation for everything that comes back from the AI Voice
// Director. We never trust raw model JSON — this is the single gate it
// must pass through before touching voice selection or TTS.

export const EmotionSchema = z.enum([
  "neutral",
  "happy",
  "sad",
  "angry",
  "excited",
  "fearful",
  "romantic",
  "flirty",
  "calm",
  "serious",
  "confident",
  "playful",
  "sarcastic",
  "curious",
  "mysterious",
  "inspirational",
  "dramatic",
  "nostalgic",
  "empathetic",
  "urgent",
]);

export const ContextCategorySchema = z.enum([
  "business",
  "corporate",
  "sales",
  "marketing",
  "advertisement",
  "education",
  "news",
  "storytelling",
  "documentary",
  "romantic",
  "flirting",
  "friendship",
  "comedy",
  "motivation",
  "customer_service",
  "announcement",
  "social_media",
  "gaming",
  "character",
  "personal_message",
]);

export const GenderSchema = z.enum(["male", "female", "neutral"]);

export const AgeRangeSchema = z.enum([
  "child",
  "young_adult",
  "adult",
  "middle_aged",
  "senior",
]);

export const DialectSchema = z.enum([
  "msa",
  "gulf",
  "saudi",
  "egyptian",
  "levantine",
  "neutral",
]);

const unit = z.number().min(0).max(1);

export const VoiceProfileSchema = z.object({
  gender: GenderSchema,
  ageRange: AgeRangeSchema,
  personality: z.array(z.string()).min(1).max(6),
});

export const DeliverySettingsSchema = z.object({
  energy: unit,
  expressiveness: unit,
  speed: z.number().min(0.5).max(2.0),
  pitch: z.number().min(0.5).max(1.5),
  warmth: unit,
  intimacy: unit,
  formality: unit,
  confidence: unit.optional(),
});

// Tags are constrained to a known, configurable vocabulary — see
// lib/ai/prompts.ts SUPPORTED_TAGS. We don't reject unknown tags outright
// (models drift), we just strip them during sanitization.
export const DirectorSegmentSchema = z.object({
  text: z.string().min(1),
  emotion: EmotionSchema,
  secondaryEmotion: EmotionSchema.optional(),
  delivery: z.string().min(1).max(120),
  tags: z.array(z.string()).max(4).default([]),
  pauseAfterMs: z.number().min(0).max(2000).optional(),
});

export const DirectorProfileSchema = z.object({
  language: z.string().min(2).max(10),
  languageConfidence: unit,
  dialect: DialectSchema.optional(),
  context: ContextCategorySchema,
  primaryEmotion: EmotionSchema,
  secondaryEmotion: EmotionSchema.optional(),
  voiceProfile: VoiceProfileSchema,
  delivery: DeliverySettingsSchema,
  performanceDirection: z.string().min(1).max(400),
  segments: z.array(DirectorSegmentSchema).min(1),
  confidence: unit,
  explanation: z.string().min(1).max(600),
});

export type DirectorProfileValidated = z.infer<typeof DirectorProfileSchema>;

export const GenerationRequestSchema = z.object({
  text: z.string().min(1).max(20000),
  style: z.string().optional(),
  directorOverride: z.string().max(500).optional(),
  voiceId: z.string().optional(),
  qualityMode: z.enum(["quick_preview", "studio_quality"]).optional(),
  advanced: z
    .object({
      stability: unit.optional(),
      similarityBoost: unit.optional(),
      style: unit.optional(),
      speakerBoost: z.boolean().optional(),
      speed: z.number().min(0.5).max(2.0).optional(),
    })
    .optional(),
  previousDirector: DirectorProfileSchema.optional(),
  regenerateHint: z
    .enum([
      "more_emotional",
      "more_natural",
      "more_confident",
      "more_playful",
      "more_serious",
      "slower",
      "faster",
      "different_voice",
    ])
    .optional(),
});

export const AnalyzeRequestSchema = z.object({
  text: z.string().min(1).max(20000),
  style: z.string().optional(),
  directorOverride: z.string().max(500).optional(),
});

/**
 * Best-effort repair for near-miss AI JSON: fills safe defaults for
 * optional fields so a minor omission doesn't fail the whole analysis.
 */
export function coerceDirectorJson(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null) return raw;
  const obj = raw as Record<string, unknown>;
  const delivery = (obj.delivery as Record<string, unknown>) || {};
  return {
    ...obj,
    dialect: obj.dialect ?? "neutral",
    delivery: {
      energy: 0.5,
      expressiveness: 0.5,
      speed: 1.0,
      pitch: 1.0,
      warmth: 0.5,
      intimacy: 0.3,
      formality: 0.5,
      ...delivery,
    },
    confidence: obj.confidence ?? 0.5,
    explanation: obj.explanation ?? "Delivery chosen based on the message's tone and context.",
    segments: Array.isArray(obj.segments) ? obj.segments : [],
  };
}
