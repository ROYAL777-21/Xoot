import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#172016',
    background: '#f8f5ef',
    backgroundElement: '#fffaf2',
    backgroundSelected: '#eadfcd',
    border: 'rgba(23, 32, 22, 0.14)',
    accent: '#926f34',
    accentSoft: '#ead6ad',
    success: '#2f7d52',
    danger: '#b54747',
    textSecondary: '#5d675d',
  },
  dark: {
    text: '#fff8ec',
    background: '#07100a',
    backgroundElement: 'rgba(17, 26, 18, 0.96)',
    backgroundSelected: 'rgba(216, 178, 110, 0.22)',
    border: 'rgba(255, 250, 242, 0.16)',
    accent: '#d8b26e',
    accentSoft: 'rgba(216, 178, 110, 0.18)',
    success: '#72d39b',
    danger: '#ff8b8b',
    textSecondary: '#c9d0c3',
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
