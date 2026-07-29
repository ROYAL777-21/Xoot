import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { StarMark, ZOEY_HALO, ZoeyArt, ZoeyEyes } from "@/components/zoot/mascot/ZoeyArt";
import {
  BEATS,
  STAGE,
  STARS,
  stageViewBox,
  TRAIL,
  ZOEY_ORIGIN,
  clamp01,
  starState,
  trailState,
  zoeyState,
  type SplashStar,
} from "@/lib/splash-choreography";

/**
 * The Xoot splash, as video.
 *
 * Rendered to a file for the native launch screen and the App Store preview. Every
 * position on screen comes from `splash-choreography.ts`, which the in-app splash
 * also reads — so what plays before the first frame of the app and what plays after
 * it are the same performance, not two people's impressions of the same brief.
 *
 * Remotion's contract is that a frame must render identically every time it is
 * sampled, which rules out CSS animation, framer-motion and anything reading the
 * clock. Hence `ZoeyArt` (the drawing with no motion in it) rather than `Zoey`.
 */

/** Brand tokens, stated literally: a video render has no stylesheet to inherit from. */
const TOKENS: Record<string, string> = {
  "--background": "26 33% 97%",
  "--foreground": "14 18% 14%",
  "--zoey-fill": "3 78% 53%",
  "--zoey-halo": "6 100% 92%",
};

function Star({ star, t, layer }: { star: SplashStar; t: number; layer: "far" | "near" }) {
  const s = starState(star, t);
  if (s.inFront !== (layer === "near")) return null;

  return (
    <g>
      {/* Trails first, so the star itself always sits on top of its own tail. */}
      {TRAIL.map((seg, i) => {
        const tr = trailState(star, seg, t);
        if (!tr || tr.opacity < 0.004) return null;
        return (
          <g
            key={i}
            transform={`translate(${tr.x} ${tr.y}) rotate(${tr.rotate}) scale(${tr.scale})`}
            opacity={tr.opacity}
            filter="url(#splash-trail-blur)"
          >
            <StarMark trail />
          </g>
        );
      })}
      <g
        transform={`translate(${s.x} ${s.y}) rotate(${s.rotate}) scale(${s.scale})`}
        opacity={s.opacity}
      >
        <StarMark glowFilter="splash-star-glow" />
      </g>
    </g>
  );
}

export function XootSplash() {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;

  const z = zoeyState(t);

  // Two deliberate blinks before she goes. Driven off the timeline rather than a
  // repeating animation, so frame N is the same picture on every render pass.
  const blink = (at: number) => clamp01(1 - Math.abs(t - at) / 0.09);
  const lidClosure = Math.max(blink(0.62), blink(BEATS.dipAt + 0.05));

  // The halo swells as she gathers herself, then goes with her.
  const haloOpacity =
    0.35 + 0.4 * clamp01((t - BEATS.gatherAt) / (BEATS.liftEnd - BEATS.gatherAt)) * z.opacity;

  return (
    <AbsoluteFill
      style={{
        ...TOKENS,
        background: "hsl(var(--background))",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg viewBox={stageViewBox(width, height)} width="100%" height="100%">
        <defs>
          <filter id="splash-trail-blur" x="-70%" y="-70%" width="240%" height="240%">
            <feGaussianBlur stdDeviation="3.2" />
          </filter>
          <filter id="splash-star-glow" x="-120%" y="-120%" width="340%" height="340%">
            <feGaussianBlur stdDeviation="4.5" />
          </filter>
        </defs>

        {/* Halo travels with her, so it is inside the same transform. */}
        <g
          transform={`translate(${STAGE / 2 + z.x} ${STAGE / 2 + z.y}) rotate(${z.rotate}) scale(${z.scale}) translate(${-STAGE / 2} ${-STAGE / 2})`}
          opacity={z.opacity}
        >
          <circle
            cx={ZOEY_ORIGIN + 80}
            cy={ZOEY_ORIGIN + 86}
            r={62}
            fill={ZOEY_HALO}
            opacity={haloOpacity}
          />
        </g>

        {/* Stars behind Zoey. */}
        {STARS.map((star, i) => (
          <Star key={`far-${i}`} star={star} t={t} layer="far" />
        ))}

        <g
          transform={`translate(${STAGE / 2 + z.x} ${STAGE / 2 + z.y}) rotate(${z.rotate}) scale(${z.scale}) translate(${-STAGE / 2} ${-STAGE / 2})`}
          opacity={z.opacity}
        >
          <g transform={`translate(${ZOEY_ORIGIN} ${ZOEY_ORIGIN})`}>
            <ZoeyArt haloOpacity={0} eyes={<ZoeyEyes lidClosure={lidClosure} />} />
          </g>
        </g>

        {/* Stars in front of Zoey. Same six, drawn twice — `inFront` decides which
            pass actually renders each one, so a star genuinely passes behind her. */}
        {STARS.map((star, i) => (
          <Star key={`near-${i}`} star={star} t={t} layer="near" />
        ))}
      </svg>
    </AbsoluteFill>
  );
}
