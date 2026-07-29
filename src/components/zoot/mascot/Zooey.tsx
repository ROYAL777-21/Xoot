// Zooey — a hand-drawn heart with dots for eyes and a curved smile. One SVG,
// pose-driven. Ink-black stroke + brand red fill read on any wallpaper.
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export type Pose = "idle" | "wave" | "point" | "celebrate" | "sleep" | "peek" | "think";

// Wobbly hand-drawn heart outline (not geometrically perfect on purpose).
const HEART_D =
  "M80 138 C40 112 14 88 14 60 C14 38 32 22 52 22 C64 22 74 28 80 40 C86 28 96 22 108 22 C128 22 146 38 146 60 C146 88 120 112 80 138 Z";

// Four-pointed star, drawn from its own centre so translate/scale place it directly.
const STAR_D = "M0 -10 L2.6 -2.6 L10 0 L2.6 2.6 L0 10 L-2.6 2.6 L-10 0 L-2.6 -2.6 Z";

// Each star rides a flattened ellipse — a circle seen from slightly above — so the
// orbit reads as a ring *around* Zooey rather than a halo drawn on top of her.
//
// Parametrised as θ = 180° + 360°·p, which starts the star at the ellipse's left
// edge and carries it over the TOP first. That makes the first half of every cycle
// the far side, so it can be drawn beneath the heart and be occluded by it.
//
// Positions are baked into explicit keyframes rather than driven by `offset-path`.
// offset-path resolves against an element's box, and an SVG <g> has none — it
// measurably flattened the orbit and inverted which half ran along the top.
const ORBITS = [
  { rx: 64, ry: 32, cx: 80, cy: 84, duration: 9, delay: 0, size: 1 },
  { rx: 52, ry: 23, cx: 80, cy: 92, duration: 12.5, delay: -4.2, size: 0.74 },
  { rx: 58, ry: 28, cx: 80, cy: 76, duration: 15, delay: -9.1, size: 0.86 },
] as const;

// Trail segments. `lag` is a fraction of one cycle behind the star, on the same
// ellipse, so each segment traces the arc the star has just travelled.
const TRAIL = [
  { lag: 0.014, opacity: 0.5, size: 0.72 },
  { lag: 0.03, opacity: 0.3, size: 0.52 },
  { lag: 0.05, opacity: 0.15, size: 0.34 },
] as const;

const STEPS = 36;

/** Keyframes for one ellipse: position plus a scale that peaks nearest the viewer. */
function orbitKeyframes(name: string, o: (typeof ORBITS)[number], size: number) {
  const stops: string[] = [];
  for (let i = 0; i <= STEPS; i++) {
    const p = i / STEPS;
    const th = Math.PI + p * Math.PI * 2;
    const x = (o.cx + o.rx * Math.cos(th)).toFixed(2);
    const y = (o.cy + o.ry * Math.sin(th)).toFixed(2);
    // sin(θ) is -1 at the far point and +1 nearest the viewer.
    const depth = (0.6 + 0.2 * (1 + Math.sin(th))) * size;
    stops.push(`${((p * 100).toFixed(2))}%{transform:translate(${x}px,${y}px) scale(${depth.toFixed(3)})}`);
  }
  return `@keyframes ${name}{${stops.join("")}}`;
}

const ORBIT_CSS = `
${ORBITS.map((o, i) => orbitKeyframes(`zoey-o${i}`, o, o.size)).join("\n")}
${ORBITS.map((o, i) => TRAIL.map((t, j) => orbitKeyframes(`zoey-o${i}t${j}`, o, o.size * t.size)).join("\n")).join("\n")}
/* Far half of the loop, drawn under the heart. */
@keyframes zoey-far  { 0%,49.9% { opacity: 1 } 50%,100% { opacity: 0 } }
/* Near half, drawn over it. The swap lands at the left and right extremes, where
   the star is level with Zooey's sides and the layer change cannot be seen. */
@keyframes zoey-near { 0%,49.9% { opacity: 0 } 50%,100% { opacity: 1 } }
.zoey-star { animation-timing-function: linear; animation-iteration-count: infinite; }
@media (prefers-reduced-motion: reduce) { .zoey-orbit { display: none } }
`;

export function Zooey({
  pose = "idle",
  size = 120,
  className,
  stars = true,
}: {
  pose?: Pose;
  size?: number;
  className?: string;
  /** Twirling white 4-pointed stars with motion trails. */
  stars?: boolean;
}) {
  const still = useReducedMotion();
  const asleep = pose === "sleep";

  const body = still
    ? {}
    : pose === "celebrate"
      ? { y: [0, -14, 0], rotate: [0, -6, 6, 0], transition: { duration: 0.9, repeat: Infinity, ease: "easeInOut" as const } }
      : pose === "wave"
        ? { rotate: [-4, 4, -4], transition: { duration: 1.6, repeat: Infinity, ease: "easeInOut" as const } }
        : asleep
          ? { scale: [1, 1.03, 1], transition: { duration: 3.8, repeat: Infinity, ease: "easeInOut" as const } }
          : { y: [0, -5, 0], scale: [1, 1.015, 1], transition: { duration: 3, repeat: Infinity, ease: "easeInOut" as const } };

  // Eyes: dots. Sleep = closed arcs. Point = one squint. Blink otherwise.
  const eyeY = 68;
  const smile =
    pose === "celebrate"
      ? "M60 88 Q80 110 100 88 Q80 100 60 88 Z"
      : pose === "think"
        ? "M66 92 H94"
        : pose === "point"
          ? "M70 92 Q80 96 90 92"
          : "M62 88 Q80 106 98 88";

  return (
    <motion.svg
      viewBox="0 0 160 160"
      width={size}
      height={size}
      role="img"
      aria-label="Zooey the heart"
      className={cn("select-none overflow-visible", className)}
      animate={body}
      style={{ transformOrigin: "80px 90px" }}
    >
      <defs>
        {/* Blur for the star trails. stdDeviation is in viewBox units, so it scales
            with `size` and stays proportionate at widget and splash sizes alike. */}
        <filter id="zoey-star-trail" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.4" />
        </filter>
      </defs>

      {/* soft halo */}
      <circle cx="80" cy="86" r="62" fill="var(--zoey-halo, #FFD9D4)" opacity="0.35" />

      {/* Far half of every orbit — drawn before the heart, so it is occluded by it. */}
      {stars && !still && <Orbits half="far" />}

      {/* hand-drawn shadow offset */}
      <path d={HEART_D} fill="var(--charcoal, #2A2622)" opacity="0.9" transform="translate(3 4)" />

      {/* heart body — brand red, ink outline. Falls back to a literal so the mascot
          never renders unfilled if it is used outside the token scope. */}
      <path
        d={HEART_D}
        fill="var(--zoey-fill, #E02B20)"
        stroke="var(--charcoal, #2A2622)"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />

      {/* inner shading crescent */}
      <path
        d="M32 52 C42 38 60 34 74 42"
        stroke="#FFFFFF"
        strokeOpacity="0.55"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />

      {/* eyes */}
      {asleep ? (
        <>
          <path d={`M58 ${eyeY} q6 6 12 0`} stroke="var(--charcoal, #2A2622)" strokeWidth="3.4" strokeLinecap="round" fill="none" />
          <path d={`M90 ${eyeY} q6 6 12 0`} stroke="var(--charcoal, #2A2622)" strokeWidth="3.4" strokeLinecap="round" fill="none" />
        </>
      ) : pose === "point" ? (
        <>
          <circle cx="64" cy={eyeY} r="4.6" fill="var(--charcoal, #2A2622)" />
          <path d={`M90 ${eyeY} q6 5 12 0`} stroke="var(--charcoal, #2A2622)" strokeWidth="3.2" strokeLinecap="round" fill="none" />
        </>
      ) : (
        <motion.g
          animate={still ? {} : { scaleY: [1, 1, 0.1, 1] }}
          transition={{ duration: 0.28, repeat: Infinity, repeatDelay: 3.6, ease: "easeInOut" }}
          style={{ transformBox: "view-box", transformOrigin: `80px ${eyeY}px` }}
        >
          <circle cx="64" cy={eyeY} r="4.8" fill="var(--charcoal, #2A2622)" />
          <circle cx="96" cy={eyeY} r="4.8" fill="var(--charcoal, #2A2622)" />
        </motion.g>
      )}

      {/* cheeks */}
      <circle cx="52" cy="82" r="4.5" fill="#FFFFFF" opacity="0.35" />
      <circle cx="108" cy="82" r="4.5" fill="#FFFFFF" opacity="0.35" />

      {/* mouth */}
      <path
        d={smile}
        stroke="var(--charcoal, #2A2622)"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={pose === "celebrate" ? "var(--charcoal, #2A2622)" : "none"}
      />

      {/* celebrate confetti dots */}
      {pose === "celebrate" && !still && (
        <motion.g animate={{ rotate: 360 }} transition={{ duration: 3.2, repeat: Infinity, ease: "linear" }} style={{ transformOrigin: "80px 80px" }}>
          <circle cx="18" cy="30" r="3" fill="var(--zoey-fill, #E02B20)" />
          <circle cx="142" cy="42" r="2.5" fill="#FFFFFF" />
          <circle cx="150" cy="110" r="3" fill="var(--zoey-halo, #FFD9D4)" />
          <circle cx="14" cy="120" r="2.5" fill="var(--charcoal, #2A2622)" />
        </motion.g>
      )}

      {/* Near half of every orbit — drawn after the heart, so it passes in front. */}
      {stars && !still && <Orbits half="near" />}

      {/* wave sparkle */}
      {pose === "wave" && (
        <path d={STAR_D} transform="translate(126 18)" fill="#FFFFFF" />
      )}

      {/* sleep zzz */}
      {asleep && !still && (
        <motion.text
          x="118"
          y="42"
          fontSize="20"
          fontFamily="Cormorant Garamond, serif"
          fill="var(--charcoal, #2A2622)"
          animate={{ opacity: [0, 1, 0], y: [42, 24, 16] }}
          transition={{ duration: 2.8, repeat: Infinity }}
        >
          z
        </motion.text>
      )}
    </motion.svg>
  );
}

/**
 * One half of every star orbit.
 *
 * Each star is rendered twice by the caller — once as `far` before the heart and
 * once as `near` after it — and the two halves cross-fade at the exact points where
 * the star is level with Zooey's sides. From there the swap is invisible, and the
 * star genuinely disappears behind her on the way round.
 */
function Orbits({ half }: { half: "far" | "near" }) {
  const visibility = half === "far" ? "zoey-far" : "zoey-near";

  return (
    <g className="zoey-orbit">
      <style>{ORBIT_CSS}</style>
      {ORBITS.map((o, i) => (
        <g key={i} style={{ animation: `${visibility} ${o.duration}s linear infinite`, animationDelay: `${o.delay}s` }}>
          {/* Trail segments run the same ellipse a fraction of a cycle behind the
              star, so they lie along the arc it has just covered. */}
          {TRAIL.map((t, j) => (
            <g
              key={j}
              className="zoey-star"
              opacity={t.opacity}
              filter="url(#zoey-star-trail)"
              style={{
                animationName: `zoey-o${i}t${j}`,
                animationDuration: `${o.duration}s`,
                animationDelay: `${o.delay - t.lag * o.duration}s`,
              }}
            >
              <path d={STAR_D} fill="#FFFFFF" />
            </g>
          ))}
          <g
            className="zoey-star"
            style={{
              animationName: `zoey-o${i}`,
              animationDuration: `${o.duration}s`,
              animationDelay: `${o.delay}s`,
            }}
          >
            <path d={STAR_D} fill="#FFFFFF" />
          </g>
        </g>
      ))}
    </g>
  );
}
