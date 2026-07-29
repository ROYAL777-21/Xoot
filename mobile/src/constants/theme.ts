import { Platform } from 'react-native';

/**
 * Xoot brand palette, in hex because React Native has no CSS custom properties.
 *
 * These are the same values as the `--background` / `--foreground` / `--primary`
 * tokens in `src/index.css`, converted from HSL. The web is the source; when a token
 * changes there, convert and mirror it here. Until this file was written the native
 * app still carried the pre-rebrand gold-and-green palette, so the same product was
 * two different brands depending on which surface you opened.
 *
 * `accent` is the brand red — on native it is the tint on tabs, links and primary
 * buttons, which is what `accent` is read for here.
 */
export const Colors = {
  light: {
    text: '#2a201d',
    background: '#fff7f5',
    backgroundElement: '#ffffff',
    backgroundSelected: '#f2ebe3',
    border: '#e7e0da',
    accent: '#e42a21',
    accentSoft: '#ffe3e0',
    success: '#188157',
    danger: '#8d1115',
    textSecondary: '#6a5c58',
  },
  dark: {
    text: '#f7efed',
    background: '#15100f',
    backgroundElement: '#201918',
    backgroundSelected: 'rgba(255, 84, 71, 0.22)',
    border: '#362826',
    accent: '#ff5447',
    accentSoft: 'rgba(255, 84, 71, 0.18)',
    success: '#37be88',
    danger: '#c72329',
    textSecondary: '#b3a29e',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
