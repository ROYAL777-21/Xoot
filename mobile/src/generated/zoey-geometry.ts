// GENERATED FILE — DO NOT EDIT.
// Copied from src/lib/zoey-geometry.ts by scripts/build/sync-shared-native.mjs.
// Edit the source and run `npm run shared:sync`.

/**
 * Zoey's shape and colour, with no rendering in it.
 *
 * Three renderers draw her and they cannot share a component: the web and Remotion use
 * DOM SVG elements, React Native uses `react-native-svg`'s capitalised ones. What they
 * can share — and must — is the geometry. A second copy of the heart path is a second
 * mascot the first time either is nudged.
 *
 * This lives in `src/lib/` rather than beside `ZoeyArt.tsx` because Metro is pointed at
 * `src/lib` and only `src/lib` (see `mobile/metro.config.js`). Widening that to reach a
 * components folder would let a React DOM component be pulled into a native bundle,
 * which fails at runtime instead of at build time.
 *
 * Nothing here may import anything. It is arithmetic and strings, which is what makes
 * sharing it across three bundlers possible at all.
 */

export type Pose = "idle" | "wave" | "point" | "celebrate" | "sleep" | "peek" | "think";

/** The box this art is authored in. Consumers letterbox it rather than rescaling paths. */
export const ZOEY_VIEWBOX = 160;

/** Wobbly hand-drawn heart outline (not geometrically perfect on purpose). */
export const HEART_D =
  "M80 138 C40 112 14 88 14 60 C14 38 32 22 52 22 C64 22 74 28 80 40 C86 28 96 22 108 22 C128 22 146 38 146 60 C146 88 120 112 80 138 Z";

/** Four-pointed star, drawn from its own centre so translate/scale place it directly. */
export const STAR_D = "M0 -10 L2.6 -2.6 L10 0 L2.6 2.6 L0 10 L-2.6 2.6 L-10 0 L-2.6 -2.6 Z";

/** Highlight crescent inside the heart. */
export const SHADING_D = "M32 52 C42 38 60 34 74 42";

export const EYE_Y = 68;

/**
 * Brand colours as bare HSL triplets.
 *
 * Stored in this form because it is the one both platforms can build from: the web
 * wraps them in `hsl(var(--token, <triplet>))` so themes can override, and native
 * expands them to a literal `hsl()` string. Storing hex instead would mean keeping a
 * second representation of the same colour in step by hand.
 */
export const ZOEY_TOKENS = {
  foreground: "14 18% 14%",
  "zoey-fill": "3 78% 53%",
  "zoey-halo": "6 100% 92%",
} as const;

export type ZoeyToken = keyof typeof ZOEY_TOKENS;

/** Web: a themeable custom property with the literal as its fallback. */
export const themedColor = (token: ZoeyToken) => `hsl(var(--${token}, ${ZOEY_TOKENS[token]}))`;

/** Native: a literal colour. React Native has no custom properties to fall back to. */
export const literalColor = (token: ZoeyToken) => {
  const [h, s, l] = ZOEY_TOKENS[token].split(" ");
  return `hsl(${h}, ${s}, ${l})`;
};

export function mouthFor(pose: Pose) {
  if (pose === "celebrate") return "M60 88 Q80 110 100 88 Q80 100 60 88 Z";
  if (pose === "think") return "M66 92 H94";
  if (pose === "point") return "M70 92 Q80 96 90 92";
  return "M62 88 Q80 106 98 88";
}
