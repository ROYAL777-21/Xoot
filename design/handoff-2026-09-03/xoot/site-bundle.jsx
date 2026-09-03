/* ── Xoot site bundle — GENERATED, do not edit ─────────────────────────────────
 *
 * Concatenation of xoot/site/*.jsx, each wrapped in an IIFE. Source order:
 *   TextFlip, SiteTop, SiteBody, SiteGift, SitePay, SiteBlog, SiteXooter, SiteTrust, SiteMap, SiteRefer, SiteExtra, SiteFoot, SiteAuth, SiteBooking
 *
 * WHY: the DC runtime resolves an x-import's module list serially, so 14 separate site modules
 * cost 14 round trips before the page can finish — measured at ~350ms each, dominated by request
 * latency rather than size (these files are 5–50KB). One request instead of fourteen.
 *
 * WHY IIFEs: four modules declare a top-level `const D = window.XootData`, two declare `PROOF`,
 * two declare `STEPS`. Raw concatenation is a SyntaxError on the first duplicate. Every module
 * publishes through Object.assign(window, …), so wrapping changes nothing observable.
 *
 * TO REGENERATE: edit the files in xoot/site/, then rebuild this bundle from them.
 */


/* ═══ site/TextFlip.jsx ════════════════════════════════════════════════════════ */
(function(){
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
})();

/* ═══ site/SiteTop.jsx ════════════════════════════════════════════════════════ */
(function(){
/* Xoot marketing site — navigation and hero.

   Copy is lifted from the live repo (src/components/zoot/Navbar.tsx, BookingHero.tsx) rather
   than written fresh, so the site says what the product actually says. What changes is the
   dressing: the repo's terracotta/sage and Space Grotesk are superseded by the Xoot system —
   violet, ink, Newsreader over Plus Jakarta Sans.

   Public pages breathe more than the app does. Section rhythm is 96–128px rather than the
   app's 20–24px, because a marketing page is read at arm's length and a phone is read at
   thirty centimetres. */
const {
  Logo, Button, Icon, Card, Badge, ServiceIcon, XOOT_SERVICES, StoreBadges,
  MemberBadge, Avatar, Rating, Bloom, SitePlanner,
  WashiTape, Squiggled, DoodleArrow, TapedFrame, HandNote,
} = window.XootNS;
const { HeroWordFlip } = window;

/* Repo nav, verbatim. Care+ keeps its own mark rather than being set as plain text. */
const NAV_LINKS = [
  { label: 'Services', href: '#services' },
  { label: 'Care+', href: '#careplus', member: true },
  { label: 'Trust', href: '#safety' },
  { label: 'Journal', href: '#articles' },
  { label: 'How it works', href: '#how' },
];

/* left/top are percentages of the hero; `rate` is the parallax multiplier — bigger means
   further forward, so it moves more. Palettes stay in the calm half of the tint set: a bloom
   field competing with a violet headline is noise. */
const HERO_BLOOMS = [
  { size: 118, palette: 'lilac', left: '-4%',  top: '8%',  rate: 0.22, opacity: .34, delay: 0 },
  { size: 74,  palette: 'petal', left: '11%',  top: '-4%', rate: 0.42, opacity: .30, delay: 260 },
  { size: 92,  palette: 'honey', left: '86%',  top: '4%',  rate: 0.30, opacity: .32, delay: 140 },
  { size: 58,  palette: 'sage',  left: '96%',  top: '34%', rate: 0.52, opacity: .28, delay: 420 },
  { size: 132, palette: 'mist',  left: '-8%',  top: '52%', rate: 0.18, opacity: .30, delay: 320 },
  { size: 80,  palette: 'petal', left: '92%',  top: '70%', rate: 0.46, opacity: .28, delay: 540 },
  { size: 100, palette: 'lilac', left: '6%',   top: '84%', rate: 0.26, opacity: .30, delay: 200 },
  { size: 64,  palette: 'honey', left: '78%',  top: '92%', rate: 0.58, opacity: .26, delay: 620 },
];

function HeroBlooms() {
  const hostRef = React.useRef(null);

  React.useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let reduced = false;
    try { reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
    if (reduced) return;

    const nodes = Array.from(host.children);
    let frame = null;

    const apply = () => {
      frame = null;
      /* Progress through the hero, 0 at the top and 1 once it has fully scrolled away. */
      const y = window.scrollY || 0;
      const p = Math.max(0, Math.min(1.4, y / Math.max(1, host.offsetHeight)));
      for (let i = 0; i < nodes.length; i++) {
        const rate = Number(nodes[i].dataset.rate) || 0.3;
        const drift = p * rate * 120;
        /* Capped so a long page can't launch a flower into the next section. */
        const dy = Math.min(26, drift);
        const scale = 1 - p * rate * 0.06;
        nodes[i].style.transform = `translate3d(0, ${dy}px, 0) scale(${scale})`;
      }
    };

    const onScroll = () => { if (frame == null) frame = window.requestAnimationFrame(apply); };
    apply();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame != null) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={hostRef} aria-hidden="true" style={{
      position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0,
    }}>
      {HERO_BLOOMS.map((b, i) => (
        <span key={i} data-rate={b.rate} style={{
          position: 'absolute', left: b.left, top: b.top,
          willChange: 'transform',
          transition: 'transform 120ms linear',
        }}>
          <Bloom size={b.size} palette={b.palette} motion="sway" delay={b.delay} opacity={b.opacity} />
        </span>
      ))}
    </div>
  );
}

/* ── Anchor jumps, in two passes ───────────────────────────────────────────
   With `content-visibility: auto` on sections, an unrendered section's height is an estimate, so
   the first scroll to an anchor lands against placeholder geometry. Scrolling again on the next
   frame — after the target and everything above it have rendered and reported real heights —
   corrects it.

   requestAnimationFrame twice, not a timeout: the second frame is the earliest point layout has
   settled, and a timeout would either fire too early or add a visible delay to every nav click.

   Falls through to default behaviour if the target is missing, so a stale href degrades to
   doing nothing rather than throwing. */
function scrollToAnchor(e, href) {
  if (!href || href.charAt(0) !== '#') return;
  const el = document.getElementById(href.slice(1));
  if (!el) return;
  e.preventDefault();
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

/* Responsive primitives live in xoot/rwd.js and are shared on window, because each site module
   is evaluated in its own scope — a hook declared here is invisible to SiteBody.jsx, which is
   how the page ended up dying on "useNarrow is not defined". */
const { useNarrow, useShort, useLandscapeCompact } = window.XootRWD;

function SiteNav({ onBook, user, onSignIn, onSignOut }) {
  const [scrolled, setScrolled] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  /* 1080 rather than a tablet number: the pill nav, sign-in and Book now stop fitting on one
     64px row well before tablet width, and a nav that wraps to two rows is worse than a menu. */
  const compact = useNarrow(1080);

  React.useEffect(() => { if (!compact) setOpen(false); }, [compact]);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <header style={{
        position: 'fixed', left: 14, right: 14, top: 12, zIndex: 50,
        borderRadius: 26,
        /* 88% rather than the 72% glass token, and the lighter blur: at 36px under 72% white the
           nav's own text sat on a ground that shifted as content scrolled beneath it, which
           reads as blurry type. The glass still reads as glass. */
        background: 'rgba(255,255,255,.88)',
        backdropFilter: 'blur(var(--xoot-glass-blur)) saturate(140%)',
        WebkitBackdropFilter: 'blur(var(--xoot-glass-blur)) saturate(140%)',
        boxShadow: scrolled
          ? 'var(--xoot-shadow-3), inset 0 0 0 1px var(--xoot-glass-light-edge)'
          : 'inset 0 0 0 1px var(--xoot-glass-light-edge)',
        transition: 'box-shadow var(--xoot-dur-base) var(--xoot-ease-out)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
          height: 64, maxWidth: 1240, margin: '0 auto', padding: '0 clamp(12px, 2.4vw, 20px)',
        }}>
          <a href="#top" onClick={e => scrollToAnchor(e, '#top')}
            style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
            {/* Wordmark only. The app-icon tile belongs on a home screen, not in a website
                navbar — beside the wordmark it reads as the brand said twice. */}
            <Logo size={26} tone="violet" />
          </a>

          <nav style={{
            display: compact ? 'none' : 'flex', alignItems: 'center', gap: 2, padding: 4,
            borderRadius: 'var(--xoot-radius-pill)', background: 'var(--xoot-neutral-100)',
          }}>
            {NAV_LINKS.map(l => (
              <a key={l.label} href={l.href}
                onClick={e => scrollToAnchor(e, l.href)}
                style={{
                  padding: '9px 14px', borderRadius: 'var(--xoot-radius-pill)',
                  fontSize: 'var(--xoot-body-sm)', fontWeight: 700, textDecoration: 'none',
                  color: 'var(--xoot-text-secondary)', whiteSpace: 'nowrap',
                  transition: 'background var(--xoot-dur-instant) var(--xoot-ease-out), color var(--xoot-dur-instant) var(--xoot-ease-out)',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--xoot-surface-card)'; e.currentTarget.style.color = 'var(--xoot-text-primary)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--xoot-text-secondary)'; }}>
                {l.member ? <MemberBadge size="sm" /> : l.label}
              </a>
            ))}
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: compact ? 8 : 10 }}>
            {compact ? (
              <>
                <Button variant="primary" size="sm" onClick={onBook}>Book</Button>
                <button type="button" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open}
                  onClick={() => setOpen(v => !v)}
                  style={{
                    display: 'grid', placeItems: 'center', width: 44, height: 44, flex: '0 0 auto',
                    border: 'none', borderRadius: 'var(--xoot-radius-pill)', cursor: 'pointer',
                    background: open ? 'var(--xoot-action-primary)' : 'var(--xoot-surface-sunken)',
                    color: open ? 'var(--xoot-text-inverse)' : 'var(--xoot-text-primary)',
                    transition: 'background var(--xoot-dur-instant) var(--xoot-ease-out)',
                  }}>
                  <Icon name={open ? 'x' : 'menu'} size={20} strokeWidth={2.2} />
                </button>
              </>
            ) : user ? (
              <>
                {/* Bug bounty is a signed-in surface. In the public nav it spends a slot that
                    should be selling cleaning; the footer link covers the signed-out case. */}
                <a href="./Xoot%20Bug%20Bounty.dc.html" style={{
                  display: 'flex', alignItems: 'center', gap: 6, height: 36, padding: '0 12px',
                  borderRadius: 'var(--xoot-radius-pill)', textDecoration: 'none',
                  background: 'var(--xoot-surface-sunken)', color: 'var(--xoot-text-secondary)',
                  fontSize: 'var(--xoot-caption)', fontWeight: 700,
                }}>
                  <Icon name="shield-check" size={14} strokeWidth={2.1} />Bug bounty
                </a>
                <button type="button" onClick={onSignOut} title={user.email}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, height: 38, padding: '0 6px 0 12px',
                    border: 'none', borderRadius: 'var(--xoot-radius-pill)', cursor: 'pointer',
                    background: 'var(--xoot-surface-sunken)', color: 'var(--xoot-text-primary)',
                    fontFamily: 'var(--xoot-font-core)', fontSize: 'var(--xoot-caption)', fontWeight: 700,
                  }}>
                  Signed in
                  <span style={{
                    display: 'grid', placeItems: 'center', width: 26, height: 26,
                    borderRadius: '50%', background: 'var(--xoot-violet-500)', color: '#fff',
                    fontSize: 11, fontWeight: 700,
                  }}>N</span>
                </button>
              </>
            ) : (
              <Button variant="ghost" size="sm" onClick={onSignIn}>Sign in</Button>
            )}
            {/* One action, stated plainly. "Get started" describes a signup; "Book now" names
                the thing the visitor actually came to do. */}
            <Button variant="primary" size="sm" onClick={onBook} iconRight="arrow-right">Book now</Button>
          </div>
        </div>
        {/* The menu sits inside the glass header so it inherits the rounded shell rather than
            floating as a second card. Max-height keeps it scrollable on a short landscape phone. */}
        {compact && open && (
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 4,
            padding: '4px clamp(12px, 2.4vw, 20px) 16px',
            maxHeight: 'calc(100vh - 140px)', overflowY: 'auto',
          }}>
            <span style={{ height: 1, background: 'var(--xoot-border-color)', margin: '0 0 10px' }} />
            {NAV_LINKS.map(l => (
              <a key={l.label} href={l.href}
                onClick={e => { setOpen(false); scrollToAnchor(e, l.href); }}
                style={{
                  display: 'flex', alignItems: 'center', minHeight: 48, padding: '0 14px',
                  borderRadius: 'var(--xoot-radius-sm)', textDecoration: 'none',
                  fontSize: 'var(--xoot-body)', fontWeight: 700, color: 'var(--xoot-text-primary)',
                }}>
                {l.member ? <MemberBadge size="sm" /> : l.label}
              </a>
            ))}
            <span style={{ height: 1, background: 'var(--xoot-border-color)', margin: '10px 0' }} />
            {user ? (
              <>
                <a href="./Xoot%20Bug%20Bounty.dc.html" onClick={() => setOpen(false)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, minHeight: 48, padding: '0 14px',
                    borderRadius: 'var(--xoot-radius-sm)', textDecoration: 'none',
                    fontSize: 'var(--xoot-body-sm)', fontWeight: 700, color: 'var(--xoot-text-secondary)',
                  }}>
                  <Icon name="shield-check" size={15} strokeWidth={2.1} />Bug bounty
                </a>
                <Button variant="outline" size="md" block onClick={() => { setOpen(false); onSignOut(); }}>
                  Sign out
                </Button>
              </>
            ) : (
              <Button variant="outline" size="md" block onClick={() => { setOpen(false); onSignIn(); }}>
                Sign in
              </Button>
            )}
          </div>
        )}
      </header>
      <div aria-hidden="true" style={{ height: 88 }} />
    </>
  );
}

/* The hero booking widget. It is a real first step, not a decoration — service, address and
   a CTA, exactly the three things the app's first screen asks for. Everything after that
   happens in the app, which is why date and status read as destinations rather than inputs. */
function BookingHero({ onBook, onPlan, onConcierge }) {
  const D = window.XootData;
  /* Matches the hero's own 420px track + gutters: below this the grid is one column, so the
     arrow and the tight photo crop stop making sense. */
  const heroStacked = useNarrow(920);
  /* A landscape phone has 390px of height. A 4:5 portrait photo there is taller than the whole
     viewport, so the hero becomes a scroll with nothing in it — the image gets capped instead. */
  const shallow = useLandscapeCompact();
  const [active, setActive] = React.useState('regular');
  const [address, setAddress] = React.useState('');
  const services = D.services.slice(0, 6);

  return (
    <section id="top" style={{ position: 'relative', overflow: 'hidden', background: 'var(--xoot-grad-dawn)' }}>
      <HeroBlooms />
      <div style={{
        position: 'relative', zIndex: 1,
        /* min(100%, 420px) is what makes this work on a phone: auto-fit alone would still
           demand 420px per track and overflow a 390px viewport. */
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))',
        gap: 'clamp(32px, 4.4vw, 56px)', alignItems: 'center',
        maxWidth: 1240, margin: '0 auto',
        padding: 'clamp(28px, 5vw, 64px) clamp(16px, 4vw, 40px) clamp(48px, 6vw, 88px)',
      }}>
        <div>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 22,
            padding: '7px 14px', borderRadius: 'var(--xoot-radius-pill)',
            background: 'var(--xoot-surface-card)', boxShadow: 'var(--xoot-shadow-1)',
            fontSize: 'var(--xoot-caption)', fontWeight: 700, color: 'var(--xoot-violet-700)',
          }}>
            <Icon name="sparkles" size={14} strokeWidth={2} />
            Launching in selected Johannesburg suburbs
          </span>

          {/* lineHeight 1.02 clipped descenders on "built on trust" — the y and the underline
              collided. 1.08 gives the phrase room, and violet-700 replaces 500: on white, 500
              measures 4.4:1, which technically clears AA-large but reads washed out at this
              weight, and it fought the highlight sitting behind it. */}
          {/* The flipping phrase runs at the headline's own size and inherits its colour and
              tracking — it is words changing, not a component sitting in a sentence. Line height
              goes to 1.14 because "Experience the difference" takes two lines at this size and
              1.08 was tuned for one. */}
          <h1 style={{ fontSize: 'clamp(34px, 6.4vw, 68px)', lineHeight: 1.14, letterSpacing: '-.02em', textWrap: 'pretty' }}>
            Premium home care,<br />
            <span style={{ color: 'var(--xoot-violet-700)' }}>
              <HeroWordFlip />
            </span>
          </h1>

          <p style={{
            marginTop: 20, maxWidth: 440, fontSize: 'var(--xoot-body-lg)',
            lineHeight: 1.55, color: 'var(--xoot-text-secondary)',
          }}>
            On-demand home services. Book vetted independent Xooters for homes, Airbnb
            turnovers, office workspaces, moving cleans and premium resets — Xoot confirms
            availability and dispatches, usually within a minute.
          </p>

          <Card pad="lg" radius="xl" style={{ marginTop: 30, boxShadow: 'var(--xoot-shadow-4)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 104px), 1fr))', gap: 8 }}>
              {services.map(s => {
                const on = active === s.key;
                return (
                  <button key={s.key} type="button" onClick={() => setActive(s.key)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                      minHeight: 48, padding: '8px 10px', border: 'none',
                      borderRadius: 'var(--xoot-radius-sm)', cursor: 'pointer',
                      background: on ? 'var(--xoot-action-primary)' : 'var(--xoot-surface-sunken)',
                      color: on ? 'var(--xoot-text-inverse)' : 'var(--xoot-text-secondary)',
                      fontFamily: 'var(--xoot-font-core)', fontSize: 'var(--xoot-body-sm)',
                      fontWeight: 700, lineHeight: 1.15, textAlign: 'center',
                      transition: 'all var(--xoot-dur-base) var(--xoot-ease-out)',
                    }}>
                    <Icon name={(XOOT_SERVICES[s.key] || {}).icon || 'sparkles'} size={16} strokeWidth={2} />
                    <span style={{ minWidth: 0 }}>{s.title}</span>
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 18 }}>
              <div style={{ padding: 14, borderRadius: 'var(--xoot-radius-sm)', background: 'var(--xoot-surface-page-alt)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 9 }}>
                  <span style={{ display: 'grid', placeItems: 'center', width: 34, height: 34, borderRadius: '50%', background: 'var(--xoot-violet-100)' }}>
                    <Icon name="map-pin" size={16} color="var(--xoot-violet-700)" strokeWidth={2} />
                  </span>
                  <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>Where</span>
                </div>
                <input value={address} onChange={e => setAddress(e.target.value)}
                  placeholder={active === 'office' ? 'Office address…' : 'Search address…'}
                  style={{
                    width: '100%', height: 44, padding: '0 14px', border: 'none',
                    borderRadius: 'var(--xoot-radius-xs)', background: 'var(--xoot-surface-card)',
                    boxShadow: 'inset 0 0 0 1px var(--xoot-border-color)', outline: 'none',
                    fontFamily: 'var(--xoot-font-core)', fontSize: 'var(--xoot-body)',
                    color: 'var(--xoot-text-primary)',
                  }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))', gap: 12 }}>
                {[['calendar', 'Date', 'Choose in booking'], ['clock', 'Status', 'Tracked in app']].map(([ic, label, val]) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: 14, borderRadius: 'var(--xoot-radius-sm)', background: 'var(--xoot-surface-page-alt)' }}>
                    <span style={{ display: 'grid', placeItems: 'center', width: 34, height: 34, flex: '0 0 auto', borderRadius: '50%', background: 'var(--xoot-sage-wash)' }}>
                      <Icon name={ic} size={16} color="var(--xoot-sage-ink)" strokeWidth={2} />
                    </span>
                    <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                      <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>{label}</span>
                      <span style={{ fontSize: 'var(--xoot-body-sm)', fontWeight: 600, marginTop: 2 }}>{val}</span>
                    </span>
                  </div>
                ))}
              </div>

              <Button variant="primary" size="lg" block iconRight="arrow-right" onClick={onBook}>Book now</Button>

              <HandNote rotate={-1.2} tape="mist" style={{ marginTop: 4 }}>
                you don't need to be home — we'll text before we arrive
              </HandNote>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: 10 }}>
                <Button variant="outline" size="sm" onClick={onConcierge}>Ask Concierge first</Button>
                <Button variant="outline" size="sm" onClick={onPlan}>Plan office or Airbnb cleaning</Button>
              </div>

              {/* Both entry paths together. A visitor from a phone ad wants the app; one from
                  search wants to book — burying either loses that visitor. */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 6 }}>
                <span style={{ fontSize: 'var(--xoot-caption)', fontWeight: 700, color: 'var(--xoot-text-secondary)', whiteSpace: 'nowrap' }}>
                  Or get the app
                </span>
                <span style={{ flex: 1, height: 1, background: 'var(--xoot-border-color)' }} />
              </div>
              <StoreBadges />

              <p style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)', textAlign: 'center', lineHeight: 1.5 }}>
                Active coverage includes Sandton, Bryanston, Rosebank, Midrand, Fourways and
                Waterfall. Other South African requests go to coverage review.
              </p>
            </div>
          </Card>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, marginTop: 24, fontSize: 'var(--xoot-body-sm)', color: 'var(--xoot-text-secondary)' }}>
            <span><strong style={{ color: 'var(--xoot-text-primary)' }}>Live roster</strong> of approved Xooters</span>
            <span><strong style={{ color: 'var(--xoot-text-primary)' }}>Accreditation-ready</strong> trust workflow</span>
          </div>
        </div>

        {/* The repo places a photograph here. No photography was supplied, so this composes
            from the brand's own parts instead of faking a stock image — swap in the real
            hero shot when it exists. */}
        <div style={{ position: 'relative' }}>
          {/* An arrow FROM the copy AT the photograph — the reference's move.

              It lives INSIDE this column, not as a sibling of it. As a sibling its offsetParent
              was the hero grid, so a negative left measured from the page edge and put most of
              the arrow off-canvas behind overflow:hidden. Anchored here, the same small offset
              reaches back across the 56px gutter and the head lands on the photo's corner. */}
          {!heroStacked && (
            <DoodleArrow direction="right" size={116} top={-34} left={-88} delay={420}
              colour="var(--xoot-careplus-500)" rotate={6} />
          )}

          {/* Tape at opposing corners, hanging onto the background — the effect only works if it
                overlaps the edge rather than sitting neatly inside it. */}
            <WashiTape colour="blush" seed={1} width={104} height={32} top={-12} left={-18} rotate={-22} />
            <WashiTape colour="honey" seed={2} width={98} height={30} bottom={-10} right={-16} rotate={-16} />
            <div style={{
            position: 'relative', aspectRatio: heroStacked ? '4 / 3.4' : '4 / 5',
            maxHeight: shallow ? '68vh' : 'none',
            borderRadius: 'clamp(22px, 3.4vw, 34px)', overflow: 'hidden',
            background: 'var(--xoot-grad-dusk)', boxShadow: 'var(--xoot-shadow-5)',
            display: 'grid', placeItems: 'center',
          }}>
            {/* Cropped tight and anchored high so the face holds at every breakpoint. The
                scale-up pushes the generator watermark out of frame at the bottom-right —
                see readme "What's still missing": this is a stand-in for a real shoot. */}
            <img
              src="./xoot/assets/marketing/xooter-female-polo.webp"
              alt="A Xooter in uniform outside a Johannesburg home"
              style={{
                position: 'absolute', inset: 0, width: '100%', height: '100%',
                objectFit: 'cover', objectPosition: '50% 12%',
                transform: 'scale(1.06)', transformOrigin: '50% 0%',
              }}
            />

            <div style={{ position: 'absolute', top: 22, left: 22, display: 'flex', alignItems: 'center', gap: 11, padding: '11px 15px', borderRadius: 'var(--xoot-radius-md)', background: 'var(--xoot-glass-light)', backdropFilter: 'blur(var(--xoot-glass-blur))', boxShadow: 'var(--xoot-shadow-glass)' }}>
              <Avatar name="Nomsa Dube" size="sm" badge="verified" />
              <span style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)' }}>Live Xooters</span>
                <span style={{ fontSize: 'var(--xoot-body-sm)', fontWeight: 700 }}>After verification</span>
              </span>
            </div>

            <div style={{ position: 'absolute', bottom: 22, left: 22, right: 22, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 16, borderRadius: 'var(--xoot-radius-md)', background: 'var(--xoot-glass-light)', backdropFilter: 'blur(var(--xoot-glass-blur))', boxShadow: 'var(--xoot-shadow-glass)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                <span style={{ display: 'grid', placeItems: 'center', width: 42, height: 42, flex: '0 0 auto', borderRadius: '50%', background: 'var(--xoot-violet-500)' }}>
                  <Icon name="house" size={20} color="#fff" strokeWidth={2} />
                </span>
                <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <span style={{ fontSize: 'var(--xoot-body-sm)', fontWeight: 700 }}>Arrival timeline</span>
                  <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-secondary)' }}>On the way, arrived, started, completed</span>
                </span>
              </span>
              <Badge tone="brand" size="sm">TRUST</Badge>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

Object.assign(window, { SiteNav, BookingHero });
})();

/* ═══ site/SiteBody.jsx ════════════════════════════════════════════════════════ */
(function(){
/* Xoot marketing site — the body sections.

   Every heading, sub-line and card description below is the repo's own copy (TrustedBy,
   Services, SafetyTrust, NearbyWorkers, HowItWorks), with Zoot→Xoot naming applied. Where
   the repo's service list and the locked catalogue disagree, the catalogue wins — see the
   note above SERVICE_CARDS. */
const {
  Button, Icon, Card, Badge, ServiceIcon, XOOT_SERVICES, Avatar, Rating, MemberBadge,
  WashiTape, Squiggled, DoodleArrow, TapedFrame, HandNote,
  XootCharacter, ScrollReveal,
} = window.XootNS;

/* Shared section furniture. Public pages get a much looser rhythm than the app.

   Every section reveals on scroll, done HERE rather than by wrapping each call site: fifteen
   paired <ScrollReveal> tags is fifteen chances to leave one unbalanced, and a section that
   forgot its wrapper is invisible rather than merely unanimated.

   Reveal is at SECTION level, not per element. Revealing every card individually turns a page
   into a slot machine — content arriving one tile at a time reads as a loading state, where a
   whole section arriving reads as a thought landing.

   `reveal={false}` opts out for the hero, which is above the fold and must never fade in. */
function Section({ id, children, tone = 'page', reveal = true, style = {} }) {
  const grounds = {
    page: 'var(--xoot-surface-page)',
    alt: 'var(--xoot-surface-page-alt)',
    card: 'var(--xoot-surface-card)',
  };

  /* One gutter rule for the whole page: 16px on a phone, 40px from ~1000px up. Sections used
     to hard-code 40px, which left a 390px viewport with 310px of usable width. */
  const inner = <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 clamp(16px, 4vw, 40px)' }}>{children}</div>;
  return (
    <section id={id} style={{
      padding: 'clamp(52px, 7.5vw, 96px) 0', background: grounds[tone],
      /* Clears the fixed header (12px offset + 64px bar) plus breathing room, so an anchor
         jump lands on the section's eyebrow rather than behind the glass. */
      scrollMarginTop: 96,

      /* ── The perf fix, in two properties ────────────────────────────────
         `content-visibility: auto` tells the browser to skip layout, paint and compositing
         for this section entirely while it is outside the viewport. On an 18-section page
         that is most of the work on the page, and it is the single largest win available
         here — it also stops the ambient animations inside from being composited, which is
         what my previous attempt spent 18 IntersectionObservers and an `!important` rule
         achieving less thoroughly. Replacing that machinery with the platform feature built
         for it is both faster and ~30 fewer lines.

         `contain-intrinsic-size` is not optional alongside it. Without a size hint a skipped
         section measures 0 tall, so the scrollbar leaps as sections render and anchor jumps
         land in the wrong place. 900px is a deliberate over-estimate of the typical section:
         640px is the measured median section content (~830px with padding), not a
         round guess: at 900px, 15 of 18 sections sat at the placeholder and the document
         over-estimated its own height by 22%, which threw first-load anchor jumps up to
         1561px — nearly three viewports — off target.

         The estimate can never be right for a 376px section and a 1454px one simultaneously,
         so SiteNav also scrolls twice (see the note there). The `auto` keyword makes the
         browser remember real sizes after first render, so this only ever matters once. */
      contentVisibility: 'auto',
      containIntrinsicSize: 'auto 640px',
      ...style,
    }}>
      {reveal ? <ScrollReveal>{inner}</ScrollReveal> : inner}
    </section>
  );
}

/* `squiggle` is a substring of `title` to underline by hand. Taking a substring rather than a
   boolean keeps the choice of emphasis at the call site, where the person writing the sentence
   knows which phrase carries it — a rule that always hits the last three words underlines
   whatever happens to be there. */
function SectionHead({ eyebrow, title, sub, squiggle, tone = 'violet', align = 'left', maxWidth = 640 }) {
  const eyebrowColor = tone === 'sage' ? 'var(--xoot-sage-ink)' : 'var(--xoot-violet-700)';

  /* Split the title around the squiggled phrase. If it isn't found, the title renders plain
     rather than throwing — a typo in the prop should cost the underline, not the heading. */
  let head = title, mark = null, tail = null;
  if (squiggle && typeof title === 'string') {
    const i = title.indexOf(squiggle);
    if (i > -1) {
      head = title.slice(0, i);
      mark = squiggle;
      tail = title.slice(i + squiggle.length);
    }
  }

  return (
    <div style={{ maxWidth, marginBottom: 52, textAlign: align, marginInline: align === 'center' ? 'auto' : undefined }}>
      {eyebrow && <p className="xoot-label" style={{ color: eyebrowColor, marginBottom: 14 }}>{eyebrow}</p>}
      <h2 style={{ fontSize: 'clamp(32px, 3.4vw, 46px)', lineHeight: 1.14, letterSpacing: '-.018em' }}>
        {head}
        {mark && <Squiggled colour="var(--xoot-careplus-500)" offset={-2}>{mark}</Squiggled>}
        {tail}
      </h2>
      {sub && <p style={{ marginTop: 16, fontSize: 'var(--xoot-body-lg)', lineHeight: 1.55, color: 'var(--xoot-text-secondary)' }}>{sub}</p>}
    </div>
  );
}

/* An arrow in the gap between two stacked sections, pointing into the next one. Centred and
   pulled below the section's own padding so it sits in the whitespace rather than crowding the
   last row of content. */
function GapArrow({ offset = 0, colour = 'var(--xoot-careplus-500)', rotate = 0, size = 78 }) {
  return (
    <div aria-hidden="true" style={{ position: 'relative', height: 0 }}>
      <DoodleArrow
        direction="down" size={size} colour={colour} rotate={rotate} delay={260}
        top={offset} left="50%" style={{ marginLeft: -size * 0.28 }}
      />
    </div>
  );
}

/* ── Trusted by ─────────────────────────────────────────────────────────── */
const OPERATORS = [
  ['building-2', 'Property managers'],
  ['key', 'Estate agents'],
  ['bed-double', 'Airbnb hosts'],
  ['shield-check', 'Office admins'],
  ['house', 'Landlords'],
];

const LAUNCH_AREAS = ['Sandton', 'Bryanston', 'Rosebank', 'Midrand', 'Fourways', 'Waterfall', 'Hyde Park', 'Parkhurst'];

function TrustedBy() {
  return (
    <section style={{ padding: 'clamp(36px, 5vw, 56px) 0', background: 'var(--xoot-surface-card)', boxShadow: 'inset 0 1px 0 var(--xoot-border-color), inset 0 -1px 0 var(--xoot-border-color)' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 clamp(16px, 4vw, 40px)' }}>
        <div style={{ maxWidth: 680, margin: '0 auto 30px', textAlign: 'center' }}>
          <p className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>Built for real Johannesburg operating workflows</p>
          <p style={{ marginTop: 13, fontSize: 'var(--xoot-body-sm)', lineHeight: 1.6, color: 'var(--xoot-text-secondary)' }}>
            Built around the real operating needs of teams and households that need cleaner
            handovers, protected access notes, repeatable quality, and accountable support.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))', gap: 12 }}>
          {OPERATORS.map(([ic, label]) => (
            <div key={label} style={{ padding: '18px 14px', textAlign: 'center', borderRadius: 'var(--xoot-radius-lg)', background: 'var(--xoot-surface-page-alt)' }}>
              <Icon name={ic} size={20} color="var(--xoot-violet-500)" strokeWidth={1.9} style={{ marginBottom: 10 }} />
              <p style={{ fontFamily: 'var(--xoot-font-display)', fontSize: 'var(--xoot-title-3)', fontWeight: 500 }}>{label}</p>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '8px 22px', marginTop: 30 }}>
          <Icon name="map-pin" size={15} color="var(--xoot-violet-500)" strokeWidth={2} />
          {LAUNCH_AREAS.map(a => (
            <span key={a} style={{ fontSize: 'var(--xoot-body-sm)', fontWeight: 700, color: 'var(--xoot-text-secondary)' }}>{a}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Services ───────────────────────────────────────────────────────────── */
/* The repo site still lists Residential / Deep clean; the locked catalogue supersedes it.
   Descriptions are the repo's, re-pointed at the catalogue's names. */
const SERVICE_CARDS = [
  { key: 'regular', title: 'Regular cleaning', desc: 'Weekly tidies, fortnightly deep cleans, and one-off resets.' },
  { key: 'express', title: 'Express cleaning', desc: 'Focused resets for smaller spaces and tighter windows.' },
  { key: 'office', title: 'Office & commercial', desc: 'Office, estate and small commercial cleans with admin follow-up.' },
  { key: 'airbnb', title: 'Airbnb turnovers', desc: 'Turnovers with host notes, readiness checks and photo proof.' },
  { key: 'moving', title: 'Moving cleans', desc: 'Move-in and move-out cleans with before-and-after proof.' },
  { key: 'laundry', title: 'Laundry & ironing', desc: 'Washed, dried and pressed — folded the way you like it.' },
];

function Services({ onBook }) {
  return (
    <Section id="services">
      <SectionHead
        eyebrow="What we clean"
        title="Specialists in cleaning the spaces you live, host and work in."
        squiggle="live, host and work in"
        sub="Homes, offices and Airbnbs in the current Xoot launch area, with vetting, ratings, arrival tracking and completion proof where required."
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 264px), 1fr))', gap: 18 }}>
        {SERVICE_CARDS.map((s, i) => (
          <Card key={s.key} interactive pad="lg" radius="lg" tone="flat"
            style={{ position: 'relative', overflow: 'visible', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Alternating corner so a row of cards doesn't read as a repeating pattern —
                hand-placed tape lands differently every time. */}
            <WashiTape
              colour={['blush', 'mist', 'honey', 'sage', 'petal', 'lilac'][i % 6]}
              seed={i} width={88} height={28}
              top={-11} {...(i % 2 ? { right: -14 } : { left: -14 })}
              rotate={i % 2 ? 18 : -19}
            />
            <ServiceIcon service={s.key} size={52} delay={i * 70} />
            <div>
              <h3 style={{ fontSize: 'var(--xoot-title-2)', fontWeight: 500, marginBottom: 5 }}>{s.title}</h3>
              <p style={{ fontSize: 'var(--xoot-body-sm)', lineHeight: 1.55, color: 'var(--xoot-text-secondary)' }}>{s.desc}</p>
            </div>
          </Card>
        ))}
        {/* ── Xoot Lux ──────────────────────────────────────────────────────
            Was a honey-tinted card at 72% opacity, which is how you signal "disabled", not
            "premium" — the aspirational tier looked like the one that had failed to load. It is
            now the only black surface in the grid: full opacity, its own palette, and a single
            champagne rule. Not-yet-available is said in words instead.

            Deliberately no WashiTape. The tape is the brand's warm, handmade register and it is
            the right voice for the other six cards; on Lux it undoes the restraint that is the
            entire point of the tier. */}
        <Card pad="lg" radius="lg" tone="flat"
          style={{
            position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 16,
            background: 'var(--xoot-lux-surface)', boxShadow: 'var(--xoot-lux-shadow)',
            border: '1px solid var(--xoot-lux-hairline)',
          }}>
          {/* The champagne rule, hairline, along the top edge. One accent, used once. */}
          <span style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'var(--xoot-lux-metal-line)' }} />
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            {/* Not ServiceIcon. That component renders a tinted pastel tile with a breathing
                blob behind it — exactly right for the six warm cards, and wrong here: a bright
                amber tile on black is the one thing that would break the restraint. A hairline
                square with the glyph in champagne is the same information, quieter. */}
            <span style={{
              display: 'grid', placeItems: 'center', width: 52, height: 52,
              borderRadius: 'var(--xoot-radius-key)',
              background: 'var(--xoot-lux-raise)',
              border: '1px solid var(--xoot-lux-hairline)',
            }}>
              <Icon name="sparkles" size={24} strokeWidth={1.6} color="var(--xoot-lux-metal)" />
            </span>
            <span className="xoot-lux-label">Xoot Lux</span>
          </div>
          <div>
            <h3 style={{
              fontFamily: 'var(--xoot-font-display)', fontSize: 'var(--xoot-title-1)', fontWeight: 400,
              lineHeight: 1.14, color: 'var(--xoot-lux-ink)', marginBottom: 8,
            }}>
              The standard, held higher
            </h3>
            <p style={{ fontSize: 'var(--xoot-body-sm)', lineHeight: 1.6, color: 'var(--xoot-lux-ink-soft)' }}>
              Our most experienced Xooters, our own supplies, and a specification written for
              high-attention homes — art, antiques, delicate textiles, and the resets that have to
              be right the first time.
            </p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 'auto' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 13px',
              borderRadius: 'var(--xoot-radius-pill)',
              background: 'var(--xoot-lux-metal-soft)',
              border: '1px solid rgba(201,176,138,.34)',
            }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '.06em', color: 'var(--xoot-lux-metal)' }}>
                By invitation · opening 2027
              </span>
            </span>
          </div>
        </Card>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 44 }}>
        <Button variant="primary" size="lg" onClick={onBook}>Book a clean</Button>
        {/* Not a product yet. Shown rather than hidden because the demand is real and worth
            signalling, but visibly not-yet rather than as a peer of the working CTA. */}
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 9, height: 56, padding: '0 24px',
          borderRadius: 'var(--xoot-radius-pill)', background: 'var(--xoot-surface-sunken)',
          color: 'var(--xoot-text-muted)', fontFamily: 'var(--xoot-font-core)',
          fontSize: 'var(--xoot-body-lg)', fontWeight: 700, cursor: 'default',
        }}>
          Find full-time help
          <span className="xoot-label" style={{
            padding: '5px 9px', borderRadius: 'var(--xoot-radius-pill)',
            background: 'var(--xoot-honey-wash)', color: 'var(--xoot-honey-ink)',
          }}>Coming soon</span>
        </span>
      </div>
    </Section>
  );
}

/* ── Safety & trust ─────────────────────────────────────────────────────── */
const TRUST_ITEMS = [
  ['star', 'Visible quality signals', 'Profiles show ratings, reliability score, completion rate, repeat-client count and trust badges.'],
  ['search', 'Admin-reviewed vetting', 'ID, selfie, proof of address, bank, references and accredited-provider screening status are reviewed before activation.'],
  ['briefcase', 'Training gate', 'Required onboarding covers etiquette, client interaction, luxury-home expectations, pets, fragile items and punctuality.'],
  ['shield-check', 'Incident system', 'Lateness, poor quality, damages, suspicious behaviour and escalations are routed into trust review queues.'],
];

function SafetyTrust() {
  return (
    <Section id="safety" tone="alt">
      <SectionHead
        eyebrow="Safety & security"
        tone="sage"
        title="Trust is built into the workflow, not added as decoration."
        sub="Xoot combines vetting, training, reliability scoring, arrival tracking and admin review queues to protect marketplace quality."
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 218px), 1fr))', gap: 16 }}>
        {TRUST_ITEMS.map(([ic, title, desc]) => (
          <Card key={title} pad="lg" radius="lg" style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            <span style={{ display: 'grid', placeItems: 'center', width: 46, height: 46, borderRadius: 'var(--xoot-radius-key)', background: 'var(--xoot-sage-wash)' }}>
              <Icon name={ic} size={21} color="var(--xoot-sage-ink)" strokeWidth={1.9} />
            </span>
            <div>
              <h3 style={{ fontSize: 'var(--xoot-title-3)', fontWeight: 500, marginBottom: 5 }}>{title}</h3>
              <p style={{ fontSize: 'var(--xoot-body-sm)', lineHeight: 1.55, color: 'var(--xoot-text-secondary)' }}>{desc}</p>
            </div>
          </Card>
        ))}
      </div>
      {/* XootCover is embedded rather than sold, so it belongs with trust, not pricing. */}
      <Card pad="lg" radius="lg" tone="flat" style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 18 }}>
        <Icon name="shield-check" size={22} color="var(--xoot-violet-500)" strokeWidth={1.9} />
        <p style={{ fontSize: 'var(--xoot-body)', color: 'var(--xoot-text-secondary)' }}>
          <strong style={{ color: 'var(--xoot-text-primary)' }}>XootCover is included on every visit</strong>
          {' '}— not an add-on, and not something you have to remember to tick.
        </p>
      </Card>
    </Section>
  );
}

/* ── Nearby Xooters ─────────────────────────────────────────────────────── */
function NearbyXooters() {
  const D = window.XootData;
  return (
    <Section id="workers">
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, marginBottom: 44 }}>
        <div style={{ maxWidth: 560 }}>
          <p className="xoot-label" style={{ color: 'var(--xoot-sage-ink)', marginBottom: 14 }}>Nearby Xooters</p>
          <h2 style={{ fontSize: 'clamp(32px, 3.4vw, 46px)', lineHeight: 1.08, letterSpacing: '-.018em' }}>
            Approved Xooters appear here when they are live in your launch area.
          </h2>
        </div>
        <Button variant="outline">View all Xooters</Button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 272px), 1fr))', gap: 18 }}>
        {D.pros.map(x => (
          <Card key={x.name} pad="lg" radius="lg" interactive style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 11, textAlign: 'center' }}>
            <Avatar name={x.name} size="xl" badge="verified" />
            <div>
              <h3 style={{ fontSize: 'var(--xoot-title-3)', fontWeight: 500 }}>{x.name}</h3>
              <p style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)', marginTop: 2 }}>{x.suburb}</p>
            </div>
            <Rating value={x.rating} count={x.reviews} size={14} />
            <p style={{ fontSize: 'var(--xoot-body-sm)', color: 'var(--xoot-text-secondary)', lineHeight: 1.5 }}>{x.tagline}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, justifyContent: 'center' }}>
              {(x.badges || []).slice(0, 2).map(b => <Badge key={b} tone="success" size="sm">{b}</Badge>)}
            </div>
          </Card>
        ))}
      </div>
      <p style={{ marginTop: 22, fontSize: 'var(--xoot-body-sm)', color: 'var(--xoot-text-muted)', textAlign: 'center' }}>
        Profiles appear only after admin-reviewed verification, training and activation.
      </p>
    </Section>
  );
}

/* ── How it works ───────────────────────────────────────────────────────── */
const STEPS = [
  ['01', 'search', 'Tell us about the place', 'Service, address, how long, and anything a Xooter should know before they arrive. About a minute.'],
  ['02', 'badge-check', 'Pick a Xooter, or let us', 'Every Xooter is background-checked and rated after each visit. "Any of them is fine" is a real answer.'],
  ['03', 'sparkles', 'Track and review', 'Follow the arrival timeline, keep messages on-platform, upload proof where required, and rate the job.'],
];

const STEP_CAST = [
  { scene: 'customer', garment: 'violet' },
  { scene: 'xooter', garment: 'sage' },
  { scene: 'pair', garment: 'blush' },
  { scene: 'host', garment: 'honey' },
];

function HowItWorks() {
  const howStacked = useNarrow(880);
  return (
    <Section id="how" tone="alt">
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))',
        gap: 'clamp(28px, 5vw, 72px)', alignItems: 'start',
      }}>
        {/* Sticky only while the copy sits BESIDE the steps. Stacked, it would pin the heading
            over the list as the steps scrolled past underneath it. */}
        <div style={{ position: howStacked ? 'static' : 'sticky', top: 110 }}>
          <SectionHead
            eyebrow="How Xoot works"
            title="Book with the details that protect quality."
            squiggle="protect quality"
            sub="Xoot keeps service details, household preferences, payment status, contractor updates and support follow-ups in one place."
            maxWidth={440}
          />
        </div>
        <ol style={{ display: 'flex', flexDirection: 'column', gap: 16, margin: 0, padding: 0, listStyle: 'none' }}>
          {STEPS.map(([n, ic, title, desc], i) => (
            <li key={n}>
             <ScrollReveal delay={i * 90}>
              <Card pad="lg" radius="lg" style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                <span style={{ display: 'grid', placeItems: 'center', width: 54, height: 54, flex: '0 0 auto', borderRadius: 'var(--xoot-radius-key)', background: 'var(--xoot-violet-500)' }}>
                  <Icon name={ic} size={23} color="#fff" strokeWidth={2} />
                </span>
                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 6 }}>
                    <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>{n}</span>
                    <h3 style={{ fontSize: 'var(--xoot-title-1)', fontWeight: 500 }}>{title}</h3>
                  </div>
                  <p style={{ fontSize: 'var(--xoot-body)', lineHeight: 1.55, color: 'var(--xoot-text-secondary)' }}>{desc}</p>
                </div>
                {STEP_CAST[i] && !howStacked && (
                  <XootCharacter
                    scene={STEP_CAST[i].scene} garment={STEP_CAST[i].garment}
                    castIndex={i + 1} size={92} delay={i * 400}
                    style={{ flex: '0 0 auto', alignSelf: 'flex-end', marginBottom: -22 }}
                  />
                )}
              </Card>
             </ScrollReveal>
            </li>
          ))}
        </ol>
      </div>
    </Section>
  );
}

/* ── The people band ─────────────────────────────────────────────────────
   Sits after the safety section on purpose: that one makes the rational case (vetted, insured,
   cover included), and this answers the emotional half of the same question — who actually
   walks through the door. Characters rather than stock photography, and honestly so. */
const PEOPLE = [
  { scene: 'xooter',   garment: 'sage',   title: 'Vetted Xooters',      body: 'ID-checked, reference-checked, and rated after every visit.' },
  { scene: 'customer', garment: 'violet', title: 'You, doing nothing',  body: "We'll tell you when they're on the way. You don't need to watch the app." },
  { scene: 'host',     garment: 'honey',  title: 'Guest-ready, on time', body: 'Turnovers timed to your checkout, so the next guest walks into a clean place.' },
  { scene: 'pair',     garment: 'blush',  title: 'Someone to talk to',  body: 'Chat and call in the app. A real person answers when it matters.' },
];

function PeopleBand() {
  return (
    <Section>
      <SectionHead
        eyebrow="Who turns up"
        title="Real people, checked properly."
        squiggle="checked properly"
        sub="Every Xooter is vetted before their first visit and rated after every one."
        align="center" maxWidth={560}
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 230px), 1fr))', gap: 20, marginTop: 52 }}>
        {PEOPLE.map((p, i) => (
          <ScrollReveal key={p.title} delay={i * 90}>
            <Card pad="lg" radius="lg" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center', height: '100%' }}>
              <XootCharacter scene={p.scene} garment={p.garment} castIndex={i} size={132} delay={i * 400} />
              <h3 style={{ fontSize: 'var(--xoot-title-2)', fontWeight: 500 }}>{p.title}</h3>
              <p style={{ fontSize: 'var(--xoot-body)', lineHeight: 1.55, color: 'var(--xoot-text-secondary)' }}>{p.body}</p>
            </Card>
          </ScrollReveal>
        ))}
      </div>
    </Section>
  );
}

Object.assign(window, { Section, SectionHead, GapArrow, TrustedBy, Services, SafetyTrust, NearbyXooters, HowItWorks, PeopleBand });
})();

/* ═══ site/SiteGift.jsx ════════════════════════════════════════════════════════ */
(function(){
/* ── Gift a clean — section two ────────────────────────────────────────────────
 *
 * Built as a near-twin of the hero: same grid, same track floor, same badge → headline →
 * paragraph → card rhythm. It sits immediately below the hero because gifting is the second thing
 * this business sells.
 *
 * PRICES COME FROM THE PRICING SERVICE. `XootQuote.giftQuote` is the same resolver the app's gift
 * flow uses, so the figure here is the figure charged.
 *
 * GIFTING IS NOT A DISCOUNT CODE, AND THE COPY SAYS SO SPECIFICALLY.
 * The mechanic is unusual enough that describing it generically loses the sale:
 *   · the sender pays in full, up front, including the recipient's booking fee
 *   · the recipient is never asked for a card, a code, or a minimum spend
 *   · credit lands in the recipient's account, not against a single fixed date
 *   · the recipient chooses the day, the service and the Xooter themselves
 *   · unused credit never expires, and is refundable to the SENDER until it is booked
 * Every one of those is a question people ask before buying, so each is answered on the page
 * rather than in a help article.
 *
 * NO BOOKING MODAL. A sender who has already chosen the bundle and the service has made every
 * decision gifting needs — a five-stage booking flow asking for THEIR address and THEIR date is
 * asking the wrong person about the wrong visit. The button goes straight to recipient + pay.
 */
const {
  Card, Button, Icon, Badge, GiftCard, Input, RadioGroup, HandNote,
} = window.XootNS;

/* Each occasion carries its own card wording. A single generic "Enjoy the quiet." under four
   different buttons makes the buttons decorative — the sender picks an occasion and nothing
   changes, which reads as a control that does not work. */
const GIFT_OCCASIONS = [
  {
    label: "Mother's Day", tint: 'petal',
    title: 'Happy Mother\'s Day',
    note: 'You have cleaned up after all of us for long enough.',
    hint: 'The most-gifted day of the year on Xoot. Book the bundle, not the single — nobody wants one afternoon off.',
  },
  {
    label: 'A new baby', tint: 'mist',
    title: 'Congratulations',
    note: 'One less thing. Sleep instead.',
    hint: 'Four visits is the useful gift here: the help is needed in week six, not week one.',
  },
  {
    label: 'Moving in', tint: 'honey',
    title: 'Welcome home',
    note: 'Start in a place that is already clean.',
    hint: 'Send a moving clean and they can use it on either end — the old place or the new one.',
  },
  {
    label: 'Just because', tint: 'sage',
    title: 'No occasion',
    note: 'Go and sit down. It is handled.',
    hint: 'No date attached, no reason given. It waits in their account until the week they need it.',
  },
];

const GIFT_BUNDLES = [
  { count: 1, label: 'One clean', detail: 'A single visit, whenever they need it' },
  { count: 4, label: 'A month of Fridays', detail: 'Four visits — the one people keep' },
  { count: 12, label: 'A season', detail: 'Twelve visits, used at their own pace' },
];

/* Specific to gifting, in the order the sender experiences it. */
const GIFT_STEPS = [
  ['credit-card', 'You pay once, now',
    'The full amount including their booking fee. Nothing is charged to them later, and there is no gifting markup — it is exactly what these cleans cost to book yourself.'],
  ['message-circle', 'They get a card, not a code',
    'By email or a link you send yourself. No app download to open it, no voucher number to type in, no minimum spend attached.'],
  ['calendar-check', 'They pick the day and the Xooter',
    'The credit sits in their account. They choose the date, the service and who comes — you are not booking a visit on their behalf.'],
  ['repeat', 'Unused credit comes back to you',
    'It never expires. Until they book the first visit, you can ask for it back in full.'],
];

function GiftClean({ onGift }) {
  const D = window.XootData;
  const Q = window.XootQuote;
  const stacked = useNarrow(920);
  const shallow = useLandscapeCompact();

  const [count, setCount] = React.useState(4);
  const [service, setService] = React.useState('regular');
  const [occasion, setOccasion] = React.useState(0);
  const [how, setHow] = React.useState(false);

  const { quote, pending } = Q.useGiftQuote(
    React.useMemo(() => ({ service, count }), [service, count])
  );

  const occ = GIFT_OCCASIONS[occasion];

  return (
    <section id="gift" style={{ position: 'relative', overflow: 'hidden', background: 'var(--xoot-grad-dusk)' }}>
      <div style={{
        position: 'relative', zIndex: 1,
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))',
        gap: 'clamp(32px, 4.4vw, 56px)', alignItems: 'center',
        maxWidth: 1240, margin: '0 auto',
        padding: 'clamp(40px, 5vw, 76px) clamp(16px, 4vw, 40px) clamp(48px, 6vw, 88px)',
      }}>
        <div>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 22,
            padding: '7px 14px', borderRadius: 'var(--xoot-radius-pill)',
            background: 'var(--xoot-surface-card)', boxShadow: 'var(--xoot-shadow-1)',
            fontSize: 'var(--xoot-caption)', fontWeight: 700, color: 'var(--xoot-petal-ink)',
          }}>
            <Icon name="gift" size={14} strokeWidth={2} />
            Gift a clean
          </span>

          <h2 style={{ fontSize: 'clamp(32px, 5.6vw, 60px)', lineHeight: 1.1, letterSpacing: '-.02em', textWrap: 'pretty' }}>
            Give someone their<br />
            <span style={{ color: 'var(--xoot-petal-ink)' }}>weekend back.</span>
          </h2>

          <p style={{
            marginTop: 20, maxWidth: 470, fontSize: 'var(--xoot-body-lg)',
            lineHeight: 1.55, color: 'var(--xoot-text-secondary)', textWrap: 'pretty',
          }}>
            You pay once, now — including their booking fee. They get a card, choose their own day
            and their own Xooter, and are never asked for a card at the door. Unused credit comes
            back to you.
          </p>

          <Card pad="lg" radius="xl" style={{ marginTop: 30, boxShadow: 'var(--xoot-shadow-4)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>How many visits</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 132px), 1fr))', gap: 8 }}>
                  {GIFT_BUNDLES.map(b => {
                    const on = count === b.count;
                    return (
                      <button key={b.count} type="button" onClick={() => setCount(b.count)}
                        style={{
                          display: 'flex', flexDirection: 'column', gap: 3, minHeight: 68,
                          padding: '11px 13px', border: 'none', cursor: 'pointer', textAlign: 'left',
                          borderRadius: 'var(--xoot-radius-sm)',
                          background: on ? 'var(--xoot-action-primary)' : 'var(--xoot-surface-sunken)',
                          color: on ? 'var(--xoot-text-inverse)' : 'var(--xoot-text-secondary)',
                          fontFamily: 'var(--xoot-font-core)',
                          transition: 'all var(--xoot-dur-base) var(--xoot-ease-out)',
                        }}>
                        <span style={{ fontSize: 'var(--xoot-body-sm)', fontWeight: 700, lineHeight: 1.2 }}>{b.label}</span>
                        <span style={{ fontSize: 'var(--xoot-caption)', lineHeight: 1.35, opacity: on ? .78 : 1 }}>{b.detail}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>What kind of visit</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 104px), 1fr))', gap: 8 }}>
                  {D.services.filter(s => s.from != null).slice(0, 4).map(s => {
                    const on = service === s.key;
                    return (
                      <button key={s.key} type="button" onClick={() => setService(s.key)}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                          minHeight: 48, padding: '8px 10px', border: 'none', cursor: 'pointer',
                          borderRadius: 'var(--xoot-radius-sm)',
                          background: on ? 'var(--xoot-action-brand-soft)' : 'var(--xoot-surface-sunken)',
                          color: on ? 'var(--xoot-violet-800)' : 'var(--xoot-text-secondary)',
                          boxShadow: on ? 'inset 0 0 0 1.5px var(--xoot-violet-400)' : 'none',
                          fontFamily: 'var(--xoot-font-core)', fontSize: 'var(--xoot-body-sm)',
                          fontWeight: 700, lineHeight: 1.15, textAlign: 'center',
                          transition: 'all var(--xoot-dur-base) var(--xoot-ease-out)',
                        }}>
                        <span style={{ minWidth: 0 }}>{s.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{
                display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between',
                gap: 10, padding: '15px 17px', borderRadius: 'var(--xoot-radius-sm)',
                background: 'var(--xoot-surface-page-alt)',
              }}>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span style={{ fontSize: 'var(--xoot-body-sm)', fontWeight: 700 }}>
                    {count} {count === 1 ? 'visit' : 'visits'} · {quote.unitLabel}
                  </span>
                  <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)', lineHeight: 1.4 }}>
                    {D.rand(quote.perVisit)} a visit, their booking fee included
                  </span>
                </span>
                <span style={{
                  fontFamily: 'var(--xoot-font-display)', fontSize: 'clamp(26px, 3vw, 34px)',
                  lineHeight: 1, letterSpacing: '-.018em',
                  opacity: pending ? .45 : 1,
                  transition: 'opacity var(--xoot-dur-fast) var(--xoot-ease-out)',
                }}>{D.rand(quote.total)}</span>
              </div>

              {/* Straight to recipient + pay. The bundle, the service and the occasion are already
                  chosen; the only thing left is who it goes to. */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                <Button variant="primary" size="lg" icon="gift"
                  onClick={() => onGift && onGift({ service, count, occasion, quote })}
                  style={{ flex: '1 1 200px' }}>
                  Send this gift
                </Button>
                <Button variant="outline" size="lg" onClick={() => setHow(v => !v)} style={{ flex: '0 1 auto' }}>
                  {how ? 'Hide the detail' : 'How gifting works'}
                </Button>
              </div>

              {how && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 13, paddingTop: 4 }}>
                  {GIFT_STEPS.map(([ic, title, body], i) => (
                    <div key={title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <span style={{
                        display: 'grid', placeItems: 'center', flex: '0 0 auto',
                        width: 32, height: 32, borderRadius: 'var(--xoot-radius-xs)',
                        background: 'var(--xoot-petal-wash)',
                      }}>
                        <Icon name={ic} size={15} strokeWidth={2} color="var(--xoot-petal-ink)" />
                      </span>
                      <span style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                        <span style={{ fontSize: 'var(--xoot-body-sm)', fontWeight: 700 }}>{i + 1}. {title}</span>
                        <span style={{ fontSize: 'var(--xoot-caption)', lineHeight: 1.5, color: 'var(--xoot-text-secondary)' }}>{body}</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)', lineHeight: 1.5 }}>
                {quote.note}
              </span>
            </div>
          </Card>
        </div>

        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
          maxHeight: shallow ? '74vh' : 'none',
        }}>
          <div style={{ position: 'relative', transform: stacked ? 'none' : 'rotate(-2deg)' }}>
            <GiftCard
              tint={occ.tint}
              title={occ.title}
              note={occ.note}
              from="Nadia"
              amount={quote.total}
              width={stacked ? 280 : 340}
              height={stacked ? 230 : 280}
            />
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 400 }}>
            {GIFT_OCCASIONS.map((o, i) => {
              const on = occasion === i;
              return (
                <button key={o.label} type="button" onClick={() => setOccasion(i)}
                  style={{
                    minHeight: 44, padding: '10px 15px', border: 'none', cursor: 'pointer',
                    borderRadius: 'var(--xoot-radius-pill)',
                    background: on ? 'var(--xoot-surface-card)' : 'rgba(255,255,255,.5)',
                    boxShadow: on ? 'var(--xoot-shadow-2)' : 'none',
                    fontFamily: 'var(--xoot-font-core)', fontSize: 'var(--xoot-body-sm)',
                    fontWeight: on ? 700 : 600,
                    color: on ? 'var(--xoot-text-primary)' : 'var(--xoot-text-secondary)',
                    transition: 'all var(--xoot-dur-base) var(--xoot-ease-out)',
                  }}>{o.label}</button>
              );
            })}
          </div>

          {/* The advice changes with the occasion too — it is the part a sender actually wants. */}
          <HandNote tape={occ.tint === 'sage' ? 'sage' : 'petal'} rotate={1.4} style={{ maxWidth: 330 }}>
            {occ.hint}
          </HandNote>
        </div>
      </div>
    </section>
  );
}

/* ── Gift checkout ────────────────────────────────────────────────────────────
 *
 * Two steps, and neither of them asks the sender for an address or a date, because neither belongs
 * to the sender. A signed-in sender skips straight to paying — their name and email are already
 * known, so re-asking is the redundancy this replaces.
 */
function GiftCheckout({ open, gift, user, onClose, onDone }) {
  const D = window.XootData;
  const Q = window.XootQuote;
  const [stage, setStage] = React.useState(0);
  const [via, setVia] = React.useState('email');
  const [to, setTo] = React.useState({ name: '', email: '' });
  const [message, setMessage] = React.useState('');
  const [paid, setPaid] = React.useState(false);

  React.useEffect(() => {
    if (open) { setStage(0); setPaid(false); setTo({ name: '', email: '' }); setMessage(''); }
  }, [open]);

  if (!open || !gift) return null;

  const occ = GIFT_OCCASIONS[gift.occasion] || GIFT_OCCASIONS[0];
  const quote = Q.giftQuote({ service: gift.service, count: gift.count });
  const canSend = via === 'link' || (to.name.trim() && /\S+@\S+\.\S+/.test(to.email));

  return (
    <div role="dialog" aria-modal="true" aria-label="Send a gift"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 240, display: 'grid', placeItems: 'start center',
        padding: 'clamp(12px, 4vw, 40px)', background: 'rgba(20,18,16,.5)', overflowY: 'auto',
      }}>
      <div style={{
        width: '100%', maxWidth: 620, borderRadius: 'var(--xoot-radius-xl)',
        background: 'var(--xoot-surface-page)', boxShadow: 'var(--xoot-shadow-5)', overflow: 'hidden',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14,
          padding: 'clamp(18px, 2.6vw, 24px)', background: 'var(--xoot-grad-dusk)',
        }}>
          <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span className="xoot-label" style={{ color: 'var(--xoot-petal-ink)' }}>
              {paid ? 'Sent' : `Step ${stage + 1} of 2`}
            </span>
            <span style={{ fontFamily: 'var(--xoot-font-display)', fontSize: 'clamp(20px, 2.4vw, 26px)', lineHeight: 1.14 }}>
              {paid ? 'That is on its way.' : stage === 0 ? 'Who is it for?' : 'Confirm and pay'}
            </span>
          </span>
          <button type="button" aria-label="Close" onClick={onClose} style={{
            display: 'grid', placeItems: 'center', width: 40, height: 40, flex: '0 0 auto',
            border: 'none', borderRadius: '50%', background: 'rgba(255,255,255,.6)',
            cursor: 'pointer', fontSize: 16, color: 'var(--xoot-text-primary)',
          }}>✕</button>
        </div>

        <div style={{ padding: 'clamp(18px, 2.6vw, 26px)', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {paid ? (
            <>
              <p style={{ fontSize: 'var(--xoot-body)', lineHeight: 1.6, color: 'var(--xoot-text-secondary)' }}>
                {via === 'email'
                  ? `${to.name} will get the card by email within a minute. Nothing is charged to them — not the visit, not the booking fee.`
                  : 'Your link is ready to send. Whoever opens it claims the credit — send it to one person.'}
              </p>
              <Card pad="md" tone="flat" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>What happens next</span>
                <span style={{ fontSize: 'var(--xoot-body-sm)', lineHeight: 1.55, color: 'var(--xoot-text-secondary)' }}>
                  They pick their own day, service and Xooter. You will be told when the first visit
                  is booked, and nothing else. Until then the full {D.rand(quote.total)} is
                  refundable to you from You › Gifts sent.
                </span>
              </Card>
              <Button variant="primary" size="lg" block onClick={onDone}>Done</Button>
            </>
          ) : stage === 0 ? (
            <>
              <RadioGroup value={via} onChange={setVia} options={[
                { value: 'email', label: 'Email it to them', description: 'Arrives as a card, not a code. No app needed to open it.' },
                { value: 'link', label: 'Give me a link', description: 'Send it yourself — WhatsApp, in a card, however you like.' },
              ]} />

              {via === 'email' && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                  <Input label="Their name" value={to.name} placeholder="Thandi"
                    onChange={e => setTo(t => ({ ...t, name: e.target.value }))}
                    style={{ flex: '1 1 200px' }} />
                  <Input label="Their email" type="email" value={to.email} placeholder="thandi@example.co.za"
                    onChange={e => setTo(t => ({ ...t, email: e.target.value }))}
                    style={{ flex: '1 1 220px' }} />
                </div>
              )}

              <Input label="Say something" placeholder={occ.note}
                hint="Leave it blank and we use the line on the card."
                value={message} onChange={e => setMessage(e.target.value)} />

              <Button variant="primary" size="lg" block disabled={!canSend}
                iconRight="arrow-right" onClick={() => setStage(1)}>
                Continue to payment
              </Button>
            </>
          ) : (
            <>
              <Card pad="md" tone="flat" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>What you are paying for</span>
                {quote.lines.map(l => (
                  <div key={l.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 'var(--xoot-body-sm)' }}>
                    <span style={{ color: 'var(--xoot-text-secondary)' }}>{l.label}</span>
                    <span style={{ fontFamily: 'var(--xoot-font-mono)', fontWeight: 600, flex: '0 0 auto' }}>{D.rand(l.amount)}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 'var(--xoot-body-sm)' }}>
                  <span style={{ color: 'var(--xoot-text-secondary)' }}>To</span>
                  <span style={{ fontWeight: 600, flex: '0 0 auto' }}>{via === 'email' ? to.name : 'A shareable link'}</span>
                </div>
                <span style={{ height: 1, background: 'var(--xoot-neutral-200)' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontWeight: 700 }}>Total</span>
                  <span style={{ fontFamily: 'var(--xoot-font-display)', fontSize: 'var(--xoot-title-1)' }}>{D.rand(quote.total)}</span>
                </div>
                <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)', lineHeight: 1.45 }}>{quote.note}</span>
              </Card>

              {user ? (
                <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)' }}>
                  Paying as {user.name || user.email}. Card ending 4242.
                </span>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                  <Input label="Your name" placeholder="Nadia" style={{ flex: '1 1 200px' }} />
                  <Input label="Your email" type="email" placeholder="you@example.co.za" hint="For the receipt and the refund route." style={{ flex: '1 1 220px' }} />
                </div>
              )}

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                <Button variant="ghost" size="lg" onClick={() => setStage(0)}>Back</Button>
                <Button variant="primary" size="lg" iconRight="lock" style={{ flex: '1 1 200px' }}
                  onClick={() => setPaid(true)}>
                  Pay {D.rand(quote.total)}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { GiftClean, GiftCheckout, GIFT_OCCASIONS });
})();

/* ═══ site/SitePay.jsx ════════════════════════════════════════════════════════ */
(function(){
/* ── Nudges and express payment ────────────────────────────────────────────────
 *
 * Two components that both exist to remove a step:
 *
 *   NudgeBanner — the personalised notification. One at a time, dismissible, and specific.
 *   ExpressPay  — paying after the booking is confirmed, in one tap where that is honest.
 *
 * ON "FRICTIONLESS", WHICH IS USUALLY MISREAD.
 * Frictionless means removing steps that carry no information, not removing the step where the
 * customer sees what they are agreeing to. So: the card is remembered, the wallet buttons are
 * first, and there is no re-entry of anything already known — but the amount and the cancellation
 * term stay on screen at the moment of payment, because under the Consumer Protection Act the
 * displayed price is the price, and a one-tap charge with the total hidden behind a chevron is how
 * that becomes a dispute. One tap, full disclosure. They are not in tension.
 */
const { Card, Button, Icon, Badge, Input, Switch } = window.XootNS;

/* ── NudgeBanner ─────────────────────────────────────────────────────────────
 * `inline` sits in the page flow; the default floats bottom-left, out of the way of the docked
 * CTA. It never covers a primary action — a notification that blocks the button it is asking you
 * to press is worse than no notification.
 */
function NudgeBanner({ inline = false, onAction }) {
  const S = window.XootSession;
  const nudge = window.XootNudges.useNudge();
  const [entered, setEntered] = React.useState(false);

  /* Marked seen on first paint, so the cooldown starts when it was shown rather than when it
     became eligible — otherwise a nudge that appeared while the tab was in the background has
     already burned its cooldown by the time anyone sees it. */
  React.useEffect(() => {
    if (!nudge) return;
    S.markSeen(nudge.id);
    const t = window.setTimeout(() => setEntered(true), 30);
    return () => window.clearTimeout(t);
  }, [nudge && nudge.id]);

  if (!nudge) return null;

  const TONES = {
    brand: { bg: 'var(--xoot-violet-50)', edge: 'var(--xoot-violet-300)', ink: 'var(--xoot-violet-800)', dot: 'var(--xoot-violet-500)' },
    careplus: { bg: 'var(--xoot-careplus-50)', edge: 'var(--xoot-careplus-200)', ink: 'var(--xoot-careplus-700)', dot: 'var(--xoot-careplus-500)' },
    petal: { bg: 'var(--xoot-petal-wash)', edge: 'var(--xoot-petal-mid)', ink: 'var(--xoot-petal-ink)', dot: 'var(--xoot-petal-500)' },
    quiet: { bg: 'var(--xoot-surface-card)', edge: 'var(--xoot-neutral-200)', ink: 'var(--xoot-text-primary)', dot: 'var(--xoot-neutral-400)' },
  };
  const t = TONES[nudge.tone] || TONES.quiet;

  return (
    <div role="status" aria-live="polite" style={{
      ...(inline ? {} : {
        position: 'fixed', left: 'clamp(12px, 3vw, 24px)', bottom: 'clamp(12px, 3vw, 24px)',
        zIndex: 180, maxWidth: 'min(calc(100vw - 24px), 420px)',
      }),
      display: 'flex', gap: 13, alignItems: 'flex-start',
      padding: 'clamp(15px, 2vw, 19px)',
      borderRadius: 'var(--xoot-radius-lg)',
      background: t.bg,
      boxShadow: inline ? 'var(--xoot-shadow-1)' : 'var(--xoot-shadow-4)',
      border: `1px solid ${t.edge}`,
      opacity: entered ? 1 : 0,
      transform: entered || inline ? 'none' : 'translateY(10px)',
      transition: 'opacity var(--xoot-dur-slow) var(--xoot-ease-settle), transform var(--xoot-dur-slow) var(--xoot-ease-settle)',
    }}>
      <span style={{
        display: 'grid', placeItems: 'center', flex: '0 0 auto',
        width: 36, height: 36, borderRadius: '50%', background: 'var(--xoot-surface-card)',
      }}>
        <Icon name={nudge.icon} size={17} strokeWidth={2} color={t.dot} />
      </span>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, minWidth: 0, flex: 1 }}>
        <span style={{ fontSize: 'var(--xoot-body-sm)', fontWeight: 700, lineHeight: 1.3, color: t.ink, textWrap: 'pretty' }}>
          {nudge.title}
        </span>
        <span style={{ fontSize: 'var(--xoot-caption)', lineHeight: 1.5, color: 'var(--xoot-text-secondary)', textWrap: 'pretty' }}>
          {nudge.body}
        </span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 2 }}>
          <Button size="sm" variant={nudge.tone === 'careplus' ? 'careplus' : 'primary'}
            onClick={() => { S.track('nudge_action', { id: nudge.id }); onAction && onAction(nudge); }}>
            {nudge.cta}
          </Button>
          {/* "Not now" is a dismissal that means it, not a cooldown. Being asked a second time
              after saying no is what makes people turn notifications off entirely. */}
          <Button size="sm" variant="ghost" onClick={() => S.dismiss(nudge.id)}>
            {nudge.secondary || 'Not now'}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── ExpressPay ──────────────────────────────────────────────────────────────
 * Three states, chosen by what is actually known about this person:
 *   wallet   — Apple / Google Pay. Nothing to type, nothing stored by us.
 *   saved    — a remembered card. One tap.
 *   capture  — first card. Asks the minimum, offers to remember it.
 */
function ExpressPay({ total, currency = 'R', summary, onPaid, onCancel }) {
  const S = window.XootSession;
  const D = window.XootData;
  const saved = S.cards[0] || null;

  const [mode, setMode] = React.useState(saved ? 'saved' : 'wallet');
  const [remember, setRemember] = React.useState(true);
  const [card, setCard] = React.useState({ number: '', expiry: '', cvv: '' });
  const [stage, setStage] = React.useState('idle');   // idle → authorising → done

  const canCapture = card.number.replace(/\s/g, '').length >= 15 && card.expiry.length >= 4 && card.cvv.length >= 3;

  /* One place that finishes the payment, whichever route got here — three copies of this is how a
     card gets saved on one path and not another. */
  const pay = (method) => {
    setStage('authorising');
    S.track('pay_start', { total, method });
    window.setTimeout(() => {
      if (method === 'capture' && remember) {
        S.saveCard({ brand: 'visa', lastFour: card.number.replace(/\s/g, '').slice(-4) || '4242' });
      }
      setStage('done');
      window.setTimeout(() => onPaid && onPaid({ total, method }), 620);
    }, 900);
  };

  if (stage === 'done') {
    return (
      <Card pad="lg" radius="lg" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center' }}>
        <span style={{
          display: 'grid', placeItems: 'center', width: 64, height: 64, borderRadius: '50%',
          background: 'var(--xoot-sage-wash)',
          animation: 'xoot-pop var(--xoot-dur-base) var(--xoot-ease-ios-snap) both',
        }}>
          <Icon name="check" size={32} color="var(--xoot-sage-500)" strokeWidth={2.6} />
        </span>
        <span style={{ fontFamily: 'var(--xoot-font-display)', fontSize: 'var(--xoot-title-1)', lineHeight: 1.16 }}>
          Paid. {D.rand(total)}.
        </span>
        <span style={{ fontSize: 'var(--xoot-body-sm)', lineHeight: 1.5, color: 'var(--xoot-text-secondary)', maxWidth: '46ch' }}>
          We hold it and release your Xooter's share once the visit is verified. A receipt is on its
          way to you.
        </span>
      </Card>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* The amount stays visible at the moment of payment. This is the one piece of "friction"
          that is not friction. */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between',
        gap: 10, padding: '15px 17px', borderRadius: 'var(--xoot-radius-sm)',
        background: 'var(--xoot-surface-page-alt)',
      }}>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>Charged now</span>
          {summary && <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)', lineHeight: 1.4 }}>{summary}</span>}
        </span>
        <span style={{ fontFamily: 'var(--xoot-font-display)', fontSize: 'clamp(26px, 3vw, 34px)', lineHeight: 1, letterSpacing: '-.018em' }}>
          {D.rand(total)}
        </span>
      </div>

      {/* Wallets first. They are the genuinely frictionless route and the one where we never
          touch a card number at all. */}
      {mode === 'wallet' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[['apple', 'Apple\u00a0Pay', '#000000'], ['google', 'Google\u00a0Pay', '#1F1F1F']].map(([k, label, bg]) => (
            <button key={k} type="button" disabled={stage === 'authorising'} onClick={() => pay(k)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                minHeight: 54, width: '100%', border: 'none', cursor: 'pointer',
                borderRadius: 'var(--xoot-radius-sm)', background: bg, color: '#fff',
                fontFamily: 'var(--xoot-font-core)', fontSize: 'var(--xoot-body)', fontWeight: 700,
                opacity: stage === 'authorising' ? .6 : 1,
              }}>
              <Icon name={k === 'apple' ? 'phone' : 'wallet'} size={18} strokeWidth={2} color="#fff" />
              {stage === 'authorising' ? 'Authorising…' : `Pay with ${label}`}
            </button>
          ))}
          <button type="button" onClick={() => setMode(saved ? 'saved' : 'capture')}
            style={{
              minHeight: 44, border: 'none', background: 'transparent', cursor: 'pointer',
              fontFamily: 'var(--xoot-font-core)', fontSize: 'var(--xoot-body-sm)',
              fontWeight: 700, color: 'var(--xoot-violet-700)',
            }}>
            {saved ? `Use my card ending ${saved.lastFour}` : 'Pay by card instead'}
          </button>
        </div>
      )}

      {/* A remembered card. One tap, and the biometric line is there because on a phone that is
          what actually happens — omitting it makes the tap feel unguarded. */}
      {mode === 'saved' && saved && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 13, padding: '14px 16px',
            borderRadius: 'var(--xoot-radius-sm)', background: 'var(--xoot-surface-card)',
            boxShadow: 'inset 0 0 0 1.5px var(--xoot-violet-300)',
          }}>
            <span style={{
              display: 'grid', placeItems: 'center', width: 40, height: 28, flex: '0 0 auto',
              borderRadius: 5, background: 'var(--xoot-ink-900)',
            }}>
              <Icon name="credit-card" size={15} color="#fff" strokeWidth={2} />
            </span>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 'var(--xoot-body-sm)', fontWeight: 700 }}>•••• {saved.lastFour}</span>
              <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)' }}>Saved on your account</span>
            </span>
            <Badge tone="success" icon="lock">Ready</Badge>
          </div>

          <Button variant="primary" size="lg" block iconRight="lock"
            loading={stage === 'authorising'} disabled={stage === 'authorising'}
            onClick={() => pay('saved')}>
            {stage === 'authorising' ? 'Authorising…' : `Pay ${D.rand(total)}`}
          </Button>
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)' }}>
            <Icon name="circle-user" size={13} strokeWidth={2} />
            Confirmed with Face ID — no card details to re-enter
          </span>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <Button size="sm" variant="ghost" onClick={() => setMode('wallet')}>Use a wallet</Button>
            <Button size="sm" variant="ghost" onClick={() => setMode('capture')}>Different card</Button>
          </div>
        </div>
      )}

      {/* First card. Three fields, nothing more — a billing address on a card payment in South
          Africa adds a drop-off and buys nothing. */}
      {mode === 'capture' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input label="Card number" inputMode="numeric" placeholder="4242 4242 4242 4242"
            value={card.number} onChange={e => setCard(c => ({ ...c, number: e.target.value }))} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <Input label="Expiry" inputMode="numeric" placeholder="09/29" value={card.expiry}
              onChange={e => setCard(c => ({ ...c, expiry: e.target.value }))} style={{ flex: '1 1 120px' }} />
            <Input label="CVV" inputMode="numeric" placeholder="123" value={card.cvv}
              onChange={e => setCard(c => ({ ...c, cvv: e.target.value }))} style={{ flex: '1 1 100px' }} />
          </div>
          <Switch size="sm" label="Remember this card" description="So the next booking is one tap."
            checked={remember} onChange={setRemember} />
          <Button variant="primary" size="lg" block iconRight="lock"
            loading={stage === 'authorising'} disabled={!canCapture || stage === 'authorising'}
            onClick={() => pay('capture')}>
            {stage === 'authorising' ? 'Authorising…' : `Pay ${D.rand(total)}`}
          </Button>
          <Button size="sm" variant="ghost" block onClick={() => setMode('wallet')}>Back to wallets</Button>
        </div>
      )}

      <span style={{ display: 'flex', gap: 8, fontSize: 'var(--xoot-caption)', lineHeight: 1.5, color: 'var(--xoot-text-muted)' }}>
        <Icon name="shield-check" size={14} strokeWidth={2} style={{ flex: '0 0 auto', marginTop: 2 }} />
        <span>
          Cancel free up to 24 hours before and it comes straight back; inside 24 hours half is
          retained. Your card details never reach Xoot's own systems.
        </span>
      </span>

      {onCancel && (
        <Button size="sm" variant="ghost" block onClick={onCancel}>Not yet — back to the booking</Button>
      )}
    </div>
  );
}

Object.assign(window, { NudgeBanner, ExpressPay });
})();

/* ═══ site/SiteBlog.jsx ════════════════════════════════════════════════════════ */
(function(){
/* ── Journal — the #articles section the nav has been pointing at ──────────────
 *
 * Both the navbar and the footer link to `#articles`. Nothing with that id existed, so the link
 * scrolled to wherever the browser gave up — which is why it "doesn't work on a consistent basis".
 * It was not intermittent; it never worked, and looked intermittent because the failure mode is
 * "stay roughly here".
 *
 * The posts are real and readable in place. A card that opens a reader is worth building; a card
 * that links to a page that does not exist yet is the same bug in a new place.
 *
 * On the writing: these are the questions people actually ask before booking a stranger into their
 * home, answered by someone who knows the answer. No SEO padding, no "in today's fast-paced world".
 */
const { Card, Button, Icon, Badge, WashiTape } = window.XootNS;

const POSTS = [
  {
    id: 'what-4-hours-buys',
    kicker: 'Pricing',
    title: 'What four hours actually buys you',
    dek: 'A realistic account of what one Xooter finishes in a standard visit — and what they do not.',
    read: 6, tint: 'petal', date: '18 Aug 2026',
    body: [
      ['p', 'The most common disappointment in home cleaning is not bad work. It is a four-hour booking with eight hours of expectation attached to it. So here is the arithmetic, honestly.'],
      ['h', 'A two-bedroom flat, four hours, one Xooter'],
      ['p', 'Kitchen takes about seventy minutes if the dishes are done and roughly two hours if they are not. Bathrooms are thirty to forty minutes each, doubled if there is limescale that has been building since the last tenant. Two bedrooms, made and dusted and floors done, is about fifty minutes. That leaves roughly forty minutes for the living areas and the floors throughout.'],
      ['p', 'It adds up almost exactly. Which is why a Xooter who is asked to "quickly do the windows as well" finishes late, or finishes something else badly.'],
      ['h', 'What pushes a visit over'],
      ['list', [
        'Dishes in the sink at the start — a full sink is forty minutes before any cleaning begins',
        'Clutter on surfaces. We tidy, but tidying a surface is not the same as wiping it, and both take time',
        'Pets, honestly. Hair on upholstery is its own job',
        'An oven that has not been done in a year. This is a two-hour job on its own and it is an add-on for that reason',
      ]],
      ['h', 'What to do about it'],
      ['p', 'Two things help more than anything else. Clear the surfaces before your Xooter arrives — twenty minutes of your time buys back an hour of theirs. And be specific in the notes about the one thing that matters most to you, because a Xooter who knows the bathroom is the priority will start there.'],
      ['p', 'If the place genuinely needs more than four hours, book more than four hours, or send two Xooters. It costs close to the same, because the price is on total work rather than per person, and it finishes in half the time.'],
    ],
  },
  {
    id: 'vetting-really-means',
    kicker: 'Trust & safety',
    title: 'What "vetted" should mean, and usually does not',
    dek: 'Most platforms use the word. Very few will tell you what they actually checked.',
    read: 8, tint: 'mist', date: '02 Aug 2026',
    body: [
      ['p', 'Every home-services platform in South Africa says its people are vetted. The word does a great deal of work and almost none of it is defined. Here is what we check, in order, and what each one does and does not prove.'],
      ['h', 'Identity'],
      ['p', 'A South African ID, or a passport with a valid work permit. This is the floor, not the ceiling — it establishes that the person is who they say and is legally allowed to work here. It proves nothing about their conduct.'],
      ['h', 'Address'],
      ['p', 'A utility bill or bank statement under three months old, in their name or with an affidavit if it is not. The point is not the address itself. It is that someone with a verifiable, current address is reachable if something goes wrong, and that matters more than most people realise.'],
      ['h', 'Criminal record'],
      ['p', 'A check against the SAPS database through an accredited bureau. Worth being precise about what this means: it surfaces convictions. It does not surface behaviour that was never reported or never prosecuted, which is most behaviour. Anyone who implies otherwise is overselling.'],
      ['h', 'Bank account in their own name'],
      ['p', 'This one is not about fraud against you — it is about the Xooter. Paying into a third party\'s account is the single most common way domestic workers in this country lose control of their own earnings.'],
      ['h', 'What we are still building'],
      ['p', 'Reference checks with previous employers are inconsistent in this industry, because most domestic work is informal and there is nobody to phone. We are working on a way to make a Xooter\'s history on Xoot itself do that job over time. Until it does, we will not claim it.'],
    ],
  },
  {
    id: 'fair-pay-arithmetic',
    kicker: 'How we work',
    title: 'The arithmetic behind what a Xooter takes home',
    dek: 'Commission, the booking fee, and why the rate per hour goes down on longer jobs — with a floor under it.',
    read: 7, tint: 'sage', date: '21 Jul 2026',
    body: [
      ['p', 'We publish this because a platform that will not show you the split is usually hiding the size of it.'],
      ['h', 'The commission'],
      ['p', 'It starts at 30% and falls to 20% as a Xooter completes more jobs. The floor is reached at 200 completed jobs, which at a realistic pace is roughly two years. That is longer than we would like and we are looking at it.'],
      ['h', 'The booking fee'],
      ['p', 'R39, once, on a customer\'s first booking. It is not taken from the Xooter. Care+ members do not pay it at all.'],
      ['h', 'The bit worth understanding'],
      ['p', 'The price ladder is sub-linear in hours: an eight-hour job does not cost twice a four-hour one, because the travel, the setup and the admin happen once either way. That is defensible from the customer\'s side and it has an uncomfortable consequence — the effective hourly rate on a long job drops.'],
      ['p', 'So there is a floor. From five and a half hours, a minimum hourly rate applies regardless of what the ladder says, and the quote is raised to meet it. A long job cannot pay below it. The customer sees a slightly higher number on very long bookings, and that is the correct trade.'],
      ['h', 'What we will not do'],
      ['p', 'We will not run surge pricing that the Xooter does not share in, and we will not discount a job by cutting their side of it. A promotion comes out of our margin or it does not happen.'],
    ],
  },
  {
    id: 'gate-codes',
    kicker: 'Trust & safety',
    title: 'Giving a stranger your gate code',
    dek: 'How access windows work, what screenshot blocking really does, and the honest limits of both.',
    read: 5, tint: 'lilac', date: '09 Jul 2026',
    body: [
      ['p', 'The single most common hesitation before a first booking is not price. It is the gate code.'],
      ['h', 'It is a timed release, not stored data'],
      ['p', 'Your codes are encrypted the moment they leave your phone. They unlock forty-five minutes before the visit, for the assigned Xooter only, and they lock again when the visit completes — not at the end of that day. Seven days later they are deleted outright rather than archived.'],
      ['h', 'Screenshots'],
      ['p', 'On Android, capture on that screen is prevented by the operating system. On iOS the platform allows detection but not prevention, so a capture is logged and you are told. The screen blanks when the app is backgrounded on both.'],
      ['p', 'Now the honest part: no software stops a second phone photographing a screen. Anyone claiming otherwise is selling you something. Screenshot blocking is one layer, and it is not the important one.'],
      ['h', 'The layer that matters'],
      ['p', 'Revoke. One switch, effective at the next read, usable mid-visit. It does not cancel the booking and it does not charge you. Combined with deletion after seven days, that is what actually limits exposure — a code that exists for one visit and can be withdrawn during it.'],
    ],
  },
  {
    id: 'hiring-vs-booking',
    kicker: 'Guides',
    title: 'Employing someone full time, or booking visits?',
    dek: 'A straight comparison, including the parts that are legally your responsibility either way.',
    read: 9, tint: 'honey', date: '24 Jun 2026',
    body: [
      ['p', 'People ask us this expecting us to argue for booking. It depends, and the honest answer costs us some bookings.'],
      ['h', 'Book visits if'],
      ['list', [
        'You need somewhere between one and three visits a week',
        'Your schedule moves around',
        'You do not want to run payroll, UIF registration and leave',
        'You want cover for damage and a replacement if someone is ill',
      ]],
      ['h', 'Employ someone if'],
      ['list', [
        'You need four or more days a week — at that point full-time is usually cheaper per hour',
        'You want one consistent person who knows the house without being told',
        'The work includes childcare, cooking or anything beyond cleaning',
      ]],
      ['h', 'What people forget about employing'],
      ['p', 'A domestic worker in South Africa is an employee with all that implies: a written contract, UIF registration, the sectoral minimum wage, paid leave, and a legally specified process before any dismissal. None of it is optional and most of it is not difficult, but it does need doing.'],
      ['p', 'We run a full-time placement service for exactly this reason, and it is genuinely a different product from booking a visit — not an upsell of one.'],
    ],
  },
  {
    id: 'gauteng-only',
    kicker: 'How we work',
    title: 'Why we are only in Gauteng',
    dek: 'Density beats coverage. A thin map is a bad experience wearing a big number.',
    read: 4, tint: 'blush', date: '11 Jun 2026',
    body: [
      ['p', 'It would be easy to say we serve South Africa. Most of our competitors do. It would also, in practice, be a lie in about eight of the nine provinces.'],
      ['h', 'The problem with a wide map'],
      ['p', 'A marketplace needs supply density before it needs geography. One Xooter in Nelspruit means a customer in Nelspruit sees availability, books, and gets a cancellation — or a Xooter travelling ninety minutes each way for four hours of work, which pays badly and does not last.'],
      ['h', 'What we do instead'],
      ['p', 'Gauteng, properly. Priority suburbs where supply is deepest and same-week availability is reliable, and the rest of the province bookable with an honest note that it may take longer to match. Nobody in Gauteng is turned away because they are outside a drawn circle.'],
      ['p', 'Cape Town is next, when we can staff it properly rather than announce it.'],
    ],
  },
];

function Journal({ onBook }) {
  const { Section, SectionHead } = window;
  const [open, setOpen] = React.useState(null);
  const post = POSTS.find(p => p.id === open);

  /* Deep links from elsewhere on the site, and the browser back button behaving as expected. */
  React.useEffect(() => {
    const read = () => {
      const m = (window.location.hash || '').match(/^#article-(.+)$/);
      setOpen(m ? m[1] : null);
    };
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, []);

  const openPost = (id) => {
    window.history.pushState(null, '', '#article-' + id);
    setOpen(id);
    window.XootSession && window.XootSession.track('article_open', { id });
  };
  const closePost = () => { window.history.pushState(null, '', '#articles'); setOpen(null); };

  return (
    <Section id="articles" tone="page">
      <SectionHead
        eyebrow="The Xoot journal"
        title="Written by people who do this work."
        sub="No filler. The questions customers actually ask, answered by someone who knows the answer."
        maxWidth={620}
      />

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
        gap: 18, marginTop: 40,
      }}>
        {POSTS.map((p, i) => (
          <button key={p.id} type="button" onClick={() => openPost(p.id)}
            style={{
              display: 'flex', flexDirection: 'column', gap: 13, textAlign: 'left',
              padding: 'clamp(20px, 2.6vw, 26px)', border: 'none', cursor: 'pointer',
              borderRadius: 'var(--xoot-radius-lg)',
              background: 'var(--xoot-surface-card)', boxShadow: 'var(--xoot-shadow-1)',
              fontFamily: 'var(--xoot-font-core)',
              transition: 'transform var(--xoot-dur-base) var(--xoot-ease-ios-snap), box-shadow var(--xoot-dur-base) var(--xoot-ease-out)',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--xoot-shadow-3)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--xoot-shadow-1)'; }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
              <span style={{
                padding: '4px 10px', borderRadius: 'var(--xoot-radius-pill)',
                background: `var(--xoot-${p.tint}-wash)`, color: `var(--xoot-${p.tint}-ink)`,
                fontSize: 11, fontWeight: 800, letterSpacing: '.04em', textTransform: 'uppercase',
              }}>{p.kicker}</span>
              <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)' }}>{p.read} min read</span>
            </div>

            <h3 style={{
              fontFamily: 'var(--xoot-font-display)', fontSize: 'clamp(20px, 2.3vw, 25px)',
              lineHeight: 1.16, letterSpacing: '-.016em', textWrap: 'pretty',
            }}>{p.title}</h3>

            <p style={{ fontSize: 'var(--xoot-body-sm)', lineHeight: 1.55, color: 'var(--xoot-text-secondary)', textWrap: 'pretty' }}>
              {p.dek}
            </p>

            <span style={{
              display: 'flex', alignItems: 'center', gap: 7, marginTop: 'auto', paddingTop: 4,
              fontSize: 'var(--xoot-body-sm)', fontWeight: 700, color: 'var(--xoot-violet-700)',
            }}>
              Read it
              <Icon name="arrow-right" size={15} strokeWidth={2.2} />
            </span>
          </button>
        ))}
      </div>

      {/* The reader. In place, because a "blog" that navigates away from a page someone was about
          to book on is a conversion leak dressed as content marketing. */}
      {post && (
        <div role="dialog" aria-modal="true" aria-label={post.title}
          onClick={e => { if (e.target === e.currentTarget) closePost(); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 260, display: 'grid', placeItems: 'start center',
            padding: 'clamp(10px, 3vw, 40px)', background: 'rgba(20,18,16,.55)', overflowY: 'auto',
            animation: 'xoot-fade-in var(--xoot-dur-base) var(--xoot-ease-out)',
          }}>
          <article style={{
            width: '100%', maxWidth: 720, borderRadius: 'var(--xoot-radius-xl)',
            background: 'var(--xoot-surface-page)', boxShadow: 'var(--xoot-shadow-5)',
            overflow: 'hidden',
            animation: 'xoot-sheet-up var(--xoot-dur-slow) var(--xoot-ease-ios-spring) both',
          }}>
            <header style={{
              position: 'relative', padding: 'clamp(24px, 4vw, 44px) clamp(20px, 4vw, 48px) clamp(18px, 2.6vw, 28px)',
              background: `var(--xoot-${post.tint}-wash)`,
            }}>
              <button type="button" aria-label="Close" onClick={closePost} style={{
                position: 'absolute', top: 16, right: 16, display: 'grid', placeItems: 'center',
                width: 40, height: 40, border: 'none', borderRadius: '50%',
                background: 'rgba(255,255,255,.7)', cursor: 'pointer', fontSize: 16,
              }}>✕</button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
                <span style={{
                  fontSize: 11, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase',
                  color: `var(--xoot-${post.tint}-ink)`,
                }}>{post.kicker}</span>
                <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)' }}>
                  {post.date} · {post.read} min read
                </span>
              </div>

              <h1 style={{
                fontFamily: 'var(--xoot-font-display)', fontSize: 'clamp(26px, 4.2vw, 42px)',
                lineHeight: 1.1, letterSpacing: '-.022em', textWrap: 'pretty', maxWidth: '20ch',
              }}>{post.title}</h1>
            </header>

            <div style={{
              display: 'flex', flexDirection: 'column', gap: 18,
              padding: 'clamp(22px, 3.4vw, 40px) clamp(20px, 4vw, 48px) clamp(28px, 4vw, 48px)',
            }}>
              {post.body.map(([kind, content], i) => {
                if (kind === 'h') return (
                  <h2 key={i} style={{
                    marginTop: 10, fontFamily: 'var(--xoot-font-display)',
                    fontSize: 'clamp(19px, 2.2vw, 24px)', lineHeight: 1.2, letterSpacing: '-.014em',
                  }}>{content}</h2>
                );
                if (kind === 'list') return (
                  <ul key={i} style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: 0, padding: 0, listStyle: 'none' }}>
                    {content.map(item => (
                      <li key={item} style={{ display: 'flex', gap: 11, fontSize: 'var(--xoot-body)', lineHeight: 1.6, color: 'var(--xoot-text-secondary)' }}>
                        <span style={{ flex: '0 0 auto', width: 5, height: 5, marginTop: 10, borderRadius: '50%', background: `var(--xoot-${post.tint}-500)` }} />
                        <span style={{ textWrap: 'pretty' }}>{item}</span>
                      </li>
                    ))}
                  </ul>
                );
                return (
                  <p key={i} style={{
                    fontSize: 'var(--xoot-body-lg)', lineHeight: 1.68,
                    color: 'var(--xoot-text-secondary)', textWrap: 'pretty', maxWidth: '68ch',
                  }}>{content}</p>
                );
              })}

              <div style={{
                display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14, marginTop: 12,
                padding: 'clamp(18px, 2.4vw, 24px)', borderRadius: 'var(--xoot-radius-lg)',
                background: 'var(--xoot-surface-page-alt)',
              }}>
                <span style={{ flex: '1 1 240px', fontSize: 'var(--xoot-body-sm)', lineHeight: 1.55, color: 'var(--xoot-text-secondary)' }}>
                  Everything above is how the service actually runs. You can see it for yourself in
                  about four minutes.
                </span>
                <Button variant="primary" size="md" onClick={() => { closePost(); onBook && onBook(); }}>
                  Book a visit
                </Button>
              </div>

              {/* Next post, so the reader has somewhere to go that is not "back". */}
              {(() => {
                const idx = POSTS.findIndex(p => p.id === post.id);
                const next = POSTS[(idx + 1) % POSTS.length];
                return (
                  <button type="button" onClick={() => openPost(next.id)} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14,
                    padding: '16px 18px', border: 'none', cursor: 'pointer', textAlign: 'left',
                    borderRadius: 'var(--xoot-radius-md)', background: 'transparent',
                    boxShadow: 'inset 0 0 0 1px var(--xoot-border-color)',
                    fontFamily: 'var(--xoot-font-core)',
                  }}>
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                      <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>Read next</span>
                      <span style={{ fontSize: 'var(--xoot-body-sm)', fontWeight: 700, textWrap: 'pretty' }}>{next.title}</span>
                    </span>
                    <Icon name="arrow-right" size={17} strokeWidth={2} color="var(--xoot-violet-700)" />
                  </button>
                );
              })()}
            </div>
          </article>
        </div>
      )}
    </Section>
  );
}

Object.assign(window, { Journal, JOURNAL_POSTS: POSTS });

/* ── Site Concierge ────────────────────────────────────────────────────────────
 * The website's two "Ask Concierge" buttons rendered and did nothing. This mounts the same
 * assistant the app uses, over the same scoped reasoning layer, so an answer given on the site
 * cannot contradict one given in the app — they are literally the same function. */
function SiteConcierge({ open, onClose, onBook }) {
  const { Concierge } = window.XootNS;
  const S = window.XootSession;
  if (!open) return null;
  const u = S && S.user;
  return (
    <div role="dialog" aria-modal="true" aria-label="Xoot Concierge"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 270, display: 'grid', placeItems: 'end center',
        padding: 'clamp(8px, 3vw, 32px)', background: 'rgba(20,18,16,.5)',
        animation: 'xoot-fade-in var(--xoot-dur-base) var(--xoot-ease-out)',
      }}>
      <div style={{
        display: 'flex', flexDirection: 'column',
        width: '100%', maxWidth: 520, height: 'min(680px, 88vh)',
        borderRadius: 'var(--xoot-radius-xl)', overflow: 'hidden',
        background: 'var(--xoot-surface-page)', boxShadow: 'var(--xoot-shadow-5)',
        animation: 'xoot-sheet-up var(--xoot-dur-slow) var(--xoot-ease-ios-spring) both',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          padding: '18px 20px', background: 'var(--xoot-grad-dawn)', flex: '0 0 auto',
        }}>
          <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
            <span style={{ fontFamily: 'var(--xoot-font-display)', fontSize: 'var(--xoot-title-2)', lineHeight: 1.2 }}>Xoot Concierge</span>
            <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)' }}>
              Prices, cover, how it works. Ask several things at once.
            </span>
          </span>
          <button type="button" aria-label="Close" onClick={onClose} style={{
            display: 'grid', placeItems: 'center', width: 40, height: 40, flex: '0 0 auto',
            border: 'none', borderRadius: '50%', background: 'rgba(255,255,255,.65)', cursor: 'pointer', fontSize: 16,
          }}>✕</button>
        </div>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', padding: '0 16px 16px' }}>
          <Concierge
            context={{
              name: u ? u.name : null,
              credit: (S && S.credit) || 0,
              points: (S && S.points) || 0,
              carePlus: !!(u && u.carePlus),
              booking: null,
            }}
            onNavigate={to => {
              onClose();
              if (to === 'book') return onBook && onBook();
              const el = document.getElementById(to);
              if (el) window.scrollTo({ top: el.offsetTop - 70, behavior: 'smooth' });
            }}
          />
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { SiteConcierge });
})();

/* ═══ site/SiteXooter.jsx ════════════════════════════════════════════════════════ */
(function(){
/* ── Xooter onboarding + training catalogue ────────────────────────────────────
 *
 * One flow, gated in the order the business actually requires:
 *   sign in → documents → training → accept work
 *
 * "See training" used to open the catalogue to anyone. That is the wrong order: training is a
 * condition of accepting work, and showing the modules to someone with no account tells them the
 * requirement is decorative. The gate is enforced here AND stated up front, because a gate you
 * discover at step four feels like a bait and switch.
 *
 * ON DOCUMENT INSTRUCTIONS. Every rejected document costs the applicant days and costs us an
 * onboarding. The overwhelming majority are rejected for four reasons — glare, a cropped corner,
 * a certification stamp older than three months, and a photo of a screen. So each of those is
 * named specifically, with the fix, before they upload rather than after we reject it.
 *
 * A note on legal accuracy: the requirement is a South African ID OR a passport with proof of the
 * right to work here. Saying "ID required" excludes people who are legally entitled to the work,
 * and getting that wrong in the copy is both unlawful and a supply problem.
 */
const { Card, Button, Icon, Badge, Input, ProgressRing } = window.XootNS;

const DOCUMENTS = [
  {
    key: 'id',
    title: 'ID or passport',
    required: true,
    what: 'A South African ID card, green ID book, or a passport together with a valid work permit or asylum document.',
    why: 'We have to establish that you are who you say you are and that you are legally allowed to work in South Africa. There is no way around this one.',
    rules: [
      'Both sides of an ID card, or the photo page of a passport',
      'A passport needs its permit page too — the permit must still be valid',
      'The document itself, photographed. Not a photo of a screen showing it',
    ],
  },
  {
    key: 'residence',
    title: 'Proof of residence',
    required: true,
    what: 'A municipal bill, bank statement, lease, or a retail account statement showing your name and address.',
    why: 'It confirms you are contactable and settled. If the bill is not in your name, a signed affidavit from the person it belongs to works — that is common and it is not a problem.',
    rules: [
      'Dated within the last three months. Older is rejected automatically',
      'Your full name and the physical address must both be readable',
      'A bank statement can have the amounts blacked out — we do not need them',
    ],
  },
  {
    key: 'photo',
    title: 'Your profile photo',
    required: true,
    what: 'A clear photo of your face, taken today, against a plain wall.',
    why: 'Customers see this before they let you into their home. A good photo measurably gets you more work — it is the single highest-return five minutes in this whole process.',
    rules: [
      'Face the window. Natural light on your face, not behind you',
      'No hat, no sunglasses, no filter',
      'Plain wall behind you, and just you in the frame',
    ],
  },
  {
    key: 'police',
    title: 'Background check consent',
    required: true,
    what: 'Signed consent for us to run a criminal record check with an accredited bureau, or a SAPS clearance certificate you already hold.',
    why: 'Customers let Xooters into their homes, often when nobody is there. This is the check that makes that defensible, and it is the one thing we will not make optional. Most applicants let us run it — it is faster than queuing at a police station and we pay for it.',
    rules: [
      'Consent is signed in the app. It authorises one check, not ongoing monitoring',
      'We use an accredited bureau checking against the SAPS database',
      'If you already have a certificate it must be issued within the last six months',
      'A conviction is not automatically disqualifying \u2014 it is reviewed, and we tell you either way',
    ],
  },
  {
    key: 'bank',
    title: 'Bank details',
    required: true,
    what: 'A bank confirmation letter or a statement header showing the account name and number.',
    why: 'The account must be in your own name. We do not pay into anyone else\'s account — that is the most common way people in this work lose control of their own earnings.',
    rules: [
      'Account holder name must match your ID exactly',
      'A stamped bank confirmation letter is fastest',
      'No third-party accounts. No exceptions, and this is for your protection',
    ],
  },
];

/* The four things that get documents rejected, and how to avoid each. Shown before upload. */
const PHOTO_GUIDE = [
  ['sun', 'Light on it, not behind it', 'Stand next to a window with the document flat on a table. A shadow across a name is the most common rejection.'],
  ['camera', 'All four corners in frame', 'A cut-off corner means we cannot confirm the document is complete. Step back rather than zoom in.'],
  ['x', 'Never a photo of a screen', 'Moiré patterns and glare make it unreadable, and a screen photo cannot be verified as genuine.'],
  ['circle-check', 'Flat, not held', 'Put it on a table. A held document curves, and the curve puts half the text out of focus.'],
];

/* ── Training catalogue ──────────────────────────────────────────────────────
 * Six tracks. Three are required before a Xooter can accept work; the rest raise what they can
 * charge for and which jobs they can take. Ordered by what unlocks work fastest.
 */
const TRACKS = [
  {
    key: 'foundation', title: 'Foundation', required: true, tint: 'lilac', hours: 4,
    blurb: 'The non-negotiables. Nobody accepts a job without this.',
    modules: [
      ['Arriving well', 22, 'Punctuality, what to say at the door, what to do if nobody answers'],
      ['Your kit and what each thing is for', 26, 'Why the blue cloth never touches a kitchen surface'],
      ['Working in an occupied home', 31, 'Someone is working from home. Someone is asleep. Both are normal'],
      ['Pets, children and the things that break', 28, 'Dogs that bolt, cats that hide, and what to do about fragile items'],
      ['Finishing and handover', 19, 'The last ten minutes decide the rating'],
      ['Safety, and when to leave', 24, 'You can end a visit and go, at any time, without penalty. How and when'],
    ],
  },
  {
    key: 'surfaces', title: 'Surfaces & chemistry', required: true, tint: 'mist', hours: 5,
    blurb: 'The knowledge that stops you ruining a R40 000 counter.',
    modules: [
      ['pH, and why it decides everything', 34, 'Acid, alkaline, neutral — and what each one dissolves'],
      ['Natural stone: marble, granite, travertine', 41, 'Why anything acidic on marble is permanent damage'],
      ['Engineered stone, laminate and solid surface', 27, 'They look identical and behave completely differently'],
      ['Wood: sealed, oiled, waxed, laminate', 38, 'Four surfaces, four methods, one very expensive mistake'],
      ['Glass, mirrors and streaks', 22, 'The technique that removes streaking entirely'],
      ['Stainless steel and the grain', 18, 'Always with it. Never across it'],
      ['Fabric and upholstery basics', 29, 'Test patches, water rings, and when to say no'],
    ],
  },
  {
    key: 'safety', title: 'Safety & chemical handling', required: true, tint: 'blush', hours: 3,
    blurb: 'Including the combinations that produce toxic gas in a closed bathroom.',
    modules: [
      ['Never mix these', 24, 'Bleach and ammonia. Bleach and acid. Why, and what happens'],
      ['Ventilation and enclosed spaces', 19, 'A small bathroom is the highest-risk room in the house'],
      ['Gloves, masks and when they matter', 16, 'Not theatre — specific products, specific protection'],
      ['Lifting, ladders and reaching high', 21, 'The injuries that end cleaning careers are back injuries'],
      ['Electrical safety around water', 17, 'Plugs, appliances, and wet floors'],
      ['If something goes wrong', 23, 'Spills, burns, breakages: the first ninety seconds'],
    ],
  },
  {
    key: 'record', title: 'The Complete Knowledge of Cleaning', required: false, tint: 'honey',
    hours: 62, record: true,
    blurb: 'Our attempt at the longest single professionally-produced cleaning course ever recorded. Sixty-two hours, ninety-four modules, built with working Xooters.',
    modules: [
      ['Part I · Water, soap and the science of soil', 210, 'Where dirt comes from and what actually removes it — surfactants, emulsification, mechanical action'],
      ['Part II · The complete surface encyclopaedia', 480, 'Sixty-one surface types, each with its method, its chemistry and its failure mode'],
      ['Part III · Stains, in full', 390, 'Red wine on wool. Turmeric on marble. Ink on leather. Ninety-one stains, each traced to its removal'],
      ['Part IV · Kitchens, room by room', 300, 'Extraction, grease, ovens, the inside of a dishwasher, and the six places nobody thinks to look'],
      ['Part V · Bathrooms and water damage', 270, 'Limescale, mould, grout, silicone, and how to tell damage from dirt'],
      ['Part VI · Textiles, upholstery and floors', 340, 'Wool, silk, viscose, jute, engineered wood, sealed concrete'],
      ['Part VII · Luxury homes and delicate contents', 250, 'Art, antiques, instruments, wine, and what to refuse to touch'],
      ['Part VIII · Commercial, hospitality and turnover', 280, 'Working to a deadline, to a checklist, and to somebody else\'s standard'],
      ['Part IX · The professional', 200, 'Time estimation, pricing your own work, difficult conversations, building repeat clients'],
    ],
  },
  {
    key: 'specialist', title: 'Specialist tracks', required: false, tint: 'sage', hours: 8,
    blurb: 'Each one unlocks a service you can accept work for, at a higher rate.',
    modules: [
      ['Airbnb turnover certification', 95, 'Linen, restocking, the photo handover, and working to a check-in clock'],
      ['Move-in and move-out', 88, 'Inside cupboards, appliances, walls, skirtings — and the inspection standard'],
      ['Office and commercial', 76, 'After hours, alarm procedures, and a completely different definition of done'],
      ['Laundry and ironing', 82, 'Fabric codes, temperatures, and how to iron a shirt in under four minutes'],
      ['Xoot Lux standard', 110, 'The elite tier: what changes, and what is expected'],
    ],
  },
  {
    key: 'business', title: 'Running your side of it', required: false, tint: 'careplus', hours: 4,
    blurb: 'Earnings, tax, ratings, and getting rebooked.',
    modules: [
      ['How you get paid, exactly', 26, 'Commission, timing, and reading your statement'],
      ['Tax for independent workers', 44, 'Provisional tax, what to keep, and when SARS applies to you'],
      ['Your rating, and how it moves', 31, 'What customers actually rate, and the two things that lose stars'],
      ['Getting rebooked', 28, 'The repeat client is worth ten first bookings'],
      ['Saying no well', 22, 'Jobs to decline, and how to decline them without a penalty'],
    ],
  },
];

const totalModules = TRACKS.reduce((n, t) => n + t.modules.length, 0);
const totalHours = TRACKS.reduce((n, t) => n + t.hours, 0);

function XooterOnboarding({ open, onClose, onSignIn }) {
  const S = window.XootSession;
  const [tab, setTab] = React.useState('start');
  const [openTrack, setOpenTrack] = React.useState('foundation');
  const [guide, setGuide] = React.useState(null);

  const user = S && S.user;
  const docs = (S && S.documents) || {};
  const doneDocs = DOCUMENTS.filter(d => d.required && docs[d.key] && docs[d.key].status !== 'rejected').length;
  const reqDocs = DOCUMENTS.filter(d => d.required).length;
  const docsComplete = doneDocs === reqDocs;

  React.useEffect(() => {
    if (!open) return;
    /* Land people where they actually are, rather than making them click through stages they have
       already finished. */
    setTab(!user ? 'start' : !docsComplete ? 'documents' : 'training');
  }, [open, !!user, docsComplete]);

  if (!open) return null;

  const STAGES = [
    ['start', 'Sign in', !!user],
    ['documents', 'Documents', docsComplete],
    ['training', 'Training', false],
  ];

  return (
    <div role="dialog" aria-modal="true" aria-label="Become a Xooter"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 250, display: 'grid', placeItems: 'start center',
        padding: 'clamp(8px, 3vw, 36px)', background: 'rgba(20,18,16,.55)', overflowY: 'auto',
        animation: 'xoot-fade-in var(--xoot-dur-base) var(--xoot-ease-out)',
      }}>
      <div style={{
        width: '100%', maxWidth: 860, borderRadius: 'var(--xoot-radius-xl)',
        background: 'var(--xoot-surface-page)', boxShadow: 'var(--xoot-shadow-5)', overflow: 'hidden',
        animation: 'xoot-sheet-up var(--xoot-dur-slow) var(--xoot-ease-ios-spring) both',
      }}>
        {/* Header: the whole path, visible from the first screen. A gate discovered at step four
            feels like a bait and switch; a gate stated at step one is just a requirement. */}
        <div style={{ padding: 'clamp(20px, 3vw, 30px)', background: 'var(--xoot-grad-dawn)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, marginBottom: 18 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span className="xoot-label" style={{ color: 'var(--xoot-violet-700)' }}>Become a Xooter</span>
              <span style={{ fontFamily: 'var(--xoot-font-display)', fontSize: 'clamp(21px, 2.8vw, 29px)', lineHeight: 1.14 }}>
                Three steps before your first job
              </span>
            </div>
            <button type="button" aria-label="Close" onClick={onClose} style={{
              display: 'grid', placeItems: 'center', width: 40, height: 40, flex: '0 0 auto',
              border: 'none', borderRadius: '50%', background: 'rgba(255,255,255,.65)',
              cursor: 'pointer', fontSize: 16,
            }}>✕</button>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {STAGES.map(([key, label, done], i) => {
              const on = tab === key;
              return (
                <button key={key} type="button" onClick={() => setTab(key)} style={{
                  display: 'flex', alignItems: 'center', gap: 8, minHeight: 44,
                  padding: '9px 15px', border: 'none', cursor: 'pointer',
                  borderRadius: 'var(--xoot-radius-pill)',
                  background: on ? 'var(--xoot-ink-900)' : 'rgba(255,255,255,.6)',
                  color: on ? '#fff' : 'var(--xoot-text-secondary)',
                  fontFamily: 'var(--xoot-font-core)', fontSize: 'var(--xoot-body-sm)', fontWeight: 700,
                  transition: 'all var(--xoot-dur-base) var(--xoot-ease-ios-snap)',
                }}>
                  <span style={{
                    display: 'grid', placeItems: 'center', width: 20, height: 20, borderRadius: '50%',
                    background: done ? 'var(--xoot-sage-500)' : on ? 'rgba(255,255,255,.22)' : 'var(--xoot-neutral-200)',
                    fontSize: 11, fontWeight: 800,
                    color: done ? '#fff' : on ? '#fff' : 'var(--xoot-text-muted)',
                  }}>{done ? '✓' : i + 1}</span>
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ padding: 'clamp(20px, 3vw, 32px)', display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* ── 1 · Sign in ── */}
          {tab === 'start' && (
            <>
              <p style={{ fontSize: 'var(--xoot-body-lg)', lineHeight: 1.6, color: 'var(--xoot-text-secondary)', textWrap: 'pretty', maxWidth: '62ch' }}>
                Xooters set their own hours, pick their own jobs, and keep 70 to 80% of what the
                customer pays. There is no joining fee and no monthly cost — we only earn when you
                do.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 210px), 1fr))', gap: 12 }}>
                {[
                  ['wallet', 'R2 400 – R6 800 a month', 'Typical for part-time hours in a priority suburb'],
                  ['calendar', 'You choose the work', 'Accept and decline freely. No penalty for saying no'],
                  ['graduation-cap', 'Training is free', `${totalModules} modules, ${totalHours} hours, all of it included`],
                ].map(([ic, t, d]) => (
                  <Card key={t} pad="md" tone="flat" style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    <Icon name={ic} size={19} strokeWidth={1.9} color="var(--xoot-violet-600)" />
                    <span style={{ fontSize: 'var(--xoot-body-sm)', fontWeight: 700, lineHeight: 1.3 }}>{t}</span>
                    <span style={{ fontSize: 'var(--xoot-caption)', lineHeight: 1.45, color: 'var(--xoot-text-muted)' }}>{d}</span>
                  </Card>
                ))}
              </div>

              <Card pad="md" style={{ background: 'var(--xoot-surface-sunken)', display: 'flex', flexDirection: 'column', gap: 9 }}>
                <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>What you will need</span>
                <ul style={{ display: 'flex', flexDirection: 'column', gap: 7, margin: 0, padding: 0, listStyle: 'none' }}>
                  {['A South African ID, or a passport with a valid work permit',
                    'Proof of where you live, dated within three months',
                    'A bank account in your own name',
                    'A smartphone that can take a clear photo'].map(x => (
                    <li key={x} style={{ display: 'flex', gap: 9, fontSize: 'var(--xoot-body-sm)', lineHeight: 1.5, color: 'var(--xoot-text-secondary)' }}>
                      <Icon name="check" size={14} strokeWidth={2.6} color="var(--xoot-sage-500)" style={{ flex: '0 0 auto', marginTop: 3 }} />
                      {x}
                    </li>
                  ))}
                </ul>
              </Card>

              {user ? (
                <Button variant="primary" size="lg" block iconRight="arrow-right" onClick={() => setTab('documents')}>
                  Continue to documents
                </Button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <Button variant="primary" size="lg" block onClick={onSignIn}>
                    Sign in to start
                  </Button>
                  <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)', textAlign: 'center' }}>
                    Takes about twenty minutes. You can stop and come back — nothing is lost.
                  </span>
                </div>
              )}
            </>
          )}

          {/* ── 2 · Documents ── */}
          {tab === 'documents' && (
            <>
              {!user && (
                <Card pad="md" style={{ background: 'var(--xoot-honey-wash)', display: 'flex', gap: 11, alignItems: 'flex-start' }}>
                  <Icon name="lock" size={16} strokeWidth={2} color="var(--xoot-honey-ink)" style={{ flex: '0 0 auto', marginTop: 2 }} />
                  <span style={{ fontSize: 'var(--xoot-body-sm)', lineHeight: 1.5, color: 'var(--xoot-text-secondary)' }}>
                    Sign in first so your documents are saved against your account.{' '}
                    <button type="button" onClick={onSignIn} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', font: 'inherit', fontWeight: 700, color: 'var(--xoot-violet-700)', textDecoration: 'underline' }}>Sign in</button>
                  </span>
                </Card>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
                <ProgressRing value={reqDocs ? doneDocs / reqDocs : 0} size={48} />
                <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 'var(--xoot-body-sm)', fontWeight: 700 }}>{doneDocs} of {reqDocs} required documents</span>
                  <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)' }}>Verified within two working days, usually faster</span>
                </span>
              </div>

              {/* The photo guide, before upload rather than after rejection. Four rules, because
                  four rejection reasons account for almost all of them. */}
              <Card pad="md" tone="flat" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>Take the photo like this and it will pass first time</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))', gap: 11 }}>
                  {PHOTO_GUIDE.map(([ic, t, d]) => (
                    <div key={t} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <span style={{
                        display: 'grid', placeItems: 'center', flex: '0 0 auto', width: 30, height: 30,
                        borderRadius: 'var(--xoot-radius-xs)', background: 'var(--xoot-surface-card)',
                      }}>
                        <Icon name={ic} size={14} strokeWidth={2} color="var(--xoot-violet-600)" />
                      </span>
                      <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                        <span style={{ fontSize: 'var(--xoot-body-sm)', fontWeight: 700, lineHeight: 1.25 }}>{t}</span>
                        <span style={{ fontSize: 11.5, lineHeight: 1.45, color: 'var(--xoot-text-muted)' }}>{d}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </Card>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {DOCUMENTS.map(doc => {
                  const st = docs[doc.key];
                  const isOpen = guide === doc.key;
                  const state = !st ? 'none' : st.status;
                  const TONE = { approved: ['sage', 'Approved'], pending: ['honey', 'Checking'], rejected: ['blush', 'Try again'] };
                  const tone = TONE[state];
                  return (
                    <Card key={doc.key} pad="md" style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                        <span style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 'var(--xoot-body)', fontWeight: 700 }}>{doc.title}</span>
                            {!doc.required && <Badge tone="neutral">Optional</Badge>}
                          </span>
                          <span style={{ fontSize: 'var(--xoot-caption)', lineHeight: 1.5, color: 'var(--xoot-text-secondary)' }}>{doc.what}</span>
                        </span>
                        {tone && <Badge tone={state === 'approved' ? 'success' : state === 'rejected' ? 'danger' : 'warning'}>{tone[1]}</Badge>}
                      </div>

                      <button type="button" onClick={() => setGuide(isOpen ? null : doc.key)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 7, alignSelf: 'flex-start',
                          minHeight: 36, padding: 0, border: 'none', background: 'none', cursor: 'pointer',
                          fontFamily: 'var(--xoot-font-core)', fontSize: 'var(--xoot-caption)',
                          fontWeight: 700, color: 'var(--xoot-violet-700)',
                        }}>
                        <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} size={14} strokeWidth={2.4} />
                        {isOpen ? 'Hide the detail' : 'What exactly is needed'}
                      </button>

                      {isOpen && (
                        <div style={{
                          display: 'flex', flexDirection: 'column', gap: 10,
                          padding: '13px 15px', borderRadius: 'var(--xoot-radius-sm)',
                          background: 'var(--xoot-surface-sunken)',
                        }}>
                          <span style={{ fontSize: 'var(--xoot-caption)', lineHeight: 1.55, color: 'var(--xoot-text-secondary)' }}>{doc.why}</span>
                          <ul style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: 0, padding: 0, listStyle: 'none' }}>
                            {doc.rules.map(r => (
                              <li key={r} style={{ display: 'flex', gap: 8, fontSize: 11.5, lineHeight: 1.5, color: 'var(--xoot-text-secondary)' }}>
                                <span style={{ flex: '0 0 auto', width: 4, height: 4, marginTop: 6, borderRadius: '50%', background: 'var(--xoot-violet-400)' }} />
                                {r}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <Button size="sm" variant={state === 'approved' ? 'ghost' : 'outline'} icon="camera"
                        disabled={!user}
                        onClick={() => S.saveDocument(doc.key, 'pending')}>
                        {state === 'none' ? 'Upload' : state === 'rejected' ? 'Upload again' : 'Replace'}
                      </Button>
                    </Card>
                  );
                })}
              </div>

              <Button variant="primary" size="lg" block iconRight="arrow-right"
                disabled={!docsComplete} onClick={() => setTab('training')}>
                {docsComplete ? 'Continue to training' : `${reqDocs - doneDocs} still to upload`}
              </Button>
            </>
          )}

          {/* ── 3 · Training ── */}
          {tab === 'training' && (
            <>
              {(!user || !docsComplete) && (
                <Card pad="md" style={{ background: 'var(--xoot-honey-wash)', display: 'flex', gap: 11, alignItems: 'flex-start' }}>
                  <Icon name="lock" size={16} strokeWidth={2} color="var(--xoot-honey-ink)" style={{ flex: '0 0 auto', marginTop: 2 }} />
                  <span style={{ fontSize: 'var(--xoot-body-sm)', lineHeight: 1.5, color: 'var(--xoot-text-secondary)' }}>
                    You can read the catalogue now. Modules open once your documents are approved —
                    training is what lets you accept work, so it comes after verification.
                  </span>
                </Card>
              )}

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'baseline' }}>
                <span style={{ fontFamily: 'var(--xoot-font-display)', fontSize: 'clamp(20px, 2.4vw, 26px)', lineHeight: 1.15 }}>
                  {totalModules} modules · {totalHours} hours
                </span>
                <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)' }}>
                  Free, at your own pace, on your phone
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                {TRACKS.map(track => {
                  const isOpen = openTrack === track.key;
                  return (
                    <Card key={track.key} pad="none" radius="lg" style={{
                      overflow: 'hidden',
                      boxShadow: track.record ? 'inset 0 0 0 2px var(--xoot-honey-mid)' : undefined,
                    }}>
                      <button type="button" onClick={() => setOpenTrack(isOpen ? null : track.key)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 13, width: '100%',
                          padding: 'clamp(15px, 2vw, 19px)', border: 'none', cursor: 'pointer',
                          textAlign: 'left', background: isOpen ? `var(--xoot-${track.tint}-wash)` : 'transparent',
                          fontFamily: 'var(--xoot-font-core)',
                          transition: 'background var(--xoot-dur-base) var(--xoot-ease-out)',
                        }}>
                        <span style={{
                          display: 'grid', placeItems: 'center', flex: '0 0 auto', width: 42, height: 42,
                          borderRadius: 'var(--xoot-radius-sm)', background: `var(--xoot-${track.tint}-wash)`,
                        }}>
                          <Icon name={track.record ? 'trophy' : track.required ? 'shield-check' : 'graduation-cap'}
                            size={19} strokeWidth={1.9} color={`var(--xoot-${track.tint}-ink)`} />
                        </span>

                        <span style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 'var(--xoot-body)', fontWeight: 700 }}>{track.title}</span>
                            {track.required && <Badge tone="brand">Required</Badge>}
                            {track.record && <Badge tone="warning" icon="trophy">Record attempt</Badge>}
                          </span>
                          <span style={{ fontSize: 'var(--xoot-caption)', lineHeight: 1.45, color: 'var(--xoot-text-secondary)', textWrap: 'pretty' }}>
                            {track.blurb}
                          </span>
                          <span style={{ fontFamily: 'var(--xoot-font-mono)', fontSize: 11, color: 'var(--xoot-text-muted)' }}>
                            {track.modules.length} modules · {track.hours} hrs
                          </span>
                        </span>

                        <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} strokeWidth={2}
                          color="var(--xoot-text-muted)" style={{ flex: '0 0 auto' }} />
                      </button>

                      {isOpen && (
                        <div style={{ display: 'flex', flexDirection: 'column', padding: '0 clamp(15px, 2vw, 19px) clamp(15px, 2vw, 19px)' }}>
                          {track.record && (
                            <div style={{
                              display: 'flex', gap: 11, alignItems: 'flex-start', marginBottom: 13,
                              padding: '14px 16px', borderRadius: 'var(--xoot-radius-sm)',
                              background: 'var(--xoot-honey-wash)',
                            }}>
                              <Icon name="trophy" size={16} strokeWidth={2} color="var(--xoot-honey-ink)" style={{ flex: '0 0 auto', marginTop: 2 }} />
                              <span style={{ fontSize: 'var(--xoot-caption)', lineHeight: 1.55, color: 'var(--xoot-text-secondary)' }}>
                                Submitted to Guinness World Records for consideration as the longest
                                single professionally-produced instructional course on cleaning.
                                Sixty-two hours, filmed with working Xooters in real homes.{' '}
                                <strong>The record is the by-product, not the point</strong> — a
                                Xooter who finishes this knows more about surfaces and chemistry than
                                most professional cleaning managers.
                              </span>
                            </div>
                          )}

                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {track.modules.map(([title, mins, detail], i) => (
                              <div key={title} style={{
                                display: 'flex', gap: 13, alignItems: 'flex-start',
                                padding: '12px 0',
                                borderTop: i ? '1px solid var(--xoot-border-color)' : 'none',
                              }}>
                                <span style={{
                                  flex: '0 0 auto', minWidth: 26, paddingTop: 1,
                                  fontFamily: 'var(--xoot-font-mono)', fontSize: 11,
                                  color: 'var(--xoot-text-muted)',
                                }}>{String(i + 1).padStart(2, '0')}</span>
                                <span style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 0 }}>
                                  <span style={{ fontSize: 'var(--xoot-body-sm)', fontWeight: 700, lineHeight: 1.3, textWrap: 'pretty' }}>{title}</span>
                                  <span style={{ fontSize: 'var(--xoot-caption)', lineHeight: 1.45, color: 'var(--xoot-text-muted)', textWrap: 'pretty' }}>{detail}</span>
                                </span>
                                <span style={{
                                  flex: '0 0 auto', fontFamily: 'var(--xoot-font-mono)', fontSize: 11,
                                  color: 'var(--xoot-text-muted)', paddingTop: 2,
                                }}>{mins >= 60 ? `${Math.round(mins / 60)}h` : `${mins}m`}</span>
                              </div>
                            ))}
                          </div>

                          <Button size="sm" variant="outline" block disabled={!user || !docsComplete}
                            style={{ marginTop: 13 }}
                            onClick={() => S.track('training_start', { track: track.key })}>
                            {!user ? 'Sign in to start' : !docsComplete ? 'Upload documents first' : `Start ${track.title.toLowerCase()}`}
                          </Button>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>

              <Card pad="md" tone="flat" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ flex: '1 1 240px', fontSize: 'var(--xoot-body-sm)', lineHeight: 1.55, color: 'var(--xoot-text-secondary)' }}>
                  Training runs in the app, so you can do it on a taxi or between jobs. Progress
                  syncs with your Xooter dashboard.
                </span>
                <a href="./Xoot%20App.dc.html" style={{ textDecoration: 'none' }}>
                  <Button variant="primary" size="md" icon="phone">Get the app</Button>
                </a>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { XooterOnboarding, XOOT_TRACKS: TRACKS, XOOT_DOCUMENTS: DOCUMENTS });
})();

/* ═══ site/SiteTrust.jsx ════════════════════════════════════════════════════════ */
(function(){
/* ── Trust, safety and security — the mechanisms ───────────────────────────────
 *
 * The existing SafetyTrust section publishes four claims in the present tense that production has
 * never exercised — one user, zero bookings. `blocker.md` flags it, and `BRAND.md` permits "real
 * process evidence, verified reviews, and approved client proof only". So this section describes
 * MECHANISMS and carries an honest status on each, rather than adding a fifth unverifiable
 * guarantee. `safety.ts` sets the rule this follows: no safety promise may be shown before the
 * thing it promises works.
 *
 * Three statuses, and the wording is deliberate:
 *   live      — running today, and a customer can rely on it now.
 *   built     — the code exists and is deployed, but has not been exercised end to end.
 *   at launch — designed and specified; switched off until a named condition is met.
 *
 * Being specific about what is off is what makes the "live" rows worth believing. A page where
 * everything is green teaches people to discount all of it.
 *
 * The access-window demo is the load-bearing piece: it is the one mechanism customers ask about
 * unprompted, and a diagram of a timed release answers it faster than three paragraphs.
 */
const { Card, Button, Icon, Badge, Switch } = window.XootNS;

const STATUS = {
  live: { label: 'Live', tone: 'success' },
  built: { label: 'Built, not yet proven end to end', tone: 'info' },
  launch: { label: 'On at launch', tone: 'warning' },
};

/* The access-window schedule, as data, because the visual and the copy must not be able to
   disagree about it. Minutes are relative to the visit start. */
const WINDOW_STAGES = [
  { at: '−7 days', title: 'You save the details', body: 'Gate code, alarm code, where the key is. Encrypted the moment they leave your phone.', state: 'locked' },
  { at: '−45 min', title: 'The window opens', body: 'Only the assigned Xooter, only for this visit. Not saved to their device.', state: 'open' },
  { at: 'During', title: 'Every view is logged', body: 'You can see who looked, and when. Screenshots are blocked on that screen.', state: 'open' },
  { at: 'Complete', title: 'The window closes', body: 'Access ends with the visit, not at the end of the day.', state: 'locked' },
  { at: '+7 days', title: 'The codes are deleted', body: 'Not archived. The shortest retention of anything on the platform.', state: 'gone' },
];

const MECHANISMS = [
  {
    icon: 'lock', tint: 'lilac', status: 'built',
    title: 'Access windows',
    body: 'Your gate and alarm codes are a timed release, not saved data a Xooter can browse. They unlock 45 minutes before the visit and lock again when it completes.',
    points: [
      'Encrypted at rest under a key that is different on every environment',
      'Released to one Xooter, for one visit',
      'Deleted seven days after the visit',
    ],
    note: 'Deployed and encrypted. Not yet proven by a code stored and read back through the app, which is the only test that counts.',
  },
  {
    icon: 'camera', tint: 'mist', status: 'built',
    title: 'Screenshots blocked',
    body: 'The screen showing your access details cannot be captured, and it blanks when the app goes to the background or into the app switcher.',
    points: [
      'Android: capture is prevented outright',
      'iOS: capture is detected and logged, and you are told',
      'The screen blanks on backgrounding on both',
    ],
    note: 'Honest limit: on iOS the platform allows detection, not prevention, and no software stops a second phone photographing a screen. This is one layer — the seven-day deletion and the revoke switch are the ones that matter.',
  },
  {
    icon: 'x', tint: 'blush', status: 'built',
    title: 'Revoke access, instantly',
    body: 'One switch in the app cuts a Xooter\'s access to your details immediately — mid-visit if you need it. No support call, no waiting.',
    points: [
      'Takes effect at the next read, not at the next sync',
      'The Xooter is told access was withdrawn, not why',
      'Revoking does not cancel the visit, and does not charge you',
    ],
  },
  {
    icon: 'phone', tint: 'careplus', status: 'launch',
    title: 'SOS — for both sides',
    body: 'Hold the button and your live location goes to the Xoot safety team, with a direct line to emergency services. It is on the Xooter\'s screen as well as yours.',
    points: [
      'A lone worker in a stranger\'s home is the person most exposed here',
      'A cancel PIN is required once an alert has dispatched',
      'The Xooter can end a visit and leave, without penalty, at any time',
    ],
    note: 'Deliberately switched off. It turns on when 112 has been dialled from a real handset and an ops person has confirmed they received the alert — not before. Every step has a failure mode where the button looks like it works, and a person in trouble pressing something that does nothing is worse than no button.',
  },
  {
    icon: 'message-circle', tint: 'sage', status: 'live',
    title: 'Nobody swaps phone numbers',
    body: 'Messages and calls run through Xoot. Your number is never shown to a Xooter, and theirs is never shown to you.',
    points: [
      'Chat is tied to the booking and ends with it',
      'No recording and no transcription, by default and by design',
      'Reportable in one tap, read by a person',
    ],
  },
  {
    icon: 'badge-check', tint: 'honey', status: 'launch',
    title: 'Vetted before the first door',
    body: 'A South African ID or a passport with a valid work permit, proof of residence under three months old, bank details in their own name, a criminal record check, and required training completed.',
    points: [
      'Documents are certified and re-checked, not collected once',
      'Bank details must match the person — we do not pay third parties',
      'Training is a gate on accepting work, not a suggestion',
    ],
    note: 'The screening pipeline is built and the queues exist. No Xooter has been through it yet, so this reads as what will be required rather than as a record we can point to.',
  },
];

function TrustMechanisms({ onBook }) {
  const stacked = useNarrow(880);
  const [stage, setStage] = React.useState(1);
  const [revoked, setRevoked] = React.useState(false);

  const current = WINDOW_STAGES[stage];
  const shown = revoked ? 'gone' : current.state;

  return (
    <Section id="trust" tone="alt">
      <SectionHead
        eyebrow="Trust, safety and security"
        title="Letting someone into your home is the whole ask."
        sub="So the mechanisms are worth describing precisely — including the ones that are not switched on yet, and why."
        maxWidth={640}
      />

      {/* The access-window demo. Scrubbing a timeline explains a timed release in about four
          seconds; a paragraph does not. */}
      <Card pad="lg" radius="xl" style={{ marginTop: 40, boxShadow: 'var(--xoot-shadow-3)' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
          gap: 'clamp(24px, 3.4vw, 44px)', alignItems: 'start',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>Access window</span>
              <h3 style={{ fontFamily: 'var(--xoot-font-display)', fontSize: 'clamp(22px, 2.6vw, 30px)', lineHeight: 1.14, letterSpacing: '-.018em' }}>
                Your codes exist for one visit, then stop existing.
              </h3>
            </div>

            {/* Tap a stage rather than drag a slider: five discrete states, and a slider implies
                values in between that do not exist. */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {WINDOW_STAGES.map((s, i) => {
                const on = i === stage;
                return (
                  <button key={s.at} type="button" onClick={() => { setStage(i); setRevoked(false); }}
                    style={{
                      display: 'flex', gap: 13, alignItems: 'flex-start', minHeight: 48,
                      padding: '11px 13px', border: 'none', cursor: 'pointer', textAlign: 'left',
                      borderRadius: 'var(--xoot-radius-sm)',
                      background: on ? 'var(--xoot-action-brand-soft)' : 'transparent',
                      transition: 'background var(--xoot-dur-fast) var(--xoot-ease-out)',
                      fontFamily: 'var(--xoot-font-core)',
                    }}>
                    <span style={{
                      flex: '0 0 auto', minWidth: 58, paddingTop: 1,
                      fontFamily: 'var(--xoot-font-mono)', fontSize: 11,
                      color: on ? 'var(--xoot-violet-700)' : 'var(--xoot-text-muted)',
                    }}>{s.at}</span>
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                      <span style={{
                        fontSize: 'var(--xoot-body-sm)', fontWeight: 700,
                        color: on ? 'var(--xoot-violet-800)' : 'var(--xoot-text-primary)',
                      }}>{s.title}</span>
                      <span style={{ fontSize: 'var(--xoot-caption)', lineHeight: 1.45, color: 'var(--xoot-text-secondary)' }}>{s.body}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* What the Xooter's screen actually shows at the selected moment. */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{
              position: 'relative', overflow: 'hidden',
              padding: 'clamp(18px, 2.4vw, 24px)', borderRadius: 'var(--xoot-radius-lg)',
              background: shown === 'open' ? 'var(--xoot-surface-card)' : 'var(--xoot-ink-900)',
              boxShadow: shown === 'open' ? 'inset 0 0 0 1.5px var(--xoot-sage-mid)' : 'none',
              minHeight: 232,
              transition: 'background var(--xoot-dur-base) var(--xoot-ease-out)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 18 }}>
                <span style={{
                  fontFamily: 'var(--xoot-font-mono)', fontSize: 10, letterSpacing: '.12em',
                  textTransform: 'uppercase',
                  color: shown === 'open' ? 'var(--xoot-text-muted)' : 'rgba(255,255,255,.45)',
                }}>Xooter's screen</span>
                <Badge tone={shown === 'open' ? 'success' : 'neutral'}
                  icon={shown === 'open' ? 'key' : shown === 'gone' ? 'trash-2' : 'lock'}>
                  {shown === 'open' ? 'Unlocked' : shown === 'gone' ? (revoked ? 'Revoked' : 'Deleted') : 'Locked'}
                </Badge>
              </div>

              {shown === 'open' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                  {[['Gate code', '1408#'], ['Alarm', '2277'], ['Entry', 'Side gate — key under the pot']].map(([l, v]) => (
                    <div key={l} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--xoot-text-muted)' }}>{l}</span>
                      <span style={{ fontFamily: 'var(--xoot-font-mono)', fontSize: 17, fontWeight: 500 }}>{v}</span>
                    </div>
                  ))}
                  <span style={{
                    display: 'flex', alignItems: 'center', gap: 7, marginTop: 4,
                    fontSize: 'var(--xoot-caption)', color: 'var(--xoot-sage-ink)',
                  }}>
                    <Icon name="camera" size={14} strokeWidth={2} />
                    Screenshots blocked · this view is logged
                  </span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 11, paddingTop: 8 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <span style={{ height: 7, width: ['38%', '30%', '44%'][i], borderRadius: 3, background: 'rgba(255,255,255,.16)' }} />
                      <span style={{ height: 13, width: ['52%', '40%', '72%'][i], borderRadius: 4, background: 'rgba(255,255,255,.09)' }} />
                    </div>
                  ))}
                  <span style={{
                    display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 6,
                    fontSize: 'var(--xoot-caption)', lineHeight: 1.45, color: 'rgba(255,255,255,.62)',
                  }}>
                    <Icon name="lock" size={14} strokeWidth={2} style={{ flex: '0 0 auto', marginTop: 2 }} />
                    {shown === 'gone'
                      ? (revoked ? 'You withdrew access. It stopped at the next read.' : 'Deleted seven days after the visit. Nothing to release.')
                      : 'Nothing to show. The window is closed.'}
                  </span>
                </div>
              )}
            </div>

            {/* Revoke, as a switch you can actually throw. It overrides whatever stage is
                selected, because that is exactly what it does in the app. */}
            <Card pad="md" tone="flat" style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              <Switch
                label="Revoke this Xooter's access"
                description={revoked ? 'Withdrawn. The visit is unaffected and you are not charged.' : 'Available at any time, including mid-visit.'}
                checked={revoked}
                onChange={setRevoked}
              />
            </Card>
          </div>
        </div>
      </Card>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
        gap: 16, marginTop: 20,
      }}>
        {MECHANISMS.map(m => {
          const st = STATUS[m.status];
          return (
            <Card key={m.title} pad="lg" radius="lg" style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <span style={{
                  display: 'grid', placeItems: 'center', flex: '0 0 auto',
                  width: 44, height: 44, borderRadius: 'var(--xoot-radius-sm)',
                  background: `var(--xoot-${m.tint}-wash)`,
                }}>
                  <Icon name={m.icon} size={20} strokeWidth={1.9} color={`var(--xoot-${m.tint}-ink)`} />
                </span>
                <Badge tone={st.tone}>{st.label}</Badge>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                <h3 style={{ fontSize: 'var(--xoot-title-3)', fontWeight: 700, letterSpacing: '-.01em' }}>{m.title}</h3>
                <p style={{ fontSize: 'var(--xoot-body-sm)', lineHeight: 1.55, color: 'var(--xoot-text-secondary)', textWrap: 'pretty' }}>{m.body}</p>
              </div>

              <ul style={{ display: 'flex', flexDirection: 'column', gap: 7, margin: 0, padding: 0, listStyle: 'none' }}>
                {m.points.map(pt => (
                  <li key={pt} style={{ display: 'flex', gap: 9, fontSize: 'var(--xoot-caption)', lineHeight: 1.5, color: 'var(--xoot-text-secondary)' }}>
                    <span style={{ flex: '0 0 auto', width: 4, height: 4, marginTop: 7, borderRadius: '50%', background: `var(--xoot-${m.tint}-500)` }} />
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>

              {m.note && (
                <div style={{
                  display: 'flex', gap: 9, marginTop: 'auto', padding: '11px 13px',
                  borderRadius: 'var(--xoot-radius-xs)', background: 'var(--xoot-surface-sunken)',
                }}>
                  <Icon name="info" size={14} strokeWidth={2} color="var(--xoot-text-muted)" style={{ flex: '0 0 auto', marginTop: 2 }} />
                  <span style={{ fontSize: 11.5, lineHeight: 1.5, color: 'var(--xoot-text-muted)' }}>{m.note}</span>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <Card pad="lg" radius="lg" tone="flat" style={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between',
        gap: 16, marginTop: 20,
      }}>
        <p style={{ flex: '1 1 300px', fontSize: 'var(--xoot-body-sm)', lineHeight: 1.55, color: 'var(--xoot-text-secondary)', textWrap: 'pretty' }}>
          The full policy — what we hold, who sees it, how long it stays and how to get it deleted —
          is written out rather than summarised.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <a href="./Xoot%20Legal.dc.html#trust-safety" style={{ textDecoration: 'none' }}>
            <Button variant="outline" size="md">Trust &amp; safety policy</Button>
          </a>
          <a href="./Xoot%20Legal.dc.html#popia" style={{ textDecoration: 'none' }}>
            <Button variant="ghost" size="md">POPIA notice</Button>
          </a>
        </div>
      </Card>
    </Section>
  );
}

Object.assign(window, { TrustMechanisms });
})();

/* ═══ site/SiteMap.jsx ════════════════════════════════════════════════════════ */
(function(){
/* ── Coverage map ──────────────────────────────────────────────────────────────
 *
 * The old one was an abstract blob over a grid — a decoration in the shape of a map, which told a
 * visitor nothing about whether their suburb is covered. That is the only question this section
 * exists to answer.
 *
 * So this is drawn from real coordinates: the South African outline, the nine provinces' shared
 * borders simplified, Lesotho as an actual hole rather than a painted-over patch, and Gauteng
 * picked out. The inset zooms Gauteng and plots the priority suburbs at their true positions.
 *
 * Every point below is a real longitude/latitude, projected once by `project()`. Hand-writing SVG
 * path strings would have been faster and would have made the inset impossible to keep aligned
 * with the main map — the same projector drives both, at different scales.
 *
 * Simplification is deliberate and heavy: this is a coverage diagram at 400px, not a survey. The
 * coastline reads correctly at a glance, which is the requirement.
 */
/* Site layout primitives, published by SiteBody — read at RENDER time, not module-eval time,
   because SiteMap may evaluate before SiteBody in the load chain. */

/* Outline, clockwise from the Orange River mouth on the west coast. */
const SA = [
  [16.45,-28.58],[17.4,-30.1],[17.9,-31.4],[18.2,-32.6],[18.35,-33.5],[18.45,-34.35],
  [19.3,-34.83],[20.9,-34.4],[22.6,-34.0],[24.8,-34.2],[25.7,-34.0],[26.9,-33.7],
  [28.0,-32.7],[29.2,-31.5],[30.2,-30.9],[31.1,-29.9],[31.6,-29.2],[32.4,-28.5],
  [32.9,-27.0],[32.89,-26.85],[32.0,-26.4],[31.9,-25.9],[31.3,-25.7],[31.0,-25.4],
  [31.5,-24.4],[31.9,-24.1],[31.3,-22.4],[30.3,-22.35],[29.4,-22.2],[28.2,-22.7],
  [27.5,-23.4],[26.9,-24.3],[26.0,-24.7],[25.6,-25.5],[24.7,-25.8],[23.9,-25.6],
  [23.0,-25.3],[22.6,-26.1],[21.7,-26.7],[20.9,-26.8],[20.6,-26.5],[20.0,-25.6],
  [19.98,-24.77],[19.98,-28.46],[19.0,-28.9],[18.0,-28.9],[17.0,-28.15],
];

/* Lesotho — an independent country entirely inside South Africa, so it is a hole in the fill.
   Painting over it would be geographically wrong and anyone from here would notice. */
const LESOTHO = [
  [27.0,-29.6],[27.8,-30.1],[28.7,-30.6],[29.4,-30.3],[29.3,-29.6],[28.6,-28.6],
  [27.7,-28.6],[27.0,-29.0],
];

/* Gauteng. Smallest province, largest economy — and the whole of our coverage. */
const GAUTENG = [
  [27.0,-25.6],[27.6,-25.3],[28.0,-25.15],[28.5,-25.35],[29.0,-25.7],[29.05,-26.3],
  [28.6,-26.9],[27.9,-27.05],[27.3,-26.85],[26.95,-26.3],
];

/* Priority suburbs at true coordinates. `p` marks the ones with deepest supply. */
const PLACES = [
  ['Pretoria', 28.188, -25.746, true],
  ['Centurion', 28.19, -25.86, false],
  ['Midrand', 28.13, -25.99, true],
  ['Fourways', 28.01, -26.02, true],
  ['Bryanston', 28.02, -26.06, true],
  ['Sandton', 28.056, -26.107, true],
  ['Randburg', 27.99, -26.09, false],
  ['Rosebank', 28.041, -26.146, true],
  ['Kempton Park', 28.23, -26.10, false],
  ['Roodepoort', 27.87, -26.16, false],
  ['Johannesburg', 28.047, -26.204, true],
  ['Benoni', 28.32, -26.19, false],
  ['Alberton', 28.12, -26.27, false],
  ['Soweto', 27.86, -26.27, true],
];

/* One projector for both maps. Equirectangular with a cosine correction at the mean latitude —
   at this extent that is visually indistinguishable from a proper conic and far simpler to reason
   about when placing a label. */
function makeProjector(pts, w, h, pad) {
  const lons = pts.map(p => p[0]), lats = pts.map(p => p[1]);
  const lon0 = Math.min(...lons), lon1 = Math.max(...lons);
  const lat0 = Math.min(...lats), lat1 = Math.max(...lats);
  const k = Math.cos((lat0 + lat1) / 2 * Math.PI / 180);
  const dx = (lon1 - lon0) * k, dy = lat1 - lat0;
  const s = Math.min((w - pad * 2) / dx, (h - pad * 2) / dy);
  const ox = (w - dx * s) / 2, oy = (h - dy * s) / 2;
  return (lon, lat) => [ox + (lon - lon0) * k * s, oy + (lat1 - lat) * s];
}

const toPath = (ring, P) => ring.map((p, i) => (i ? 'L' : 'M') + P(p[0], p[1]).map(n => n.toFixed(1)).join(' ')).join(' ') + ' Z';

function ServiceAreaMap({ onBook }) {
  const D = window.XootData;
  const { Section, SectionHead } = window;
  const [hover, setHover] = React.useState(null);

  const P = React.useMemo(() => makeProjector(SA, 400, 340, 14), []);
  const Z = React.useMemo(() => makeProjector(GAUTENG, 400, 340, 46), []);

  return (
    <Section tone="alt">
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))',
        gap: 'clamp(28px, 4vw, 48px)', alignItems: 'center',
      }}>
        <div>
          <SectionHead
            eyebrow="Where we operate"
            title="All of Gauteng. Deepest where we started."
            squiggle="All of Gauteng"
            sub="Density beats coverage — one Xooter in a distant town means a booking that gets cancelled. So we built supply properly in Johannesburg first, and anywhere in Gauteng is bookable. Outside the priority suburbs it may take a little longer to match you; nobody is turned away for being on the wrong side of a drawn circle."
            maxWidth={480}
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: -20 }}>
            {D.prioritySuburbs.map(a => (
              <span key={a}
                onMouseEnter={() => setHover(a)} onMouseLeave={() => setHover(null)}
                style={{
                  padding: '8px 14px', borderRadius: 'var(--xoot-radius-pill)',
                  background: hover === a ? 'var(--xoot-violet-500)' : 'var(--xoot-surface-card)',
                  color: hover === a ? '#fff' : 'inherit',
                  boxShadow: hover === a ? 'none' : 'inset 0 0 0 1px var(--xoot-border-color)',
                  fontSize: 'var(--xoot-body-sm)', fontWeight: 600, cursor: 'default',
                  transition: 'all var(--xoot-dur-fast) var(--xoot-ease-out)',
                }}>{a}</span>
            ))}
            <span style={{
              padding: '8px 14px', borderRadius: 'var(--xoot-radius-pill)',
              background: 'var(--xoot-violet-50)', color: 'var(--xoot-violet-800)',
              fontSize: 'var(--xoot-body-sm)', fontWeight: 700,
            }}>… and anywhere else in Gauteng</span>
          </div>
        </div>

        <div style={{
          position: 'relative', aspectRatio: '4 / 3.4', borderRadius: 'var(--xoot-radius-xl)',
          overflow: 'hidden', background: 'var(--xoot-surface-page)', boxShadow: 'var(--xoot-shadow-3)',
        }}>
          <svg viewBox="0 0 400 340" role="img"
            aria-label="Map of South Africa with Gauteng highlighted, and an inset showing the Johannesburg and Pretoria suburbs Xoot serves"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
            <defs>
              <clipPath id="xt-sa"><path d={toPath(SA, P)} /></clipPath>
            </defs>

            {/* The country. Lesotho is subtracted with evenodd rather than covered. */}
            <path d={toPath(SA, P) + ' ' + toPath(LESOTHO, P)} fillRule="evenodd"
              fill="var(--xoot-neutral-200)" stroke="var(--xoot-neutral-400)" strokeWidth="1.1"
              strokeLinejoin="round" />

            {/* Gauteng, the served province. */}
            <path d={toPath(GAUTENG, P)} clipPath="url(#xt-sa)"
              fill="var(--xoot-violet-500)" fillOpacity=".9"
              stroke="var(--xoot-violet-700)" strokeWidth="1.2" strokeLinejoin="round" />

            {/* A leader from the province to the inset, so the zoom is legible as a zoom. */}
            {(() => {
              const g = P(28.1, -26.1);
              return (
                <g>
                  <circle cx={g[0]} cy={g[1]} r="16" fill="none"
                    stroke="var(--xoot-violet-500)" strokeWidth="1.2" strokeDasharray="3 4" opacity=".8" />
                  <line x1={g[0] - 15} y1={g[1] + 9} x2="190" y2="176"
                    stroke="var(--xoot-violet-400)" strokeWidth="1.3" strokeDasharray="3 4" />
                </g>
              );
            })()}

            <text x={P(25.0, -28.2)[0]} y={P(25.0, -28.2)[1]} textAnchor="middle"
              style={{ fontSize: 11, fontWeight: 700, fill: 'var(--xoot-text-muted)', letterSpacing: '.08em' }}>
              SOUTH AFRICA
            </text>
            <text x={P(28.5, -29.5)[0]} y={P(28.5, -29.5)[1]} textAnchor="middle"
              style={{ fontSize: 8, fontWeight: 600, fill: 'var(--xoot-text-muted)' }}>
              LESOTHO
            </text>

            {/* ── The inset: Gauteng at scale, with the real suburbs ── */}
            <g transform="translate(16, 178) scale(.42)">
              <rect x="-14" y="-14" width="428" height="368" rx="26"
                fill="var(--xoot-surface-card)" stroke="var(--xoot-violet-200)" strokeWidth="2.6" />
              <path d={toPath(GAUTENG, Z)} fill="var(--xoot-violet-50)"
                stroke="var(--xoot-violet-500)" strokeWidth="2.4" strokeLinejoin="round" />

              {PLACES.map(([name, lon, lat, priority]) => {
                const [x, y] = Z(lon, lat);
                const on = hover === name;
                return (
                  <g key={name}>
                    {priority && <circle cx={x} cy={y} r={on ? 26 : 19} fill="var(--xoot-violet-500)" opacity={on ? '.3' : '.15'} />}
                    <circle cx={x} cy={y} r={priority ? 9 : 6.5}
                      fill={priority ? 'var(--xoot-violet-600)' : 'var(--xoot-surface-card)'}
                      stroke={priority ? 'none' : 'var(--xoot-violet-500)'} strokeWidth="3" />
                  </g>
                );
              })}

              {/* Only the anchors are labelled — fourteen labels at this size is a smudge. */}
              {[['Pretoria', 28.188, -25.746, 'start', 16, 5],
                ['Sandton', 28.056, -26.107, 'end', -16, 0],
                ['Soweto', 27.86, -26.27, 'end', -14, 12],
                ['Benoni', 28.32, -26.19, 'start', 15, 4]].map(([n, lon, lat, anchor, dx, dy]) => {
                const [x, y] = Z(lon, lat);
                return (
                  <text key={n} x={x + dx} y={y + dy} textAnchor={anchor}
                    style={{ fontSize: 21, fontWeight: 700, fill: 'var(--xoot-text-primary)' }}>{n}</text>
                );
              })}
              <text x="200" y="342" textAnchor="middle"
                style={{ fontSize: 20, fontWeight: 800, letterSpacing: '.14em', fill: 'var(--xoot-violet-700)' }}>
                GAUTENG
              </text>
            </g>
          </svg>

          <div style={{
            position: 'absolute', left: 16, bottom: 16, display: 'flex', flexDirection: 'column', gap: 7,
            padding: '11px 15px', borderRadius: 'var(--xoot-radius-md)',
            background: 'var(--xoot-glass-light)', backdropFilter: 'blur(var(--xoot-glass-blur))',
            boxShadow: 'var(--xoot-shadow-glass)',
          }}>
            {[['var(--xoot-violet-600)', 'Deepest supply', true], ['transparent', 'Also covered', false]].map(([bg, label, solid]) => (
              <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  width: 10, height: 10, borderRadius: '50%', background: bg,
                  boxShadow: solid ? 'none' : 'inset 0 0 0 2px var(--xoot-violet-500)',
                }} />
                <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--xoot-text-secondary)' }}>{label}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}

Object.assign(window, { ServiceAreaMap });
})();

/* ═══ site/SiteRefer.jsx ════════════════════════════════════════════════════════ */
(function(){
/* ── Refer & earn, on the website ─────────────────────────────────────────────
 *
 * The app had a referral screen; the site had nothing, so a link shared to WhatsApp landed on a
 * homepage that never mentioned the R100 the sender had just promised. That gap is where referral
 * programmes die — the recipient assumes they were sent an advert.
 *
 * Two pieces here, and the first matters more than the second:
 *
 *   ReferralWelcome — the bar that appears when you arrive on someone's link. It names the friend,
 *   states the amount, and says when it comes off. It is not dismissible-by-default noise: it is
 *   the only proof the recipient has that the link did something.
 *
 *   ReferSection — the section for people already using Xoot, which is the same offer stated from
 *   the other side, with their real code and their real invite list.
 */
function ReferralWelcome({ onBook }) {
  const { Icon, Button } = window.CareDesignSystem_ed2067;
  const RF = window.XootRefer.useRefer();
  const d = RF.pendingDiscount();
  if (!d) return null;

  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'clamp(10px, 2vw, 18px)',
      padding: 'clamp(13px, 2vw, 16px) clamp(16px, 3vw, 28px)',
      background: 'var(--xoot-violet-600)', color: '#fff',
    }}>
      <Icon name="gift" size={19} strokeWidth={2} color="#fff" style={{ flex: '0 0 auto' }} />
      <span style={{ flex: '1 1 260px', fontSize: 'var(--xoot-body-sm)', lineHeight: 1.5, minWidth: 0 }}>
        <strong>{d.from} sent you R{d.amount} off your first clean.</strong>{' '}
        <span style={{ opacity: .88 }}>It comes off automatically at checkout — no code to remember.</span>
      </span>
      <Button size="sm" variant="surface" onClick={onBook}>Book a clean</Button>
    </div>
  );
}

function ReferSection({ onBook, onSignIn }) {
  const { Icon, Button, Card, Avatar, Badge } = window.CareDesignSystem_ed2067;
  const { Section, SectionHead } = window;
  const RF = window.XootRefer.useRefer();
  const S = window.XootSession;
  const s = RF.summary();
  const signedIn = !!S.user;
  const [copied, setCopied] = React.useState(null);

  const flash = k => { setCopied(k); window.setTimeout(() => setCopied(null), 2200); };
  async function doShare() {
    const r = await RF.share();
    if (r.ok) flash(r.via === 'sheet' ? 'shared' : 'link');
  }

  const STEPS = [
    ['send', 'Send your link', 'One tap. WhatsApp, message, however you talk to them.'],
    ['sparkles', 'They save R' + s.reward, 'It comes off their first booking automatically — nothing to type in.'],
    ['wallet', 'You get R' + s.reward, 'Into your XootCred once that first visit is booked and paid.'],
  ];

  return (
    <Section tone="alt" id="refer">
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
        gap: 'clamp(28px, 4vw, 52px)', alignItems: 'start',
      }}>
        <div>
          <SectionHead
            eyebrow="Refer & earn"
            title={'R' + s.reward + ' for them. R' + s.reward + ' for you.'}
            squiggle={'R' + s.reward + ' for you'}
            sub="The people who trust us most found us through someone they already trusted. So the offer runs both ways and the amounts match — nobody should feel like they are selling to their neighbour."
            maxWidth={470}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(14px, 2vw, 20px)', marginTop: -14 }}>
            {STEPS.map(([icon, title, body], n) => (
              <div key={title} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <span style={{
                  display: 'grid', placeItems: 'center', flex: '0 0 auto',
                  width: 40, height: 40, borderRadius: 'var(--xoot-radius-md)',
                  background: 'var(--xoot-violet-50)',
                }}>
                  <Icon name={icon} size={18} strokeWidth={1.9} color="var(--xoot-violet-700)" />
                </span>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                  <span style={{ fontSize: 'var(--xoot-body)', fontWeight: 700, lineHeight: 1.3 }}>{title}</span>
                  <span style={{ fontSize: 'var(--xoot-body-sm)', color: 'var(--xoot-text-secondary)', lineHeight: 1.55 }}>{body}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        <Card pad="lg" radius="xl" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {signedIn ? (
            <>
              <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>Your code</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
                <span style={{
                  flex: '1 1 180px', minHeight: 56, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 'var(--xoot-radius-md)', background: 'var(--xoot-surface-page-alt)',
                  fontFamily: 'var(--xoot-font-mono)', fontSize: 'clamp(17px, 2.4vw, 21px)', letterSpacing: '.08em',
                }}>{s.code}</span>
                <Button variant="primary" icon="handshake" onClick={doShare}>
                  {copied === 'link' ? 'Link copied' : copied === 'shared' ? 'Shared' : 'Share link'}
                </Button>
              </div>

              <span style={{ height: 1, background: 'var(--xoot-border-color)' }} />

              {s.invites.length ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {s.invites.slice().reverse().slice(0, 4).map(i => (
                    <div key={i.to + i.at} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                      <Avatar name={i.name} size="sm" />
                      <span style={{ flex: 1, minWidth: 0, fontSize: 'var(--xoot-body-sm)', fontWeight: 600 }}>{i.name}</span>
                      <Badge size="sm" tone={i.state === 'booked' ? 'success' : i.state === 'joined' ? 'warning' : 'neutral'}>
                        {i.state === 'booked' ? '+R' + s.reward : i.state === 'joined' ? 'Pending' : 'Sent'}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <span style={{ fontSize: 'var(--xoot-body-sm)', color: 'var(--xoot-text-muted)', lineHeight: 1.55 }}>
                  Nobody yet. Whoever opens your link appears here — sent, then joined, then booked.
                </span>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 'var(--xoot-body-sm)', fontWeight: 700 }}>Earned so far</span>
                <span style={{ fontFamily: 'var(--xoot-font-mono)', fontSize: 'var(--xoot-body)', color: 'var(--xoot-sage-ink)' }}>R{s.earned}</span>
              </div>
              <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)', lineHeight: 1.55 }}>
                Paid on their first completed booking, not on sign-up — a sign-up isn't a clean.
                Up to {s.cap} friends a year.
              </span>
            </>
          ) : (
            <>
              <span style={{
                display: 'grid', placeItems: 'center', width: 54, height: 54,
                borderRadius: 'var(--xoot-radius-lg)', background: 'var(--xoot-violet-50)',
              }}>
                <Icon name="handshake" size={26} strokeWidth={1.7} color="var(--xoot-violet-700)" />
              </span>
              <span style={{ fontFamily: 'var(--xoot-font-display)', fontSize: 'var(--xoot-display-4)', lineHeight: 1.1 }}>
                Your code is waiting
              </span>
              <span style={{ fontSize: 'var(--xoot-body-sm)', color: 'var(--xoot-text-secondary)', lineHeight: 1.6 }}>
                Sign in and you get a code built from your own name — short enough to say out loud
                over a fence, which is where most of ours actually get shared.
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                <Button variant="primary" onClick={onSignIn}>Sign in to get your code</Button>
                <Button variant="ghost" onClick={onBook}>Book a clean first</Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </Section>
  );
}

Object.assign(window, { ReferSection, ReferralWelcome });
})();

/* ═══ site/SiteExtra.jsx ════════════════════════════════════════════════════════ */
(function(){
/* Xoot marketing site — reviews, merch, and the bug bounty programme.

   Kept in its own file because SiteFoot.jsx was already carrying six sections; a marketing
   page grows by accretion and splitting it early is cheaper than splitting it later. */
const D = window.XootData;
/* Section and SectionHead are NOT in this destructure on purpose: they are SiteBody.jsx
   locals on the global scope, not design-system components. Pulling them from XootNS returned
   a placeholder and — because a top-level const leaks into the shared Babel scope — replaced
   the working ones for every other site file too. */
const {
  Button, Icon, Card, Badge, Rating, Avatar,
  XootCharacter, ScrollReveal, StoreBadges, CarePlusMark,
  WashiTape, Squiggled, DoodleArrow, HandNote,
} = window.XootNS;

/* ── Reviews ───────────────────────────────────────────────────────────────
   Real-shaped reviews: a first name and surname initial, a suburb, the service they actually
   booked, and a sentence that sounds like a person rather than a testimonial. The service tag
   matters more than it looks — a five-star review is generic, but "Airbnb turnover in
   Rosebank" tells a host that someone with their exact problem was happy.

   Five stars on every card would read as fabricated, so one is four. A review section with no
   variance is the least credible kind. */
const REVIEWS = [
  { name: 'Thandi M.', where: 'Bryanston', service: 'Regular cleaning', stars: 5,
    text: 'I stopped dreading Sunday nights. Nomsa knows the house now — I do not have to explain anything.' },
  { name: 'Ruan V.', where: 'Rosebank', service: 'Airbnb turnover', stars: 5,
    text: 'Turnovers timed to my checkout. Three years of guests and not one complaint about the place being dirty.' },
  { name: 'Sipho D.', where: 'Sandton', service: 'Office cleaning', stars: 4,
    text: 'Office is spotless every Monday. Only knock is I wish I could book further ahead than a month.' },
  { name: 'Nadia K.', where: 'Fourways', service: 'Moving clean', stars: 5,
    text: 'Booked the day before I moved out. Got my full deposit back, which has never once happened to me.' },
  { name: 'Lerato P.', where: 'Melville', service: 'Laundry & ironing', stars: 5,
    text: 'The ironing alone gives me back two hours a week. That is the whole review, really.' },
  { name: 'Johan B.', where: 'Midrand', service: 'Express cleaning', stars: 5,
    text: 'Booked at 8am, someone was there by 11. I had family arriving and Xoot genuinely saved me.' },
];

function Reviews() {
  return (
    <Section id="reviews">
      <SectionHead
        eyebrow="What people say"
        title="Booked, cleaned, and left alone."
        squiggle="left alone"
        sub="Reviews come from customers after a completed visit — every one is tied to a real booking."
        align="center" maxWidth={560}
      />

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
        gap: 20, marginTop: 52,
      }}>
        {REVIEWS.map((r, i) => (
          <ScrollReveal key={r.name} delay={i * 80}>
            <Card pad="lg" radius="lg" style={{ position: 'relative', overflow: 'visible', display: 'flex', flexDirection: 'column', gap: 14, height: '100%' }}>
              <WashiTape
                colour={['honey', 'blush', 'sage', 'mist', 'petal', 'lilac'][i % 6]}
                seed={i + 2} width={92} height={28}
                top={-11} {...(i % 2 ? { left: -14 } : { right: -14 })}
                rotate={i % 2 ? -20 : 17}
              />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <Rating value={r.stars} size={16} showNumber={false} />
                <Badge tone="neutral" size="sm">{r.service}</Badge>
              </div>
              <p style={{
                flex: 1, fontFamily: 'var(--xoot-font-display)', fontSize: 'var(--xoot-title-3)',
                lineHeight: 1.45, color: 'var(--xoot-text-primary)',
              }}>{r.text}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar name={r.name} size="sm" />
                <span style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 'var(--xoot-body-sm)', fontWeight: 700 }}>{r.name}</span>
                  <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)' }}>{r.where}</span>
                </span>
              </div>
            </Card>
          </ScrollReveal>
        ))}
      </div>
    </Section>
  );
}

/* ── Merch ─────────────────────────────────────────────────────────────────
   Coming soon, and honest about it. A waitlist that says "coming soon" and takes an email is
   fine; one that looks shoppable and then fails at checkout is not, so nothing here is priced
   or has an Add to basket.

   The two lines are deliberate: the room spray is what a customer smells when they walk in
   after a visit, and the attire is what a Xooter arrives in. Both are the brand as a physical
   object rather than merchandise for its own sake. */
const MERCH = [
  { icon: 'spray-can', tint: 'sage', name: 'Xoot room spray',
    detail: 'The scent a Xooter leaves behind. Three notes, made in Joburg, no synthetic musk.',
    tag: 'Home' },
  { icon: 'shirt', tint: 'violet', name: 'Xooter attire',
    detail: 'What Xooters arrive in — hard-wearing, breathable, and recognisable at the gate.',
    tag: 'For Xooters' },
  { icon: 'droplet', tint: 'mist', name: 'Surface kit',
    detail: 'The products used on premium finishes. Marble, brass and treated wood safe.',
    tag: 'Home' },
];

const MERCH_TINT = {
  sage:   { wash: 'var(--xoot-sage-wash)',   ink: 'var(--xoot-sage-ink)' },
  violet: { wash: 'var(--xoot-violet-100)',  ink: 'var(--xoot-violet-700)' },
  mist:   { wash: 'var(--xoot-mist-wash)',   ink: 'var(--xoot-mist-ink)' },
};

function Merch() {
  const [email, setEmail] = React.useState('');
  const [joined, setJoined] = React.useState(false);

  return (
    <Section id="merch" tone="alt">
      <SectionHead
        eyebrow="Coming soon"
        title="Xoot, as an object."
        squiggle="as an object"
        sub="Room sprays, Xooter attire and the surface kit our Xooters actually use. Not on sale yet."
        align="center" maxWidth={560}
      />

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
        gap: 20, marginTop: 52,
      }}>
        {MERCH.map((m, i) => {
          const t = MERCH_TINT[m.tint];
          return (
            <ScrollReveal key={m.name} delay={i * 90}>
              <Card pad="none" radius="lg" style={{ position: 'relative', overflow: 'visible', height: '100%', display: 'flex', flexDirection: 'column' }}>
                <WashiTape
                  colour={['sage', 'lilac', 'mist'][i % 3]}
                  seed={i + 4} width={90} height={28}
                  top={-11} {...(i % 2 ? { right: -14 } : { left: -14 })}
                  rotate={i % 2 ? 19 : -18}
                />
                {/* No product photography exists yet, so this is an honest placeholder rather
                    than a rendered mock-up implying a product that isn't made.

                    Rounded top corners are clipped locally rather than by the card, because the
                    card now has to stay overflow:visible for the tape. */}
                <div style={{
                  position: 'relative', height: 168, display: 'grid', placeItems: 'center',
                  borderRadius: 'var(--xoot-radius-lg) var(--xoot-radius-lg) 0 0', overflow: 'hidden',
                  background: `linear-gradient(166deg, color-mix(in oklch, ${t.wash} 88%, white) 0%, ${t.wash} 100%)`,
                }}>
                  <Icon name={m.icon} size={54} color={t.ink} strokeWidth={1.4} />
                  <span className="xoot-label" style={{
                    position: 'absolute', top: 14, left: 16, padding: '6px 11px',
                    borderRadius: 'var(--xoot-radius-pill)', background: 'rgba(255,255,255,.78)',
                    color: t.ink,
                  }}>{m.tag}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 'var(--xoot-space-5)', flex: 1 }}>
                  <h3 style={{ fontSize: 'var(--xoot-title-2)', fontWeight: 500 }}>{m.name}</h3>
                  <p style={{ fontSize: 'var(--xoot-body)', lineHeight: 1.55, color: 'var(--xoot-text-secondary)' }}>{m.detail}</p>
                </div>
              </Card>
            </ScrollReveal>
          );
        })}
      </div>

      {/* A waitlist, not a shop. Nothing here is priced, and there is no basket — a page that
          looks shoppable and then can't take an order costs more trust than it earns. */}
      <ScrollReveal delay={280}>
        <Card pad="lg" radius="lg" style={{
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 20,
          marginTop: 32, background: 'var(--xoot-surface-card)',
        }}>
          <div style={{ flex: '1 1 300px', minWidth: 0 }}>
            <h3 style={{ fontSize: 'var(--xoot-title-2)', fontWeight: 500, marginBottom: 6 }}>
              {joined ? "You're on the list." : 'Tell me when it launches'}
            </h3>
            <p style={{ fontSize: 'var(--xoot-body-sm)', lineHeight: 1.55, color: 'var(--xoot-text-secondary)' }}>
              {joined
                ? "One email when it's ready. Nothing else — we won't add you to anything."
                : "One email when the first run is ready. No newsletter, no drip campaign."}
            </p>
          </div>
          {!joined && (
            <div style={{ display: 'flex', gap: 10, flex: '0 1 380px' }}>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.co.za"
                style={{
                  flex: 1, minWidth: 0, height: 52, padding: '0 18px', border: 'none',
                  borderRadius: 'var(--xoot-radius-pill)', outline: 'none',
                  background: 'var(--xoot-surface-page-alt)',
                  boxShadow: 'inset 0 0 0 1px var(--xoot-border-color)',
                  fontFamily: 'var(--xoot-font-core)', fontSize: 'var(--xoot-body)',
                  color: 'var(--xoot-text-primary)',
                }}
              />
              <Button variant="ink" size="lg" disabled={!email.includes('@')} onClick={() => setJoined(true)}>
                Notify me
              </Button>
            </div>
          )}
        </Card>
      </ScrollReveal>
    </Section>
  );
}

/* ── Bug bounty ────────────────────────────────────────────────────────────
   A security page is read by exactly two audiences: researchers deciding whether reporting is
   worth their time, and customers checking whether anyone is minding the store. It has to
   serve both, which means the scope and the reward table are as important as the reassurance.

   Rewards are stated as ranges rather than fixed amounts — a fixed number invites argument
   about severity, and every real programme reserves judgement. Safe harbour is stated first
   because it is the thing a researcher looks for before reading anything else. */
const BOUNTY_TIERS = [
  { sev: 'Critical', range: 'R15 000 – R40 000', tint: 'careplus',
    detail: 'Remote code execution, full account takeover without interaction, access to bulk customer or Xooter data, payment manipulation.' },
  { sev: 'High', range: 'R6 000 – R15 000', tint: 'honey',
    detail: 'Access to another user\'s bookings, addresses or access codes. Privilege escalation. Auth bypass.' },
  { sev: 'Medium', range: 'R1 500 – R6 000', tint: 'mist',
    detail: 'Stored XSS, CSRF on a state-changing action, IDOR on non-sensitive records, rate-limit bypass on OTP.' },
  { sev: 'Low', range: 'R500 – R1 500', tint: 'sage',
    detail: 'Reflected XSS needing significant interaction, information disclosure with limited impact, misconfiguration.' },
];

const BOUNTY_TINT = {
  careplus: { wash: 'var(--xoot-careplus-wash)', ink: 'var(--xoot-careplus-ink)' },
  honey:    { wash: 'var(--xoot-honey-wash)',    ink: 'var(--xoot-honey-ink)' },
  mist:     { wash: 'var(--xoot-mist-wash)',     ink: 'var(--xoot-mist-ink)' },
  sage:     { wash: 'var(--xoot-sage-wash)',     ink: 'var(--xoot-sage-ink)' },
};

const IN_SCOPE = [
  'xoot.co.za and all subdomains',
  'The Xoot iOS and Android apps',
  'The Xooter app and web portal',
  'Public API endpoints under api.xoot.co.za',
];

const OUT_OF_SCOPE = [
  'Denial of service, volumetric or otherwise',
  'Social engineering of staff, Xooters or customers',
  'Reports from automated scanners with no demonstrated impact',
  'Missing headers or cookie flags without a working exploit',
  'Anything requiring a rooted or jailbroken device plus physical access',
];

function BugBounty() {
  return (
    <Section id="security" tone="alt">
      <SectionHead
        eyebrow="Security"
        title="Find something, tell us, get paid."
        squiggle="get paid"
        sub="Xoot holds addresses, access codes and payment details. We would rather pay a researcher than explain a breach."
        align="center" maxWidth={620}
      />

      {/* Safe harbour first. It is the thing a researcher checks before reading anything
          else, and burying it below a reward table costs reports. */}
      <ScrollReveal>
        <Card pad="lg" radius="lg" style={{
          display: 'flex', gap: 16, marginTop: 48, alignItems: 'flex-start',
          background: 'var(--xoot-sage-wash)', boxShadow: 'none',
        }}>
          <Icon name="shield-check" size={26} color="var(--xoot-sage-ink)" strokeWidth={1.8} style={{ marginTop: 2 }} />
          <div>
            <h3 style={{ fontSize: 'var(--xoot-title-2)', fontWeight: 500, color: 'var(--xoot-sage-ink)', marginBottom: 8 }}>
              Safe harbour
            </h3>
            <p style={{ fontSize: 'var(--xoot-body)', lineHeight: 1.6, color: 'var(--xoot-sage-ink)', maxWidth: 720 }}>
              Research conducted in good faith under this policy will not be met with legal
              action. Stay within scope, use only accounts you own or have permission to test,
              stop at the point you have proven impact, and never access, modify or retain
              another person's data. Report it and give us 90 days before publishing.
            </p>
          </div>
        </Card>
      </ScrollReveal>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 18, marginTop: 24 }}>
        {BOUNTY_TIERS.map((t, i) => {
          const c = BOUNTY_TINT[t.tint];
          return (
            <ScrollReveal key={t.sev} delay={i * 80}>
              <Card pad="lg" radius="lg" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <span className="xoot-label" style={{
                    padding: '7px 12px', borderRadius: 'var(--xoot-radius-pill)',
                    background: c.wash, color: c.ink,
                  }}>{t.sev}</span>
                </div>
                <span style={{
                  fontFamily: 'var(--xoot-font-display)', fontSize: 'var(--xoot-title-1)',
                  lineHeight: 1.1, color: 'var(--xoot-text-primary)',
                }}>{t.range}</span>
                <p style={{ fontSize: 'var(--xoot-body-sm)', lineHeight: 1.55, color: 'var(--xoot-text-secondary)' }}>{t.detail}</p>
              </Card>
            </ScrollReveal>
          );
        })}
      </div>

      <ScrollReveal delay={120}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 18, marginTop: 24 }}>
          {[['In scope', IN_SCOPE, 'circle-check', 'var(--xoot-sage-500)'],
            ['Out of scope', OUT_OF_SCOPE, 'x', 'var(--xoot-neutral-400)']].map(([title, items, ic, col]) => (
            <Card key={title} pad="lg" radius="lg" style={{ height: '100%' }}>
              <h3 style={{ fontSize: 'var(--xoot-title-2)', fontWeight: 500, marginBottom: 16 }}>{title}</h3>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 11, margin: 0, padding: 0, listStyle: 'none' }}>
                {items.map(it => (
                  <li key={it} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <Icon name={ic} size={16} color={col} strokeWidth={2.2} style={{ marginTop: 3, flex: '0 0 auto' }} />
                    <span style={{ fontSize: 'var(--xoot-body-sm)', lineHeight: 1.55, color: 'var(--xoot-text-secondary)' }}>{it}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </ScrollReveal>

      <ScrollReveal delay={200}>
        <Card pad="lg" radius="lg" style={{
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 20, marginTop: 24,
          background: 'var(--xoot-ink-900)',
        }}>
          <div style={{ flex: '1 1 320px', minWidth: 0 }}>
            <h3 style={{ fontSize: 'var(--xoot-title-2)', fontWeight: 500, color: 'var(--xoot-neutral-0)', marginBottom: 8 }}>
              How to report
            </h3>
            <p style={{ fontSize: 'var(--xoot-body)', lineHeight: 1.6, color: 'rgba(255,255,255,.72)', maxWidth: 560 }}>
              Email <span style={{ fontFamily: 'var(--xoot-font-mono)', color: 'var(--xoot-neutral-0)' }}>security@xoot.co.za</span> with
              steps to reproduce and what you were able to reach. We acknowledge within two
              business days and give a severity assessment within ten. First valid report on a
              given issue is the one we pay.
            </p>
          </div>
          <Button variant="cream" size="lg" icon="book-open">Read the full policy</Button>
        </Card>
      </ScrollReveal>
    </Section>
  );
}

Object.assign(window, { Reviews, Merch, BugBounty });
})();

/* ═══ site/SiteFoot.jsx ════════════════════════════════════════════════════════ */
(function(){
/* Xoot marketing site — Care+, contractor recruitment, operators, articles, footer.

   Copy from the repo (CtaBand.tsx, HomeExpansion.tsx, Footer.tsx), Zoot→Xoot. Care+ is the
   one place on this page allowed to use the membership red; everything else stays violet. */
const D = window.XootData;
const {
  DownloadBand, StoreBadges, ScrollReveal, Button, Icon, Card, Badge, Logo, MemberBadge, CarePlusMark, Avatar, Rating, XootCharacter } = window.XootNS;

/* ── Care+ ────────────────────────────────────────────────────────────────
   Rebuilt to mirror the app paywall's argument, adapted for a wide screen: the arithmetic
   first, then benefits, then a free-vs-Care+ comparison. Desktop has room to show all of it
   at once, so nothing hides behind a swipe here — the horizontal rail is a phone constraint,
   not a design choice worth carrying over. */
const carePerks = P => [
  ['ticket-percent', 'No booking fee, ever', `The ${P.rand(P.pricing.bookingFee)} fee comes off every visit you book.`],
  ['wallet', `${P.rand(P.pricing.addOn)} add-on credit to start`, 'A once-off welcome credit — laundry, inside the fridge, windows.'],
  ['repeat', 'Your Xooter, held for you', 'The same person week after week, not whoever is free.'],
  ['zap', 'First pick of slots', 'Saturday mornings open to members two days early.'],
  ['calendar-check', 'Move a visit, free', 'Reschedule up to two hours before, as often as you like.'],
  ['message-circle', 'Straight to a human', 'Your message skips the queue, every time.'],
];

/* Free is listed as genuinely capable, because it is. A comparison that cripples the free
   column reads as a threat rather than an offer. */
const CARE_COMPARE = [
  ['Book, track and chat', true, true],
  ['Widgets, Siri, calendar sync', true, true],
  ['XootCover included', true, true],
  ['Booking fee', 'R39', 'None'],
  ['Add-on credit', '—', 'R30 to start'],
  ['Same Xooter held', false, true],
  ['Early slot access', false, true],
  ['Free rescheduling', false, true],
];

function CarePlusBand({ onJoin }) {
  /* Computed from the real catalogue, not typed in — the same arithmetic the app paywall
     shows, so the two can never quote different numbers. */
  const visits = 4;
  const feeSaved = visits * D.pricing.bookingFee;
  /* Fees only. The R30 is a once-off, so including it in a per-month figure overstates the
     recurring saving from month two onward. */
  const monthly = feeSaved;
  const net = monthly - D.pricing.carePlusMonthly;

  return (
    <Section id="careplus">
      <div style={{
        padding: 'clamp(32px, 4vw, 60px)', borderRadius: 40,
        background: 'var(--xoot-careplus-50)',
        boxShadow: 'inset 0 0 0 1px var(--xoot-careplus-100)',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 48, alignItems: 'start' }}>
          <div>
            <span style={{ display: 'inline-flex', marginBottom: 20 }}><MemberBadge /></span>
            <h2 style={{ fontSize: 'clamp(32px, 3.4vw, 46px)', lineHeight: 1.08, letterSpacing: '-.018em' }}>
              For homes that would rather not think about it.
            </h2>
            <p style={{ marginTop: 16, maxWidth: 440, fontSize: 'var(--xoot-body-lg)', lineHeight: 1.55, color: 'var(--xoot-text-secondary)' }}>
              Care<CarePlusMark inText size={15} /> is {D.rand(D.pricing.carePlusMonthly)} a month, and it is
              about cost and continuity rather than access — booking, tracking, chat, widgets and
              calendar sync are free for everyone.
            </p>

            {/* The arithmetic, stated the same way the app states it. */}
            <div style={{
              marginTop: 28, padding: 24, borderRadius: 'var(--xoot-radius-lg)',
              background: 'var(--xoot-surface-card)',
            }}>
              <span className="xoot-label" style={{ display: 'block', marginBottom: 10, color: 'var(--xoot-text-muted)' }}>
                Someone booking {visits} visits a month
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                <span style={{
                  fontFamily: 'var(--xoot-font-display)', fontSize: 'clamp(34px, 3.6vw, 46px)',
                  lineHeight: 1, color: 'var(--xoot-careplus-ink)',
                }}>{D.rand(monthly)}</span>
                <span style={{ fontSize: 'var(--xoot-body)', fontWeight: 600, color: 'var(--xoot-careplus-ink)' }}>
                  saved a month
                </span>
              </div>
              <p style={{ marginTop: 10, fontSize: 'var(--xoot-body-sm)', lineHeight: 1.55, color: 'var(--xoot-text-secondary)' }}>
                {D.rand(feeSaved)} a month in waived booking fees, plus {D.rand(D.pricing.addOn)} of
                add-on credit when you join.
              </p>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 28 }}>
              <Button variant="careplus" size="lg" onClick={onJoin}>Start your free month</Button>
              <Button variant="outline" size="lg" onClick={onJoin}>See what's included</Button>
            </div>
            <p style={{ marginTop: 14, fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)' }}>
              Cancel anytime. No notice period, no exit fee.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* All six benefits visible at once — desktop has the room, so nothing hides. */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: 12 }}>
              {carePerks(D).map(([ic, title, desc]) => (
                <div key={title} style={{ display: 'flex', gap: 13, alignItems: 'flex-start', padding: 18, borderRadius: 'var(--xoot-radius-md)', background: 'var(--xoot-surface-card)' }}>
                  <span style={{ display: 'grid', placeItems: 'center', width: 38, height: 38, flex: '0 0 auto', borderRadius: 'var(--xoot-radius-key)', background: 'var(--xoot-careplus-50)' }}>
                    <Icon name={ic} size={18} color="var(--xoot-careplus-600)" strokeWidth={1.9} />
                  </span>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                    <span style={{ fontSize: 'var(--xoot-body-sm)', fontWeight: 700 }}>{title}</span>
                    <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-secondary)', lineHeight: 1.5 }}>{desc}</span>
                  </span>
                </div>
              ))}
            </div>

            {/* The comparison. Its real function is showing the free tier is complete. */}
            <div style={{ borderRadius: 'var(--xoot-radius-lg)', overflow: 'hidden', background: 'var(--xoot-surface-card)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr clamp(50px, 13vw, 72px) clamp(50px, 13vw, 72px)', padding: '13px clamp(14px, 3vw, 20px)', boxShadow: 'inset 0 -1px 0 var(--xoot-border-color)' }}>
                <span />
                <span className="xoot-label" style={{ textAlign: 'center', color: 'var(--xoot-text-muted)' }}>Free</span>
                <span className="xoot-label" style={{ textAlign: 'center', color: 'var(--xoot-careplus-ink)' }}>Care+</span>
              </div>
              {CARE_COMPARE.map(([label, free, plus], i) => (
                <div key={label} style={{
                  display: 'grid', gridTemplateColumns: '1fr clamp(50px, 13vw, 72px) clamp(50px, 13vw, 72px)', padding: '13px clamp(14px, 3vw, 20px)', alignItems: 'center',
                  boxShadow: i < CARE_COMPARE.length - 1 ? 'inset 0 -1px 0 var(--xoot-neutral-100)' : 'none',
                }}>
                  <span style={{ fontSize: 'var(--xoot-body-sm)', fontWeight: 600 }}>{label}</span>
                  {[free, plus].map((v, j) => (
                    <span key={j} style={{ display: 'grid', placeItems: 'center' }}>
                      {v === true ? (
                        <Icon name="check" size={17} strokeWidth={2.6} color={j === 1 ? 'var(--xoot-careplus-600)' : 'var(--xoot-sage-500)'} />
                      ) : v === false ? (
                        <span style={{ width: 11, height: 2, borderRadius: 2, background: 'var(--xoot-neutral-300)' }} />
                      ) : (
                        <span style={{ fontFamily: 'var(--xoot-font-mono)', fontSize: 'var(--xoot-caption)', color: j === 1 ? 'var(--xoot-careplus-600)' : 'var(--xoot-text-secondary)' }}>{v}</span>
                      )}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ── Become a Xooter ────────────────────────────────────────────────────── */
const PROOF = [
  ['Verified', 'Badge path'],
  ['Accredited', 'Screening queue'],
  ['Trained', 'Required modules'],
  ['Repeat clients', 'Continuity'],
];

function BecomeXooter({ onJoin }) {
  return (
    <Section id="pro" tone="alt">
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
        gap: 'clamp(26px, 4vw, 48px)', alignItems: 'center',
        padding: 'clamp(26px, 4.4vw, 60px)', borderRadius: 'clamp(24px, 3.4vw, 40px)', background: 'var(--xoot-ink-900)',
      }}>
        <div>
          <span className="xoot-label" style={{
            display: 'inline-block', marginBottom: 20, padding: '8px 13px',
            borderRadius: 'var(--xoot-radius-pill)', background: 'rgba(255,255,255,.12)',
            color: 'rgba(255,255,255,.88)',
          }}>Become a Xooter</span>
          <h2 style={{ fontSize: 'clamp(32px, 3.4vw, 46px)', lineHeight: 1.08, letterSpacing: '-.018em', color: 'var(--xoot-neutral-0)' }}>
            Build a stronger contractor profile.
          </h2>
          <p style={{ marginTop: 16, maxWidth: 420, fontSize: 'var(--xoot-body-lg)', lineHeight: 1.55, color: 'rgba(255,255,255,.7)' }}>
            Xoot helps high-quality independent contractors show experience, suburb coverage,
            reliability, repeat clients, training and trust badges.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 30 }}>
            <Button variant="cream" size="lg" iconRight="arrow-right" onClick={onJoin}>Become a Xooter</Button>
            <Button variant="glass" size="lg" icon="graduation-cap" onClick={onJoin}>See training</Button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 138px), 1fr))', gap: 14 }}>
          {PROOF.map(([stat, label]) => (
            /* These four blocks hold WORDS, not figures. At the 34px display size they were
               inheriting from the stat-card pattern, "Accredited" and "Repeat clients" ran past
               their own block; and with no vertical centring the two-line labels sat high while
               the one-line ones sat low, so the row read as misaligned. Now: type sized to fit
               the narrowest track, balanced wrapping, and every block centres its own content
               against a shared minimum height. */
            <div key={label} style={{
              display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6,
              minHeight: 132, padding: '20px 18px', borderRadius: 'var(--xoot-radius-lg)',
              background: 'rgba(255,255,255,.08)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.12)',
            }}>
              <p style={{
                fontFamily: 'var(--xoot-font-display)', fontSize: 'clamp(20px, 1.9vw, 27px)',
                lineHeight: 1.1, letterSpacing: '-.015em', color: 'var(--xoot-neutral-0)',
                textWrap: 'balance',
              }}>{stat}</p>
              <p style={{ fontSize: 'var(--xoot-body-sm)', lineHeight: 1.4, color: 'rgba(255,255,255,.7)', textWrap: 'pretty' }}>{label}</p>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

/* ── Operators ──────────────────────────────────────────────────────────── */
const SEGMENTS = [
  'Residential property managers', 'Estate agencies', 'Airbnb hosts', 'Landlords',
  'Office administrators', 'Guesthouse teams', 'Facilities coordinators', 'Body corporate trustees',
];

function HomeExpansion() {
  return (
    <>
      <Section tone="card">
        <div style={{ display: 'grid', gridTemplateColumns: '0.9fr 1.1fr', gap: 48, alignItems: 'center' }}>
          <div>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 16,
              padding: '7px 13px', borderRadius: 'var(--xoot-radius-pill)',
              background: 'var(--xoot-violet-100)', color: 'var(--xoot-violet-700)',
              fontSize: 'var(--xoot-caption)', fontWeight: 700,
            }}>
              <Icon name="shield-check" size={14} strokeWidth={2} /> Built for high-trust operators
            </span>
            <h2 style={{ fontSize: 'clamp(28px, 2.8vw, 38px)', lineHeight: 1.1, letterSpacing: '-.018em' }}>
              Designed for the people who cannot afford messy handovers.
            </h2>
            <p style={{ marginTop: 14, fontSize: 'var(--xoot-body-sm)', lineHeight: 1.65, color: 'var(--xoot-text-secondary)' }}>
              Xoot is being shaped around real cleaning operations for property managers,
              short-term rental hosts, landlords, offices and homes. These are target operator
              groups, not unsupported partnership or customer-logo claims.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 132px), 1fr))', gap: 10 }}>
            {SEGMENTS.map(s => (
              <div key={s} style={{
                padding: '16px 12px', textAlign: 'center', borderRadius: 'var(--xoot-radius-md)',
                background: 'var(--xoot-surface-page-alt)',
                fontSize: 'var(--xoot-body-sm)', fontWeight: 700, lineHeight: 1.35,
              }}>
                <Icon name="building-2" size={16} color="var(--xoot-violet-500)" strokeWidth={1.9} style={{ marginBottom: 8 }} />
                {s}
              </div>
            ))}
          </div>
        </div>
      </Section>

    </>
  );
}

/* ── Feedback ───────────────────────────────────────────────────────────── */
const QUOTES = [
  ['I stopped dreading Sunday nights.', 'Thandi M.', 'Bryanston'],
  ['Same Xooter every week. She knows the house now.', 'Sipho D.', 'Rosebank'],
  ['Booking took ninety seconds flat.', 'Ruan V.', 'Sandton'],
];

function FeedbackSection() {
  return (
    <Section tone="alt">
      <SectionHead
        eyebrow="What people say"
        title="The point is not the clean. It is not thinking about it."
        align="center"
        maxWidth={620}
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 268px), 1fr))', gap: 18 }}>
        {QUOTES.map(([quote, name, suburb]) => (
          <Card key={name} pad="lg" radius="lg" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Rating value={5} size={16} showNumber={false} />
            <p style={{ fontFamily: 'var(--xoot-font-display)', fontSize: 'var(--xoot-title-2)', lineHeight: 1.35 }}>{quote}</p>
            <span style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 'auto' }}>
              <Avatar name={name} size="sm" />
              <span style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 'var(--xoot-body-sm)', fontWeight: 700 }}>{name}</span>
                <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)' }}>{suburb}</span>
              </span>
            </span>
          </Card>
        ))}
      </div>
    </Section>
  );
}

/* ── Closing CTA ──────────────────────────────────────────────────────────
   The download band sits above the sign-off: someone who has read this far is deciding
   between "book now" and "get the app", so both need to be in reach at the same moment. */
function CtaBand({ onBook, onConcierge }) {
  return (
    <Section>
      <DownloadBand onBook={onBook} style={{ marginBottom: 'var(--xoot-space-8)' }} />
      <div style={{
        position: 'relative', overflow: 'hidden', padding: 'clamp(38px, 6vw, 72px) clamp(20px, 4vw, 56px)', borderRadius: 'clamp(24px, 3.4vw, 40px)',
        background: 'var(--xoot-grad-dusk)', textAlign: 'center',
      }}>
        <XootCharacter scene="customer" garment="violet" castIndex={2} size={132} style={{ marginBottom: 18 }} />
        <h2 style={{ fontSize: 'clamp(34px, 3.8vw, 52px)', lineHeight: 1.05, letterSpacing: '-.02em' }}>
          Your home. Handled.
        </h2>
        <p style={{ margin: '16px auto 0', maxWidth: 460, fontSize: 'var(--xoot-body-lg)', lineHeight: 1.55, color: 'var(--xoot-text-secondary)' }}>
          Book in about a minute. We'll tell you when your Xooter is on the way — you don't
          need to watch the app.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 30 }}>
          <Button variant="primary" size="lg" iconRight="arrow-right" onClick={onBook}>Book a clean</Button>
          <Button variant="outline" size="lg" icon="message-circle" onClick={onConcierge}>Ask Concierge</Button>
        </div>
        <StoreBadges align="center" style={{ marginTop: 26 }} />
      </div>
    </Section>
  );
}

/* ── Footer ─────────────────────────────────────────────────────────────── */
/* Only the pages that exist get an href. Everything else stays a plain label rather than a
   link to nowhere — a footer full of dead anchors is worse than one that is honest about
   being a sitemap sketch. */
/* Only pages that EXIST get an href; everything else stays plain text rather than an anchor
   to nowhere. A footer where half the links are dead costs a click each to discover that.

   Support is a mailto with the subject pre-filled — the ask was an email form, and a real
   composer beats a form that posts nowhere in a prototype. The subject line matters: it means
   the reply lands in the right queue without the customer having to categorise their own
   problem. */
const SUPPORT_MAIL = 'mailto:help@xoot.co.za'
  + '?subject=' + encodeURIComponent('Help with my Xoot booking')
  + '&body=' + encodeURIComponent("Tell us what's happened and we'll pick it up.\n\nIf it's about a specific visit, the date and suburb are enough — we'll find it.\n\n");

const FOOTER_HREFS = {
  'Bug bounty programme': 'bug-bounty.html',
  'Contact support': SUPPORT_MAIL,
  'Care+ membership': '#careplus',
  'Gift a clean': '#gift',
  'Refer & earn': '#refer',
  'Regular cleaning': '#services',
  'Airbnb turnovers': '#services',
  'Office cleaning': '#services',
  'Express cleaning': '#services',
  'Moving cleans': '#services',
  'Laundry & ironing': '#services',
  'Become a Xooter': '#pro',
  'Journal': '#articles',
  'Training': '#pro',
  'Xooter dashboard': '#pro',
  /* The legal centre is a separate document, deliberately. None of this belongs in the scroll of
     a page that is trying to sell a clean, and a policy you can only reach by scrolling past
     merchandise is a policy nobody reads. Each link deep-links to its own document. */
  'Trust policy': './Xoot%20Legal.dc.html#trust-safety',
  'Trust & safety': './Xoot%20Legal.dc.html#trust-safety',
  'Terms & Conditions': './Xoot%20Legal.dc.html#terms',
  'Privacy': './Xoot%20Legal.dc.html#privacy',
  'POPIA': './Xoot%20Legal.dc.html#popia',
  'Cookies': './Xoot%20Legal.dc.html#cookies',
  'Refunds & cancellations': './Xoot%20Legal.dc.html#refunds',
  'Care+ terms': './Xoot%20Legal.dc.html#careplus',
  'Xooter terms': './Xoot%20Legal.dc.html#xooter',
  'Acceptable use': './Xoot%20Legal.dc.html#acceptable-use',
  'AI Concierge': './Xoot%20Legal.dc.html#concierge',
  'Account deletion': './Xoot%20Legal.dc.html#account-deletion',
  'XootCover terms': './Xoot%20Legal.dc.html#xootcover',
  'Bug bounty programme': './Xoot%20Bug%20Bounty.dc.html',
  'Contact support': 'mailto:newsletter@xoot.co.za?subject=Xoot%20support',
};

const FOOTER_COLS = [
  ['Cleaning services', ['Regular cleaning', 'Airbnb turnovers', 'Office cleaning', 'Express cleaning', 'Moving cleans', 'Laundry & ironing']],
  ['Membership & accounts', ['Care+ membership', 'Full-time help', 'Pricing', 'Gift a clean', 'Refer & earn']],
  ['Join Xoot', ['Become a Xooter', 'Xooter dashboard', 'Training', 'Trust policy']],
  ['Guides & support', ['Journal', 'Contact support', 'Bug bounty programme']],
  ['Legal', ['Terms & Conditions', 'Privacy', 'POPIA', 'Cookies', 'Refunds & cancellations', 'Care+ terms', 'Xooter terms', 'Acceptable use', 'AI Concierge', 'Account deletion', 'Trust & safety', 'XootCover terms']],
];

function SiteFooter() {
  return (
    <footer style={{ background: 'var(--xoot-surface-card)', boxShadow: 'inset 0 1px 0 var(--xoot-border-color)' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: 'clamp(40px, 5vw, 64px) clamp(16px, 4vw, 40px)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 158px), 1fr))', gap: 'clamp(24px, 3vw, 40px)', marginBottom: 48 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 16 }}>
              <Logo variant="icon" size={34} />
              <Logo size={26} tone="ink" />
            </div>
            <p style={{ maxWidth: 260, fontSize: 'var(--xoot-body-sm)', lineHeight: 1.6, color: 'var(--xoot-text-secondary)' }}>
              Premium home, office and Airbnb cleaning in Xoot launch suburbs with vetting,
              training and trust workflows.
            </p>
          </div>
          {FOOTER_COLS.map(([title, links]) => (
            <div key={title}>
              <h4 style={{ marginBottom: 16, fontSize: 'var(--xoot-title-3)', fontWeight: 500 }}>{title}</h4>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: 0, padding: 0, listStyle: 'none' }}>
                {links.map(l => {
                  const href = FOOTER_HREFS[l];
                  return (
                    <li key={l}>
                      {href ? (
                        <a href={href} style={{ fontSize: 'var(--xoot-body-sm)', color: 'var(--xoot-text-secondary)', textDecoration: 'none' }}>{l}</a>
                      ) : (
                        <span style={{ fontSize: 'var(--xoot-body-sm)', color: 'var(--xoot-text-muted)' }}>
                          {l} <span style={{ opacity: .7 }}>· soon</span>
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
        <div style={{
          display: 'flex', justifyContent: 'space-between', gap: 16, paddingTop: 32,
          boxShadow: 'inset 0 1px 0 var(--xoot-border-color)',
          fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)',
        }}>
          <p>2026 Xoot. All rights reserved.</p>
          <p>Made with care, for every home.</p>
        </div>
      </div>
    </footer>
  );
}

Object.assign(window, { CarePlusBand, BecomeXooter, HomeExpansion, FeedbackSection, CtaBand, SiteFooter });
})();

/* ═══ site/SiteAuth.jsx ════════════════════════════════════════════════════════ */
(function(){
/* Website sign-in.

   The repo is explicit that this must not be transactional: never "Sign up" / "Sign in", but
   "Let's get your home sorted" and "Pick up where you left off" (§5.3). That is not decoration —
   a marketplace asking someone to let a stranger into their house has to sound like a person
   from the first screen.

   Four ways in, ordered by what actually works today. §5.2a of the master brief flags that
   "Continue with phone" has NO BACKEND — email OTP is all that exists, and phone auth is blocked
   on the same Twilio Verify activation as masked calling. The brief's own recommendation is to
   DEMOTE rather than hide it, so the layout stays honest and the button returns to the top when
   Verify is live. That is what this does: email leads, phone sits below with a quiet "coming
   soon", and the two SSO buttons flank them.

   Shipping phone as the primary CTA while it dead-ends is the one option the brief calls the
   worst, and it would be the easiest mistake to make since it looks the most modern. */
const D = window.XootData;
const {
  Button, Icon, Card, Logo, ScrollReveal, Bloom, CarePlusMark,
} = window.XootNS;

/* Both marks drawn locally rather than imported — they are brand assets of other companies and
   belong to the sign-in surface, not the design system's own vocabulary. */
function AppleMark({ size = 19 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ display: 'block', marginTop: -2 }}>
      <path d="M17.05 12.54c-.02-2.3 1.88-3.4 1.96-3.46-1.07-1.56-2.73-1.78-3.32-1.8-1.41-.14-2.76.83-3.48.83-.72 0-1.83-.81-3.01-.79-1.55.02-2.98.9-3.77 2.29-1.61 2.79-.41 6.92 1.15 9.18.76 1.11 1.67 2.35 2.86 2.31 1.15-.05 1.58-.74 2.97-.74 1.38 0 1.78.74 3 .72 1.24-.02 2.02-1.13 2.78-2.24.88-1.29 1.24-2.54 1.26-2.6-.03-.01-2.41-.93-2.4-3.7zM14.79 5.6c.63-.77 1.06-1.83.94-2.9-.91.04-2.01.61-2.67 1.37-.59.68-1.1 1.76-.96 2.8 1.01.08 2.05-.51 2.69-1.27z"/>
    </svg>
  );
}

function GoogleMark({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ display: 'block' }}>
      <path fill="#4285F4" d="M23 12.2c0-.8-.07-1.54-.2-2.27H12v4.3h6.15a5.3 5.3 0 0 1-2.28 3.47v2.9h3.68C21.68 18.66 23 15.72 23 12.2z"/>
      <path fill="#34A853" d="M12 23.5c2.97 0 5.46-.98 7.28-2.66l-3.68-2.85c-1.02.68-2.32 1.09-3.6 1.09-2.77 0-5.12-1.87-5.96-4.39H2.28v2.95A11.02 11.02 0 0 0 12 23.5z"/>
      <path fill="#FBBC05" d="M6.04 14.69a6.6 6.6 0 0 1 0-4.23V7.51H2.28a11.03 11.03 0 0 0 0 9.9l3.76-2.72z"/>
      <path fill="#EA4335" d="M12 5.7c1.57 0 2.97.54 4.08 1.6l3.25-3.25C17.45 2.2 14.96 1.15 12 1.15A11.02 11.02 0 0 0 2.28 7.51l3.76 2.95C6.88 7.94 9.23 5.7 12 5.7z"/>
    </svg>
  );
}

/* Social proof INSIDE the flow rather than as its own screen (§5.5). Three numbers, no chart —
   someone deciding whether to hand over their address wants scale and rating, not a dashboard. */
const PROOF = [
  { n: '4.9', label: 'Average rating', detail: 'across 2 100+ visits' },
  { n: '12', label: 'Joburg suburbs', detail: 'with same-week availability' },
  { n: '100%', label: 'Background-checked', detail: 'every Xooter, before their first job' },
];

function SignIn({ open, onClose, onSignedIn, initialMode = 'in' }) {
  /* 'in' = returning, 'up' = new. Same screen, different framing — a separate signup page
     doubles the surface for one boolean, and the fields are identical either way. */
  const [mode, setMode] = React.useState(initialMode);
  const [stage, setStage] = React.useState('choose');
  const [email, setEmail] = React.useState('');
  const [code, setCode] = React.useState('');
  const [sso, setSso] = React.useState(null);

  React.useEffect(() => { if (open) { setStage('choose'); setMode(initialMode); } }, [open, initialMode]);

  if (!open) return null;

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const codeValid = code.replace(/\D/g, '').length === 6;

  const finish = () => {
    /* A real build sets a session here. The kit just tells the page it's signed in, which is
       enough for the header, the bug-bounty tab and the booking prefill to react. */
    onSignedIn && onSignedIn({ email: email || `${sso}@example.co.za`, via: sso || 'email' });
  };

  const closeBtn = (
    <button type="button" aria-label="Close" onClick={onClose}
      style={{
        position: 'absolute', top: 18, right: 18, zIndex: 3,
        display: 'grid', placeItems: 'center', width: 38, height: 38, border: 'none',
        borderRadius: '50%', background: 'var(--xoot-surface-sunken)', cursor: 'pointer',
        color: 'var(--xoot-text-primary)',
      }}>
      <Icon name="x" size={18} strokeWidth={2.2} />
    </button>
  );

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose && onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 240, display: 'grid', placeItems: 'center',
        padding: 'clamp(12px, 4vw, 40px)', background: 'rgba(20,18,16,.5)',
        overflowY: 'auto',
      }}
    >
      <div style={{
        position: 'relative', width: '100%', maxWidth: 940,
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
        background: 'var(--xoot-surface-card)', borderRadius: 'var(--xoot-radius-xl)',
        boxShadow: 'var(--xoot-shadow-5)', overflow: 'hidden',
        /* Opacity only — a transform here would promote the panel to its own layer and
           rasterise every field label blurrily. Same trap as the booking modal. */
        animation: 'xoot-fade-in 280ms var(--xoot-ease-ios-nav) both',
      }}>
        {closeBtn}

        {/* ── Left: the pitch. §5.2's split layout — card one side, creative the other. ── */}
        <div style={{
          position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center',
          gap: 26, padding: 'clamp(28px, 4vw, 48px)', background: 'var(--xoot-grad-dawn)',
          overflow: 'hidden',
        }}>
          <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            {[
              { size: 96, palette: 'lilac', left: '-8%', top: '6%', op: .32, d: 0 },
              { size: 64, palette: 'petal', left: '82%', top: '-2%', op: .3, d: 220 },
              { size: 80, palette: 'honey', left: '86%', top: '68%', op: .28, d: 400 },
              { size: 58, palette: 'sage', left: '4%', top: '82%', op: .3, d: 140 },
            ].map((b, i) => (
              <span key={i} style={{ position: 'absolute', left: b.left, top: b.top }}>
                <Bloom size={b.size} palette={b.palette} motion="sway" delay={b.d} opacity={b.op} />
              </span>
            ))}
          </div>

          <div style={{ position: 'relative' }}>
            <Logo size={30} tone="violet" />
            <h2 style={{
              marginTop: 22, fontSize: 'clamp(28px, 3vw, 40px)', lineHeight: 1.1,
              letterSpacing: '-.018em',
            }}>
              {mode === 'in' ? 'Pick up where you left off.' : "Let's get your home sorted."}
            </h2>
            <p style={{ marginTop: 14, fontSize: 'var(--xoot-body-lg)', lineHeight: 1.55, color: 'var(--xoot-text-secondary)', maxWidth: 380 }}>
              {mode === 'in'
                ? 'Your places, your Xooters and your usual times are all still here.'
                : 'Tell us about the place once. After that, booking is about a minute — and you can walk away and let us handle it.'}
            </p>
          </div>

          {/* Proof in the flow, not on its own screen. */}
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {PROOF.map(p => (
              <div key={p.label} style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                <span style={{
                  fontFamily: 'var(--xoot-font-display)', fontSize: 'var(--xoot-title-1)',
                  lineHeight: 1, color: 'var(--xoot-violet-700)', minWidth: 62,
                }}>{p.n}</span>
                <span style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 'var(--xoot-body-sm)', fontWeight: 700 }}>{p.label}</span>
                  <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-secondary)' }}>{p.detail}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: the ways in ── */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 16, padding: 'clamp(28px, 4vw, 48px)' }}>

          {stage === 'choose' && (
            <>
              <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>
                {mode === 'in' ? 'Welcome back' : 'Three taps and you are in'}
              </span>

              {/* Email leads because it is the only path with a backend. */}
              <label style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                <span style={{ fontSize: 'var(--xoot-body-sm)', fontWeight: 700 }}>Your email</span>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.co.za"
                  style={{
                    height: 54, padding: '0 18px', border: 'none', borderRadius: 'var(--xoot-radius-sm)',
                    background: 'var(--xoot-surface-page-alt)',
                    boxShadow: 'inset 0 0 0 1px var(--xoot-border-color)', outline: 'none',
                    fontFamily: 'var(--xoot-font-core)', fontSize: 'var(--xoot-body)',
                    color: 'var(--xoot-text-primary)',
                  }} />
              </label>

              <Button variant="primary" size="lg" block disabled={!emailValid}
                onClick={() => setStage('code')} iconRight="arrow-right">
                Continue with email
              </Button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0' }}>
                <span style={{ flex: 1, height: 1, background: 'var(--xoot-border-color)' }} />
                <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)' }}>or</span>
                <span style={{ flex: 1, height: 1, background: 'var(--xoot-border-color)' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[['apple', 'Apple', <AppleMark key="a" />], ['google', 'Google', <GoogleMark key="g" />]].map(([key, label, mark]) => (
                  <button key={key} type="button"
                    onClick={() => { setSso(key); setStage('sso'); }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                      height: 54, border: 'none', borderRadius: 'var(--xoot-radius-sm)',
                      background: 'var(--xoot-surface-card)',
                      boxShadow: 'inset 0 0 0 1.5px var(--xoot-border-color-strong)',
                      cursor: 'pointer', color: 'var(--xoot-text-primary)',
                      fontFamily: 'var(--xoot-font-core)', fontSize: 'var(--xoot-body-sm)', fontWeight: 700,
                    }}>
                    {mark}{label}
                  </button>
                ))}
              </div>

              {/* Phone, demoted. §5.2a: it has no backend — email OTP is all that exists, and
                  phone auth is blocked on the same Twilio Verify activation as masked calling.
                  The brief's own call is to demote rather than hide, so the layout stays honest
                  and the button returns to the top once Verify is live. */}
              <button type="button" disabled
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                  height: 50, marginTop: 2, border: 'none', borderRadius: 'var(--xoot-radius-sm)',
                  background: 'var(--xoot-surface-sunken)', cursor: 'not-allowed',
                  color: 'var(--xoot-text-muted)', fontFamily: 'var(--xoot-font-core)',
                  fontSize: 'var(--xoot-body-sm)', fontWeight: 700,
                }}>
                <Icon name="phone" size={16} strokeWidth={2} />
                Continue with phone
                <span className="xoot-label" style={{
                  padding: '4px 8px', borderRadius: 'var(--xoot-radius-pill)',
                  background: 'var(--xoot-honey-wash)', color: 'var(--xoot-honey-ink)',
                }}>Soon</span>
              </button>

              <button type="button" onClick={() => setMode(m => (m === 'in' ? 'up' : 'in'))}
                style={{
                  marginTop: 6, border: 'none', background: 'none', padding: 0, cursor: 'pointer',
                  fontFamily: 'var(--xoot-font-core)', fontSize: 'var(--xoot-body-sm)',
                  fontWeight: 700, color: 'var(--xoot-violet-700)', textAlign: 'left',
                }}>
                {mode === 'in' ? "First time here? Start fresh" : 'Been here before? Pick up where you left off'}
              </button>

              <p style={{ marginTop: 4, fontSize: 'var(--xoot-caption)', lineHeight: 1.55, color: 'var(--xoot-text-muted)' }}>
                By continuing you agree to our terms and privacy notice. We never share your
                address or access codes — a Xooter sees them only on the day.
              </p>
            </>
          )}

          {stage === 'code' && (
            <>
              <button type="button" onClick={() => setStage('choose')}
                style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6, border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontSize: 'var(--xoot-body-sm)', fontWeight: 700, color: 'var(--xoot-text-muted)' }}>
                <Icon name="arrow-left" size={15} strokeWidth={2.2} />Back
              </button>
              <h3 style={{ fontSize: 'var(--xoot-title-1)', lineHeight: 1.2 }}>Check your email</h3>
              <p style={{ fontSize: 'var(--xoot-body)', lineHeight: 1.55, color: 'var(--xoot-text-secondary)' }}>
                We sent a six-digit code to <strong style={{ color: 'var(--xoot-text-primary)' }}>{email}</strong>.
                No password to remember.
              </p>
              <input
                value={code} inputMode="numeric" autoFocus
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                style={{
                  height: 62, padding: '0 20px', border: 'none', borderRadius: 'var(--xoot-radius-sm)',
                  background: 'var(--xoot-surface-page-alt)',
                  boxShadow: 'inset 0 0 0 1px var(--xoot-border-color)', outline: 'none',
                  fontFamily: 'var(--xoot-font-mono)', fontSize: 26, letterSpacing: '.28em',
                  textAlign: 'center', color: 'var(--xoot-text-primary)',
                }} />
              <Button variant="primary" size="lg" block disabled={!codeValid} onClick={finish}>
                {mode === 'in' ? 'Sign me in' : "Let's go"}
              </Button>
              <button type="button" onClick={() => setStage('choose')}
                style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontSize: 'var(--xoot-caption)', fontWeight: 700, color: 'var(--xoot-text-muted)' }}>
                Wrong email? Change it
              </button>
            </>
          )}

          {stage === 'sso' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center', padding: '20px 0' }}>
              <span style={{
                display: 'grid', placeItems: 'center', width: 62, height: 62,
                borderRadius: '50%', background: 'var(--xoot-surface-sunken)',
                color: 'var(--xoot-ink-900)',
              }}>
                {sso === 'apple' ? <AppleMark size={28} /> : <GoogleMark size={26} />}
              </span>
              <h3 style={{ fontSize: 'var(--xoot-title-1)', lineHeight: 1.2 }}>
                Continue with {sso === 'apple' ? 'Apple' : 'Google'}
              </h3>
              <p style={{ fontSize: 'var(--xoot-body-sm)', lineHeight: 1.55, color: 'var(--xoot-text-secondary)', maxWidth: 300 }}>
                {sso === 'apple'
                  ? 'You can hide your email address — we only ever use it to send booking updates.'
                  : "We'll only see your name and email. Nothing is posted anywhere."}
              </p>
              <Button variant="ink" size="lg" block onClick={finish}>
                Continue as Nadia
              </Button>
              <button type="button" onClick={() => setStage('choose')}
                style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontSize: 'var(--xoot-caption)', fontWeight: 700, color: 'var(--xoot-text-muted)' }}>
                Use a different way in
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { SignIn });
})();

/* ═══ site/SiteBooking.jsx ════════════════════════════════════════════════════════ */
(function(){
/* The website's booking flow — a real one, not a scroll-to-top.

   The site had CTAs everywhere that all called `window.scrollTo`, which is worse than no CTA:
   the visitor clicks something labelled "Book now" and the page moves. This is the same
   five-step flow as the app, adapted for a wide screen.

   Two deliberate differences from the app:

     · it runs in a MODAL over the page rather than as a screen stack. Someone booking from
       the marketing site hasn't committed to an app-like context, and taking over the whole
       page loses the thing that persuaded them to click.
     · prices stay hidden until the final step, exactly as in the app. That rule exists because
       a price shown before the scope is set is always wrong, and a wrong price is the reason
       people abandon.

   State is intentionally simple and local — this is a prototype of the flow, not a checkout. */
const D = window.XootData;
const {
  Button, Icon, Card, Badge, ServiceIcon, XOOT_SERVICES, Input, Select,
  XooterCard, Rating, Avatar, CarePlusMark, Picker, JOBURG_SUBURBS, StoreBadges,
  PaymentFlow,
} = window.XootNS;
/* ExpressPay lives in SitePay.jsx and is published on window like the rest of the kit — each
   site module is its own scope, so a sibling's function is not otherwise visible here. */
const { ExpressPay } = window;

const STEPS = ['Service', 'Your place', 'When', 'Xooter', 'Confirm'];

/* Only the seven services Xoot actually sells. Lux is listed but not bookable — showing it
   as coming soon is more honest than hiding it and more useful than letting someone pick it. */
const BOOKABLE = ['regular', 'airbnb', 'office', 'express', 'moving', 'laundry'];

/* Straight from the shared catalogue. Copying these locally would drift from the app the
   first time pricing changed — and a marketing site quoting a stale price is worse than one
   quoting none. */
const SIZES = D.sizes;

const ADDONS = [
  { key: 'fridge',  label: 'Inside the fridge' },
  { key: 'oven',    label: 'Inside the oven' },
  { key: 'windows', label: 'Windows' },
  { key: 'laundry', label: 'Laundry & ironing' },
  { key: 'cupboards', label: 'Inside cupboards' },
];

/* Xooters work 07:00–17:00, so a slot has to both start and finish inside that window.
   Generating the list from the service duration rather than hardcoding times means a long
   job correctly stops being offerable in the afternoon. */
function slotsFor(hours) {
  const out = [];
  for (let h = 7; h + hours <= 17; h += 1) {
    out.push(`${String(h).padStart(2, '0')}:00`);
  }
  return out;
}

function DAYS() {
  const out = [];
  const now = new Date();
  for (let i = 1; i <= 14; i++) {
    const d = new Date(now.getTime() + i * 86400000);
    out.push({
      iso: d.toISOString().slice(0, 10),
      day: d.toLocaleDateString('en-ZA', { weekday: 'short' }),
      num: d.getDate(),
      /* Tomorrow is the ideal — supply is real and same-day depends on when you book. */
      ideal: i <= 3,
    });
  }
  return out;
}

function StepDots({ step }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {STEPS.map((s, i) => (
        <React.Fragment key={s}>
          <span style={{
            display: 'flex', alignItems: 'center', gap: 7,
            fontSize: 'var(--xoot-caption)', fontWeight: 700,
            color: i === step ? 'var(--xoot-text-primary)' : 'var(--xoot-text-muted)',
          }}>
            <span style={{
              display: 'grid', placeItems: 'center', width: 22, height: 22, borderRadius: '50%',
              background: i < step ? 'var(--xoot-violet-500)' : i === step ? 'var(--xoot-ink-900)' : 'var(--xoot-neutral-200)',
              color: i <= step ? '#fff' : 'var(--xoot-text-muted)',
              fontSize: 11, fontWeight: 700,
            }}>
              {i < step ? <Icon name="check" size={11} strokeWidth={3.4} /> : i + 1}
            </span>
            <span style={{ display: window.innerWidth < 720 ? 'none' : 'inline' }}>{s}</span>
          </span>
          {i < STEPS.length - 1 && (
            <span style={{ width: 18, height: 2, borderRadius: 2, background: i < step ? 'var(--xoot-violet-300)' : 'var(--xoot-neutral-200)' }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function BookingModal({ open, onClose }) {
  const [step, setStep] = React.useState(0);
  const [service, setService] = React.useState(null);
  const [size, setSize] = React.useState('medium');
  const [addons, setAddons] = React.useState([]);
  const [address, setAddress] = React.useState('');
  const [suburb, setSuburb] = React.useState('Sandton');
  const [day, setDay] = React.useState(null);
  const [slot, setSlot] = React.useState(null);
  const [xooter, setXooter] = React.useState(null);
  /* Once a week preselected — it is the tier that earns the recurring discount, so it is the
     default that most often suits both sides. */
  const [freq, setFreq] = React.useState('weekly');
  /* How many Xooters. 1 by default everywhere — crowding a job nobody asked to be crowded is a
     worse default than a longer visit. */
  const [crew, setCrew] = React.useState(1);
  /* Property type gates which service is correct — see `D.serviceFit`. */
  const [property, setProperty] = React.useState('house');
  /* What a friend's link is worth on this first booking, or null. */
  const referral = window.XootRefer ? window.XootRefer.pendingDiscount() : null;
  /* Laundry is priced by LOADS, not by rooms — and the site never asked for them, so every
     laundry quote resolved against zero loads and came back as "tell us how many loads" with no
     price. The service was bookable and unpriceable at the same time. Defaults are 4 wash / 2
     iron because that is the median real basket, so a price appears immediately. */
  const [laundry, setLaundry] = React.useState({ wash: 4, iron: 2 });
  const isLaundry = service === 'laundry';
  const [paid, setPaid] = React.useState(false);

  const days = React.useMemo(DAYS, []);
  const tier = SIZES.find(s => s.key === size) || SIZES[1];
  /* Slots are generated from the CREW-ADJUSTED hours (set below), so sending two Xooters
     genuinely opens up the afternoon slots a solo visit cannot reach. */
  const svc = service ? XOOT_SERVICES[service] : null;

  React.useEffect(() => { if (open) { setStep(0); setPaid(false); } }, [open]);

  /* ── PRICING IS THE ENGINE'S, NOT THIS COMPONENT'S ──────────────────────────
     This modal used to price itself: `tier.price` (the marketing R280/R325/R400 tiers, not the
     ladder customers are actually charged), a hardcoded `base * 0.15` plan saving, and a booking
     fee waived on recurring — which is not the rule. It also kept a `recurring` boolean beside
     `freq`, so the two could disagree and a plan saving could survive a switch back to a one-off.
     Every one of those was a way for the site to quote a number the app would not charge.

     Now it asks XootQuote, renders `quote.lines` verbatim, and holds no arithmetic on money.

     ⚠️ THESE TWO HOOKS MUST STAY ABOVE `if (!open) return null;`. `useQuote` calls useState and
     useEffect internally, so with them below the guard the component ran a different NUMBER of
     hooks closed than open — React error #310, which unmounts the whole tree and takes the entire
     page down, not just the modal. React's hook order is positional; an early return between a
     hook and a render is the one thing that breaks it. Everything below the guard is plain
     derivation and is safe there. */
  const quoteInput = React.useMemo(() => ({
    service: service || 'regular',
    sizeKey: size,
    /* Sent with the quote so the SERVER decides whether the pairing is priceable. A client that
       can claim "house" for an office can claim its own price. */
    propertyType: property,
    washLoads: isLaundry ? laundry.wash : 0,
    ironLoads: isLaundry ? laundry.iron : 0,
    addOns: addons,
    crew,
    freq,
    dayCount: freq === 'once' ? 0 : 1,
    carePlus: false,
    isNewUser: true,
    /* A referral discount is priced by the ENGINE as a line, never subtracted by this screen.
       Passing the amount in and letting quote.js clamp it keeps one source of truth for money
       and means the receipt names the friend who sent it. */
    referralCredit: referral ? referral.amount : 0,
    referralFrom: referral ? referral.from : null,
    useCredit: false,
    creditAvailable: 0,
  }), [service, size, addons, crew, freq, property, laundry.wash, laundry.iron, isLaundry, referral && referral.code]);

  const { quote, pending } = window.XootQuote.useQuote(quoteInput);

  /* The draft is written to the session on every meaningful change, which is what makes a
     personalised abandonment nudge possible at all: without a persisted draft the only message you
     can write is "you left something", which is the generic one nobody reads. */
  React.useEffect(() => {
    if (!open || !service) return;
    window.XootSession.saveDraft({ service, size, addons, address, suburb, day, slot, xooter, freq, crew, step });
  }, [open, service, size, addons, address, suburb, day, slot, xooter, freq, crew, step]);

  React.useEffect(() => {
    /* Reaching the priced step is the behaviour the window-shopping nudge keys on. */
    if (open && step === 4) window.XootSession.track('price_viewed', { service, total: quote.total });
  }, [open, step]);

  if (!open) return null;

  /* null when the pairing is fine; otherwise the swap to offer. */
  const fit = D.serviceFit(service, property);

  const maxCrew = D.crewCapFor(service || 'regular', size);
  const total = quote.total;
  const hours = quote.hours || tier.hours;
  const slots = slotsFor(hours);
  /* Derived from the frequency they already chose, not a second checkbox. A discount the
     customer has to hunt for is a discount most of them never get. */
  const isRecurring = freq !== 'once';

  const canNext = [
    !!service,
    address.trim().length > 3,
    !!day && !!slot,
    true,   /* Xooter step always passable — "any of them is fine" is a valid answer */
    true,
  ][step];

  const next = () => setStep(s => Math.min(STEPS.length - 1, s + 1));
  const back = () => (step === 0 ? onClose() : setStep(s => s - 1));

  return (
    <div
      role="dialog" aria-modal="true" aria-label="Book a visit"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 200, display: 'grid', placeItems: 'center',
        padding: 'clamp(12px, 4vw, 40px)', background: 'rgba(20,18,16,.46)',
        backdropFilter: 'blur(4px)', overflowY: 'auto',
      }}
    >
      <div style={{
        width: '100%', maxWidth: 720, background: 'var(--xoot-surface-card)',
        borderRadius: 'var(--xoot-radius-xl)', boxShadow: 'var(--xoot-shadow-5)',
        overflow: 'hidden',
        /* Opacity only. A transform here would promote the panel to its own layer inside the
           backdrop-filtered scrim, and every field label in the flow would rasterise blurry. */
        animation: 'xoot-fade-in 280ms var(--xoot-ease-ios-nav) both',
      }}>
        {/* ── Header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
          padding: '18px 24px', boxShadow: 'inset 0 -1px 0 var(--xoot-border-color)',
        }}>
          <button type="button" aria-label={step === 0 ? 'Close' : 'Back'} onClick={back}
            style={{
              display: 'grid', placeItems: 'center', width: 36, height: 36, flex: '0 0 auto',
              border: 'none', borderRadius: '50%', background: 'var(--xoot-surface-sunken)',
              cursor: 'pointer', color: 'var(--xoot-text-primary)',
            }}>
            <Icon name={step === 0 ? 'x' : 'arrow-left'} size={17} strokeWidth={2.2} />
          </button>
          <StepDots step={step} />
        </div>

        <div style={{ padding: 'clamp(20px, 4vw, 32px)', minHeight: 340 }}>
          {/* ── 1 · Service ── */}
          {step === 0 && (
            <>
              <h2 style={{ fontSize: 'var(--xoot-display-3)', lineHeight: 1.1, marginBottom: 8 }}>
                What needs doing?
              </h2>
              <p style={{ fontSize: 'var(--xoot-body)', color: 'var(--xoot-text-secondary)', marginBottom: 24 }}>
                Pick one. You can add extras in a moment.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))', gap: 12 }}>
                {BOOKABLE.map((k, i) => {
                  const on = service === k;
                  return (
                    <button key={k} type="button" onClick={() => setService(k)}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                        padding: '20px 12px', border: 'none', borderRadius: 'var(--xoot-radius-lg)',
                        cursor: 'pointer', background: on ? 'var(--xoot-action-brand-soft)' : 'var(--xoot-surface-page-alt)',
                        boxShadow: on ? 'inset 0 0 0 2px var(--xoot-violet-500)' : 'inset 0 0 0 1px var(--xoot-border-color)',
                        transform: on ? 'translateY(-2px)' : 'none',
                        transition: 'all var(--xoot-dur-fast) var(--xoot-ease-out)',
                      }}>
                      <ServiceIcon service={k} size={52} delay={i * 60} motion={on ? 'breathe' : 'still'} />
                      <span style={{ fontSize: 'var(--xoot-body-sm)', fontWeight: 700, textAlign: 'center', lineHeight: 1.3 }}>
                        {XOOT_SERVICES[k].label}
                      </span>
                    </button>
                  );
                })}
                {/* Lux is shown, not offered — and shown at full strength. It used to sit at
                    62% opacity, which reads as "disabled" rather than "premium": the tier meant
                    to be aspired to looked like the one that had failed to load. */}
                <div style={{
                  position: 'relative', overflow: 'hidden',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                  padding: '20px 12px', borderRadius: 'var(--xoot-radius-lg)',
                  background: 'var(--xoot-lux-surface)',
                  border: '1px solid var(--xoot-lux-hairline)',
                  boxShadow: 'var(--xoot-lux-shadow)',
                }}>
                  <span style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'var(--xoot-lux-metal-line)' }} />
                  <span style={{
                    display: 'grid', placeItems: 'center', width: 52, height: 52,
                    borderRadius: 'var(--xoot-radius-key)',
                    background: 'var(--xoot-lux-raise)', border: '1px solid var(--xoot-lux-hairline)',
                  }}>
                    <Icon name="sparkles" size={24} strokeWidth={1.6} color="var(--xoot-lux-metal)" />
                  </span>
                  <span style={{ fontSize: 'var(--xoot-body-sm)', fontWeight: 700, textAlign: 'center', color: 'var(--xoot-lux-ink)' }}>Xoot Lux</span>
                  <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--xoot-lux-metal)' }}>By invitation</span>
                </div>
              </div>
            </>
          )}

          {/* ── 2 · Place ── */}
          {step === 1 && (
            <>
              <h2 style={{ fontSize: 'var(--xoot-display-3)', lineHeight: 1.1, marginBottom: 8 }}>
                Where are we going?
              </h2>
              <p style={{ fontSize: 'var(--xoot-body)', color: 'var(--xoot-text-secondary)', marginBottom: 24 }}>
                Your Xooter only sees the address on the day of the visit.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 14 }}>
                  <Input label="Street address" icon="map-pin" placeholder="14 Fredman Drive"
                    value={address} onChange={e => setAddress(e.target.value)} />
                  {/* Picker, not Select: the OS dropdown arrives with its own typography and
                      broke the flow mid-booking. Grouped, because "Best coverage" is real
                      information rather than decoration. */}
                  <Picker label="Suburb" icon="map-pin" groups={JOBURG_SUBURBS}
                    value={suburb} onChange={setSuburb} searchPlaceholder="Search suburbs" />
                </div>

                {/* Laundry asks a completely different question. Rooms and property type mean
                    nothing to a wash \u2014 loads are the unit, and they are the price. */}
                {isLaundry ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {[['wash', 'Loads to wash & dry', 'washing-machine', 'About one full machine \u2014 roughly a black bag, or two weeks for one person'],
                      ['iron', 'Loads to iron', 'shirt', 'Count only what you want pressed. Most people iron about half of what they wash']].map(([k, label, icon, hint]) => (
                      <div key={k} style={{
                        display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
                        padding: 'clamp(14px, 2vw, 18px)', borderRadius: 'var(--xoot-radius-md)',
                        background: 'var(--xoot-surface-page-alt)',
                      }}>
                        <span style={{
                          display: 'grid', placeItems: 'center', flex: '0 0 auto', width: 42, height: 42,
                          borderRadius: 'var(--xoot-radius-sm)', background: 'var(--xoot-surface-card)',
                        }}>
                          <Icon name={icon} size={19} strokeWidth={1.9} color="var(--xoot-violet-600)" />
                        </span>
                        <span style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: '1 1 200px', minWidth: 0 }}>
                          <span style={{ fontSize: 'var(--xoot-body-sm)', fontWeight: 700, lineHeight: 1.3 }}>{label}</span>
                          <span style={{ fontSize: 'var(--xoot-caption)', lineHeight: 1.45, color: 'var(--xoot-text-muted)', textWrap: 'pretty' }}>{hint}</span>
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, flex: '0 0 auto' }}>
                          {[['minus', -1], ['plus', 1]].map(([ic, d], i) => (
                            <React.Fragment key={ic}>
                              {i === 1 && (
                                <span style={{
                                  minWidth: 34, textAlign: 'center', fontFamily: 'var(--xoot-font-mono)',
                                  fontSize: 'var(--xoot-body-lg)', fontWeight: 700,
                                }}>{laundry[k]}</span>
                              )}
                              <button type="button" aria-label={`${d > 0 ? 'More' : 'Fewer'} ${k} loads`}
                                onClick={() => setLaundry(L => ({ ...L, [k]: Math.max(0, Math.min(20, L[k] + d)) }))}
                                style={{
                                  display: 'grid', placeItems: 'center', width: 44, height: 44,
                                  border: 'none', borderRadius: '50%', cursor: 'pointer',
                                  background: 'var(--xoot-surface-card)',
                                  boxShadow: 'inset 0 0 0 1px var(--xoot-border-color)',
                                }}>
                                <Icon name={ic} size={16} strokeWidth={2.4} color="var(--xoot-text-primary)" />
                              </button>
                            </React.Fragment>
                          ))}
                        </span>
                      </div>
                    ))}
                    {laundry.wash + laundry.iron === 0 && (
                      <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)' }}>
                        Add at least one load to see your price.
                      </span>
                    )}
                  </div>
                ) : (
                <>
                {/* WHAT IS IT, before HOW BIG. Asked here because the answer changes which service
                    is correct, and asking after the price has been seen means arguing with a
                    number they have already accepted. */}
                <div style={{ marginBottom: 22 }}>
                  <span className="xoot-label" style={{ display: 'block', marginBottom: 10, color: 'var(--xoot-text-muted)' }}>What kind of place is it?</span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))', gap: 10 }}>
                    {D.propertyTypes.map(p => {
                      const on = property === p.key;
                      return (
                        <button key={p.key} type="button" onClick={() => setProperty(p.key)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10, minHeight: 52,
                            padding: '12px 14px', border: 'none', cursor: 'pointer', textAlign: 'left',
                            borderRadius: 'var(--xoot-radius-md)',
                            background: on ? 'var(--xoot-action-brand-soft)' : 'var(--xoot-surface-page-alt)',
                            boxShadow: on ? 'inset 0 0 0 2px var(--xoot-violet-500)' : 'inset 0 0 0 1px var(--xoot-border-color)',
                            fontFamily: 'var(--xoot-font-core)',
                            transition: 'all var(--xoot-dur-fast) var(--xoot-ease-out)',
                          }}>
                          <Icon name={p.icon} size={17} strokeWidth={1.9}
                            color={on ? 'var(--xoot-violet-700)' : 'var(--xoot-text-muted)'} />
                          <span style={{
                            fontSize: 'var(--xoot-body-sm)', fontWeight: on ? 700 : 600, lineHeight: 1.25,
                            color: on ? 'var(--xoot-violet-800)' : 'var(--xoot-text-primary)',
                          }}>{p.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* THE SWAP, NOT A REFUSAL. It explains why in terms of the WORK, offers the right
                    service in one tap, and does not block Continue — an error that traps someone
                    just teaches them to go back and pick "house". */}
                {fit && (
                  <div style={{
                    display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 22,
                    padding: 'clamp(14px, 2vw, 17px)', borderRadius: 'var(--xoot-radius-md)',
                    background: 'var(--xoot-honey-wash)', border: '1px solid var(--xoot-honey-mid)',
                  }}>
                    <Icon name="lightbulb" size={17} strokeWidth={2} color="var(--xoot-honey-ink)"
                      style={{ flex: '0 0 auto', marginTop: 2 }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
                      <span style={{ fontSize: 'var(--xoot-body-sm)', fontWeight: 700, lineHeight: 1.35, color: 'var(--xoot-honey-ink)' }}>
                        {fit.service.title} is the right one for this
                      </span>
                      <span style={{ fontSize: 'var(--xoot-caption)', lineHeight: 1.55, color: 'var(--xoot-text-secondary)' }}>
                        {fit.why} Booking a regular visit for it means your Xooter arrives with the
                        wrong time set aside — the work does not get finished, and they are not paid
                        for what they actually did.
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 2 }}>
                        <Button size="sm" variant="primary" onClick={() => setService(fit.to)}>
                          Switch to {fit.service.title.toLowerCase()}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <span className="xoot-label" style={{ display: 'block', marginBottom: 10, color: 'var(--xoot-text-muted)' }}>How big is the place?</span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))', gap: 10 }}>
                    {SIZES.map(s => {
                      const on = size === s.key;
                      return (
                        <button key={s.key} type="button" onClick={() => setSize(s.key)}
                          style={{
                            display: 'flex', flexDirection: 'column', gap: 3, padding: '14px 16px',
                            border: 'none', borderRadius: 'var(--xoot-radius-md)', textAlign: 'left',
                            cursor: 'pointer', background: on ? 'var(--xoot-action-brand-soft)' : 'var(--xoot-surface-page-alt)',
                            boxShadow: on ? 'inset 0 0 0 2px var(--xoot-violet-500)' : 'inset 0 0 0 1px var(--xoot-border-color)',
                          }}>
                          <span style={{ fontSize: 'var(--xoot-body)', fontWeight: 700, color: on ? 'var(--xoot-violet-700)' : 'var(--xoot-text-primary)' }}>{s.label}</span>
                          <span style={{ fontSize: 'var(--xoot-caption)', color: on ? 'var(--xoot-violet-700)' : 'var(--xoot-text-muted)' }}>{s.detail}</span>
                        </button>
                      );
                    })}
                  </div>
                  {/* Duration, not price — an estimate is useful this early, a number isn't. */}
                  <p style={{ marginTop: 10, fontSize: 'var(--xoot-body-sm)', color: 'var(--xoot-text-secondary)' }}>
                    Estimate: {hours % 1 === 0 ? hours : hours.toFixed(1)} hrs
                  </p>
                </div>

                <div>
                  <span className="xoot-label" style={{ display: 'block', marginBottom: 10, color: 'var(--xoot-text-muted)' }}>Anything extra?</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {ADDONS.map(a => {
                      const on = addons.includes(a.key);
                      return (
                        <button key={a.key} type="button"
                          onClick={() => setAddons(v => on ? v.filter(x => x !== a.key) : [...v, a.key])}
                          style={{
                            height: 42, padding: '0 16px', border: 'none', borderRadius: 'var(--xoot-radius-pill)',
                            cursor: 'pointer', background: on ? 'var(--xoot-violet-500)' : 'var(--xoot-surface-page-alt)',
                            color: on ? '#fff' : 'var(--xoot-text-secondary)',
                            boxShadow: on ? 'none' : 'inset 0 0 0 1px var(--xoot-border-color)',
                            fontFamily: 'var(--xoot-font-core)', fontSize: 'var(--xoot-body-sm)', fontWeight: 700,
                            transition: 'all var(--xoot-dur-fast) var(--xoot-ease-out)',
                          }}>
                          {a.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                </>
                )}
              </div>
            </>
          )}

          {/* ── 3 · When ── */}
          {step === 2 && (
            <>
              <h2 style={{ fontSize: 'var(--xoot-display-3)', lineHeight: 1.1, marginBottom: 8 }}>
                When suits you?
              </h2>
              <p style={{ fontSize: 'var(--xoot-body)', color: 'var(--xoot-text-secondary)', marginBottom: 24 }}>
                Xooters work 07:00–17:00. Tomorrow or later gives you the best pick.
              </p>
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 22 }}>
                {days.map(d => {
                  const on = day === d.iso;
                  return (
                    <button key={d.iso} type="button" onClick={() => setDay(d.iso)}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                        flex: '0 0 auto', width: 62, padding: '11px 0 13px', border: 'none',
                        borderRadius: 'var(--xoot-radius-md)', cursor: 'pointer',
                        background: on ? 'var(--xoot-ink-900)' : 'var(--xoot-surface-page-alt)',
                        color: on ? '#fff' : 'var(--xoot-text-primary)',
                        boxShadow: on ? 'none' : 'inset 0 0 0 1px var(--xoot-border-color)',
                      }}>
                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', opacity: .7 }}>{d.day}</span>
                      <span style={{ fontFamily: 'var(--xoot-font-display)', fontSize: 22, lineHeight: 1.1 }}>{d.num}</span>
                      {d.ideal && <span style={{ width: 5, height: 5, borderRadius: '50%', background: on ? 'var(--xoot-violet-300)' : 'var(--xoot-sage-500)' }} />}
                    </button>
                  );
                })}
              </div>
              {/* Frequency sits on the WHEN step, before the time. It changes which days
                  matter, so asking after the date would mean asking for the date twice. */}
              <span className="xoot-label" style={{ display: 'block', marginBottom: 10, color: 'var(--xoot-text-muted)' }}>How often</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 22 }}>
                {[
                  { key: 'weekly', label: 'Once a week', note: 'Most popular' },
                  { key: 'fortnightly', label: 'Twice a month', note: null },
                  { key: 'monthly', label: 'Once a month', note: null },
                  { key: 'once', label: 'Just this once', note: null },
                ].map(f => {
                  const on = freq === f.key;
                  return (
                    <button key={f.key} type="button" onClick={() => setFreq(f.key)}
                      style={{
                        display: 'flex', flexDirection: 'column', gap: 2, minHeight: 58,
                        padding: '10px 18px', border: 'none', borderRadius: 'var(--xoot-radius-md)',
                        cursor: 'pointer', textAlign: 'left',
                        background: on ? 'var(--xoot-action-brand-soft)' : 'var(--xoot-surface-page-alt)',
                        boxShadow: on ? 'inset 0 0 0 2px var(--xoot-violet-500)' : 'inset 0 0 0 1px var(--xoot-border-color)',
                        transition: 'all var(--xoot-dur-fast) var(--xoot-ease-out)',
                      }}>
                      <span style={{ fontSize: 'var(--xoot-body-sm)', fontWeight: 700, color: on ? 'var(--xoot-violet-700)' : 'var(--xoot-text-primary)' }}>{f.label}</span>
                      {f.note && (
                        <span style={{ fontSize: 'var(--xoot-caption)', color: on ? 'var(--xoot-violet-700)' : 'var(--xoot-text-muted)', opacity: on ? .85 : 1 }}>{f.note}</span>
                      )}
                    </button>
                  );
                })}
              </div>
              <span className="xoot-label" style={{ display: 'block', marginBottom: 10, color: 'var(--xoot-text-muted)' }}>Start time</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {slots.map(s => {
                  const on = slot === s;
                  return (
                    <button key={s} type="button" onClick={() => setSlot(s)}
                      style={{
                        height: 44, padding: '0 18px', border: 'none', borderRadius: 'var(--xoot-radius-pill)',
                        cursor: 'pointer', background: on ? 'var(--xoot-violet-500)' : 'var(--xoot-surface-page-alt)',
                        color: on ? '#fff' : 'var(--xoot-text-primary)',
                        boxShadow: on ? 'none' : 'inset 0 0 0 1px var(--xoot-border-color)',
                        fontFamily: 'var(--xoot-font-mono)', fontSize: 'var(--xoot-body-sm)', fontWeight: 500,
                      }}>
                      {s}
                    </button>
                  );
                })}
              </div>
              {slots.length === 0 && (
                <p style={{ fontSize: 'var(--xoot-body-sm)', color: 'var(--xoot-text-secondary)' }}>
                  A {hours % 1 === 0 ? hours : hours.toFixed(1)}-hour visit doesn't fit in a single day —
                  {maxCrew > 1 ? ' send more than one Xooter, ' : ' '}pick a smaller place, or split it
                  across two visits.
                </p>
              )}
            </>
          )}

          {/* ── 4 · Xooter ── */}
          {step === 3 && (
            <>
              <h2 style={{ fontSize: 'var(--xoot-display-3)', lineHeight: 1.1, marginBottom: 8 }}>
                These Xooters are available
              </h2>
              <p style={{ fontSize: 'var(--xoot-body)', color: 'var(--xoot-text-secondary)', marginBottom: 24 }}>
                Every one is background-checked and rated after each visit.
              </p>

              {/* HOW MANY, before WHO — and only where it earns its place. A turnover, an office
                  and a moving clean all run against a clock, which is the entire reason to send
                  more than one person: the price barely moves because it is charged on total
                  labour, but the visit finishes in half the time. Offered on a regular home clean
                  it would just sell crowding, so `crewCapFor` returns 1–2 there and this block
                  disappears. */}
              {maxCrew > 1 && (
                <div style={{ marginBottom: 22, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>How many Xooters</span>
                    <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)', lineHeight: 1.45 }}>
                      Charged on total work, not per person — so more Xooters finishes sooner for
                      close to the same price.
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, 108px), 1fr))`, gap: 8 }}>
                    {Array.from({ length: maxCrew }, (_, i) => i + 1).map(n => {
                      const on = crew === n;
                      const q = window.XootQuote.resolve({ ...quoteInput, crew: n });
                      return (
                        <button key={n} type="button" onClick={() => setCrew(n)}
                          style={{
                            display: 'flex', flexDirection: 'column', gap: 3, minHeight: 68,
                            padding: '11px 13px', border: 'none', cursor: 'pointer', textAlign: 'left',
                            borderRadius: 'var(--xoot-radius-sm)',
                            background: on ? 'var(--xoot-action-brand-soft)' : 'var(--xoot-surface-page-alt)',
                            boxShadow: on ? 'inset 0 0 0 2px var(--xoot-violet-500)' : 'inset 0 0 0 1px var(--xoot-border-color)',
                            transition: 'all var(--xoot-dur-fast) var(--xoot-ease-out)',
                            fontFamily: 'var(--xoot-font-core)',
                          }}>
                          <span style={{ fontSize: 'var(--xoot-body-sm)', fontWeight: 700, color: on ? 'var(--xoot-violet-800)' : 'var(--xoot-text-primary)' }}>
                            {n === 1 ? 'One Xooter' : `${n} Xooters`}
                          </span>
                          <span style={{ fontFamily: 'var(--xoot-font-mono)', fontSize: 11, color: 'var(--xoot-text-muted)' }}>
                            {q.hours % 1 === 0 ? q.hours : q.hours.toFixed(1)} hrs
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {crew > 1 && (
                    <p style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-secondary)', lineHeight: 1.5 }}>
                      We assign the other {crew - 1 === 1 ? 'Xooter' : `${crew - 1} Xooters`} from the
                      same vetted pool, and they arrive together.
                    </p>
                  )}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: 14 }}>
                {D.pros.slice(0, 3).map(p => {
                  const on = xooter === p.name;
                  return (
                    <button key={p.name} type="button" onClick={() => setXooter(p.name)}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                        padding: 'var(--xoot-space-5)', border: 'none', borderRadius: 'var(--xoot-radius-lg)',
                        cursor: 'pointer', textAlign: 'center',
                        background: on ? 'var(--xoot-action-brand-soft)' : 'var(--xoot-surface-page-alt)',
                        boxShadow: on ? 'inset 0 0 0 2px var(--xoot-violet-500)' : 'inset 0 0 0 1px var(--xoot-border-color)',
                        transform: on ? 'translateY(-2px)' : 'none',
                        transition: 'all var(--xoot-dur-fast) var(--xoot-ease-out)',
                      }}>
                      <Avatar name={p.name} size="lg" badge="verified" ring={on ? 'var(--xoot-violet-400)' : undefined} />
                      <span style={{ fontFamily: 'var(--xoot-font-display)', fontSize: 'var(--xoot-title-3)' }}>{p.name}</span>
                      <Rating value={p.rating} count={p.reviews} size={14} />
                      <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)', lineHeight: 1.45 }}>{p.tagline}</span>
                    </button>
                  );
                })}
              </div>
              <Button variant="outline" block style={{ marginTop: 16 }}
                onClick={() => { setXooter(D.pros[Math.floor(Math.random() * D.pros.length)].name); next(); }}>
                Any of them is fine
              </Button>
            </>
          )}

          {/* ── 5 · Confirm ── the only step with prices on it */}
          {step === 4 && !paid && (
            <>
              <h2 style={{ fontSize: 'var(--xoot-display-3)', lineHeight: 1.1, marginBottom: 20 }}>
                Confirm your booking.
              </h2>
              <Card tone="flat" pad="lg" radius="lg" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[['Service', svc ? svc.label : '—'],
                  ['Place', `${tier.label} · ${hours} hrs`],
                  ...(crew > 1 ? [['Xooters', `${crew}, arriving together`]] : []),
                  ['Where', `${address || '—'}, ${suburb}`],
                  ['When', day && slot ? `${new Date(day + 'T00:00:00').toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'short' })} at ${slot}` : '—'],
                  ['Xooter', xooter || 'Best available']].map(([l, v]) => (
                  <div key={l} style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                    <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>{l}</span>
                    <span style={{ fontSize: 'var(--xoot-body-sm)', fontWeight: 600, textAlign: 'right' }}>{v}</span>
                  </div>
                ))}

                {quote.mismatch && (
                  <div style={{
                    display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 14,
                    padding: '13px 15px', borderRadius: 'var(--xoot-radius-sm)',
                    background: 'var(--xoot-honey-wash)',
                  }}>
                    <Icon name="info" size={15} strokeWidth={2} color="var(--xoot-honey-ink)" style={{ flex: '0 0 auto', marginTop: 2 }} />
                    <span style={{ fontSize: 'var(--xoot-caption)', lineHeight: 1.55, color: 'var(--xoot-text-secondary)' }}>
                      Priced as <strong>{quote.mismatch.title.toLowerCase()}</strong> — that is what
                      this property needs, and it is what your Xooter will be scheduled and paid
                      for. You are charged this, not the regular rate.
                    </span>
                  </div>
                )}

                <span style={{ height: 1, background: 'var(--xoot-neutral-200)' }} />

                {/* Rendered verbatim from the pricing service — no arithmetic here for the lines
                    and the total to drift apart. */}
                {quote.lines.map(l => (
                  <div key={l.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                    <span style={{ fontSize: 'var(--xoot-body-sm)', color: 'var(--xoot-text-secondary)' }}>{l.label}</span>
                    <span style={{ fontFamily: 'var(--xoot-font-mono)', fontSize: 'var(--xoot-body-sm)', fontWeight: 600, flex: '0 0 auto' }}>
                      {D.rand(l.amount)}
                    </span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--xoot-body-sm)' }}>
                  <span style={{ color: 'var(--xoot-sage-ink)' }}>XootCover</span>
                  <span style={{ fontWeight: 700, color: 'var(--xoot-sage-ink)' }}>Included</span>
                </div>

                <span style={{ height: 1, background: 'var(--xoot-neutral-200)' }} />

                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>Total</span>
                  <span style={{ fontFamily: 'var(--xoot-font-display)', fontSize: 'var(--xoot-display-3)', lineHeight: 1 }}>
                    {D.rand(total)}
                  </span>
                </div>
              </Card>

              {/* Moves `freq` ITSELF rather than setting a second flag beside it. The old version
                  was a separate `recurring` checkbox claiming "Saves 15% and drops the service
                  fee" — two false promises (the rate comes from a table keyed on visits per month,
                  and the fee is waived only for Care+) sitting on a control that could disagree
                  with the frequency actually chosen. Both figures below are engine quotes, so the
                  saving shown is the saving charged. */}
              {(() => {
                const once = window.XootQuote.resolve({ ...quoteInput, freq: 'once', dayCount: 0 });
                const weekly = window.XootQuote.resolve({ ...quoteInput, freq: 'weekly', dayCount: 1 });
                const saving = once.total - weekly.total;
                if (saving <= 0) return null;
                const on = isRecurring;
                return (
                  <button type="button" onClick={() => setFreq(on ? 'once' : 'weekly')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, width: '100%', marginTop: 14,
                      padding: 'var(--xoot-space-4)', border: 'none', borderRadius: 'var(--xoot-radius-md)',
                      cursor: 'pointer', textAlign: 'left',
                      background: on ? 'var(--xoot-careplus-wash)' : 'var(--xoot-surface-page-alt)',
                      boxShadow: on ? 'inset 0 0 0 1.5px var(--xoot-careplus-300)' : 'inset 0 0 0 1px var(--xoot-border-color)',
                    }}>
                    <span style={{
                      display: 'grid', placeItems: 'center', width: 24, height: 24, flex: '0 0 auto',
                      borderRadius: 6, background: on ? 'var(--xoot-careplus-500)' : 'transparent',
                      boxShadow: on ? 'none' : 'inset 0 0 0 2px var(--xoot-neutral-300)',
                    }}>
                      {on && <Icon name="check" size={14} color="#fff" strokeWidth={3.4} />}
                    </span>
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: 'var(--xoot-body-sm)', fontWeight: 700 }}>Make this a once-a-week visit</span>
                      <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)' }}>
                        Saves {D.rand(saving)} a visit · {D.rand(weekly.total)} instead of {D.rand(once.total)}. Pause or stop any time.
                      </span>
                    </span>
                  </button>
                );
              })()}

              {/* FRICTIONLESS PAYMENT, IN PLACE — not as a sixth step.
                  Confirming and paying were two screens with the same information on both, so the
                  second one only added a tap. ExpressPay puts the wallet buttons and the saved card
                  directly under the summary: the amount stays visible, and a returning customer is
                  one tap from done because the card is already known. */}
              <div style={{ marginTop: 18 }}>
                <ExpressPay
                  total={total}
                  summary={`${svc ? svc.label : 'Cleaning'} · ${day && slot ? slot : 'your slot'}`}
                  onPaid={(res) => {
                    /* Burn the referral before the booking is recorded: `pendingDiscount` refuses
                       once `bookings` is non-empty, so redeeming after would find nothing to
                       redeem and the code would stay armed for a second booking. */
                    if (window.XootRefer) window.XootRefer.redeem();
                    window.XootSession.completeBooking({
                      service, size, address, suburb, day, slot, xooter, crew,
                      total: res.total, method: res.method,
                    });
                    setPaid(true);
                  }}
                />
              </div>

              <p style={{ marginTop: 14, fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)', lineHeight: 1.55 }}>
                Paid once, now. We hold it and pay your Xooter after the visit is done.
              </p>
            </>
          )}

          {/* Confirmed */}
          {step === 4 && paid && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, textAlign: 'center', padding: '20px 0' }}>
              <span style={{
                display: 'grid', placeItems: 'center', width: 76, height: 76, borderRadius: '50%',
                background: 'var(--xoot-sage-wash)',
                animation: 'xoot-pop var(--xoot-dur-base) var(--xoot-ease-ios-snap) both',
              }}>
                <Icon name="check" size={38} color="var(--xoot-sage-500)" strokeWidth={2.6} />
              </span>
              <h2 style={{ fontSize: 'var(--xoot-display-3)', lineHeight: 1.1 }}>You're all set.</h2>
              <p style={{ fontSize: 'var(--xoot-body)', color: 'var(--xoot-text-secondary)', maxWidth: 400, lineHeight: 1.6 }}>
                {xooter || 'Your Xooter'} arrives {day ? new Date(day + 'T00:00:00').toLocaleDateString('en-ZA', { weekday: 'long' }) : 'soon'} at {slot}.
                We'll tell you the night before, when they're on the way, and when they're done —
                you don't need to check anything.
              </p>
              <div style={{ marginTop: 6 }}>
                <span style={{ display: 'block', marginBottom: 12, fontSize: 'var(--xoot-body-sm)', fontWeight: 700 }}>
                  Track it live in the app
                </span>
                <StoreBadges align="center" />
              </div>
              <Button variant="outline" onClick={onClose} style={{ marginTop: 6 }}>Done</Button>
            </div>
          )}
        </div>

        {/* ── Footer ──
            Gone entirely on the confirm step: payment lives in the body now, and a second Pay
            button in the footer would be a competing primary action on the one screen that must
            have exactly one. */}
        {step < 4 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
            padding: '18px 24px', boxShadow: 'inset 0 1px 0 var(--xoot-border-color)',
            background: 'var(--xoot-surface-page-alt)',
          }}>
            <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)' }}>
              No charge until you confirm.
            </span>
            <Button variant="primary" size="lg" disabled={!canNext} onClick={next} iconRight="arrow-right">
              Continue
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { BookingModal });
})();
