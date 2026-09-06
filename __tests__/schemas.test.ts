import { describe, it, expect } from "vitest";
import { DirectorProfileSchema, coerceDirectorJson, GenerationRequestSchema } from "@/lib/ai/schemas";

const VALID_PROFILE = {
  language: "en",
  languageConfidence: 0.95,
  dialect: "neutral",
  context: "personal_message",
  primaryEmotion: "flirty",
  secondaryEmotion: "playful",
  voiceProfile: { gender: "female", ageRange: "young_adult", personality: ["warm", "playful"] },
  delivery: {
    energy: 0.6,
    expressiveness: 0.8,
    speed: 0.95,
    pitch: 1.02,
    warmth: 0.8,
    intimacy: 0.7,
    formality: 0.2,
    confidence: 0.7,
  },
  performanceDirection: "Warm, playful, teasing delivery.",
  segments: [
    { text: "You look amazing tonight.", emotion: "flirty", delivery: "playful teasing", tags: ["[playfully]"] },
  ],
  confidence: 0.9,
  explanation: "This message is playful and personal.",
};

describe("DirectorProfileSchema", () => {
  it("accepts a well-formed profile", () => {
    const result = DirectorProfileSchema.safeParse(VALID_PROFILE);
    expect(result.success).toBe(true);
  });

  it("rejects an unknown emotion", () => {
    const result = DirectorProfileSchema.safeParse({ ...VALID_PROFILE, primaryEmotion: "melancholic-but-hopeful" });
    expect(result.success).toBe(false);
  });

  it("rejects a profile missing required fields", () => {
    const { delivery, ...withoutDelivery } = VALID_PROFILE;
    void delivery;
    const result = DirectorProfileSchema.safeParse(withoutDelivery);
    expect(result.success).toBe(false);
  });

  it("rejects delivery values out of range", () => {
    const result = DirectorProfileSchema.safeParse({
      ...VALID_PROFILE,
      delivery: { ...VALID_PROFILE.delivery, energy: 1.5 },
    });
    expect(result.success).toBe(false);
  });

  it("rejects a segment with more than 4 tags at the schema level", () => {
    const result = DirectorProfileSchema.safeParse({
      ...VALID_PROFILE,
      segments: [
        { text: "Hi.", emotion: "happy", delivery: "cheerful", tags: ["[a]", "[b]", "[c]", "[d]", "[e]"] },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-object input entirely", () => {
    const result = DirectorProfileSchema.safeParse("not an object");
    expect(result.success).toBe(false);
  });
});

describe("coerceDirectorJson", () => {
  it("fills in missing optional fields with safe defaults", () => {
    const coerced = coerceDirectorJson({
      language: "en",
      languageConfidence: 0.9,
      context: "personal_message",
      primaryEmotion: "neutral",
      voiceProfile: { gender: "neutral", ageRange: "adult", personality: ["calm"] },
      performanceDirection: "Neutral delivery.",
      segments: [{ text: "Hello.", emotion: "neutral", delivery: "calm", tags: [] }],
    }) as Record<string, unknown>;

    expect(coerced.dialect).toBe("neutral");
    expect(coerced.confidence).toBe(0.5);
    expect(typeof coerced.explanation).toBe("string");
    const result = DirectorProfileSchema.safeParse(coerced);
    expect(result.success).toBe(true);
  });

  it("passes non-object input through unchanged", () => {
    expect(coerceDirectorJson(null)).toBeNull();
    expect(coerceDirectorJson("hi")).toBe("hi");
  });
});

describe("GenerationRequestSchema", () => {
  it("accepts a minimal valid request", () => {
    const result = GenerationRequestSchema.safeParse({ text: "Hello world" });
    expect(result.success).toBe(true);
  });

  it("rejects an empty text field", () => {
    const result = GenerationRequestSchema.safeParse({ text: "" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid regenerateHint", () => {
    const result = GenerationRequestSchema.safeParse({ text: "Hi", regenerateHint: "make_it_sad" });
    expect(result.success).toBe(false);
  });

  it("rejects speed out of the 0.5-2.0 range", () => {
    const result = GenerationRequestSchema.safeParse({ text: "Hi", advanced: { speed: 3 } });
    expect(result.success).toBe(false);
  });
});
