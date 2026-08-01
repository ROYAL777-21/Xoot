import { Composition } from "remotion";
import { DURATION_FRAMES, FPS } from "@/lib/splash-choreography";
import { XootMark, type MarkProps } from "./XootMark";
import { XootSplash } from "./XootSplash";

/** Brand background, matching `--background` in `src/index.css`. */
const CREAM = "#fff7f5";
/** The app is pinned to dark (`userInterfaceStyle`), so native surfaces use this. */
const INK = "#15100f";

/**
 * Compositions Remotion Studio lists and `npm run splash:render` can target.
 *
 * Three sizes of the same performance rather than three animations: portrait for the
 * app launch screen, square for the store and social, landscape for the marketing
 * site. The choreography is resolution-independent, so adding a size is one entry
 * here and nothing else.
 */
export function RemotionRoot() {
  const shared = {
    component: XootSplash,
    durationInFrames: DURATION_FRAMES,
    fps: FPS,
  };

  return (
    <>
      {/* iPhone 15 Pro logical resolution at 3x — the launch screen target. */}
      <Composition id="XootSplash" {...shared} width={1179} height={2556} />
      <Composition id="XootSplashSquare" {...shared} width={1080} height={1080} />
      <Composition id="XootSplashWide" {...shared} width={1920} height={1080} />

      {/* Still marks. One frame each — `remotion still` ignores the duration. */}
      {MARKS.map(({ id, props }) => (
        <Composition
          key={id}
          id={id}
          component={XootMark}
          defaultProps={props}
          durationInFrames={1}
          fps={FPS}
          width={1024}
          height={1024}
        />
      ))}
    </>
  );
}

const MARKS: { id: string; props: MarkProps }[] = [
  // iOS and web app icon. Opaque: the App Store rejects an icon with an alpha channel.
  { id: "XootIcon", props: { scale: 0.82, background: CREAM } },
  // Launch screen mark. Transparent so `expo-splash-screen`'s backgroundColor shows.
  { id: "XootSplashMark", props: { scale: 0.8, background: null } },
  // Android adaptive foreground — heavily inset for the manufacturer's crop.
  { id: "XootAdaptiveForeground", props: { scale: 0.52, background: null } },
  { id: "XootAdaptiveBackground", props: { scale: 0, background: INK } },
  { id: "XootMonochrome", props: { scale: 0.52, background: null, silhouette: true } },
];
