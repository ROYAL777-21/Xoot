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
