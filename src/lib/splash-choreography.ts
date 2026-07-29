/**
 * Xoot splash choreography — Zoey levitates, then flies away, and her stars scatter
 * in different directions trailing paths that disappear behind them.
 *
 * This module is the ONE definition of that animation. Two very different renderers
 * consume it:
 *
 *   1. `remotion/XootSplash.tsx` samples it per video frame to render the MP4/WebM
 *      used for the native launch screen and store previews.
 *   2. `src/components/zoot/SplashScreen.tsx` samples it into Web Animations API
 *      keyframes for the in-app splash.
 *
 * Neither renderer owns any timing or geometry of its own. That is deliberate: a
 * splash that plays one way in the shipped video and another way in the app is the
 * exact seam users notice, and it is invisible in review. `splash-choreography.test.ts`
 * asserts the properties both renderers depend on.
 *
 * Everything here is a pure function of time in seconds. No React, no DOM, no
 * randomness — Remotion requires a frame to render identically every time it is
 * sampled, so nothing may depend on wall-clock time or `Math.random()`.
 *
 * Per ZD-021, every tunable is a named constant here rather than a literal buried in
 * a renderer. Retiming the splash is an edit to this file alone.
 */

// ---------------------------------------------------------------------------
// Stage
// ---------------------------------------------------------------------------

/** Video frame rate. The runtime splash is resolution-independent; this is for Remotion. */
export const FPS = 60;

/** Total runtime. Long enough to read as a performance, short enough not to be a toll gate. */
export const DURATION_S = 2.6;

export const DURATION_FRAMES = Math.round(DURATION_S * FPS);

/**
 * Square stage in abstract units. Both renderers letterbox this into whatever real
 * space they have, so nothing below needs to know about pixels or device size.
 */
export const STAGE = 400;

/**
 * The viewBox to give an SVG of a particular shape so the stage sits inside it.
 *
 * The choreography is authored square, but it plays on a 19.5:9 phone, a 1:1 store
 * asset and a 16:9 hero. Fitting the square into the *smaller* dimension and letting
 * the longer one run over keeps Zoey the same physical size everywhere and gives the
 * flight the extra room it needs to actually leave the frame.
 *
 * Scaling the square to fill instead is the obvious alternative and it is wrong: on a
 * tall phone it makes the mascot most of the screen wide, and on a short one she
 * shrinks to nothing.
 */
export function stageViewBox(width: number, height: number) {
  const aspect = width / height;
  const w = aspect >= 1 ? STAGE * aspect : STAGE;
  const h = aspect >= 1 ? STAGE : STAGE / aspect;
  return `${STAGE / 2 - w / 2} ${STAGE / 2 - h / 2} ${w} ${h}`;
}

/** Zoey's own SVG is authored in a 160-unit box (see `mascot/ZoeyArt.tsx`). */
export const ZOEY_BOX = 160;

/** Top-left of that box when centred on the stage. */
export const ZOEY_ORIGIN = (STAGE - ZOEY_BOX) / 2;

/** Stage-space centre of Zoey's star orbits — her orbit centre (80, 84) offset onto the stage. */
const ORBIT_CX = ZOEY_ORIGIN + 80;
const ORBIT_CY = ZOEY_ORIGIN + 84;

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------

/**
 * Phase boundaries, in seconds. The named beats are what the app hooks into — the
 * lift haptic fires at LIFT_AT, not at a magic number copied into a component.
 */
export const BEATS = {
  /** Zoey fades up from nothing. */
  arriveEnd: 0.4,
  /** Orbits begin winding up — the stars gather speed before anything moves. */
  gatherAt: 0.75,
  /** Anticipation: she dips before she rises. Nothing reads as "lift" without it. */
  dipAt: 0.95,
  dipEnd: 1.25,
  /** She leaves the ground. This is where the lift haptic fires. */
  liftAt: 1.25,
  liftEnd: 1.95,
  /** She accelerates out of frame. */
  launchAt: 1.95,
  end: DURATION_S,
} as const;

// ---------------------------------------------------------------------------
// Easing
// ---------------------------------------------------------------------------

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

const easeOutCubic = (p: number) => 1 - Math.pow(1 - p, 3);
const easeInCubic = (p: number) => p * p * p;
/** Acceleration with an adjustable bite. Exponent 1 is linear, higher is later. */
const easeInPow = (exp: number) => (p: number) => Math.pow(p, exp);
const easeInOutSine = (p: number) => -(Math.cos(Math.PI * p) - 1) / 2;
const easeOutBack = (p: number) => {
  const c = 1.7;
  return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2);
};

/** Smooth 0→1 ramp between two thresholds. Used for speed-driven trail strength. */
const smoothstep = (edge0: number, edge1: number, v: number) => {
  const p = clamp01((v - edge0) / (edge1 - edge0));
  return p * p * (3 - 2 * p);
};

type Ease = (p: number) => number;

/**
 * One additive move: contributes 0 before `from`, eases to `delta` across the window,
 * and holds `delta` afterwards.
 *
 * Motion is composed by summing these rather than by a `switch` over phases. Summing
 * is continuous by construction, so there is no way to introduce a visible jump
 * between beats by retiming one of them — the failure mode a piecewise version has
 * every time someone nudges a boundary.
 */
const move = (t: number, from: number, to: number, delta: number, ease: Ease) => {
  if (t <= from) return 0;
  if (t >= to) return delta;
  return delta * ease((t - from) / (to - from));
};

// ---------------------------------------------------------------------------
// Zoey
// ---------------------------------------------------------------------------

/**
 * How far she travels after the launch.
 *
 * Sized to just clear the stage from her lifted position rather than to a round
 * number — overshoot costs nothing on screen but shows up as an absurd per-frame
 * step, and at 60fps a step past roughly a fifth of the stage strobes instead of
 * reading as speed.
 */
const LAUNCH_TRAVEL = -300;
/** Bite of the launch acceleration. Peak speed is this multiple of the average. */
const LAUNCH_BITE = 2.2;
const DIP_DEPTH = 9;
const LIFT_HEIGHT = -78;

export type ZoeyState = {
  /** Stage-unit offset from her resting position. */
  x: number;
  y: number;
  scale: number;
  /** Degrees. A slight lean into the direction of travel. */
  rotate: number;
  opacity: number;
};

export function zoeyState(t: number): ZoeyState {
  const y =
    move(t, BEATS.dipAt, BEATS.dipEnd, DIP_DEPTH, easeInOutSine) +
    move(t, BEATS.liftAt, BEATS.liftEnd, LIFT_HEIGHT - DIP_DEPTH, easeOutCubic) +
    move(t, BEATS.launchAt, BEATS.end, LAUNCH_TRAVEL, easeInPow(LAUNCH_BITE));

  // She drifts a little to the right as she goes, so the exit is an arc rather than
  // a lift shaft.
  const x = move(t, BEATS.liftAt, BEATS.end, 26, easeInCubic);

  // Squash on the dip, stretch on the lift, shrink into the distance on the launch.
  const scale =
    1 +
    move(t, 0, BEATS.arriveEnd, 0.08, easeOutBack) - 0.08 +
    move(t, BEATS.dipAt, BEATS.dipEnd, -0.04, easeInOutSine) +
    move(t, BEATS.liftAt, BEATS.liftEnd, 0.1, easeOutCubic) +
    move(t, BEATS.launchAt, BEATS.end, -0.42, easeInCubic);

  const rotate =
    move(t, BEATS.liftAt, BEATS.liftEnd, -5, easeOutCubic) +
    move(t, BEATS.launchAt, BEATS.end, 13, easeInCubic);

  // Fades in at the head; at the tail she is gone on geometry alone, but the last
  // sliver of opacity keeps a fast device from flashing a stray pixel at the edge.
  const opacity =
    move(t, 0, BEATS.arriveEnd, 1, easeOutCubic) +
    move(t, BEATS.end - 0.25, BEATS.end, -1, easeInCubic);

  return { x, y, scale: Math.max(0, scale), rotate, opacity: clamp01(opacity) };
}

// ---------------------------------------------------------------------------
// Stars
// ---------------------------------------------------------------------------

export type SplashStar = {
  /** Ellipse it rides. The first three match `Zoey`'s idle orbits exactly, so the */
  /** splash can hand over to the live mascot without the stars jumping. */
  rx: number;
  ry: number;
  /** Seconds per revolution at rest. */
  period: number;
  /** Starting position on the ellipse, in turns. */
  phase: number;
  size: number;
  /** Direction it leaves in: degrees clockwise from straight up. */
  exitAngle: number;
  /** How far out it travels. Varied so they do not land on a common circle. */
  exitDistance: number;
  /** When it breaks away, in seconds. Staggered — a simultaneous exit reads as a cut. */
  breakAt: number;
  /** Full turns it spins during the flight. */
  spin: number;
};

/**
 * Six stars. Three inherit Zoey's idle orbits; three more join for the scatter so the
 * exit fans out properly. Exit angles are deliberately uneven and span both sides plus
 * one that drops away downward — an even fan reads as a firework, not as scattering.
 */
export const STARS: readonly SplashStar[] = [
  { rx: 64, ry: 32, period: 9, phase: 0, size: 1, exitAngle: -24, exitDistance: 430, breakAt: 1.3, spin: 1.6 },
  { rx: 52, ry: 23, period: 12.5, phase: 0.34, size: 0.74, exitAngle: 41, exitDistance: 390, breakAt: 1.42, spin: -2.1 },
  { rx: 58, ry: 28, period: 15, phase: 0.61, size: 0.86, exitAngle: -67, exitDistance: 460, breakAt: 1.36, spin: 1.2 },
  { rx: 44, ry: 20, period: 7.5, phase: 0.18, size: 0.62, exitAngle: 88, exitDistance: 410, breakAt: 1.52, spin: -1.5 },
  { rx: 70, ry: 36, period: 11, phase: 0.79, size: 0.55, exitAngle: 152, exitDistance: 360, breakAt: 1.6, spin: 2.4 },
  { rx: 48, ry: 26, period: 8.4, phase: 0.47, size: 0.68, exitAngle: -128, exitDistance: 400, breakAt: 1.47, spin: -1.1 },
] as const;

/**
 * Extra revolutions added across the gather, so the ring visibly winds up before it
 * lets go. Applied as accumulated phase rather than as a period change, which would
 * teleport every star the moment it took effect.
 */
const SPIN_UP_TURNS = 1.15;

/**
 * Base scale on every star. The path is authored at the mascot's scale, where the
 * stars are an accent beside a 160-unit heart; on the splash stage they carry the
 * whole second half of the animation and need the presence to do it.
 */
const STAR_SCALE = 1.45;

export type StarState = {
  x: number;
  y: number;
  scale: number;
  rotate: number;
  opacity: number;
  /** True once it is past the near/far crossover and should draw in front of Zoey. */
  inFront: boolean;
};

/** Position on the ellipse, in turns, including the wind-up. */
function starPhase(star: SplashStar, t: number) {
  return (
    star.phase +
    t / star.period +
    SPIN_UP_TURNS * easeInCubic(clamp01((t - BEATS.gatherAt) / (BEATS.end - BEATS.gatherAt)))
  );
}

export function starState(star: SplashStar, t: number): StarState {
  // θ starts at the ellipse's left edge and travels over the top first, matching the
  // live mascot, so the first half of every revolution is the far side.
  const th = Math.PI + starPhase(star, t) * Math.PI * 2;

  const p = clamp01((t - star.breakAt) / (BEATS.end - star.breakAt));

  // Breaking orbit means exactly that: the ellipse relaxes to nothing as the star
  // departs, so it stops circling a centre it has already left. Keeping the orbit
  // running under the exit looks defensible on paper and is wrong on screen — the
  // two velocities cancel about a third of the way out and the star visibly stalls
  // mid-flight, taking its trail with it.
  //
  // Both the release and the exit ease in from zero slope, so position and velocity
  // stay continuous through the break rather than switching tracks.
  const hold = 1 - easeInCubic(p);
  const ox = ORBIT_CX + star.rx * Math.cos(th) * hold;
  const oy = ORBIT_CY + star.ry * Math.sin(th) * hold;

  const reach = star.exitDistance * easeInCubic(p);
  const a = (star.exitAngle - 90) * (Math.PI / 180);

  // sin(θ) is -1 at the far point and +1 nearest the viewer.
  const depth = 0.6 + 0.2 * (1 + Math.sin(th));

  return {
    x: ox + Math.cos(a) * reach,
    y: oy + Math.sin(a) * reach,
    scale: STAR_SCALE * star.size * depth * (1 - 0.45 * p),
    rotate: 360 * star.spin * p,
    // Gone before it reaches the edge, so nothing is seen clipping off the stage.
    opacity: clamp01(1 - easeInCubic(clamp01((p - 0.5) / 0.5))),
    inFront: Math.sin(th) > 0,
  };
}

// ---------------------------------------------------------------------------
// Trails
// ---------------------------------------------------------------------------

/**
 * Trail segments, each a fraction of a second behind the star on its own path. Because
 * they sample the same `starState`, a trail is always exactly the route just taken —
 * it cannot drift out of alignment with the star the way a hand-drawn tail does.
 */
/** How far back in time the tail reaches, in seconds. */
const TRAIL_SPAN = 0.1;

/**
 * Number of segments across that span.
 *
 * This is a sampling rate, not a style choice. A tail is only a streak if its
 * segments overlap; the moment the spacing exceeds a star's width it stops being a
 * trail and becomes a dotted line following the star. At the top speed of the exit
 * (~1000 stage units/second) the segments are about 11 units apart, against a star
 * roughly 20 units across — so they overlap throughout, and they overlap by more
 * everywhere slower.
 */
const TRAIL_SEGMENTS = 10;

export const TRAIL = Array.from({ length: TRAIL_SEGMENTS }, (_, i) => {
  const k = (i + 1) / TRAIL_SEGMENTS;
  return {
    lag: TRAIL_SPAN * k,
    // Both taper toward the tail, so the streak thins and fades as it recedes rather
    // than ending in a blunt stub.
    opacity: 0.72 * Math.pow(1 - 0.92 * k, 1.3),
    size: 0.92 * (1 - 0.72 * k),
  };
});

/** Speeds (stage units/second) between which a trail fades up to full strength. */
const TRAIL_SPEED_MIN = 90;
const TRAIL_SPEED_MAX = 620;

/**
 * How visible a trail is at time `t`, from how fast the star is actually moving.
 *
 * Deriving this from measured speed rather than from the phase is what keeps the
 * effect honest: during the slow orbit there is barely a smear, and the streak only
 * appears once the star is genuinely flying. Retime the exit and the trails retime
 * themselves.
 */
export function trailStrength(star: SplashStar, t: number) {
  const h = 1 / 120;
  const a = starState(star, Math.max(0, t - h));
  const b = starState(star, t);
  const speed = Math.hypot(b.x - a.x, b.y - a.y) / h;
  return smoothstep(TRAIL_SPEED_MIN, TRAIL_SPEED_MAX, speed);
}

/** Full state for one trail segment, including its own fade. */
export function trailState(star: SplashStar, segment: (typeof TRAIL)[number], t: number) {
  const at = t - segment.lag;
  // Before the star existed there is nothing to trail.
  if (at < 0) return null;
  const s = starState(star, at);
  // Faded by the star as it was *then* (the tail thins along its length) and by the
  // star as it is *now* — a trail cannot outlive the thing casting it, and without
  // the second factor the longest segments are still visible after the star has gone.
  return {
    ...s,
    scale: s.scale * segment.size,
    opacity: s.opacity * starState(star, t).opacity * segment.opacity * trailStrength(star, at),
  };
}

// ---------------------------------------------------------------------------
// Sampling
// ---------------------------------------------------------------------------

/**
 * Even sample times across the whole splash, for renderers that need discrete
 * keyframes rather than a per-frame callback.
 *
 * 72 samples over 2.6s is a stop every ~36ms. The Web Animations API interpolates
 * linearly between stops, and across curves this smooth that is not distinguishable
 * from evaluating every frame — while keeping the generated keyframe list small
 * enough to build during app boot, which is precisely when the main thread is busiest.
 */
export const SAMPLES = 72;

export function sampleTimes(samples = SAMPLES) {
  return Array.from({ length: samples + 1 }, (_, i) => (i / samples) * DURATION_S);
}
