// Core domain types for VoiceMood AI

export type Language = "en" | "ar" | "mixed" | string;

export type ArabicDialect =
  | "msa"
  | "gulf"
  | "saudi"
  | "egyptian"
  | "levantine"
  | "neutral";

export type Emotion =
  | "neutral"
  | "happy"
  | "sad"
  | "angry"
  | "excited"
  | "fearful"
  | "romantic"
  | "flirty"
  | "calm"
  | "serious"
  | "confident"
  | "playful"
  | "sarcastic"
  | "curious"
  | "mysterious"
  | "inspirational"
  | "dramatic"
  | "nostalgic"
  | "empathetic"
  | "urgent";

export type ContextCategory =
  | "business"
  | "corporate"
  | "sales"
  | "marketing"
  | "advertisement"
  | "education"
  | "news"
  | "storytelling"
  | "documentary"
  | "romantic"
  | "flirting"
  | "friendship"
  | "comedy"
  | "motivation"
  | "customer_service"
  | "announcement"
  | "social_media"
  | "gaming"
  | "character"
  | "personal_message";

export type Gender = "male" | "female" | "neutral";

export type AgeRange = "child" | "young_adult" | "adult" | "middle_aged" | "senior";

export type QualityMode = "quick_preview" | "studio_quality";

export interface VoiceProfile {
  gender: Gender;
  ageRange: AgeRange;
  personality: string[];
}

export interface DeliverySettings {
  energy: number; // 0-1
  expressiveness: number; // 0-1
  speed: number; // 0.5 - 2.0, 1.0 = normal
  pitch: number; // relative multiplier, 1.0 = normal
  warmth: number; // 0-1
  intimacy: number; // 0-1
  formality: number; // 0-1
  confidence?: number; // 0-1
}

export interface DirectorSegment {
  text: string;
  emotion: Emotion;
  secondaryEmotion?: Emotion;
  delivery: string;
  tags: string[];
  pauseAfterMs?: number;
}

export interface DirectorProfile {
  language: Language;
  languageConfidence: number;
  dialect?: ArabicDialect | "neutral";
  context: ContextCategory;
  primaryEmotion: Emotion;
  secondaryEmotion?: Emotion;
  voiceProfile: VoiceProfile;
  delivery: DeliverySettings;
  performanceDirection: string;
  segments: DirectorSegment[];
  confidence: number; // overall confidence 0-1
  explanation: string; // concise, user-facing "why this voice/direction"
}

export interface VoiceMetadata {
  voiceId: string;
  name: string;
  gender: Gender;
  age: AgeRange;
  languages: Language[];
  accents: string[];
  styles: string[];
  previewUrl?: string | null;
  source: "elevenlabs" | "mock";
  description?: string;
}

export interface SelectedVoice {
  voice: VoiceMetadata;
  matchScore: number;
  matchReasons: string[];
}

export type ModelTier = "highest_quality" | "balanced" | "fast_preview";

export interface AdvancedVoiceControls {
  stability: number; // 0-1 (creative -> robust)
  similarityBoost: number; // 0-1
  style: number; // 0-1, style exaggeration
  speakerBoost: boolean;
  speed: number; // 0.5 - 2.0
}

export interface GenerationRequest {
  text: string;
  style?: string; // preset id or "auto"
  directorOverride?: string;
  voiceId?: string | "auto";
  qualityMode?: QualityMode;
  advanced?: Partial<AdvancedVoiceControls>;
  previousDirector?: DirectorProfile; // for intelligent regeneration
  regenerateHint?: RegenerateHint;
}

export type RegenerateHint =
  | "more_emotional"
  | "more_natural"
  | "more_confident"
  | "more_playful"
  | "more_serious"
  | "slower"
  | "faster"
  | "different_voice";

export interface GenerationResult {
  id: string;
  audioUrl: string;
  analysis: DirectorProfile;
  voice: VoiceMetadata;
  duration: number; // seconds, estimated or measured
  createdAt: string;
  text: string;
  model: string;
  provider: string;
  version: number;
}

export interface UsageEvent {
  timestamp: string;
  charactersAnalyzed: number;
  charactersSynthesized: number;
  model: string;
  provider: string;
  estimatedCostUsd?: number;
}

export interface StylePreset {
  id: string;
  label: string;
  icon: string;
  description: string;
  directorHint: string;
  context: ContextCategory;
  emotion: Emotion;
}
