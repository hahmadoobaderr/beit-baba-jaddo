"use client";

import Link from "next/link";
import { Sparkles, Heart, Globe2, Wand2 } from "lucide-react";
import { useLocale } from "@/components/LocaleProvider";

const FEATURES = [
  { icon: Sparkles, titleKey: "featureContextTitle", bodyKey: "featureContextBody" } as const,
  { icon: Heart, titleKey: "featureHumanTitle", bodyKey: "featureHumanBody" } as const,
  { icon: Globe2, titleKey: "featureLangTitle", bodyKey: "featureLangBody" } as const,
  { icon: Wand2, titleKey: "featureDirectsTitle", bodyKey: "featureDirectsBody" } as const,
];

export default function LandingPage() {
  const { t } = useLocale();

  return (
    <div className="flex flex-col">
      <section className="relative overflow-hidden px-4 py-24 text-center sm:px-6 sm:py-32">
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-40 blur-3xl"
          style={{
            background:
              "radial-gradient(60% 50% at 50% 0%, var(--accent) 0%, transparent 60%), radial-gradient(40% 40% at 80% 30%, var(--accent-2) 0%, transparent 60%)",
          }}
        />
        <p className="mb-4 text-sm font-medium uppercase tracking-[0.3em] text-muted">VoiceMood AI</p>
        <h1 className="mx-auto max-w-3xl text-5xl font-bold tracking-tight sm:text-6xl">
          {t("heroTitle1")} <span className="gradient-text">{t("heroTitle2")}</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-muted">{t("heroSubtitle")}</p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/studio"
            className="rounded-full bg-gradient-to-r from-accent to-accent-2 px-7 py-3 font-semibold text-white transition-opacity hover:opacity-90"
          >
            {t("ctaPrimary")}
          </Link>
          <Link
            href="/voices"
            className="rounded-full border border-border px-7 py-3 font-semibold text-foreground hover:bg-surface-2"
          >
            {t("ctaSecondary")}
          </Link>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-4 px-4 pb-24 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        {FEATURES.map(({ icon: Icon, titleKey, bodyKey }) => (
          <div key={titleKey} className="rounded-2xl border border-border bg-surface p-6">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-2 text-white">
              <Icon size={18} />
            </div>
            <h3 className="mb-1.5 font-semibold">{t(titleKey)}</h3>
            <p className="text-sm text-muted">{t(bodyKey)}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
