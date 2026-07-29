import { describe, expect, it } from "vitest";
import {
  BEATS,
  DURATION_FRAMES,
  DURATION_S,
  FPS,
  SAMPLES,
  STAGE,
  STARS,
  TRAIL,
  sampleTimes,
  starState,
  trailState,
  trailStrength,
  zoeyState,
} from "./splash-choreography";

/**
 * The splash plays twice in two different renderers — Remotion samples it per video
 * frame, the app samples it into Web Animations keyframes. Neither can be eyeballed
 * in CI, so these assert the properties that make the animation read correctly, and
 * that would silently break the moment someone retimes a beat.
 */

/** Dense sampling — finer than either renderer uses, so nothing hides between stops. */
const frames = Array.from({ length: DURATION_FRAMES + 1 }, (_, i) => i / FPS);

describe("splash choreography", () => {
  it("is a whole number of frames long", () => {
    expect(DURATION_FRAMES).toBe(156);
    expect(DURATION_FRAMES / FPS).toBeCloseTo(DURATION_S, 6);
  });

  it("orders its beats", () => {
    const order = [BEATS.arriveEnd, BEATS.gatherAt, BEATS.dipAt, BEATS.dipEnd, BEATS.liftEnd, BEATS.launchAt, BEATS.end];
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    // Every star must break orbit while there is still flight left to watch.
    for (const s of STARS) expect(s.breakAt).toBeLessThan(BEATS.launchAt);
  });

  it("moves Zoey continuously — no jump between beats", () => {
    // A piecewise timeline shows its seams as a visible snap. Summed additive moves
    // cannot, and this is the assertion that keeps it that way if someone rewrites it.
    let prev = zoeyState(0);
    for (const t of frames.slice(1)) {
      const now = zoeyState(t);
      expect(Math.abs(now.y - prev.y)).toBeLessThan(24);
      expect(Math.abs(now.x - prev.x)).toBeLessThan(24);
      expect(Math.abs(now.scale - prev.scale)).toBeLessThan(0.06);
      prev = now;
    }
  });

  it("anticipates the lift by dipping first", () => {
    // Without the dip the levitation reads as a glitch rather than a decision.
    const rest = zoeyState(BEATS.dipAt).y;
    const dipped = zoeyState(BEATS.dipEnd).y;
    expect(dipped).toBeGreaterThan(rest);
    expect(zoeyState(BEATS.liftEnd).y).toBeLessThan(rest - 40);
  });

  it("takes Zoey fully off the stage by the end", () => {
    const end = zoeyState(DURATION_S);
    expect(end.y).toBeLessThan(-STAGE / 2);
    expect(end.opacity).toBe(0);
  });

  it("keeps every star on stage until it breaks orbit", () => {
    for (const star of STARS) {
      for (const t of frames.filter((f) => f <= star.breakAt)) {
        const s = starState(star, t);
        expect(s.x).toBeGreaterThan(0);
        expect(s.x).toBeLessThan(STAGE);
        expect(s.y).toBeGreaterThan(0);
        expect(s.y).toBeLessThan(STAGE);
      }
    }
  });

  it("scatters the stars in genuinely different directions", () => {
    const centre = STAGE / 2;
    const bearings = STARS.map((star) => {
      const s = starState(star, DURATION_S);
      return (Math.atan2(s.y - centre, s.x - centre) * 180) / Math.PI;
    });

    // No two stars may leave along nearly the same line, or the exit reads as a
    // single burst rather than a scatter.
    const separation = (a: number, b: number) => Math.abs((((a - b) % 360) + 540) % 360 - 180);
    for (let i = 0; i < bearings.length; i++) {
      for (let j = i + 1; j < bearings.length; j++) {
        expect(separation(bearings[i], bearings[j])).toBeGreaterThan(15);
      }
    }
  });

  it("carries every star off the stage and fades it before the edge", () => {
    for (const star of STARS) {
      const end = starState(star, DURATION_S);
      const distance = Math.hypot(end.x - STAGE / 2, end.y - STAGE / 2);
      expect(distance).toBeGreaterThan(STAGE / 2);
      // Gone before it clips, so nothing is seen being cut off by the frame.
      expect(end.opacity).toBe(0);
    }
  });

  it("moves stars continuously through the break", () => {
    // The orbit relaxes and the exit ramps up, both from zero slope, precisely so
    // position and velocity stay continuous. If someone replaces the break with a
    // hard switch of tracks, the acceleration spikes here first.
    for (const star of STARS) {
      let prev = starState(star, 0);
      let maxStep = 0;
      for (const t of frames.slice(1)) {
        const now = starState(star, t);
        maxStep = Math.max(maxStep, Math.hypot(now.x - prev.x, now.y - prev.y));
        prev = now;
      }
      // A 60fps frame at the fastest point of the flight, with headroom.
      expect(maxStep).toBeLessThan(30);
    }
  });

  it("only shows a trail once the star is actually moving fast", () => {
    // The trail is derived from measured speed, not from the phase. During the slow
    // orbit there should be barely a smear; by the exit it should be a full streak.
    for (const star of STARS) {
      expect(trailStrength(star, 0.2)).toBeLessThan(0.1);
      expect(trailStrength(star, DURATION_S)).toBeGreaterThan(0.9);
    }
  });

  it("never lets a departing star stall", () => {
    // This is the guard on the orbit release. Keep the ellipse running underneath
    // the exit and the two velocities cancel partway out: the star slows to a crawl
    // and its trail blinks off mid-flight. Once a trail is up it stays up.
    for (const star of STARS) {
      let peaked = false;
      for (const t of frames) {
        const strength = trailStrength(star, t);
        if (strength > 0.5) peaked = true;
        if (peaked) expect(strength).toBeGreaterThan(0.35);
      }
      expect(peaked).toBe(true);
    }
  });

  it("puts the trail behind the star, never ahead of it", () => {
    // A trail is the path just travelled. If the lag sign is ever flipped it becomes
    // a leading streak, which reads as the star chasing its own light.
    const t = DURATION_S - 0.3;
    for (const star of STARS) {
      const s = starState(star, t);
      const heading = Math.atan2(s.y - starState(star, t - 0.05).y, s.x - starState(star, t - 0.05).x);
      for (const seg of TRAIL) {
        const tr = trailState(star, seg, t);
        if (!tr) continue;
        const toTrail = Math.atan2(tr.y - s.y, tr.x - s.x);
        const delta = Math.abs(((toTrail - heading) * 180) / Math.PI);
        expect(Math.abs(180 - (delta % 360))).toBeLessThan(45);
      }
    }
  });

  it("fades trails to nothing by the end", () => {
    for (const star of STARS) {
      for (const seg of TRAIL) {
        expect(trailState(star, seg, DURATION_S)?.opacity ?? 0).toBeLessThan(0.01);
      }
    }
  });

  it("hands the renderers a keyframe list spanning the whole splash", () => {
    // Web Animations requires offsets covering 0→1. An off-by-one here shifts the
    // entire animation in the app while the video stays correct.
    const times = sampleTimes();
    expect(times).toHaveLength(SAMPLES + 1);
    expect(times[0]).toBe(0);
    expect(times[times.length - 1]).toBeCloseTo(DURATION_S, 10);
  });

  it("is deterministic — the same frame renders identically every time", () => {
    // Remotion renders frames out of order and in parallel processes. Anything
    // reading a clock or a random source silently produces a flickering video.
    for (const t of [0, 0.5, 1.3, 2.6]) {
      expect(zoeyState(t)).toEqual(zoeyState(t));
      for (const star of STARS) expect(starState(star, t)).toEqual(starState(star, t));
    }
  });
});
