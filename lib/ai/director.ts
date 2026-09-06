import Anthropic from "@anthropic-ai/sdk";
import type { DirectorProfile, Emotion, ContextCategory } from "@/types";
import {
  DirectorProfileSchema,
  coerceDirectorJson,
} from "./schemas";
import { DIRECTOR_SYSTEM_PROMPT, buildDirectorUserPrompt, sanitizeTags } from "./prompts";
import { STYLE_PRESET_MAP } from "@/lib/presets";
import { getCached, setCached } from "@/lib/cache/memory";

export interface DirectorInput {
  text: string;
  style?: string;
  directorOverride?: string;
  previousDirector?: DirectorProfile;
  regenerateHint?: string;
}

export interface DirectorOutput {
  profile: DirectorProfile;
  provider: "anthropic" | "mock";
}

function getAnthropicClient(): Anthropic | null {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) return null;
  return new Anthropic({ apiKey });
}

const AI_MODEL = process.env.AI_MODEL || "claude-sonnet-5";

function cacheKey(input: DirectorInput): string {
  return JSON.stringify({
    t: input.text,
    s: input.style,
    o: input.directorOverride,
    r: input.regenerateHint,
    p: input.previousDirector ? input.previousDirector.primaryEmotion : null,
  });
}

export async function runVoiceDirector(input: DirectorInput): Promise<DirectorOutput> {
  const cacheHit = getCached<DirectorOutput>("director", cacheKey(input));
  if (cacheHit) return cacheHit;

  const client = getAnthropicClient();
  let result: DirectorOutput;

  if (client) {
    try {
      result = await runWithAnthropic(client, input);
    } catch (err) {
      console.error("[director] Anthropic call failed, falling back to mock analysis:", err);
      result = { profile: runMockDirector(input), provider: "mock" };
    }
  } else {
    result = { profile: runMockDirector(input), provider: "mock" };
  }

  setCached("director", cacheKey(input), result, 1000 * 60 * 10);
  return result;
}

async function runWithAnthropic(client: Anthropic, input: DirectorInput): Promise<DirectorOutput> {
  const preset = input.style && input.style !== "auto" ? STYLE_PRESET_MAP[input.style] : undefined;
  const mergedOverride = [preset?.directorHint, input.directorOverride].filter(Boolean).join(" ");

  const userPrompt = buildDirectorUserPrompt({
    text: input.text,
    style: input.style,
    directorOverride: mergedOverride || undefined,
    previousDirector: input.previousDirector,
    regenerateHint: input.regenerateHint,
  });

  const response = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 4096,
    system: DIRECTOR_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Director response contained no text block");
  }

  const parsed = extractJson(textBlock.text);
  const coerced = coerceDirectorJson(parsed);
  const validated = DirectorProfileSchema.parse(coerced);

  const profile = finalizeProfile(validated as DirectorProfile, input.text);
  return { profile, provider: "anthropic" };
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("No JSON object found in director response");
  }
  const jsonStr = trimmed.slice(start, end + 1);
  return JSON.parse(jsonStr);
}

/**
 * Sanitizes tags against the supported vocabulary and, if the model's
 * segments don't faithfully reconstruct the original text (rare, but we
 * never trust raw AI output), falls back to a single segment carrying the
 * full text so nothing spoken is ever lost or altered.
 */
function finalizeProfile(profile: DirectorProfile, originalText: string): DirectorProfile {
  const rebuilt = profile.segments.map((s) => s.text).join(" ").replace(/\s+/g, " ").trim();
  const original = originalText.replace(/\s+/g, " ").trim();

  const segmentsOk = rebuilt.length > 0 && levenshteinRatio(rebuilt, original) > 0.85;

  const segments = segmentsOk
    ? profile.segments.map((s) => ({ ...s, tags: sanitizeTags(s.tags) }))
    : [
        {
          text: originalText,
          emotion: profile.primaryEmotion,
          secondaryEmotion: profile.secondaryEmotion,
          delivery: profile.performanceDirection.slice(0, 100),
          tags: [],
        },
      ];

  return { ...profile, segments };
}

function levenshteinRatio(a: string, b: string): number {
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  const dist = levenshtein(a, b);
  return 1 - dist / maxLen;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  // Cap cost for very long strings to avoid pathological perf on huge inputs.
  const cappedA = a.length > 4000 ? a.slice(0, 4000) : a;
  const cappedB = b.length > 4000 ? b.slice(0, 4000) : b;
  const prev = new Array(cappedB.length + 1);
  const curr = new Array(cappedB.length + 1);
  for (let j = 0; j <= cappedB.length; j++) prev[j] = j;
  for (let i = 1; i <= cappedA.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= cappedB.length; j++) {
      const cost = cappedA[i - 1] === cappedB[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= cappedB.length; j++) prev[j] = curr[j];
  }
  return prev[cappedB.length];
}

// ---------------------------------------------------------------------------
// Mock Voice Director — a rule-based fallback used when no AI_API_KEY is
// configured. Deliberately heuristic and isolated from the real (Anthropic)
// path so the app remains fully demoable without credentials, while making
// no claim to the sophistication of the real model.
// ---------------------------------------------------------------------------

function detectLanguage(text: string): { language: string; confidence: number } {
  const arabicChars = (text.match(/[؀-ۿ]/g) || []).length;
  const latinChars = (text.match(/[A-Za-z]/g) || []).length;
  const total = arabicChars + latinChars || 1;
  if (arabicChars > 0 && latinChars > 0 && Math.min(arabicChars, latinChars) / total > 0.15) {
    return { language: "mixed", confidence: 0.75 };
  }
  if (arabicChars > latinChars) return { language: "ar", confidence: Math.min(0.98, 0.6 + arabicChars / total) };
  if (latinChars > 0) return { language: "en", confidence: Math.min(0.98, 0.6 + latinChars / total) };
  return { language: "en", confidence: 0.4 };
}

function detectDialect(text: string): "msa" | "gulf" | "saudi" | "neutral" {
  const gulfMarkers = ["والله", "أبي", "وش", "ليش", "اشتقت", "احس", "أحس", "توني", "زين", "يا هلا"];
  if (gulfMarkers.some((m) => text.includes(m))) return "gulf";
  return "msa";
}

interface MockRule {
  test: RegExp;
  emotion: Emotion;
  secondaryEmotion?: Emotion;
  context: ContextCategory;
  delivery: Partial<DirectorProfile["delivery"]>;
  personality: string[];
  gender: DirectorProfile["voiceProfile"]["gender"];
  ageRange: DirectorProfile["voiceProfile"]["ageRange"];
  explanation: string;
}

const MOCK_RULES: MockRule[] = [
  {
    test: /\b(dear team|announce|pleased to|project|phase|colleagues|quarter|stakeholders)\b|يسرنا أن نعلن|مشروعنا|الشركة/i,
    emotion: "confident",
    secondaryEmotion: "serious",
    context: "business",
    delivery: { energy: 0.45, expressiveness: 0.35, speed: 0.98, pitch: 1.0, warmth: 0.4, intimacy: 0.1, formality: 0.85, confidence: 0.8 },
    personality: ["professional", "composed", "confident"],
    gender: "male",
    ageRange: "adult",
    explanation: "Your message reads as a professional announcement, so a confident, formal corporate voice was chosen.",
  },
  {
    test: /\b(smile|forget what i was going to say|making it very difficult|behave|looking at me)\b/i,
    emotion: "flirty",
    secondaryEmotion: "playful",
    context: "flirting",
    delivery: { energy: 0.55, expressiveness: 0.75, speed: 0.93, pitch: 1.05, warmth: 0.8, intimacy: 0.75, formality: 0.15, confidence: 0.7 },
    personality: ["warm", "playful", "confident"],
    gender: "female",
    ageRange: "young_adult",
    explanation: "Your message is personal and playfully teasing, so a warm, expressive voice with light flirtatious energy was chosen.",
  },
  {
    test: /ليش كل ما أشوفك|اشتقت لك|شعوري/,
    emotion: "romantic",
    secondaryEmotion: "flirty",
    context: "romantic",
    delivery: { energy: 0.4, expressiveness: 0.7, speed: 0.88, pitch: 1.02, warmth: 0.85, intimacy: 0.85, formality: 0.1, confidence: 0.6 },
    personality: ["warm", "sincere", "gentle"],
    gender: "female",
    ageRange: "young_adult",
    explanation: "Your message is intimate and emotional, so a soft, warm Arabic voice with high intimacy was chosen.",
  },
  {
    test: /\b(you can do this|don't stop|already come this far|next step|believe in yourself|keep going)\b/i,
    emotion: "inspirational",
    secondaryEmotion: "confident",
    context: "motivation",
    delivery: { energy: 0.85, expressiveness: 0.75, speed: 1.08, pitch: 1.05, warmth: 0.6, intimacy: 0.2, formality: 0.3, confidence: 0.9 },
    personality: ["energetic", "inspiring", "warm"],
    gender: "male",
    ageRange: "adult",
    explanation: "Your message is motivational, so an energetic, confident and inspiring delivery was chosen.",
  },
  {
    test: /\b(luxury|experience|like never before|premium|indulge)\b/i,
    emotion: "confident",
    secondaryEmotion: "dramatic",
    context: "advertisement",
    delivery: { energy: 0.55, expressiveness: 0.6, speed: 0.9, pitch: 1.0, warmth: 0.5, intimacy: 0.3, formality: 0.5, confidence: 0.85 },
    personality: ["polished", "persuasive", "confident"],
    gender: "female",
    ageRange: "adult",
    explanation: "Your message reads as an advertisement, so a polished, persuasive and confident delivery was chosen.",
  },
];

const DEFAULT_RULE: MockRule = {
  test: /.*/,
  emotion: "neutral",
  context: "personal_message",
  delivery: { energy: 0.5, expressiveness: 0.5, speed: 1.0, pitch: 1.0, warmth: 0.5, intimacy: 0.3, formality: 0.4, confidence: 0.5 },
  personality: ["natural", "conversational"],
  gender: "female",
  ageRange: "young_adult",
  explanation: "A natural, conversational delivery was chosen based on your message's neutral tone.",
};

function splitIntoSentences(text: string): string[] {
  const parts = text
    .split(/(?<=[.!?؟])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : [text];
}

export function runMockDirector(input: DirectorInput): DirectorProfile {
  const { text, style, directorOverride } = input;
  const preset = style && style !== "auto" ? STYLE_PRESET_MAP[style] : undefined;

  const rule = preset
    ? MOCK_RULES.find((r) => r.context === preset.context) || {
        ...DEFAULT_RULE,
        emotion: preset.emotion,
        context: preset.context,
      }
    : MOCK_RULES.find((r) => r.test.test(text)) || DEFAULT_RULE;

  const { language, confidence: languageConfidence } = detectLanguage(text);
  const dialect = language === "ar" || language === "mixed" ? detectDialect(text) : "neutral";

  const overrideBoost = directorOverride ? analyzeOverrideHint(directorOverride) : {};

  const delivery: DirectorProfile["delivery"] = {
    energy: 0.5,
    expressiveness: 0.5,
    speed: 1.0,
    pitch: 1.0,
    warmth: 0.5,
    intimacy: 0.3,
    formality: 0.4,
    confidence: 0.5,
    ...rule.delivery,
    ...overrideBoost,
  };

  const sentences = splitIntoSentences(text);
  const segments = sentences.map((sentence, i) => {
    const isLast = i === sentences.length - 1;
    const emotion = isLast ? rule.emotion : sentences.length > 1 && i === 0 ? "neutral" : rule.emotion;
    const tags = i === sentences.length - 1 ? (rule.emotion === "flirty" || rule.emotion === "romantic" ? ["[softly]"] : []) : [];
    return {
      text: sentence,
      emotion: sentences.length > 1 ? emotion : rule.emotion,
      secondaryEmotion: rule.secondaryEmotion,
      delivery: rule.personality.join(", "),
      tags,
    };
  });

  return {
    language,
    languageConfidence,
    dialect,
    context: preset?.context ?? rule.context,
    primaryEmotion: rule.emotion,
    secondaryEmotion: rule.secondaryEmotion,
    voiceProfile: {
      gender: rule.gender,
      ageRange: rule.ageRange,
      personality: rule.personality,
    },
    delivery,
    performanceDirection: `${rule.personality.join(", ")} delivery — ${rule.emotion}${rule.secondaryEmotion ? ` with ${rule.secondaryEmotion} undertones` : ""}.`,
    segments,
    confidence: rule.emotion === "neutral" ? 0.55 : 0.82,
    explanation: rule.explanation,
  };
}

function analyzeOverrideHint(hint: string): Partial<DirectorProfile["delivery"]> {
  const h = hint.toLowerCase();
  const out: Partial<DirectorProfile["delivery"]> = {};
  if (/luxur|premium|elegant|calm/.test(h)) {
    out.energy = 0.4;
    out.formality = 0.6;
    out.warmth = 0.5;
  }
  if (/confident|business/.test(h)) {
    out.confidence = 0.85;
  }
  if (/disappoint|hurt|sad/.test(h)) {
    out.energy = 0.3;
    out.warmth = 0.4;
    out.intimacy = 0.6;
  }
  if (/fast|energetic|hype/.test(h)) {
    out.speed = 1.15;
    out.energy = 0.85;
  }
  if (/slow/.test(h)) {
    out.speed = 0.85;
  }
  return out;
}
