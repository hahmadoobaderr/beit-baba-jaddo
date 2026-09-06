"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mic2, Moon, Sun, Globe, User, Menu, X } from "lucide-react";
import { useState } from "react";
import { useTheme } from "./ThemeProvider";
import { useLocale } from "./LocaleProvider";
import { cn } from "@/lib/utils/cn";

const NAV_ITEMS: { href: string; key: "navStudio" | "navHistory" | "navVoices" | "navSettings" }[] = [
  { href: "/studio", key: "navStudio" },
  { href: "/history", key: "navHistory" },
  { href: "/voices", key: "navVoices" },
  { href: "/settings", key: "navSettings" },
];

export function Header() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { locale, toggleLocale, t } = useLocale();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-2 text-white">
            <Mic2 size={16} />
          </span>
          <span className="text-lg">
            VoiceMood <span className="gradient-text">AI</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => {
            const active = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  active ? "bg-surface-2 text-foreground" : "text-muted hover:text-foreground"
                )}
              >
                {t(item.key)}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleLocale}
            aria-label="Toggle language"
            className="hidden items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground sm:flex"
          >
            <Globe size={14} />
            {locale === "en" ? "EN" : "AR"}
          </button>
          <button
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted hover:text-foreground"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            aria-label="User profile"
            className="hidden h-9 w-9 items-center justify-center rounded-full border border-border text-muted hover:text-foreground sm:flex"
          >
            <User size={16} />
          </button>
          <button
            aria-label="Open menu"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted md:hidden"
          >
            {menuOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="flex flex-col gap-1 border-t border-border px-4 py-3 md:hidden">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-surface-2 hover:text-foreground"
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
