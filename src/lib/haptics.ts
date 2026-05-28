import type { MouseEventHandler } from "react";

export type HapticIntent = "selection" | "impact" | "success" | "warning";

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
    const mod = (await import("@capacitor/haptics")) as CapacitorHapticsModule;
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
  if (typeof window === "undefined" || prefersReducedMotion()) return false;

  void nativeHaptic(intent).then((handled) => {
    if (handled) return;

    const navigatorWithVibrate = window.navigator as Navigator & {
      vibrate?: (pattern: number | number[]) => boolean;
    };

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
