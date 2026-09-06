import type { DirectorProfile } from "@/types";
import { preprocessForTTS } from "@/lib/audio/processor";

const PAUSE_BREAK = "…";

/**
 * Builds the final string sent to ElevenLabs from a validated Director
 * profile: inline audio tags before each segment plus natural pause
 * markers, with the underlying words always exactly the user's text (only
 * pronunciation/number preprocessing may touch it — never the meaning).
 * The Director's prose instructions (performanceDirection, explanation,
 * "delivery" labels) are UI-facing only and are never sent to the TTS
 * engine as spoken content.
 */
export function buildTTSMarkup(profile: DirectorProfile): string {
  const parts: string[] = [];

  for (const segment of profile.segments) {
    const spoken = preprocessForTTS(segment.text);
    const tagPrefix = segment.tags.length > 0 ? `${segment.tags.join(" ")} ` : "";
    parts.push(`${tagPrefix}${spoken}`);
    if (segment.pauseAfterMs && segment.pauseAfterMs > 0) {
      parts.push(PAUSE_BREAK);
    }
  }

  return parts.join(" ").replace(/\s+/g, " ").trim();
}
