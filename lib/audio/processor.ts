/**
 * Pre-processing applied ONLY to the text sent to the TTS engine — the
 * text shown in the UI is never modified. Handles a pronunciation
 * dictionary (admin-configurable custom terms) plus light normalization
 * of numbers, currency and dates so they're read naturally.
 */

export interface PronunciationEntry {
  term: string;
  replacement: string;
  caseSensitive?: boolean;
}

// Default/seed dictionary. Admins can extend this via lib/audio/pronunciation-store.ts.
export const DEFAULT_PRONUNCIATION_DICTIONARY: PronunciationEntry[] = [
  { term: "Aramco", replacement: "Aramco" },
  { term: "Cladtek", replacement: "Klad-tek" },
  { term: "Mertel", replacement: "Mer-tel" },
];

export function applyPronunciationDictionary(
  text: string,
  dictionary: PronunciationEntry[] = DEFAULT_PRONUNCIATION_DICTIONARY
): string {
  let result = text;
  for (const entry of dictionary) {
    const flags = entry.caseSensitive ? "g" : "gi";
    const pattern = new RegExp(`\\b${escapeRegExp(entry.term)}\\b`, flags);
    result = result.replace(pattern, entry.replacement);
  }
  return result;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  "$": "dollars",
  "€": "euros",
  "£": "pounds",
  "﷼": "riyals",
};

/** Normalizes currency, percentages and simple numeric patterns for natural speech. */
export function normalizeForSpeech(text: string): string {
  let result = text;

  // "SAR 25,000" / "USD 10,500" -> "25,000 SAR" style already reads fine for
  // v3-class models, but bare symbols benefit from spelling out the unit.
  result = result.replace(/([$€£﷼])\s?([\d,]+(?:\.\d+)?)/g, (_match, symbol, amount) => {
    const unit = CURRENCY_SYMBOLS[symbol] ?? "";
    return unit ? `${amount} ${unit}` : `${amount}`;
  });

  // "95%" -> "95 percent"
  result = result.replace(/(\d+(?:\.\d+)?)\s?%/g, "$1 percent");

  // "PO 4508147151" style codes: insert light spacing so long digit runs
  // aren't mis-parsed by the synthesizer as one giant number.
  result = result.replace(/\b([A-Za-z]{1,4})\s?(\d{6,})\b/g, (_match, prefix, digits) => `${prefix} ${groupDigits(digits)}`);

  return result;
}

function groupDigits(digits: string): string {
  return digits.replace(/(\d{3})(?=\d)/g, "$1 ");
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Full preprocessing pipeline applied right before building TTS markup. */
export function preprocessForTTS(text: string, dictionary?: PronunciationEntry[]): string {
  return applyPronunciationDictionary(normalizeForSpeech(text), dictionary);
}
