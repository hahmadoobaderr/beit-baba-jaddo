"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { UI_STRINGS, type UILocale, type UIStringKey } from "@/lib/i18n";

interface LocaleContextValue {
  locale: UILocale;
  toggleLocale: () => void;
  t: (key: UIStringKey) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<UILocale>("en");

  useEffect(() => {
    queueMicrotask(() => {
      const stored = localStorage.getItem("voicemood.locale") as UILocale | null;
      if (stored) setLocale(stored);
    });
  }, []);

  useEffect(() => {
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = locale;
    localStorage.setItem("voicemood.locale", locale);
  }, [locale]);

  const toggleLocale = () => setLocale((l) => (l === "en" ? "ar" : "en"));
  const t = (key: UIStringKey) => UI_STRINGS[locale][key];

  return <LocaleContext.Provider value={{ locale, toggleLocale, t }}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}
