// Lightweight UI-chrome localization. This toggles the interface language
// (navigation, headings, buttons) between English and Arabic, including
// document direction. It is independent from the Voice Director, which
// analyzes the *content* language regardless of the UI language.

export type UILocale = "en" | "ar";

export const UI_STRINGS = {
  en: {
    tagline: "Don't just read the words. Feel them.",
    navStudio: "Studio",
    navHistory: "History",
    navVoices: "Voices",
    navSettings: "Settings",
    heroTitle1: "Your words.",
    heroTitle2: "Their emotion.",
    heroSubtitle: "AI that understands what you mean — and knows how it should sound.",
    ctaPrimary: "Start Creating",
    ctaSecondary: "Explore Voices",
    featureContextTitle: "Understands Context",
    featureContextBody: "AI analyzes what your words actually mean.",
    featureHumanTitle: "Feels Human",
    featureHumanBody: "Natural voices with expressive delivery.",
    featureLangTitle: "Speaks Your Language",
    featureLangBody: "English, Arabic and multilingual support.",
    featureDirectsTitle: "Directs Every Performance",
    featureDirectsBody: "Emotion, pacing, emphasis and tone adapt to your message.",
  },
  ar: {
    tagline: "لا تكتفِ بقراءة الكلمات. اجعلها تُحَس.",
    navStudio: "الاستوديو",
    navHistory: "السجل",
    navVoices: "الأصوات",
    navSettings: "الإعدادات",
    heroTitle1: "كلماتك.",
    heroTitle2: "مشاعرهم.",
    heroSubtitle: "ذكاء اصطناعي يفهم ما تقصده — ويعرف كيف يجب أن يبدو صوته.",
    ctaPrimary: "ابدأ الإنشاء",
    ctaSecondary: "استكشف الأصوات",
    featureContextTitle: "يفهم السياق",
    featureContextBody: "يحلل الذكاء الاصطناعي المعنى الحقيقي لكلماتك.",
    featureHumanTitle: "يبدو إنسانياً",
    featureHumanBody: "أصوات طبيعية بأداء معبر.",
    featureLangTitle: "يتحدث لغتك",
    featureLangBody: "دعم للعربية والإنجليزية ولغات متعددة.",
    featureDirectsTitle: "يوجّه كل أداء",
    featureDirectsBody: "المشاعر والإيقاع والتأكيد تتكيف مع رسالتك.",
  },
} as const;

export type UIStringKey = keyof (typeof UI_STRINGS)["en"];
