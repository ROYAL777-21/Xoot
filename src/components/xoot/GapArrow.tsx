import { useEffect, useRef, useState } from "react";

/**
 * The hand-drawn connector between sections, ported from the 2026-09-03 design handoff
 * (`design/handoff-2026-09-03/xoot/site/SiteBody.jsx` → `GapArrow`, drawn by `DoodleArrow`
 * in `ds-bundle.js`).
 *
 * The path data is the kit's own, copied exactly rather than redrawn by eye — a curve
 * approximated from a screenshot is how a design stops looking like the design.
 *
 * ── Why it occupies no height ────────────────────────────────────────────────────────
 * The wrapper is `height: 0` and the arrow is absolutely positioned out of it, so dropping
 * one between two sections cannot change the page's vertical rhythm. `offset` pulls it up
 * into the gap that already exists. That is the design's own trick and it is why the
 * arrows could be added to a finished layout without re-spacing anything.
 *
 * Decorative only: `aria-hidden`, no text, no semantics. A screen reader gets nothing,
 * which is correct — it is a flourish, not a signpost.
 */

type GapArrowProps = {
  /** Vertical nudge in px. Negative pulls the arrow up into the gap above. */
  offset?: number;
  /** Degrees of tilt. The design alternates the sign so consecutive arrows differ. */
  rotate?: number;
  /** Any CSS colour. Defaults to the Care+ red the kit uses for annotation marks. */
  colour?: string;
  /** Rendered height in px; the viewBox scales to it. */
  size?: number;
};

/** The kit's `down` arrow — a curve that points at the section below. */
const VIEW_BOX = "0 0 60 110";
const BODY = "M30,4 C22,34 38,58 30,96";
const HEAD = "M30,96 L20,80 M30,96 L41,80";

/** Long enough to cover both sub-paths; exactness does not matter, only that it exceeds them. */
const DASH = 260;

export const GapArrow = ({
  offset = 0,
  rotate = 0,
  colour = "var(--xoot-careplus-500)",
  size = 78,
}: GapArrowProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [drawn, setDrawn] = useState(false);

  /**
   * Draw when the arrow scrolls into view, and draw immediately if it is already there.
   *
   * The already-visible check matters more than it looks: without it, an arrow above the
   * fold on first paint waits for an intersection that has already happened and never
   * animates. `IntersectionObserver` fires for elements that are visible at observe time in
   * every current browser, but the explicit check also covers the jsdom case in tests and
   * any environment where the observer is missing entirely.
   */
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setDrawn(true);
      return;
    }

    const box = el.getBoundingClientRect();
    if (box.top < window.innerHeight && box.bottom > 0) {
      setDrawn(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          setDrawn(true);
          observer.disconnect();
        }
      },
      { threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} aria-hidden="true" className="relative h-0">
      <svg
        viewBox={VIEW_BOX}
        height={size}
        width={size * (60 / 110)}
        fill="none"
        stroke={colour}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="pointer-events-none absolute left-1/2 motion-reduce:!transition-none"
        style={{
          top: offset,
          // -0.28 of the height, matching the kit's own optical centring: the curve's mass
          // sits right of the box centre, so a true 50% translate reads as off-centre.
          marginLeft: -size * 0.28,
          transform: `rotate(${rotate}deg)`,
          strokeDasharray: DASH,
          strokeDashoffset: drawn ? 0 : DASH,
          transition: `stroke-dashoffset var(--xoot-dur-story, 760ms) var(--xoot-ease-out, ease-out) 260ms`,
        }}
      >
        <path d={BODY} />
        <path d={HEAD} />
      </svg>
    </div>
  );
};
