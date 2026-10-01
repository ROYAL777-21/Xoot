import type { MouseEventHandler } from "react";
import { importOptionalNativePlugin } from "@/lib/optional-capacitor";

export type HapticIntent = "selection" | "impact" | "success" | "warning";
const preferenceKey = "xoot:haptics-enabled";
export const getHapticsEnabled = () => {
  try { return typeof window === "undefined" || window.localStorage.getItem(preferenceKey) !== "false"; }
  catch { return true; }
};
export const setHapticsEnabled = (enabled: boolean) => {
  try { window.localStorage.setItem(preferenceKey, String(enabled)); return true; }
  catch { return false; }
};

type CapacitorHapticsModule = {
  Haptics?: {
    selectionChanged?: () => Promise<void>;
    impact?: (options?: { style?: "LIGHT" | "MEDIUM" | "HEAVY" }) => Promise<void>;
    notification?: (options?: { type?: "SUCCESS" | "WARNING" | "ERROR" }) => Promise<void>;
  };
  ImpactStyle?: { Light?: "LIGHT"; Medium?: "MEDIUM"; Heavy?: "HEAVY" };
  NotificationType?: { Success?: "SUCCESS"; Warning?: "WARNING"; Error?: "ERROR" };
};

const patterns: Record<HapticIntent, number | number[]> = {
  selection: 8,
  impact: 12,
  success: [8, 24, 12],
  warning: [14, 32, 14],
};

const prefersReducedMotion = () => {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

const nativeHaptic = async (intent: HapticIntent) => {
  try {
    const mod = await importOptionalNativePlugin<CapacitorHapticsModule>("@capacitor/haptics");
    if (!mod || !getHapticsEnabled()) return false;
    const haptics = mod.Haptics;
    if (!haptics) return false;

    if (intent === "selection" && haptics.selectionChanged) {
      await haptics.selectionChanged();
      return true;
    }

    if (intent === "impact" && haptics.impact) {
      await haptics.impact({ style: mod.ImpactStyle?.Light ?? "LIGHT" });
      return true;
    }

    if (intent === "success" && haptics.notification) {
      await haptics.notification({ type: mod.NotificationType?.Success ?? "SUCCESS" });
      return true;
    }

    if (intent === "warning" && haptics.notification) {
      await haptics.notification({ type: mod.NotificationType?.Warning ?? "WARNING" });
      return true;
    }
  } catch {
    return false;
  }

  return false;
};

export const haptic = (intent: HapticIntent = "selection") => {
  if (typeof window === "undefined" || !getHapticsEnabled() || prefersReducedMotion()) return false;

  void nativeHaptic(intent).then((handled) => {
    if (handled || !getHapticsEnabled()) return;

    const navigatorWithVibrate = window.navigator as Navigator & {
      vibrate?: (pattern: number | number[]) => boolean;
      userActivation?: { hasBeenActive: boolean };
    };

    // Browsers refuse to vibrate before the user has interacted with the page, and
    // log an error when asked to. Calling it anyway achieves nothing and fills the
    // console on every launch, now that the splash fires a haptic on load.
    if (navigatorWithVibrate.userActivation?.hasBeenActive === false) return;

    if (typeof navigatorWithVibrate.vibrate === "function") {
      navigatorWithVibrate.vibrate(patterns[intent]);
    }
  });

  return true;
};

export const hapticOnClick = <T extends HTMLElement>(
  intent: HapticIntent,
  handler?: MouseEventHandler<T>,
): MouseEventHandler<T> => {
  return (event) => {
    haptic(intent);
    handler?.(event);
  };
};
