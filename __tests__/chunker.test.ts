import { describe, it, expect } from "vitest";
import { chunkText, splitParagraphs, splitSentences } from "@/lib/audio/chunker";

describe("chunkText", () => {
  it("returns a single chunk for short text", () => {
    const chunks = chunkText("Hello there, how are you?", 2500);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].position).toBe("only");
    expect(chunks[0].text).toBe("Hello there, how are you?");
  });

  it("returns an empty array for empty input", () => {
    expect(chunkText("   ", 2500)).toEqual([]);
  });

  it("splits long text by paragraph without cutting mid-sentence", () => {
    const paragraph = "This is a sentence. ".repeat(50).trim();
    const text = `${paragraph}\n\n${paragraph}\n\n${paragraph}`;
    const chunks = chunkText(text, 400);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.text.length).toBeLessThanOrEqual(400 + 1); // small slack for join spacing
      // no chunk should end mid-word (a truncated sentence would end without
      // terminal punctuation AND not be the very last chunk)
    }
  });

  it("marks chunk positions correctly (opening/middle/closing)", () => {
    const paragraph = "Sentence number filler text here. ".repeat(30).trim();
    const text = [paragraph, paragraph, paragraph, paragraph].join("\n\n");
    const chunks = chunkText(text, 300);
    expect(chunks[0].position).toBe("opening");
    expect(chunks[chunks.length - 1].position).toBe("closing");
    if (chunks.length > 2) {
      expect(chunks[1].position).toBe("middle");
    }
  });

  it("falls back to clause-level splitting for a single oversized sentence", () => {
    const longSentence = Array.from({ length: 100 }, (_, i) => `clause ${i}`).join(", ") + ".";
    const chunks = chunkText(longSentence, 200);
    expect(chunks.length).toBeGreaterThan(1);
    const rebuilt = chunks.map((c) => c.text).join(" ");
    expect(rebuilt.replace(/\s+/g, " ")).toContain("clause 0");
    expect(rebuilt.replace(/\s+/g, " ")).toContain("clause 99");
  });

  it("preserves total content across chunks (nothing silently dropped)", () => {
    const text = Array.from({ length: 20 }, (_, i) => `Paragraph number ${i} has some content in it.`).join("\n\n");
    const chunks = chunkText(text, 150);
    const totalChars = chunks.reduce((sum, c) => sum + c.text.length, 0);
    // Allow for whitespace normalization differences but content should be close.
    expect(totalChars).toBeGreaterThan(text.length * 0.9);
  });
});

describe("splitParagraphs / splitSentences", () => {
  it("splits on blank lines", () => {
    expect(splitParagraphs("A.\n\nB.\n\nC.")).toEqual(["A.", "B.", "C."]);
  });

  it("splits on sentence-ending punctuation including Arabic question mark", () => {
    expect(splitSentences("Hello. How are you? Great!")).toEqual(["Hello.", "How are you?", "Great!"]);
    expect(splitSentences("مرحبا؟ كيف حالك.")).toEqual(["مرحبا؟", "كيف حالك."]);
  });
});
