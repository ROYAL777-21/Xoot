import { useCallback, useEffect, useRef, useState } from "react";
import { StarMark, ZOEY_HALO, ZoeyArt } from "@/components/zoot/mascot/ZoeyArt";
import { haptic } from "@/lib/haptics";
import {
  BEATS,
  DURATION_S,
  STAGE,
  STARS,
  TRAIL,
  ZOEY_ORIGIN,
  sampleTimes,
  stageViewBox,
  starState,
  trailState,
  zoeyState,
  type SplashStar,
  type TrailSegment,
} from "@/lib/splash-choreography";
import { cn } from "@/lib/utils";

/**
 * The in-app splash: Zoey levitates, then flies away, and her stars scatter trailing
 * paths that disappear behind them.
 *
 * Geometry and timing come from `splash-choreography.ts` — the same module the
 * Remotion composition samples per video frame. This component's only job is turning
 * that into something a browser can play smoothly.
 *
 * It plays through the Web Animations API rather than React state or a rAF loop.
 * A splash runs at the single busiest moment in the app's life — bundle parse, auth
 * rehydration, first query — and anything sharing the main thread with that stutters
 * exactly where a first impression is formed. WAAPI hands transform and opacity to
 * the compositor, so the animation holds even while the thread is blocked.
 *
 * The keyframes are built in JS from the choreography rather than shipped as a CSS
 * string: ~20 elements at 72 stops is far too much CSS to send down the wire, and
 * hand-writing a second copy in CSS is how the video and the app drift apart.
 */

const TOTAL_MS = DURATION_S * 1000;

/** Beat at which the lift haptic fires, matched to the moment she leaves the ground. */
const LIFT_HAPTIC_MS = BEATS.liftAt * 1000;

type Keyframe = { transform: string; opacity: number; offset: number };

/**
 * Stars rotate and scale about their own centre, not the stage's.
 *
 * `transform-box: view-box` makes percentage origins resolve against the SVG rather
 * than each element's own bounding box, and its default origin is the view-box
 * centre — which would swing every star out on a 200-unit arm the moment it scaled.
 * Pinning the origin to 0 0 keeps it on the point the star path is drawn around.
 */
const STAR_TRANSFORM = { transformBox: "view-box", transformOrigin: "0 0" } as const;

const round = (n: number) => Math.round(n * 1000) / 1000;

/** Keyframes for one star, or one segment of its trail. */
function starKeyframes(star: SplashStar, segment?: TrailSegment): Keyframe[] {
  const frames: Keyframe[] = [];
  for (const t of sampleTimes()) {
    const s = segment ? trailState(star, segment, t) : starState(star, t);
    const offset = round(t / DURATION_S);
    if (!s) {
      // Trail segments do not exist yet at the very start; park them invisible so
      // the keyframe list still spans the full 0→1 range WAAPI requires.
      frames.push({ transform: "translate(0px, 0px)", opacity: 0, offset });
      continue;
    }
    frames.push({
      transform: `translate(${round(s.x)}px, ${round(s.y)}px) rotate(${round(s.rotate)}deg) scale(${round(Math.max(0, s.scale))})`,
      opacity: round(s.opacity),
      offset,
    });
  }
  return frames;
}

function zoeyKeyframes(): Keyframe[] {
  return sampleTimes().map((t) => {
    const z = zoeyState(t);
    return {
      transform: `translate(${round(z.x)}px, ${round(z.y)}px) rotate(${round(z.rotate)}deg) scale(${round(z.scale)})`,
      opacity: round(z.opacity),
      offset: round(t / DURATION_S),
    };
  });
}

export function SplashScreen({
  onDone,
  className,
}: {
  /** Fired once the flight finishes, or immediately when motion is reduced. */
  onDone?: () => void;
  className?: string;
}) {
  const stageRef = useRef<HTMLDivElement>(null);

  // Read once. The splash lasts 2.6 seconds, so a rotation mid-flight is not worth a
  // resize listener — and the animations are in stage units, so the viewBox only
  // decides how much room is visible around them.
  const [viewBox] = useState(() =>
    typeof window === "undefined" ? stageViewBox(1, 1) : stageViewBox(window.innerWidth, window.innerHeight),
  );
  const [leaving, setLeaving] = useState(false);
  const doneRef = useRef(false);

  // onDone can be an inline arrow from the caller; keeping it in a ref stops a new
  // identity on every parent render from tearing down and restarting the animation.
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setLeaving(true);
    onDoneRef.current?.();
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const targets = Array.from(stage.querySelectorAll<SVGGElement>("[data-splash]"));

    // No WAAPI, or the user asked for less motion: show the resting frame briefly and
    // move on. Cutting the performance is the correct response to that preference —
    // playing it faster is not.
    if (reduced || typeof targets[0]?.animate !== "function") {
      const timer = window.setTimeout(finish, reduced ? 450 : 0);
      return () => window.clearTimeout(timer);
    }

    const animations = targets.map((el) => {
      // "zoey" | "star:<i>" | "trail:<i>:<segment>"
      const [kind, si, ti] = el.dataset.splash!.split(":");
      const frames =
        kind === "zoey"
          ? zoeyKeyframes()
          : starKeyframes(STARS[Number(si)], kind === "trail" ? TRAIL[Number(ti)] : undefined);
      return el.animate(frames, { duration: TOTAL_MS, easing: "linear", fill: "both" });
    });

    haptic("selection");
    const liftHaptic = window.setTimeout(() => haptic("impact"), LIFT_HAPTIC_MS);

    // Drive completion off the animation rather than a parallel timer, so a browser
    // that throttles the tab cannot dismiss the splash before Zoey has left.
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      finish();
    };
    animations[0]?.finished.then(done).catch(done);
    // Belt and braces: if the tab is backgrounded mid-flight the promise may never
    // settle, and a splash that never dismisses is worse than one that cuts early.
    const guard = window.setTimeout(done, TOTAL_MS + 1200);

    return () => {
      window.clearTimeout(liftHaptic);
      window.clearTimeout(guard);
      animations.forEach((a) => a.cancel());
    };
  }, [finish]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] grid place-items-center bg-background transition-opacity duration-300",
        leaving && "pointer-events-none opacity-0",
        className,
      )}
      // The splash is decoration over a loading app. A screen reader should announce
      // the app, not a heart flying off, so the whole stage is hidden from the tree.
      aria-hidden="true"
    >
      {/* The stage fills the overlay so the flight has somewhere to go. Sized from
          the live viewport rather than a fixed square: on a tall phone a centred
          square leaves Zoey fading out halfway up the screen instead of leaving it. */}
      <div ref={stageRef} className="absolute inset-0">
        <svg viewBox={viewBox} className="h-full w-full" preserveAspectRatio="xMidYMid meet">
          <defs>
            <filter id="splash-trail-blur" x="-70%" y="-70%" width="240%" height="240%">
              <feGaussianBlur stdDeviation="3.2" />
            </filter>
            <filter id="splash-star-glow" x="-120%" y="-120%" width="340%" height="340%">
              <feGaussianBlur stdDeviation="4.5" />
            </filter>
          </defs>

          {/*
            Every star is drawn once, in front of Zoey.

            The video composition swaps each star between a far and a near layer so it
            passes behind her. That needs a re-render per frame, which is exactly what
            this component avoids — and by the time the stars are the point they have
            already broken orbit and are nowhere near her. The occlusion belongs to
            the live mascot, which does it properly on `/welcome` a moment later.
          */}
          <g
            data-splash="zoey"
            style={{ transformOrigin: `${STAGE / 2}px ${STAGE / 2}px`, transformBox: "view-box" }}
          >
            <circle cx={ZOEY_ORIGIN + 80} cy={ZOEY_ORIGIN + 86} r={62} fill={ZOEY_HALO} opacity={0.45} />
            <g transform={`translate(${ZOEY_ORIGIN} ${ZOEY_ORIGIN})`}>
              <ZoeyArt haloOpacity={0} />
            </g>
          </g>

          {STARS.map((_, si) => (
            <g key={si}>
              {TRAIL.map((_, ti) => (
                <g
                  key={ti}
                  data-splash={`trail:${si}:${ti}`}
                  opacity={0}
                  filter="url(#splash-trail-blur)"
                  style={STAR_TRANSFORM}
                >
                  <StarMark trail />
                </g>
              ))}
              <g data-splash={`star:${si}`} opacity={0} style={STAR_TRANSFORM}>
                <StarMark glowFilter="splash-star-glow" />
              </g>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
