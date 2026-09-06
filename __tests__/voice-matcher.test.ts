import { describe, it, expect } from "vitest";
import { selectVoice } from "@/lib/voices/matcher";
import { MOCK_VOICES } from "@/lib/tts/mock";
import { runMockDirector } from "@/lib/ai/director";

describe("VoiceMatcher", () => {
  it("selects a female voice for a flirty/romantic message", () => {
    const profile = runMockDirector({ text: "ليش كل ما أشوفك أنسى وش كنت أبي أقول؟" });
    const result = selectVoice(profile, MOCK_VOICES);
    expect(result.voice.gender).toBe("female");
    expect(result.voice.languages).toContain("ar");
  });

  it("selects a male, professional voice for a business message", () => {
    const profile = runMockDirector({
      text: "Dear team, I am pleased to announce that we have successfully completed the first phase of the project.",
    });
    const result = selectVoice(profile, MOCK_VOICES);
    expect(result.voice.gender).toBe("male");
  });

  it("never invents a voice — explicit voiceId must exist in the provided list", () => {
    const profile = runMockDirector({ text: "Hello there." });
    const result = selectVoice(profile, MOCK_VOICES, "mock-sarah");
    expect(result.voice.voiceId).toBe("mock-sarah");
  });

  it("falls back to automatic matching when the requested voiceId no longer exists", () => {
    const profile = runMockDirector({ text: "Hello there." });
    const result = selectVoice(profile, MOCK_VOICES, "voice-that-does-not-exist");
    expect(MOCK_VOICES.some((v) => v.voiceId === result.voice.voiceId)).toBe(true);
  });

  it("throws when there are no voices available at all", () => {
    const profile = runMockDirector({ text: "Hello there." });
    expect(() => selectVoice(profile, [])).toThrow();
  });

  it("always returns at least one match reason", () => {
    const profile = runMockDirector({ text: "Hello there." });
    const result = selectVoice(profile, MOCK_VOICES);
    expect(result.matchReasons.length).toBeGreaterThan(0);
  });
});
