import type { DirectorProfile, VoiceMetadata, SelectedVoice } from "@/types";

/**
 * Matches a Director profile to the best available voice. Never invents a
 * voice — it only scores and ranks voices that the provider actually
 * returned (see lib/tts/index.ts#getVoices). "Auto" selection and explicit
 * user selection both flow through here so recommendations stay
 * consistent and explainable.
 */
export function selectVoice(
  profile: DirectorProfile,
  voices: VoiceMetadata[],
  requestedVoiceId?: string
): SelectedVoice {
  if (voices.length === 0) {
    throw new Error("No voices available to select from");
  }

  if (requestedVoiceId && requestedVoiceId !== "auto") {
    const exact = voices.find((v) => v.voiceId === requestedVoiceId);
    if (exact) {
      return { voice: exact, matchScore: 1, matchReasons: ["Manually selected by user"] };
    }
    // Never invent a voice ID — if the requested one doesn't exist anymore
    // (e.g. removed upstream), fall through to automatic matching.
  }

  const scored = voices.map((voice) => scoreVoice(profile, voice));
  scored.sort((a, b) => b.matchScore - a.matchScore);
  return scored[0];
}

function scoreVoice(profile: DirectorProfile, voice: VoiceMetadata): SelectedVoice {
  let score = 0;
  const reasons: string[] = [];

  const targetLang = profile.language === "mixed" ? "en" : profile.language;
  if (voice.languages.includes(targetLang)) {
    score += 3;
    reasons.push(`Speaks ${languageLabel(targetLang)}`);
  }
  if (profile.language === "mixed" && voice.languages.includes("ar") && voice.languages.includes("en")) {
    score += 2;
    reasons.push("Multilingual — handles mixed Arabic/English naturally");
  }

  if (voice.gender === profile.voiceProfile.gender) {
    score += 2;
    reasons.push(`${capitalize(voice.gender)} voice matches the requested profile`);
  } else if (profile.voiceProfile.gender === "neutral") {
    score += 0.5;
  }

  if (voice.age === profile.voiceProfile.ageRange) {
    score += 1.5;
    reasons.push(`Age range (${humanAge(voice.age)}) fits the message`);
  }

  if (
    profile.dialect &&
    profile.dialect !== "neutral" &&
    profile.dialect !== "msa" &&
    voice.accents.includes(profile.dialect)
  ) {
    score += 2;
    reasons.push(`Matches ${profile.dialect} accent`);
  }

  const personalityOverlap = profile.voiceProfile.personality.filter((p) =>
    voice.styles.some((s) => s.includes(p) || p.includes(s))
  );
  if (personalityOverlap.length > 0) {
    score += personalityOverlap.length;
    reasons.push(`Style matches: ${personalityOverlap.join(", ")}`);
  }

  const emotionStyleHints = EMOTION_STYLE_HINTS[profile.primaryEmotion] ?? [];
  const emotionOverlap = emotionStyleHints.filter((h) => voice.styles.includes(h));
  if (emotionOverlap.length > 0) {
    score += emotionOverlap.length * 0.75;
    reasons.push(`Well suited to a ${profile.primaryEmotion} delivery`);
  }

  if (reasons.length === 0) {
    reasons.push("Closest available match for this message");
  }

  return { voice, matchScore: score, matchReasons: reasons };
}

const EMOTION_STYLE_HINTS: Partial<Record<DirectorProfile["primaryEmotion"], string[]>> = {
  flirty: ["playful", "warm", "expressive", "romantic"],
  romantic: ["warm", "romantic", "soft", "expressive"],
  confident: ["confident", "professional", "authoritative"],
  serious: ["authoritative", "professional", "narration"],
  inspirational: ["energetic", "confident", "warm"],
  calm: ["calm", "soothing", "soft"],
  dramatic: ["expressive", "narration", "deep"],
  sad: ["soft", "soothing"],
  excited: ["energetic", "playful"],
  playful: ["playful", "friendly", "energetic"],
};

function languageLabel(code: string): string {
  if (code === "ar") return "Arabic";
  if (code === "en") return "English";
  return code;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function humanAge(age: VoiceMetadata["age"]): string {
  return age.replace(/_/g, " ");
}
