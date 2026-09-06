import { describe, it, expect } from "vitest";
import { normalizeForSpeech, applyPronunciationDictionary } from "@/lib/audio/processor";
import { buildTTSMarkup } from "@/lib/tts/markup";
import { runMockDirector } from "@/lib/ai/director";

describe("normalizeForSpeech", () => {
  it("expands currency symbols into words", () => {
    expect(normalizeForSpeech("It costs $10,500 today.")).toContain("10,500 dollars");
  });

  it("expands percentages", () => {
    expect(normalizeForSpeech("Satisfaction is at 95%.")).toContain("95 percent");
  });

  it("leaves normal prose untouched", () => {
    expect(normalizeForSpeech("Hello, how are you?")).toBe("Hello, how are you?");
  });
});

describe("applyPronunciationDictionary", () => {
  it("replaces configured terms with their preferred pronunciation", () => {
    const result = applyPronunciationDictionary("We partnered with Cladtek last year.");
    expect(result).toContain("Klad-tek");
  });

  it("does not affect unrelated words", () => {
    const result = applyPronunciationDictionary("The Cladtekker is not a real word.");
    // word-boundary match should NOT replace substrings inside other words
    expect(result).toBe("The Cladtekker is not a real word.");
  });
});

describe("buildTTSMarkup", () => {
  it("never includes internal director prose (performanceDirection/explanation) as spoken content", () => {
    const profile = runMockDirector({ text: "You look amazing tonight." });
    const markup = buildTTSMarkup(profile);
    expect(markup).not.toContain(profile.performanceDirection);
    expect(markup).not.toContain(profile.explanation);
  });

  it("preserves the user's exact words in the markup", () => {
    const profile = runMockDirector({ text: "You look amazing tonight." });
    const markup = buildTTSMarkup(profile);
    expect(markup).toContain("You look amazing tonight.");
  });
});
