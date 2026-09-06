import type { VoiceMetadata, Gender, AgeRange } from "@/types";

export interface RawVoiceInput {
  voiceId: string;
  name: string;
  previewUrl?: string | null;
  description?: string;
  labels?: Record<string, string>;
  verifiedLanguages?: string[];
}

/**
 * Turns provider-native voice data into our internal VoiceMetadata shape.
 * ElevenLabs voice `labels` commonly include hints like gender/age/accent/
 * description/use_case, but coverage is inconsistent, so we back-fill from
 * free text (name + description) with conservative heuristics. This never
 * invents a voiceId — it only classifies voices the provider actually
 * returned.
 *
 * Administrators can override any of this via the local metadata store
 * (see lib/voices/store.ts) — that override always wins over these
 * heuristics.
 */
export function classifyVoice(input: RawVoiceInput): VoiceMetadata {
  const labels = input.labels || {};
  const haystack = `${input.name} ${input.description ?? ""} ${Object.values(labels).join(" ")}`.toLowerCase();

  const gender = classifyGender(labels.gender, haystack);
  const age = classifyAge(labels.age, haystack);
  const languages = classifyLanguages(input.verifiedLanguages, haystack);
  const accents = classifyAccents(labels.accent, haystack, languages);
  const styles = classifyStyles(haystack, labels);

  return {
    voiceId: input.voiceId,
    name: input.name,
    gender,
    age,
    languages,
    accents,
    styles,
    previewUrl: input.previewUrl ?? null,
    source: "elevenlabs",
    description: input.description,
  };
}

function classifyGender(label: string | undefined, haystack: string): Gender {
  if (label === "male" || label === "female") return label;
  if (/\b(male|man|he\/him)\b/.test(haystack)) return "male";
  if (/\b(female|woman|she\/her)\b/.test(haystack)) return "female";
  return "neutral";
}

function classifyAge(label: string | undefined, haystack: string): AgeRange {
  const known: Record<string, AgeRange> = {
    child: "child",
    young: "young_adult",
    "young adult": "young_adult",
    middle_aged: "middle_aged",
    "middle aged": "middle_aged",
    old: "senior",
    senior: "senior",
  };
  if (label && known[label]) return known[label];
  if (/\bchild\b/.test(haystack)) return "child";
  if (/\bsenior|elderly|old\b/.test(haystack)) return "senior";
  if (/\bmiddle.?aged\b/.test(haystack)) return "middle_aged";
  if (/\byoung\b/.test(haystack)) return "young_adult";
  return "adult";
}

function classifyLanguages(verified: string[] | undefined, haystack: string): string[] {
  const langs = new Set<string>(verified?.map((l) => l.toLowerCase()) ?? []);
  if (/\barabic|عرب/.test(haystack)) langs.add("ar");
  if (/\benglish\b/.test(haystack)) langs.add("en");
  if (langs.size === 0) langs.add("en"); // ElevenLabs voices are multilingual-capable by default
  return Array.from(langs);
}

function classifyAccents(label: string | undefined, haystack: string, languages: string[]): string[] {
  const accents = new Set<string>();
  if (label) accents.add(label.toLowerCase());
  if (/\bgulf\b/.test(haystack)) accents.add("gulf");
  if (/\bsaudi\b/.test(haystack)) accents.add("saudi");
  if (/\begyptian\b/.test(haystack)) accents.add("egyptian");
  if (/\blevantine\b/.test(haystack)) accents.add("levantine");
  if (/\bbritish\b/.test(haystack)) accents.add("british");
  if (/\bamerican\b/.test(haystack)) accents.add("american");
  if (accents.size === 0 && languages.includes("ar")) accents.add("neutral");
  if (accents.size === 0) accents.add("neutral");
  return Array.from(accents);
}

function classifyStyles(haystack: string, labels: Record<string, string>): string[] {
  const styles = new Set<string>();
  const styleWords: Record<string, string> = {
    warm: "warm",
    friendly: "friendly",
    professional: "professional",
    calm: "calm",
    confident: "confident",
    energetic: "energetic",
    playful: "playful",
    romantic: "romantic",
    deep: "deep",
    soothing: "soothing",
    authoritative: "authoritative",
    narration: "narration",
    conversational: "conversational",
    expressive: "expressive",
  };
  for (const [word, style] of Object.entries(styleWords)) {
    if (haystack.includes(word)) styles.add(style);
  }
  if (labels.use_case) styles.add(labels.use_case.toLowerCase());
  if (labels.description) styles.add(labels.description.toLowerCase());
  if (styles.size === 0) styles.add("versatile");
  return Array.from(styles);
}
