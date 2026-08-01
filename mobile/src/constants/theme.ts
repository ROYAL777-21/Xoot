import { Platform } from 'react-native';

import { COLOR, MIN_TAP_TARGET, RADIUS, SPACE, TYPE, alpha, hsl } from '@/generated/design-tokens';

/**
 * The native end of the Xoot design system.
 *
 * Colours, spacing, radii and type all come from `src/lib/design-tokens.ts`, which
 * mirrors `src/index.css` under test — so the native app and the web render the same
 * design system rather than two that happen to look similar. Before this file was
 * rewritten, `mobile/src` carried 39 loose hex codes and a palette two rebrands out of
 * date.
 *
 * Add a colour here only if it is a *role* the web does not have. A one-off hex in a
 * StyleSheet is how the drift started last time.
 */

const resolve = <S extends 'light' | 'dark'>(scheme: S) => ({
  text: hsl(COLOR[scheme].foreground),
  textSecondary: hsl(COLOR[scheme].mutedForeground),
  background: hsl(COLOR[scheme].background),
  backgroundElement: hsl(COLOR[scheme].card),
  backgroundSelected: hsl(COLOR[scheme].secondary),
  border: hsl(COLOR[scheme].border),
  accent: hsl(COLOR[scheme].primary),
  accentText: hsl(COLOR[scheme].primaryForeground),
  accentSoft: alpha(scheme, 'primary', 0.14),
  success: hsl(COLOR[scheme].success),
  danger: hsl(COLOR[scheme].destructive),
  warning: hsl(COLOR[scheme].warning),
  carePlus: hsl(COLOR[scheme].carePlus),
  /** Press feedback. One value, so every pressable dims by the same amount. */
  pressed: alpha(scheme, 'foreground', 0.06),
  /** Scrim behind sheets and dialogs. */
  scrim: alpha(scheme, 'background', 0.72),
});

export const Colors = {
  light: resolve('light'),
  dark: resolve('dark'),
} as const;

export type ThemeColor = keyof typeof Colors.light;

/**
 * Type faces.
 *
 * `display` is the serif the founder chose for headings and for typed text. iOS resolves
 * `ui-serif` to the system serif; Android has no equivalent alias, so it takes the
 * platform serif by name.
 */
export const Fonts = Platform.select({
  ios: { sans: 'system-ui', display: 'ui-serif', rounded: 'ui-rounded', mono: 'ui-monospace' },
  android: { sans: 'sans-serif', display: 'serif', rounded: 'sans-serif-medium', mono: 'monospace' },
  default: { sans: 'normal', display: 'serif', rounded: 'normal', mono: 'monospace' },
  web: {
    sans: 'var(--font-sans)',
    display: 'var(--font-display)',
    rounded: 'var(--font-sans)',
    mono: 'var(--font-mono)',
  },
})!;

/**
 * Spacing, straight from the shared scale.
 *
 * The old numeric names (`half`, `one`, `two`… mapping to 2, 4, 8) are gone: they read
 * as multiples but were not, so `Spacing.two` being 8 and `Spacing.four` being 24 was a
 * trap rather than a scale.
 */
/**
 * Re-exported so a component can build a translucent value from a role instead of
 * reaching for an rgba literal. `StyleSheet.create` is static, so styles that are not
 * scheme-aware pass an explicit scheme — which is what the old hardcoded overlays were
 * doing implicitly, and badly.
 */
export { alpha, hsl, COLOR };

export const Spacing = SPACE;
export const Radius = RADIUS;
export const Type = TYPE;
export { MIN_TAP_TARGET };

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
