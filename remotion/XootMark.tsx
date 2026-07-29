import { AbsoluteFill } from "remotion";
import { HEART_D, INK, ZoeyArt } from "@/components/zoot/mascot/ZoeyArt";

/**
 * Zoey as a still mark, for the launcher and launch-screen assets.
 *
 * These are rendered rather than drawn so the app icon and the splash are the same
 * character as the mascot in the product — the whole reason `ZoeyArt` exists. It also
 * means regenerating the set after a change to her is one command instead of a round
 * trip through a design file.
 *
 * `npm run icons:render` writes every variant into `mobile/assets/images/`.
 */

/** Zoey is authored in a 160-unit box. */
const BOX = 160;

export type MarkProps = {
  /**
   * Fraction of the canvas the mascot occupies, or 0 for a plain field of colour —
   * which is what an Android adaptive *background* layer is.
   *
   * Android adaptive icons crop to a shape the manufacturer chooses, and only the
   * inner ~66% of the canvas is guaranteed to survive it, so the foreground layer
   * needs far more padding than a plain icon.
   */
  scale: number;
  /** Opaque fill, or null for transparency. iOS app icons may not have an alpha channel. */
  background: string | null;
  /** Flat silhouette for the Android monochrome layer, which the system recolours. */
  silhouette?: boolean;
  /**
   * Her soft halo. Off by default for icons: at icon size it stops reading as a glow
   * and starts reading as a stray disc behind the heart, and it is offset from the
   * canvas centre because it is positioned relative to her, not to the frame.
   */
  halo?: boolean;
};

export function XootMark({ scale, background, silhouette, halo }: MarkProps) {
  if (scale <= 0) return <AbsoluteFill style={background ? { background } : undefined} />;

  const view = BOX / scale;
  const offset = (view - BOX) / 2;

  return (
    <AbsoluteFill style={background ? { background } : undefined}>
      <svg viewBox={`${-offset} ${-offset} ${view} ${view}`} width="100%" height="100%">
        {silhouette ? (
          <path d={HEART_D} fill={INK} />
        ) : (
          <ZoeyArt haloOpacity={halo ? 0.35 : 0} />
        )}
      </svg>
    </AbsoluteFill>
  );
}
