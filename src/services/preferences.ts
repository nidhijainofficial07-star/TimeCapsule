import { useEffect } from "react";
import type { Preferences } from "@/lib/types";
import { mutate, useDB } from "./db";
import { DEFAULT_PREFERENCES } from "@/lib/constants";

export const THEME_KEY = "timecapsule.theme";

export function updatePreferences(patch: Partial<Preferences>) {
  mutate((db) => {
    db.preferences = { ...db.preferences, ...patch };
  });
  if (patch.theme) {
    try {
      window.localStorage.setItem(THEME_KEY, patch.theme);
    } catch {
      /* ignore */
    }
  }
}

export function resetDashboardLayout() {
  updatePreferences({ widgets: structuredClone(DEFAULT_PREFERENCES.widgets), density: DEFAULT_PREFERENCES.density });
}

/** Inline script (runs before paint) to avoid theme flicker. */
export const THEME_BOOT_SCRIPT = `(function(){try{var t=localStorage.getItem('${THEME_KEY}')||'system';var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

export function useApplyTheme() {
  const { theme } = useDB().preferences;
  useEffect(() => {
    try {
      window.localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* ignore */
    }
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => document.documentElement.classList.toggle("dark", theme === "dark" || (theme === "system" && mq.matches));
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme]);
}
