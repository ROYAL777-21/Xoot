/**
 * The Xoot design tokens, as data.
 *
 * `src/index.css` remains the source of truth — it is what the web actually renders
 * from, and Tailwind resolves against it. This module mirrors those values so the
 * native app can have the same design system, because React Native has no CSS custom
 * properties and cannot read a stylesheet.
 *
 * `design-tokens.test.ts` parses `index.css` and asserts every value here matches. That
 * is what makes a second copy safe: change a colour in the CSS without mirroring it and
 * the suite fails, rather than the two surfaces quietly becoming different products.
 *
 * Nothing here may import anything — it is copied into `mobile/src/generated/` by
 * `npm run shared:sync`, and mobile does not resolve the web app's node_modules.
 *
 * Colours are bare HSL triplets, the same form the CSS uses, so the mirror is a literal
 * comparison rather than a conversion nobody can eyeball.
 */

export type Scheme = "light" | "dark";

/**
 * Semantic colour roles.
 *
 * Roles, not names: components ask for `border` or `mutedForeground`, never for a
 * specific red. That is what lets the palette change — which the founder has said it
 * will — without touching a component.
 */
export const COLOR = {
  light: {
    background: "20 13% 95%",
    foreground: "0 0% 8%",
    card: "0 0% 100%",
    cardForeground: "0 0% 8%",
    primary: "0 0% 8%",
    primaryForeground: "0 0% 100%",
    /**
     * The kit's brand violet, carrying emphasis, selection and progress — never the commit
     * button, which is ink. Added to the mirror 2026-08-08: it had been in `index.css` since the
     * palette migration but never here, so the native app had no brand colour at all while the
     * web had one. The old mirror test could not catch it, because it only checked that roles
     * present in this file match the CSS, never that the CSS is fully covered.
     *
     * Held at violet-600, not the kit's nominal violet-500. See `design-contrast.test.ts`.
     */
    brand: "253 79% 58%",
    brandForeground: "0 0% 100%",
    secondary: "30 11% 93%",
    secondaryForeground: "0 0% 14%",
    muted: "24 10% 90%",
    mutedForeground: "27 4% 47%",
    accent: "37 78% 56%",
    accentForeground: "14 18% 14%",
    destructive: "7 78% 56%",
    destructiveForeground: "36 40% 98%",
    success: "155 47% 43%",
    successForeground: "0 0% 100%",
    warning: "37 78% 56%",
    warningForeground: "14 18% 14%",
    border: "28 22% 88%",
    input: "28 22% 88%",
    ring: "14 51% 53%",
    carePlus: "3 79% 51%",
  },
  dark: {
    background: "20 13% 7%",
    foreground: "20 13% 95%",
    card: "20 8% 10%",
    cardForeground: "20 13% 95%",
    primary: "20 13% 95%",
    primaryForeground: "0 0% 8%",
    /** Lifted to violet-300 in dark so it reads against the near-black page, with ink on top. */
    brand: "252 87% 78%",
    brandForeground: "0 0% 8%",
    secondary: "20 6% 14%",
    secondaryForeground: "20 13% 95%",
    muted: "20 6% 15%",
    mutedForeground: "25 7% 68%",
    accent: "37 78% 60%",
    accentForeground: "10 17% 7%",
    destructive: "7 78% 62%",
    destructiveForeground: "12 38% 95%",
    success: "155 40% 62%",
    successForeground: "10 17% 7%",
    warning: "37 78% 60%",
    warningForeground: "10 17% 7%",
    border: "8 17% 18%",
    input: "8 17% 18%",
    ring: "4 100% 64%",
    carePlus: "3 79% 56%",
  },
} as const;

export type ColorRole = keyof (typeof COLOR)["light"];

/**
 * Native needs a literal colour string; the web wraps the same triplet in a custom
 * property so a theme can override it at runtime.
 */
export const hsl = (triplet: string) => {
  const [h, s, l] = triplet.split(" ");
  return `hsl(${h}, ${s}, ${l})`;
};

/** Resolve a role to something React Native can put in a style. */
export const color = (scheme: Scheme, role: ColorRole) => hsl(COLOR[scheme][role]);

/**
 * Translucent variant of a role, for overlays and pressed states.
 *
 * Native has no `color-mix()` and no `/ <alpha>` syntax on a custom property, so the
 * alternative is a hand-picked rgba per surface — which is where the 39 loose hex codes
 * in `mobile/src` came from in the first place.
 */
export const alpha = (scheme: Scheme, role: ColorRole, a: number) => {
  const [h, s, l] = COLOR[scheme][role].split(" ");
  return `hsla(${h}, ${s}, ${l}, ${a})`;
};

/**
 * Spacing scale, in points.
 *
 * A 4-point grid. Named by size rather than by use, because a scale named for use
 * ("cardPadding") stops being a scale the second two things want different padding.
 */
export const SPACE = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
  "3xl": 48,
  "4xl": 64,
} as const;

/**
 * Corner radii. `--radius: 1rem` in the CSS is `lg` here; the rest step around it.
 * `full` is the pill used on every primary action.
 */
export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
  full: 9999,
} as const;

/**
 * Type scale.
 *
 * `display` is the Georgia-family serif the founder chose for headings and for typed
 * text; `sans` is the rounded UI face. Native resolves the actual family in
 * `constants/theme.ts`, because the names differ per platform.
 */
export const TYPE = {
  eyebrow: { size: 12, lineHeight: 16, weight: "700" as const, letterSpacing: 0.8 },
  caption: { size: 12, lineHeight: 18, weight: "500" as const, letterSpacing: 0 },
  body: { size: 15, lineHeight: 22, weight: "400" as const, letterSpacing: 0 },
  bodyStrong: { size: 15, lineHeight: 22, weight: "600" as const, letterSpacing: 0 },
  title: { size: 22, lineHeight: 28, weight: "700" as const, letterSpacing: -0.2 },
  display: { size: 30, lineHeight: 36, weight: "700" as const, letterSpacing: -0.4 },
} as const;

export type TypeRole = keyof typeof TYPE;

/**
 * Minimum tap target, in points.
 *
 * 44 is Apple's floor and the one the Human Interface Guidelines are checked against.
 * Named here so a control cannot be built smaller by accident, which is the usual way
 * it happens.
 */
export const MIN_TAP_TARGET = 44;

/**
 * Motion, mirrored from `index.css`.
 *
 * Milliseconds as plain numbers rather than the CSS `280ms` strings: React Native's Animated
 * and Reanimated both take numbers, and a mirror that needs parsing at the call site is a
 * mirror that will be parsed differently in two places.
 *
 * `docs/xoot-ios-build-prompt.md` calls these "the first thing lost in a hand translation",
 * which is what had happened — the kit referenced twelve tokens and this codebase declared none.
 *
 * Not split by scheme: durations and curves are the same in light and dark, so unlike `COLOR`
 * there is one set.
 */
export const DURATION = {
  instant: 90,
  fast: 170,
  base: 280,
  slow: 440,
  story: 760,
  bloom: 1200,
  /** Ambient loops. Long by intent — a breathing surface, a looping icon. */
  breathe: 4600,
  icon: 2600,
} as const;

/**
 * Easing curves as their four control points.
 *
 * Kept as tuples rather than CSS strings so native can hand them straight to `Easing.bezier`.
 * `spring` is the only one that overshoots past 1 — reserve it for arrivals, never exits, or
 * things appear to bounce on their way out.
 */
export const EASING = {
  out: [0.22, 0.9, 0.28, 1],
  inOut: [0.6, 0.05, 0.3, 0.95],
  settle: [0.16, 1, 0.3, 1],
  spring: [0.34, 1.42, 0.5, 1],
} as const;

/**
 * Honour the OS reduced-motion setting by zeroing durations, matching what `index.css` does
 * under `@media (prefers-reduced-motion: reduce)`.
 *
 * Zeroing rather than skipping animations keeps every call site working unchanged: the
 * animation still runs and still completes, it just takes no time. Native reads the setting
 * from `AccessibilityInfo.isReduceMotionEnabled()`; this function exists so the *rule* lives in
 * one place rather than being re-decided per screen.
 */
export const durationFor = (key: keyof typeof DURATION, reduceMotion: boolean) =>
  reduceMotion ? 0 : DURATION[key];
