import { KIT_LIGHT, type KitLightToken } from '@/generated/kit-tokens';

/** Resolve the handoff's CSS aliases into values React Native can render. */
function token(name: KitLightToken): string {
  let value: string = KIT_LIGHT[name];
  const seen = new Set<string>([name]);
  while (value.startsWith('var(')) {
    const reference = /^var\(--xoot-([a-z0-9-]+)\)$/.exec(value)?.[1] as KitLightToken | undefined;
    if (!reference || !(reference in KIT_LIGHT) || seen.has(reference)) {
      throw new Error(`Invalid handoff token: ${name}`);
    }
    seen.add(reference);
    value = KIT_LIGHT[reference];
  }
  return value;
}

export function withOpacity(color: string, opacity: number): string {
  const rgb = Number.parseInt(color.slice(1), 16);
  return `rgba(${rgb >> 16},${(rgb >> 8) & 255},${rgb & 255},${opacity})`;
}

export const nativePalette = {
  page: token('neutral-25'), card: token('neutral-0'), sunken: token('neutral-50'),
  border: token('neutral-200'), borderStrong: token('neutral-300'),
  ink: token('ink-900'), inkSoft: token('ink-600'), muted: token('neutral-500'),
  violet: token('violet-500'), violetDark: token('violet-700'), violetWash: token('violet-100'),
  violetBorder: token('violet-300'),
  blushWash: token('blush-wash'), blushInk: token('blush-ink'),
  honeyWash: token('honey-wash'), honeyInk: token('honey-ink'),
  sageWash: token('sage-wash'), sageInk: token('sage-ink'),
  careWash: token('careplus-50'), care: token('careplus-500'), careInk: token('careplus-700'),
} as const;

export const nativeShadows = {
  card: `0 8px 26px ${withOpacity(nativePalette.ink, 0.07)}`,
  tab: `0 3px 10px ${withOpacity(nativePalette.ink, 0.08)}`,
} as const;
