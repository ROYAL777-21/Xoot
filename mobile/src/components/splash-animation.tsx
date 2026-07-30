import { useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedProps,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, G, Path, RadialGradient, Stop } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';
import {
  DURATION_S,
  STAGE,
  STARS,
  ZOEY_ORIGIN,
  sampleTimes,
  stageViewBox,
  starState,
  trailSegments,
  trailState,
  zoeyState,
  type SplashStar,
  type TrailSegment,
} from '@/generated/splash-choreography';
import {
  HEART_D,
  SHADING_D,
  STAR_D,
  EYE_Y,
  literalColor,
  mouthFor,
} from '@/generated/zoey-geometry';

/**
 * The launch animation, natively.
 *
 * Same performance as the web splash and the rendered video, from the same
 * `splash-choreography` module — see ZD-022. This file owns only the translation into
 * `react-native-svg` and Reanimated; it decides no timing and no geometry.
 *
 * Whether it plays at all is decided by `shouldPlayLaunchAnimation` in
 * `lib/native-launch.ts`, which already owns the deep-link bypass and the Reduce
 * Motion / Low Power gate. This component assumes it should run.
 *
 * Structure mirrors the web version for a reason: one Reanimated clock drives
 * everything, and each element interpolates precomputed samples of the choreography.
 * Sampling rather than calling the choreography per frame keeps the work on the UI
 * thread down to array interpolation, and avoids having to mark a module shared with
 * two other bundlers with Reanimated's `'worklet'` directives.
 */

const AnimatedG = Animated.createAnimatedComponent(G);

/**
 * Fewer tail segments than the browser gets.
 *
 * Every animated element is a worklet the UI thread evaluates each frame. Sixty of
 * them is comfortable in a compositor-driven browser animation and is not a bet worth
 * taking on a low-end Android device during app start, which is when this runs.
 */
const TRAIL = trailSegments(5);

const INK = literalColor('foreground');
const FILL = literalColor('zoey-fill');
const HALO = literalColor('zoey-halo');

const TIMES = sampleTimes().map((t) => t / DURATION_S);

/** Glow radius, against a star roughly 10 units from centre to point. */
const GLOW_R = 19;

type Samples = { x: number[]; y: number[]; scale: number[]; rotate: number[]; opacity: number[] };

const emptySamples = (): Samples => ({ x: [], y: [], scale: [], rotate: [], opacity: [] });

function sampleStar(star: SplashStar, segment?: TrailSegment): Samples {
  const out = emptySamples();
  for (const t of sampleTimes()) {
    const s = segment ? trailState(star, segment, t) : starState(star, t);
    out.x.push(s?.x ?? 0);
    out.y.push(s?.y ?? 0);
    out.scale.push(Math.max(0, s?.scale ?? 0));
    out.rotate.push(s?.rotate ?? 0);
    out.opacity.push(s?.opacity ?? 0);
  }
  return out;
}

function sampleZoey(): Samples {
  const out = emptySamples();
  for (const t of sampleTimes()) {
    const z = zoeyState(t);
    // Zoey's transform is about the stage centre; the samples carry her offset from
    // rest, and the group is positioned there.
    out.x.push(STAGE / 2 + z.x);
    out.y.push(STAGE / 2 + z.y);
    out.scale.push(z.scale);
    out.rotate.push(z.rotate);
    out.opacity.push(z.opacity);
  }
  return out;
}

/**
 * One animated group, positioned and turned about its own origin.
 *
 * `G` takes `x`/`y`/`scale`/`rotation` with an `origin`, which composes in the order
 * this animation needs — scale and rotate about the element's own centre, then
 * translate. Building a `transform` string per frame would allocate on the UI thread
 * every frame instead.
 */
function useGroupProps(samples: Samples, clock: SharedValue<number>, originX = 0, originY = 0) {
  return useAnimatedProps(() => {
    'worklet';
    const p = clock.value;
    return {
      x: interpolate(p, TIMES, samples.x),
      y: interpolate(p, TIMES, samples.y),
      scale: interpolate(p, TIMES, samples.scale),
      rotation: interpolate(p, TIMES, samples.rotate),
      origin: `${originX}, ${originY}`,
      opacity: interpolate(p, TIMES, samples.opacity),
    };
  });
}

function AnimatedStar({
  samples,
  clock,
  baseOpacity = 1,
  baseScale = 1,
  trail,
}: {
  samples: Samples;
  clock: SharedValue<number>;
  baseOpacity?: number;
  baseScale?: number;
  trail?: boolean;
}) {
  const props = useGroupProps(samples, clock);
  return (
    <AnimatedG animatedProps={props}>
      <G scale={baseScale} opacity={baseOpacity}>
        {trail ? (
          <Path d={STAR_D} fill={FILL} />
        ) : (
          <>
            {/* The web draws this glow with a Gaussian blur. react-native-svg has no
                filter support on Android, and the obvious substitute — concentric
                copies of the star at falling opacity — is the exact failure the web
                version warns about: hard edges stack into a bullseye and the white
                star reads as a red ring. A radial gradient is genuinely soft. */}
            <Circle cx={0} cy={0} r={GLOW_R} fill="url(#star-glow)" />
            <Path d={STAR_D} fill="#FFFFFF" />
          </>
        )}
      </G>
    </AnimatedG>
  );
}

export function SplashAnimation({ onDone }: { onDone: () => void }) {
  const { width, height } = useWindowDimensions();
  const theme = useTheme();
  const clock = useSharedValue(0);

  // Sampling is pure arithmetic over a fixed timeline, so it is done once and never
  // recomputed. Doing it inside the animated props would run it 60 times a second.
  const zoey = useMemo(sampleZoey, []);
  const stars = useMemo(() => STARS.map((s) => sampleStar(s)), []);
  const trails = useMemo(
    () => STARS.map((s) => TRAIL.map((seg) => ({ seg, samples: sampleStar(s, seg) }))),
    [],
  );

  useEffect(() => {
    clock.value = withTiming(1, { duration: DURATION_S * 1000, easing: Easing.linear }, (finished) => {
      'worklet';
      if (finished) runOnJS(onDone)();
    });
    // `onDone` is intentionally not a dependency: re-running this would restart the
    // animation from zero every time the parent re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const zoeyProps = useGroupProps(zoey, clock, STAGE / 2, STAGE / 2);

  // Shared with the web and the video renderer, rather than restated here — the rule
  // (fit the square into the shorter dimension, let the longer one run over) has to be
  // the same everywhere or the mascot is a different size per platform.
  const viewBox = stageViewBox(width, height);

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, { backgroundColor: theme.background }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
    >
      <Svg width="100%" height="100%" viewBox={viewBox}>
        <Defs>
          <RadialGradient id="star-glow" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={FILL} stopOpacity={0.7} />
            <Stop offset="0.45" stopColor={FILL} stopOpacity={0.34} />
            <Stop offset="1" stopColor={FILL} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <AnimatedG animatedProps={zoeyProps}>
          <G x={-STAGE / 2} y={-STAGE / 2}>
            <G x={ZOEY_ORIGIN} y={ZOEY_ORIGIN}>
              <Circle cx={80} cy={86} r={62} fill={HALO} opacity={0.45} />
              <Path d={HEART_D} fill={INK} opacity={0.9} x={3} y={4} />
              <Path d={HEART_D} fill={FILL} stroke={INK} strokeWidth={3.5} strokeLinejoin="round" />
              <Path
                d={SHADING_D}
                stroke="#FFFFFF"
                strokeOpacity={0.55}
                strokeWidth={4}
                strokeLinecap="round"
                fill="none"
              />
              <Circle cx={64} cy={EYE_Y} r={4.8} fill={INK} />
              <Circle cx={96} cy={EYE_Y} r={4.8} fill={INK} />
              <Circle cx={52} cy={82} r={4.5} fill="#FFFFFF" opacity={0.35} />
              <Circle cx={108} cy={82} r={4.5} fill="#FFFFFF" opacity={0.35} />
              <Path
                d={mouthFor('idle')}
                stroke={INK}
                strokeWidth={3.2}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </G>
          </G>
        </AnimatedG>

        {trails.map((segments, si) =>
          segments.map(({ seg, samples }, ti) => (
            <AnimatedStar
              key={`t${si}-${ti}`}
              samples={samples}
              clock={clock}
              baseOpacity={seg.opacity}
              baseScale={seg.size}
              trail
            />
          )),
        )}

        {stars.map((samples, si) => (
          <AnimatedStar key={`s${si}`} samples={samples} clock={clock} />
        ))}
      </Svg>
    </Animated.View>
  );
}
