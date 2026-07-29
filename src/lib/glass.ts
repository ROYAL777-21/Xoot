// Glassmorphism intensity — user-controlled. Applied as CSS variables on <html>
// so every `glass` / `glass-nav` surface reacts instantly.
import { useEffect, useState } from "react";

export type GlassLevel = "clear" | "frosted" | "solid";

const KEY = "zoot.glass";

export const GLASS_PRESETS: Record<GlassLevel, { blur: number; opacity: number; label: string; hint: string }> = {
  clear: { blur: 14, opacity: 34, label: "Clear", hint: "See-through, minimal blur" },
  frosted: { blur: 30, opacity: 62, label: "Frosted", hint: "Balanced — the Xoot default" },
  solid: { blur: 6, opacity: 94, label: "Solid", hint: "Opaque, maximum legibility" },
};

export type GlassPrefs = { level: GlassLevel; opacity: number };

export const DEFAULT_GLASS: GlassPrefs = { level: "frosted", opacity: GLASS_PRESETS.frosted.opacity };

export function readGlass(): GlassPrefs {
  if (typeof window === "undefined") return DEFAULT_GLASS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_GLASS;
    const p = JSON.parse(raw) as Partial<GlassPrefs>;
    const level = (p.level && p.level in GLASS_PRESETS ? p.level : DEFAULT_GLASS.level) as GlassLevel;
    const opacity = typeof p.opacity === "number" ? Math.min(100, Math.max(0, p.opacity)) : GLASS_PRESETS[level].opacity;
    return { level, opacity };
  } catch {
    return DEFAULT_GLASS;
  }
}

export function applyGlass(p: GlassPrefs) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--glass-blur", `${GLASS_PRESETS[p.level].blur}px`);
  root.style.setProperty("--glass-opacity", `${p.opacity}%`);
}

const listeners = new Set<(p: GlassPrefs) => void>();

export function setGlass(next: GlassPrefs) {
  applyGlass(next);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable — session-only */
  }
  listeners.forEach((l) => l(next));
}

export function useGlass() {
  const [prefs, setPrefs] = useState<GlassPrefs>(DEFAULT_GLASS);

  useEffect(() => {
    const initial = readGlass();
    setPrefs(initial);
    applyGlass(initial);
    listeners.add(setPrefs);
    return () => {
      listeners.delete(setPrefs);
    };
  }, []);

  return {
    prefs,
    setLevel: (level: GlassLevel) => setGlass({ level, opacity: GLASS_PRESETS[level].opacity }),
    setOpacity: (opacity: number) => setGlass({ ...prefs, opacity }),
  };
}
