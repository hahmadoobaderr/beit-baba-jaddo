import type { StylePreset } from "@/types";

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: "professional",
    label: "Professional",
    icon: "🎙",
    description: "Clear, confident, controlled.",
    directorHint: "Clear, confident, controlled professional delivery. Measured pacing, minimal emotional swings.",
    context: "business",
    emotion: "confident",
  },
  {
    id: "corporate",
    label: "Corporate",
    icon: "💼",
    description: "Formal, authoritative, polished.",
    directorHint: "Formal corporate announcement tone. Authoritative, polished, composed.",
    context: "corporate",
    emotion: "serious",
  },
  {
    id: "romantic",
    label: "Romantic",
    icon: "❤️",
    description: "Warm, intimate, sincere.",
    directorHint: "Warm, intimate, sincere romantic delivery. Soft pacing, gentle warmth, no exaggeration.",
    context: "romantic",
    emotion: "romantic",
  },
  {
    id: "flirty",
    label: "Flirty",
    icon: "😏",
    description: "Playful, teasing, confident, intimate.",
    directorHint: "Playful, teasing, lightly flirty delivery. Confident and intimate but never exaggerated or overacted.",
    context: "flirting",
    emotion: "flirty",
  },
  {
    id: "energetic",
    label: "Energetic",
    icon: "🔥",
    description: "Fast, enthusiastic, exciting.",
    directorHint: "Fast, enthusiastic, high-energy delivery with dynamic pacing.",
    context: "motivation",
    emotion: "excited",
  },
  {
    id: "emotional",
    label: "Emotional",
    icon: "😢",
    description: "Soft, vulnerable, restrained.",
    directorHint: "Soft, vulnerable, emotionally restrained delivery. Understated, not melodramatic.",
    context: "personal_message",
    emotion: "sad",
  },
  {
    id: "cinematic",
    label: "Cinematic",
    icon: "🎬",
    description: "Dramatic, expressive, storytelling.",
    directorHint: "Cinematic storytelling delivery. Dramatic pacing, expressive but purposeful, builds tension where the text calls for it.",
    context: "storytelling",
    emotion: "dramatic",
  },
  {
    id: "advertisement",
    label: "Advertisement",
    icon: "📢",
    description: "Persuasive, polished, confident.",
    directorHint: "Persuasive advertisement delivery. Polished, confident, premium, controlled emphasis on key phrases.",
    context: "advertisement",
    emotion: "confident",
  },
  {
    id: "news",
    label: "News",
    icon: "📰",
    description: "Authoritative, clear, neutral.",
    directorHint: "Authoritative news-anchor delivery. Clear, neutral, measured pacing, minimal emotional coloring.",
    context: "news",
    emotion: "serious",
  },
  {
    id: "funny",
    label: "Funny",
    icon: "😂",
    description: "Playful, comedic timing.",
    directorHint: "Playful delivery with comedic timing — landing the beat before a punchline, light and fun.",
    context: "comedy",
    emotion: "playful",
  },
];

export const STYLE_PRESET_MAP: Record<string, StylePreset> = Object.fromEntries(
  STYLE_PRESETS.map((p) => [p.id, p])
);

export interface DemoExample {
  id: string;
  label: string;
  text: string;
  style: string;
  expected: string;
}

export const DEMO_EXAMPLES: DemoExample[] = [
  {
    id: "business",
    label: "Business",
    text: "Dear team, I am pleased to announce that we have successfully completed the first phase of the project.",
    style: "auto",
    expected: "Corporate / confident / professional.",
  },
  {
    id: "flirty_en",
    label: "Flirty (English)",
    text: "Why do you keep looking at me like that? You're making it very difficult for me to behave.",
    style: "auto",
    expected: "Playful / teasing / intimate.",
  },
  {
    id: "romantic_ar",
    label: "Romantic (Arabic)",
    text: "اشتقت لك أكثر مما تتخيل، وكل يوم يمر بدونك أحسه أطول من اليوم اللي قبله.",
    style: "auto",
    expected: "Warm / emotional / intimate.",
  },
  {
    id: "business_ar",
    label: "Business (Arabic)",
    text: "يسرنا أن نعلن عن إطلاق مشروعنا الجديد، والذي يمثل خطوة مهمة في مسيرة الشركة.",
    style: "auto",
    expected: "Professional / authoritative.",
  },
  {
    id: "motivational",
    label: "Motivational",
    text: "You've already come this far. Don't stop now. The next step could change everything.",
    style: "auto",
    expected: "Energetic / inspirational.",
  },
  {
    id: "advertisement",
    label: "Advertisement",
    text: "Experience luxury like never before.",
    style: "auto",
    expected: "Premium / persuasive / confident.",
  },
];
