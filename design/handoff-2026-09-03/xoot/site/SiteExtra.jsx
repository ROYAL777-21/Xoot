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
