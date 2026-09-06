import type { Emotion } from "@/types";

/**
 * The Voice Director system prompt. This is the single most important
 * piece of text in the whole application — it is what turns "text to
 * speech" into "an AI that decides how a human would say these words."
 */
export const DIRECTOR_SYSTEM_PROMPT = `You are an expert voice director, stage actor coach, audiobook director, advertising voice director and dialogue coach with 20 years of experience directing professional voice talent.

Your job is NOT to rewrite the user's words. Your job is to determine how those exact words should be performed by a human voice actor.

Rules you must never break:
- Preserve the user's wording exactly. Never invent sentences, never add dialogue, never change the meaning. You may only make a tiny technical modification to a word if it is required for pronunciation/TTS markup, and even then the visible meaning must stay identical.
- Analyze context, intent, emotion, audience and implied meaning — not just surface keywords.
- Determine appropriate voice characteristics (gender, age, personality) and delivery (energy, pacing, pitch, warmth, intimacy, formality) that match what a real human speaker would sound like saying this.
- Break the text into logical sentences or short phrases and direct each one individually — real speech evolves emotionally across a passage, it does not stay static. A message that starts calm and turns urgent should show that progression across segments.
- Use the minimum emotional intensity the text actually calls for. A mildly playful message is NOT flirtatious, and a flirtatious message is NOT exaggerated seduction. Distinguish friendly / playful / teasing / flirty / romantic / intimate and pick the lightest one that fits.
- Only attach audio tags (like [whispers], [laughs], [sighs]) to a segment when they would genuinely improve the performance. Most segments should have zero or one tag. Never stack more than 2 tags on one segment. Natural, restrained speech beats a performance stuffed with tags.
- Never output a tag as spoken text. Tags are stage directions for the synthesizer, never words the voice should say.
- If the text is Arabic, identify whether it reads as Modern Standard Arabic, or a conversational dialect (Gulf/Saudi, Egyptian, Levantine) ONLY when you are reasonably confident. If unsure, use "neutral" rather than guessing a specific dialect.
- If the text mixes Arabic and English, set language to "mixed" and do not translate anything.
- If the user supplies a "director override" instruction, use it to steer HOW the text is performed (mood, pacing, formality, persona) — never let it add words, change the literal text, or contradict the plain meaning of the user's message.
- Never expose your internal reasoning process. The "explanation" field is a short, user-facing sentence about why this delivery/voice fits — not a chain of thought.

You will output ONLY a single JSON object matching the schema you are given. No markdown fences, no commentary.`;

export function buildDirectorUserPrompt(input: {
  text: string;
  style?: string;
  directorOverride?: string;
  previousDirector?: unknown;
  regenerateHint?: string;
}): string {
  const parts: string[] = [];
  parts.push(`USER TEXT (perform exactly this text, verbatim):\n"""\n${input.text}\n"""`);

  if (input.style && input.style !== "auto") {
    parts.push(`REQUESTED STYLE PRESET: ${input.style} (use it as a strong hint, but let the actual text override it if they conflict).`);
  } else {
    parts.push(`STYLE: Auto — determine the best style purely from the text itself.`);
  }

  if (input.directorOverride) {
    parts.push(`DIRECTOR OVERRIDE (how the user wants it to sound — apply to delivery only, never change the words): "${input.directorOverride}"`);
  }

  if (input.previousDirector) {
    parts.push(`PREVIOUS DIRECTOR PROFILE (for regeneration — adjust from this baseline rather than starting over):\n${JSON.stringify(input.previousDirector)}`);
  }

  if (input.regenerateHint) {
    parts.push(`REGENERATION REQUEST: Adjust the previous profile to be "${input.regenerateHint.replace(/_/g, " ")}". Keep everything else about the previous profile that still fits.`);
  }

  parts.push(`Return valid JSON with this exact shape:
{
  "language": string (ISO-ish code: "en", "ar", "mixed", etc.),
  "languageConfidence": number 0-1,
  "dialect": "msa" | "gulf" | "saudi" | "egyptian" | "levantine" | "neutral",
  "context": one of business, corporate, sales, marketing, advertisement, education, news, storytelling, documentary, romantic, flirting, friendship, comedy, motivation, customer_service, announcement, social_media, gaming, character, personal_message,
  "primaryEmotion": one of neutral, happy, sad, angry, excited, fearful, romantic, flirty, calm, serious, confident, playful, sarcastic, curious, mysterious, inspirational, dramatic, nostalgic, empathetic, urgent,
  "secondaryEmotion": same set, optional,
  "voiceProfile": { "gender": "male"|"female"|"neutral", "ageRange": "child"|"young_adult"|"adult"|"middle_aged"|"senior", "personality": string[] (2-4 short trait words) },
  "delivery": { "energy": 0-1, "expressiveness": 0-1, "speed": 0.5-2.0 (1.0 normal), "pitch": 0.5-1.5 (1.0 normal), "warmth": 0-1, "intimacy": 0-1, "formality": 0-1, "confidence": 0-1 },
  "performanceDirection": short paragraph describing the overall performance,
  "segments": [ { "text": exact substring of the user's text, "emotion": ..., "secondaryEmotion": optional, "delivery": short phrase, "tags": string[] (0-2 items from the supported tag list), "pauseAfterMs": optional number } ... ],
  "confidence": 0-1 overall confidence in this analysis,
  "explanation": one short user-facing sentence explaining the emotion/voice choice (no internal reasoning, no chain of thought)
}

Concatenating all "segments[].text" back together (with whitespace) must reproduce the user's text exactly, in order, with nothing added or removed.`);

  return parts.join("\n\n");
}

/**
 * Emotion -> ElevenLabs v3 audio tag mapping. Kept intentionally small and
 * configurable: only tags we are confident are supported/effective. Do not
 * assume every conceivable tag exists — this list is the source of truth
 * for what the Director is allowed to attach to a segment.
 */
export const EMOTION_TAG_MAP: Record<Emotion, string[]> = {
  neutral: [],
  happy: ["[happy]", "[chuckles]"],
  sad: ["[sad]", "[sighs]", "[softly]"],
  angry: ["[angry]"],
  excited: ["[excited]"],
  fearful: ["[hesitates]", "[softly]"],
  romantic: ["[softly]", "[warmly]"],
  flirty: ["[playfully]", "[softly]", "[chuckles]"],
  calm: ["[softly]"],
  serious: [],
  confident: [],
  playful: ["[playfully]", "[laughs]"],
  sarcastic: ["[laughs]"],
  curious: [],
  mysterious: ["[whispers]"],
  inspirational: ["[excited]"],
  dramatic: ["[pauses]"],
  nostalgic: ["[softly]", "[sighs]"],
  empathetic: ["[softly]", "[warmly]"],
  urgent: [],
};

/** The full set of tags the app is willing to send to ElevenLabs. */
export const SUPPORTED_TAGS = new Set(
  Object.values(EMOTION_TAG_MAP).flat().concat(["[whispers]", "[shouts]", "[warmly]", "[pauses]"])
);

export function sanitizeTags(tags: string[] | undefined): string[] {
  if (!tags) return [];
  return tags.filter((t) => SUPPORTED_TAGS.has(t)).slice(0, 2);
}
