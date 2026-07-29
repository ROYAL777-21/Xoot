import { Composition } from "remotion";
import { DURATION_FRAMES, FPS } from "@/lib/splash-choreography";
import { XootSplash } from "./XootSplash";

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
    </>
  );
}
