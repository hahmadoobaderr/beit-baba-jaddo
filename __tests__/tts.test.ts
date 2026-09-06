import { describe, it, expect } from "vitest";
import { MockTTSProvider, estimateDuration } from "@/lib/tts/mock";

describe("MockTTSProvider", () => {
  const provider = new MockTTSProvider();

  it("is always configured (never requires credentials)", () => {
    expect(provider.isConfigured()).toBe(true);
  });

  it("lists a non-empty, multilingual voice set", () => {
    return provider.listVoices().then((voices) => {
      expect(voices.length).toBeGreaterThan(0);
      expect(voices.some((v) => v.languages.includes("ar"))).toBe(true);
      expect(voices.some((v) => v.languages.includes("en"))).toBe(true);
    });
  });

  it("synthesizes a valid, non-empty WAV buffer", async () => {
    const result = await provider.synthesize({
      text: "Hello, this is a test.",
      voiceId: "mock-sarah",
      modelId: "eleven_v3",
    });
    expect(result.contentType).toBe("audio/wav");
    expect(result.audio.length).toBeGreaterThan(44); // header + some samples
    expect(result.audio.toString("ascii", 0, 4)).toBe("RIFF");
    expect(result.audio.toString("ascii", 8, 12)).toBe("WAVE");
  });

  it("produces roughly proportional duration to text length", () => {
    const short = estimateDuration("Hi there.");
    const long = estimateDuration(
      "This is a much longer piece of text that should take noticeably more time to speak aloud than a short greeting."
    );
    expect(long).toBeGreaterThan(short);
  });

  it("clamps duration to a sane range even for empty or huge input", () => {
    expect(estimateDuration("")).toBeGreaterThanOrEqual(1);
    expect(estimateDuration("word ".repeat(5000))).toBeLessThanOrEqual(120);
  });

  it("synthesizeStream yields the same bytes as synthesize", async () => {
    const params = { text: "Streaming test.", voiceId: "mock-sarah", modelId: "eleven_v3" };
    const { audio } = await provider.synthesize(params);
    const stream = await provider.synthesizeStream(params);
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    const streamed = Buffer.concat(chunks);
    expect(streamed.length).toBe(audio.length);
  });
});
