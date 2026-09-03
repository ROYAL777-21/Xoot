/* ── Hero word flip ───────────────────────────────────────────────────────────
 *
 * Just the words changing — no container, no keycap, no background. The phrase sits in the
 * headline and inherits its colour and tracking.
 *
 * ONE LINE, ALWAYS, AND AS LARGE AS THAT ALLOWS.
 *
 * The five phrases are 12 to 25 characters. At the headline's own 68px the longest one is about
 * 780px wide, and the hero column is roughly 560px on a laptop and 358px on a phone — so it
 * wrapped, and against the photo in the next grid track a wrap reads as the sentence being cut in
 * half rather than as a second line.
 *
 * Two obvious fixes are both wrong. Picking a font size small enough for the longest phrase
 * punishes the four short ones and drops the headline to about half its intended size. Allowing
 * the wrap is what we are fixing.
 *
 * So the phrase is measured and fitted: `white-space: nowrap` guarantees one line, and the type
 * scales down only by the ratio it actually overflows by, per phrase. "the Xoot way" runs at the
 * full headline size; "Experience the difference" shrinks to about 70% of it. Nothing is ever cut,
 * and nothing is smaller than it has to be.
 *
 * Measurement happens on a hidden sizer at the unscaled size, never on the visible node — reading
 * the visible node gives a width that is already scaled, which compounds on every cycle until the
 * phrase creeps away to nothing.
 *
 * prefers-reduced-motion drops the per-letter animation but keeps the fitting; a headline that
 * re-animates every three seconds is what that setting exists to stop.
 */
const HERO_WORDS = [
  'Built on trust',
  'Your Home Handled',
  'Affordable pricing',
  'quality services',
  'the Xoot way',
  'Experience the difference',
];

function HeroWordFlip({
  words = HERO_WORDS,
  interval = 3000,
  animationDuration = 700,
  minScale = 0.42,
  style,
}) {
  const [index, setIndex] = React.useState(0);
  const [scale, setScale] = React.useState(1);
  const hostRef = React.useRef(null);
  const sizerRef = React.useRef(null);
  const reduced = React.useRef(
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ).current;

  const word = words[index] || '';

  /* Fit the current phrase to the space the headline actually has. Runs on every phrase change and
     on resize, because the available width is a grid track that reflows. */
  const fit = React.useCallback(() => {
    const host = hostRef.current;
    const sizer = sizerRef.current;
    if (!host || !sizer) return;
    const available = host.getBoundingClientRect().width;
    const natural = sizer.getBoundingClientRect().width;
    if (!available || !natural) return;
    /* 0.995 leaves a sub-pixel of slack: a phrase measured at exactly the container width still
       wraps in some browsers once sub-pixel rounding goes the wrong way. */
    setScale(Math.max(minScale, Math.min(1, (available * 0.995) / natural)));
  }, [minScale]);

  React.useEffect(fit, [word, fit]);

  React.useEffect(() => {
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', fit);
      return () => window.removeEventListener('resize', fit);
    }
    const ro = new ResizeObserver(fit);
    if (hostRef.current) ro.observe(hostRef.current);
    return () => ro.disconnect();
  }, [fit]);

  React.useEffect(() => {
    if (words.length < 2) return;
    const id = window.setInterval(() => setIndex(i => (i + 1) % words.length), interval);
    return () => window.clearInterval(id);
  }, [words, interval]);

  return (
    /* display:block so the host measures the full line width rather than shrink-wrapping the
       phrase, which would make `available` equal `natural` and defeat the fit. */
    <span ref={hostRef} style={{ display: 'block', minWidth: 0, ...style }}>
      {/* The sizer: same text, same inherited type, unscaled, never painted. */}
      <span ref={sizerRef} aria-hidden="true" style={{
        position: 'absolute', left: -99999, top: 0, visibility: 'hidden',
        pointerEvents: 'none', whiteSpace: 'nowrap', font: 'inherit', letterSpacing: 'inherit',
      }}>{word}</span>

      <span key={word} aria-live="polite" aria-atomic="true" style={{
        display: 'inline-block',
        whiteSpace: 'nowrap',
        fontSize: scale === 1 ? 'inherit' : `${(scale * 100).toFixed(2)}%`,
        transition: 'font-size var(--xoot-dur-fast) var(--xoot-ease-out)',
      }}>
        {reduced ? word : word.split('').map((letter, i) => (
          <span key={i} style={{
            display: 'inline-block',
            whiteSpace: 'pre',
            opacity: 0,
            animation: `xoot-flip-in ${animationDuration}ms var(--xoot-ease-out) ${i * 20}ms forwards`,
          }}>{letter}</span>
        ))}
      </span>
    </span>
  );
}

Object.assign(window, { HeroWordFlip, HERO_WORDS });
