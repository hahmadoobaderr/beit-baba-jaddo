/**
 * Splits long text into TTS-safe chunks without ever cutting mid-sentence
 * or mid-clause when avoidable. Priority order: paragraph > sentence >
 * clause. Each returned chunk stays under maxChars unless a single
 * sentence itself exceeds the limit (rare; only then do we fall back to
 * clause-level splitting).
 */

export interface TextChunk {
  text: string;
  index: number;
  total: number;
  /** A short label describing this chunk's position, used to give the
   * Voice Director continuity context ("opening", "middle", "closing"). */
  position: "opening" | "middle" | "closing" | "only";
}

const SENTENCE_SPLIT_RE = /(?<=[.!?؟。])\s+/;
const CLAUSE_SPLIT_RE = /(?<=[,;،])\s+/;

export function splitParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function splitSentences(text: string): string[] {
  return text
    .split(SENTENCE_SPLIT_RE)
    .map((s) => s.trim())
    .filter(Boolean);
}

function splitClauses(text: string): string[] {
  return text
    .split(CLAUSE_SPLIT_RE)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Greedily packs units (paragraphs or sentences) into chunks under maxChars. */
function packUnits(units: string[], maxChars: number, joiner: string): string[] {
  const chunks: string[] = [];
  let current = "";

  for (const unit of units) {
    if (unit.length > maxChars) {
      if (current) {
        chunks.push(current);
        current = "";
      }
      // The unit itself is too long — split it at the next level down.
      const sentences = splitSentences(unit);
      const subUnits = sentences.length > 1 ? sentences : splitClauses(unit);
      chunks.push(...packUnits(subUnits.length > 0 ? subUnits : [unit.slice(0, maxChars)], maxChars, " "));
      continue;
    }

    const candidate = current ? `${current}${joiner}${unit}` : unit;
    if (candidate.length > maxChars) {
      if (current) chunks.push(current);
      current = unit;
    } else {
      current = candidate;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

export function chunkText(text: string, maxChars = 2500): TextChunk[] {
  const trimmed = text.trim();
  if (trimmed.length === 0) return [];
  if (trimmed.length <= maxChars) {
    return [{ text: trimmed, index: 0, total: 1, position: "only" }];
  }

  const paragraphs = splitParagraphs(trimmed);
  const units = paragraphs.length > 1 ? paragraphs : splitSentences(trimmed);
  const raw = packUnits(units, maxChars, paragraphs.length > 1 ? "\n\n" : " ");

  return raw.map((chunkText, index) => ({
    text: chunkText,
    index,
    total: raw.length,
    position: raw.length === 1 ? "only" : index === 0 ? "opening" : index === raw.length - 1 ? "closing" : "middle",
  }));
}
