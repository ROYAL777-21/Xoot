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

// Orbit params per star. Different radii, speeds and phases so they never
// line up into a visibly rotating rigid ring.
const STARS = [
  { x: 0, y: -62, scale: 1.0, duration: 7.5, delay: 0 },
  { x: 58, y: 8, scale: 0.72, duration: 9.5, delay: 0.8 },
  { x: -52, y: 30, scale: 0.85, duration: 11, delay: 1.6 },
] as const;

// Trail segments, in degrees behind the star along its own orbit.
const TRAIL = [
  { deg: 5, opacity: 0.55, scale: 0.78 },
  { deg: 11, opacity: 0.34, scale: 0.58 },
  { deg: 18, opacity: 0.18, scale: 0.4 },
  { deg: 26, opacity: 0.08, scale: 0.26 },
] as const;

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

      {/* Twirling 4-pointed stars, each dragging a fading trail of its own path.
          The trail is a second copy of the star on the same orbit, running a beat
          behind and blurred — cheaper and smoother than stroking a real motion path,
          and it reads as a streak at these sizes. Hidden when motion is reduced. */}
      {stars && !still && (
        <g>
          {STARS.map((s, i) => (
            <motion.g
              key={i}
              animate={{ rotate: 360 }}
              transition={{ duration: s.duration, repeat: Infinity, ease: "linear", delay: s.delay }}
              style={{ transformOrigin: "80px 80px" }}
            >
              {/* Trail: copies of the star placed progressively further back along the
                  orbit, shrinking and fading. Because they ride the same rotating group
                  they trace exactly the path the star has just travelled. */}
              {TRAIL.map((t, j) => (
                <g key={j} transform={`rotate(${-t.deg} 80 80)`} opacity={t.opacity} filter="url(#zoey-star-trail)">
                  <path d={STAR_D} fill="#FFFFFF" transform={`translate(${s.x} ${s.y}) scale(${s.scale * t.scale})`} />
                </g>
              ))}
              <motion.path
                d={STAR_D}
                fill="#FFFFFF"
                transform={`translate(${s.x} ${s.y}) scale(${s.scale})`}
                animate={{ opacity: [0.8, 1, 0.8] }}
                transition={{ duration: 1.8, repeat: Infinity, delay: s.delay }}
              />
            </motion.g>
          ))}
        </g>
      )}

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
