import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DURATION_S, STAGE, STARS, trailSegments } from "./splash-choreography";

/**
 * The splash has three renderers — the Remotion video, the browser, and React Native —
 * and exactly one definition, `splash-choreography.ts` (ZD-022).
 *
 * Nothing in a type system stops someone pasting `2600` into the native component when
 * an import feels like a detour, and the result is two animations that agree today and
 * disagree after the next retiming. These read the renderers as text and fail when one
 * starts deciding timing or geometry for itself.
 */

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

const RENDERERS = [
  ["native", "mobile/src/components/splash-animation.tsx"],
  ["web", "src/components/zoot/SplashScreen.tsx"],
  ["video", "remotion/XootSplash.tsx"],
] as const;

describe("splash renderer parity", () => {
  it.each(RENDERERS)("%s imports the choreography rather than restating it", (_name, path) => {
    const src = read(path);
    // Native reads the generated copy, which `shared-native-sync.test.ts` proves is
    // the same file. Either route is fine; restating the numbers is not.
    expect(src).toMatch(/from ["']@\/(lib|generated)\/splash-choreography["']/);

    // The literal durations and stage size, in every form someone would plausibly type
    // them. `DURATION_S * 1000` is fine; `2600` is not.
    expect(src).not.toMatch(/\b2600\b/);
    expect(src).not.toMatch(/\b156\b/);
    expect(src).not.toMatch(/duration:\s*2\.6/);
  });

  it("draws every renderer's mascot from the shared geometry", () => {
    // The heart path is the mascot's identity. A copy in a renderer is a second Zoey,
    // and nobody notices until the two are side by side in a screenshot.
    for (const [, path] of RENDERERS) {
      expect(read(path)).not.toMatch(/M80 138 C40 112/);
    }
    expect(read("mobile/src/components/splash-animation.tsx")).toMatch(
      /from ["']@\/generated\/zoey-geometry["']/,
    );
  });

  it("gives native a lighter tail without changing its shape", () => {
    // Native runs fewer segments because each animated element is a per-frame worklet
    // on the UI thread. The taper is the part that is a style choice, and it has to
    // survive the change in density — same span, same fade, fewer samples.
    const web = trailSegments(10);
    const native = trailSegments(5);

    expect(native.length).toBeLessThan(web.length);
    expect(native[native.length - 1].lag).toBeCloseTo(web[web.length - 1].lag, 10);
    expect(native[0].opacity).toBeGreaterThan(native[native.length - 1].opacity);
    expect(native[0].size).toBeGreaterThan(native[native.length - 1].size);
  });

  it("shares one set of stars across all three renderers", () => {
    // Star count and exit angles decide what the animation *is*. If a renderer maps
    // over its own list the scatter differs per platform.
    for (const [, path] of RENDERERS) {
      expect(read(path)).toMatch(/STARS\.map/);
    }
    expect(STARS.length).toBeGreaterThan(1);
    expect(STAGE).toBe(400);
    expect(DURATION_S).toBe(2.6);
  });
});
