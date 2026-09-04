import { cn } from "@/lib/utils";

/**
 * The Xoot mark — the "oo" of Xoot as two rings on a violet squircle.
 *
 * Geometry is `design/handoff-2026-09-03/xoot/assets/logo.svg` verbatim: viewBox 512, corner
 * radius 115, rings at cx 196 and 330 with r 66 and a 38 stroke. Inline rather than an <img> so it
 * scales without a second network request and so the ring colour can follow the surface it sits on.
 *
 * ⚠️ **Replaces a Newsreader "X" in a near-black rounded square**, which is what `Navbar` and
 * `Footer` drew until 2026-09-04. That lockup was never in the handoff — it was a stand-in from
 * before the mark existed, and it survived the Zoot→Xoot rename by being the one part of the brand
 * that looked deliberate enough not to question.
 *
 * ⚠️ The ground is `--xoot-violet-500` (#7C5CFC), not `--brand`. Those differ on purpose: `--brand`
 * is violet-600 for WCAG AA against text, and `theme-consumes-audited-palette.test.ts` guards that.
 * A logo carries no text, so it takes the brand's own 500 — the same value `public/xoot-icon.svg`
 * and the app icons use, which is what makes the tab, the home screen and the nav read as one mark.
 */
export const Logo = ({
  size = 36,
  className,
  title = "Xoot",
}: {
  size?: number;
  className?: string;
  /** Empty string marks it decorative — use that when a visible "Xoot" wordmark sits beside it. */
  title?: string;
}) => (
  <svg
    viewBox="0 0 512 512"
    width={size}
    height={size}
    className={cn("shrink-0", className)}
    role={title ? "img" : undefined}
    aria-label={title || undefined}
    aria-hidden={title ? undefined : true}
    focusable="false"
  >
    <rect width="512" height="512" rx="115" fill="var(--xoot-violet-500)" />
    <circle cx="196" cy="256" r="66" fill="none" stroke="#FFFFFF" strokeWidth="38" />
    <circle cx="330" cy="256" r="66" fill="none" stroke="#FFFFFF" strokeWidth="38" />
  </svg>
);
