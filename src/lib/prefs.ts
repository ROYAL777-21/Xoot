// Motion + haptics are core app behaviour, not user settings. The only thing
// that can turn them down is the OS-level reduced-motion accessibility setting.

export function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

/** Short tactile pulse on supported devices. Always on. */
export function haptic(pattern: number | number[] = 8) {
  if (typeof window === "undefined") return;
  if (prefersReducedMotion()) return;
  navigator.vibrate?.(pattern);
}
