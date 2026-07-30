// Zoey's drawing, with no motion in it.
//
// Split out of `Zoey.tsx` so the splash video and the live mascot are provably the
// same character. Remotion has to render a frame identically every time it is sampled,
// so it cannot use the framer-motion component — and a second hand-copied heart path
// is a redrawn mascot waiting to happen the first time either one is nudged.
//
// Everything is authored in a 160×160 box. Colours come from theme tokens with literal
// HSL fallbacks, so this still renders correctly outside the token scope — a widget
// extension, a bare SVG export, or a Remotion render with no stylesheet attached.
import type { ReactNode } from "react";
import {
  EYE_Y,
  HEART_D,
  SHADING_D,
  STAR_D,
  mouthFor,
  themedColor,
  type Pose,
} from "@/lib/zoey-geometry";

export { HEART_D, STAR_D, ZOEY_VIEWBOX, mouthFor, type Pose } from "@/lib/zoey-geometry";

// Themeable on the web: the token wins, the literal is the fallback for anywhere the
// token scope does not reach — a bare SVG export, or a Remotion render with no
// stylesheet attached.
export const INK = themedColor("foreground");
export const ZOEY_FILL = themedColor("zoey-fill");
export const ZOEY_HALO = themedColor("zoey-halo");

/**
 * A star as the splash draws it: a crisp white core inside a soft red glow.
 *
 * The core alone is only legible where it crosses the heart. Against the cream
 * background the app actually uses, white on near-white is invisible — fine for the
 * mascot, whose stars stay close to her, and wrong for the splash, where they fly out
 * across empty ground and *are* the effect.
 *
 * The glow has to be blurred. A scaled copy of the same path at low opacity looks
 * like the obvious cheap substitute and is not one: an unblurred star shape behind a
 * star shape reads as a hard outline ring, which turns a white star into a red one.
 *
 * `glowFilter` is the id of a Gaussian blur the caller has in its `<defs>`. Without
 * one the glow is skipped rather than drawn hard, so this degrades to a plain white
 * star instead of to the ringed version.
 */
export function StarMark({ glowFilter, trail }: { glowFilter?: string; trail?: boolean }) {
  // Trail segments are drawn blurred by the caller. A white one vanishes into the
  // cream background exactly as the star head did, so the tail takes the glow colour
  // and skips the white core — a blurred white core would only wash the tail out.
  if (trail) return <path d={STAR_D} fill={ZOEY_FILL} />;

  return (
    <>
      {glowFilter && (
        <g filter={`url(#${glowFilter})`}>
          <path d={STAR_D} fill={ZOEY_FILL} opacity={0.85} transform="scale(1.7)" />
        </g>
      )}
      <path d={STAR_D} fill="#FFFFFF" />
    </>
  );
}

/**
 * Default eyes: two dots, or closed arcs when asleep, or one squint when pointing.
 *
 * `lidClosure` is 0 for wide open and 1 for fully shut, so a caller that needs a blink
 * can drive one deterministically. `Zoey` overrides this slot entirely with its own
 * framer-motion blink; the splash drives closure from the timeline.
 */
export function ZoeyEyes({ pose = "idle", lidClosure = 0 }: { pose?: Pose; lidClosure?: number }) {
  if (pose === "sleep") {
    return (
      <>
        <path d={`M58 ${EYE_Y} q6 6 12 0`} stroke={INK} strokeWidth="3.4" strokeLinecap="round" fill="none" />
        <path d={`M90 ${EYE_Y} q6 6 12 0`} stroke={INK} strokeWidth="3.4" strokeLinecap="round" fill="none" />
      </>
    );
  }

  if (pose === "point") {
    return (
      <>
        <circle cx="64" cy={EYE_Y} r="4.6" fill={INK} />
        <path d={`M90 ${EYE_Y} q6 5 12 0`} stroke={INK} strokeWidth="3.2" strokeLinecap="round" fill="none" />
      </>
    );
  }

  const open = Math.max(0.08, 1 - lidClosure);
  return (
    <g style={{ transformBox: "view-box", transformOrigin: `80px ${EYE_Y}px` }} transform={`scale(1 ${open})`}>
      <circle cx="64" cy={EYE_Y} r="4.8" fill={INK} />
      <circle cx="96" cy={EYE_Y} r="4.8" fill={INK} />
    </g>
  );
}

/**
 * Zoey's body: halo, drop shadow, heart, shading, cheeks and mouth, plus whichever
 * eyes the caller supplies. Returns SVG children — the caller owns the `<svg>` element,
 * because the mascot appears both on her own and composed into a larger stage.
 */
export function ZoeyArt({
  pose = "idle",
  eyes,
  /** Halo opacity. The splash brightens it as she gathers herself to leave. */
  haloOpacity = 0.35,
}: {
  pose?: Pose;
  eyes?: ReactNode;
  /** Set to 0 to omit it — `Zoey` draws her own so the far stars can pass between. */
  haloOpacity?: number;
}) {
  return (
    <>
      {haloOpacity > 0 && <circle cx="80" cy="86" r="62" fill={ZOEY_HALO} opacity={haloOpacity} />}

      {/* hand-drawn shadow offset */}
      <path d={HEART_D} fill={INK} opacity="0.9" transform="translate(3 4)" />

      {/* heart body — brand red, ink outline */}
      <path d={HEART_D} fill={ZOEY_FILL} stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />

      {/* inner shading crescent */}
      <path
        d={SHADING_D}
        stroke="#FFFFFF"
        strokeOpacity="0.55"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />

      {eyes ?? <ZoeyEyes pose={pose} />}

      {/* cheeks */}
      <circle cx="52" cy="82" r="4.5" fill="#FFFFFF" opacity="0.35" />
      <circle cx="108" cy="82" r="4.5" fill="#FFFFFF" opacity="0.35" />

      {/* mouth */}
      <path
        d={mouthFor(pose)}
        stroke={INK}
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={pose === "celebrate" ? "var(--charcoal, #2A2622)" : "none"}
      />
    </>
  );
}
