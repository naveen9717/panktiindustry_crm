"use client";

import * as React from "react";

const STORAGE_KEY = "theme";
type Theme = "light" | "dark";

function getStoredTheme(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
}

/**
 * Minimal class-based dark/light theme hook.
 *
 * The initial theme is applied pre-hydration by an inline script in the root
 * layout; this hook only tracks and toggles it afterwards.
 */
export function useTheme() {
  const [mounted, setMounted] = React.useState(false);
  const [theme, setThemeState] = React.useState<Theme>("light");

  React.useEffect(() => {
    setMounted(true);
    setThemeState(
      document.documentElement.classList.contains("dark") ? "dark" : "light"
    );

    // Stay in sync across browser tabs.
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      const next = event.newValue === "dark" ? "dark" : "light";
      setThemeState(next);
      applyTheme(next);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setTheme = React.useCallback((next: Theme) => {
    setThemeState(next);
    applyTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore (private mode / storage disabled)
    }
  }, []);

  const toggleTheme = React.useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  return { mounted, theme, setTheme, toggleTheme };
}
