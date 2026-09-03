import { useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * The rotating half of the hero headline — ported from the 2026-09-03 handoff
 * (`design/handoff-2026-09-03/xoot/site/TextFlip.jsx` → `HeroWordFlip`).
 *
 * ⛔ **One phrase was dropped: "Affordable pricing".**
 *
 * `locked-commercial-facts.md` § Brand: *"Position: premium managed home-care infrastructure…
 * Do not describe Xoot as cheap cleaning."* A headline that rotates "Premium home care" and
 * "Affordable pricing" past the same reader is arguing with itself, and "affordable" sits in
 * the same family as the `cheap / budget / discount / bargain` words `BRAND_GUIDE` bans.
 *
 * It is also a **price claim while the pricing conflict is open** — the locked document and
 * `create-booking` currently disagree about what a clean costs. Calling an unresolved number
 * affordable is a claim about a figure nobody can yet quote.
 *
 * ── And three more were dropped for grammar, not compliance ────────────────────────────
 * The handoff's flip is the whole headline, so its phrases stand alone. Here the first line
 * "Premium home care," is fixed and the flip completes it, so only phrases that finish that
 * sentence survive. "Experience the difference" and "quality services" do not.
 *
 * ── The fitting, which is the non-obvious part and is worth keeping ────────────────────
 * The phrases differ in length by more than 2×. Three approaches, two of them wrong:
 *
 *   · **Let it wrap** — against the hero's narrow column a wrapped headline reads as a
 *     sentence cut in half, not as a second line.
 *   · **Size for the longest phrase** — punishes every short one and drops the headline to
 *     roughly half its intended size.
 *   · **Measure and fit per phrase** ✓ — `white-space: nowrap` guarantees one line, and each
 *     phrase scales down only by the ratio it actually overflows by.
 *
 * ⚠️ **Measure on a hidden sizer, never on the visible node.** Reading the visible node returns
 * a width that is already scaled, so the correction compounds every cycle and the phrase creeps
 * away to nothing. The handoff's comment flags this and it is the kind of bug that looks like a
 * rendering glitch for a week.
 */

/** Phrases that complete "Premium home care,". See the header for what was dropped and why. */
const PHRASES = ["built on trust", "your home handled", "the Xoot way"] as const;

const INTERVAL_MS = 3200;
const MIN_SCALE = 0.42;

export const HeroWordFlip = () => {
  const [index, setIndex] = useState(0);
  const [scale, setScale] = useState(1);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const sizerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    // `matchMedia` is absent in some test environments; treat that as "motion is fine".
    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const id = window.setInterval(
      () => setIndex((current) => (current + 1) % PHRASES.length),
      INTERVAL_MS,
    );
    return () => window.clearInterval(id);
  }, []);

  // Layout effect so the scale is applied before paint — a phrase that appears at full width
  // and then snaps smaller is worse than one that wrapped.
  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const sizer = sizerRef.current;
    if (!wrap || !sizer) return;

    const available = wrap.getBoundingClientRect().width;
    const needed = sizer.getBoundingClientRect().width;
    if (!available || !needed) return;

    setScale(needed <= available ? 1 : Math.max(MIN_SCALE, available / needed));
  }, [index]);

  const phrase = PHRASES[index];

  return (
    <span ref={wrapRef} className="relative block w-full">
      {/* Unscaled, unpainted, out of the accessibility tree: the only honest place to measure. */}
      <span
        ref={sizerRef}
        aria-hidden="true"
        className="pointer-events-none invisible absolute left-0 top-0 whitespace-nowrap"
      >
        {phrase}
      </span>

      <span
        key={phrase}
        className="relative inline-block origin-left whitespace-nowrap text-primary motion-safe:animate-fade-in"
        style={{ transform: `scale(${scale})` }}
      >
        {phrase}
        <span
          aria-hidden="true"
          className="absolute bottom-2 left-0 right-0 z-0 h-3 bg-primary/15"
        />
      </span>
    </span>
  );
};
