"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** Inline script injected before hydration so the correct theme class is
 * present on first paint — avoids a light/dark flash. */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('voicemood.theme');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.classList.toggle('dark',t==='dark');}catch(e){}})();`;

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    // Deferred a tick so this doesn't fire a synchronous setState from
    // within the effect body (avoids a cascading extra render); the value
    // still lands before the user can interact with the toggle.
    queueMicrotask(() => {
      const stored = localStorage.getItem("voicemood.theme") as Theme | null;
      setTheme(stored ?? (document.documentElement.classList.contains("dark") ? "dark" : "light"));
    });
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("voicemood.theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
