export type HapticIntent = "selection" | "impact" | "success" | "warning";

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

export const haptic = (intent: HapticIntent = "selection") => {
  if (typeof window === "undefined" || prefersReducedMotion()) return false;

  const navigatorWithVibrate = window.navigator as Navigator & {
    vibrate?: (pattern: number | number[]) => boolean;
  };

  if (typeof navigatorWithVibrate.vibrate !== "function") return false;
  return navigatorWithVibrate.vibrate(patterns[intent]);
};

export const hapticOnClick = <T extends HTMLElement>(
  intent: HapticIntent,
  handler?: React.MouseEventHandler<T>,
): React.MouseEventHandler<T> => {
  return (event) => {
    haptic(intent);
    handler?.(event);
  };
};
