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
