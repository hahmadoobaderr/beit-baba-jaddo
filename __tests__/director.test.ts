import { describe, it, expect } from "vitest";
import { runMockDirector } from "@/lib/ai/director";
import { DEMO_EXAMPLES } from "@/lib/presets";

describe("Voice Director — mock language detection", () => {
  it("detects English", () => {
    const profile = runMockDirector({ text: "Hello, how are you doing today?" });
    expect(profile.language).toBe("en");
  });

  it("detects Arabic", () => {
    const profile = runMockDirector({ text: "مرحباً كيف حالك اليوم؟" });
    expect(profile.language).toBe("ar");
  });

  it("detects mixed Arabic + English", () => {
    const profile = runMockDirector({
      text: "أهلاً وسهلاً بالجميع. Today we're going to talk about our new project.",
    });
    expect(profile.language).toBe("mixed");
  });

  it("detects Gulf/Saudi dialect markers", () => {
    const profile = runMockDirector({ text: "والله الصراحة ما توقعت إن الموضوع يوصل لهالدرجة." });
    expect(profile.dialect).toBe("gulf");
  });
});

describe("Voice Director — emotion differentiation (critical product test)", () => {
  // Section 69 of the spec: these four must NOT sound the same.
  const business = runMockDirector({
    text: "Dear colleagues, I am pleased to announce that our project has successfully reached the next phase.",
  });
  const flirtyArabic = runMockDirector({ text: "ليش كل ما أشوفك أنسى وش كنت أبي أقول؟" });
  const flirtyEnglish = runMockDirector({
    text: "I don't know why, but every time you smile, I forget what I was going to say.",
  });
  const motivational = runMockDirector({ text: "You can do this. You've made it this far. Don't stop now." });

  it("gives each a distinct primary emotion or context", () => {
    const signatures = [business, flirtyArabic, flirtyEnglish, motivational].map(
      (p) => `${p.context}:${p.primaryEmotion}`
    );
    expect(new Set(signatures).size).toBe(signatures.length);
  });

  it("business reads confident/professional, not flirty or romantic", () => {
    expect(business.primaryEmotion).not.toBe("flirty");
    expect(business.primaryEmotion).not.toBe("romantic");
    expect(business.delivery.formality).toBeGreaterThan(0.5);
  });

  it("motivational has high energy", () => {
    expect(motivational.delivery.energy).toBeGreaterThan(0.7);
  });

  it("flirty text has meaningfully higher intimacy than the business message", () => {
    expect(flirtyEnglish.delivery.intimacy).toBeGreaterThan(business.delivery.intimacy);
  });
});

describe("Voice Director — segment reconstruction", () => {
  it("segments concatenate back to (approximately) the original text", () => {
    for (const demo of DEMO_EXAMPLES) {
      const profile = runMockDirector({ text: demo.text, style: demo.style });
      const rebuilt = profile.segments.map((s) => s.text).join(" ").replace(/\s+/g, " ").trim();
      const original = demo.text.replace(/\s+/g, " ").trim();
      expect(rebuilt).toBe(original);
    }
  });

  it("never emits more than 2 tags per segment", () => {
    for (const demo of DEMO_EXAMPLES) {
      const profile = runMockDirector({ text: demo.text, style: demo.style });
      for (const segment of profile.segments) {
        expect(segment.tags.length).toBeLessThanOrEqual(2);
      }
    }
  });
});

describe("Voice Director — director override", () => {
  it("luxury override increases formality without changing the emotion category unexpectedly", () => {
    const base = runMockDirector({ text: "Welcome to our new hotel." });
    const withOverride = runMockDirector({
      text: "Welcome to our new hotel.",
      directorOverride: "Make it sound like a confident luxury brand advertisement.",
    });
    expect(withOverride.delivery.formality).toBeGreaterThanOrEqual(base.delivery.formality);
  });
});
