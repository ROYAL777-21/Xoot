/* The bug bounty page.

   A security page is read by two audiences with opposite needs: researchers deciding whether
   reporting here is worth their time, and customers checking whether anyone is minding the store.
   The structure serves both by putting safe harbour first (the thing a researcher checks before
   reading anything else) and how-we-pay second (the thing that decides whether they bother).

   NO SITE NAV. This page is reached from one footer link and its job is to be read start to
   finish. A full marketing navbar at the top of a disclosure policy invites the reader back to
   the shop mid-sentence, and it made the page open on a black strip that matched nothing below
   it. A single back-link is the whole chrome.

   The flip-board hero is the one flourish. A departure board resolving into REPORT A BUG · GET
   PAID says "we take this seriously and we are not stuffy about it" faster than a paragraph can,
   and this is the single page on the site where a mechanical effect is on-subject. */
const D = window.XootData;
const {
  Button, Icon, Card, Badge, ScrollReveal,
  TextFlippingBoard, EncryptedText, FloatingDock,
} = window.XootNS;

const SECURITY_MAIL = 'mailto:security@xoot.co.za?subject=Security%20report';

/* Severity DEFINITIONS, not price tags. Xoot pays cash and decides the amount per report, so
   printing a range here would be a promise the programme has not made — and a published floor is
   the number a researcher argues from when the real impact turns out to be lower. What the tiers
   do is tell you how seriously a class of bug is taken, which is the part you need before you
   spend a weekend on it. */
const BOUNTY_TIERS = [
  { sev: 'Critical', range: 'Cash · highest band', tint: 'careplus', sla: 'Triaged same day',
    detail: 'Remote code execution. Full account takeover with no interaction. Access to bulk customer or Xooter data. Payment manipulation. Anything that exposes a customer\'s home access codes.' },
  { sev: 'High', range: 'Cash · high band', tint: 'honey', sla: 'Triaged in 2 business days',
    detail: 'Authentication bypass. Access to another person\'s bookings, documents or messages. Privilege escalation to staff. Stored cross-site scripting on a signed-in page.' },
  { sev: 'Medium', range: 'Cash · standard band', tint: 'mist', sla: 'Triaged in 5 business days',
    detail: 'Reflected XSS. CSRF on a state-changing action. Business-logic flaws that alter a price or skip a payment step. Leaking non-sensitive data across accounts.' },
  { sev: 'Low', range: 'Cash · nominal, or credit', tint: 'sage', sla: 'Triaged in 10 business days',
    detail: 'Missing security headers with a demonstrated impact. Rate-limiting gaps. Information disclosure with limited consequence.' },
];

const BOUNTY_TINT = {
  careplus: { wash: 'var(--xoot-careplus-wash)', ink: 'var(--xoot-careplus-ink)' },
  honey:    { wash: 'var(--xoot-honey-wash)',    ink: 'var(--xoot-honey-ink)' },
  mist:     { wash: 'var(--xoot-mist-wash)',     ink: 'var(--xoot-mist-ink)' },
  sage:     { wash: 'var(--xoot-sage-wash)',     ink: 'var(--xoot-sage-ink)' },
};

const REWARD_NOTE = 'Every valid report is paid in cash. We set the amount per report, judged on real impact, exploitability and report quality — not on a published table. We tell you the amount before you invoice, and we will explain how we got there.';

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
  'Anything needing a rooted device plus physical access',
];

/* Rules of engagement. Written as things you MAY do wherever possible — a policy that is only
   prohibitions reads as a threat, and a researcher who feels threatened publishes instead of
   emailing. The two hard limits are the two that involve other people's homes. */
const RULES = [
  { icon: 'circle-user', title: 'Test on your own accounts',
    body: 'Register as many as you need. Prefix them with "sec-" so our fraud checks leave them alone. If you need a Xooter-side account, ask and we will make you one.' },
  { icon: 'shield-check', title: 'Stop at proof',
    body: 'One record is proof of an IDOR. A thousand is a data breach that we then have to report to the Information Regulator, with your name on it. Prove it and stop.' },
  { icon: 'house', title: 'Never touch a real home',
    body: 'No booking a real Xooter to test something. No accessing gate codes, alarm codes or addresses that are not yours. A person lives there.' },
  { icon: 'clock', title: 'Rate-limit yourself',
    body: 'Keep automated traffic under 5 requests a second and put your handle in the User-Agent so our on-call engineer knows it is you and not an incident.' },
];

/* The disclosure clock, stated as a table because a researcher checks it like a contract. */
const TIMELINE = [
  ['You report', 'Any time', 'security@xoot.co.za, or the form. PGP welcome, never required.'],
  ['We acknowledge', 'Within 2 business days', 'A human reply, not an autoresponder. You get a reference and a named engineer.'],
  ['We assess', 'Within 10 business days', 'Severity, whether it is a duplicate, and the reward amount — before you invoice.'],
  ['We fix', 'Critical in 7 days · High in 30', 'You get told when it ships, and we ask you to re-test.'],
  ['We pay', 'Within 30 days of your invoice', 'EFT to a South African account, or Wise internationally. VAT handled if you are registered.'],
  ['You publish', 'After 90 days, or when we fix', 'Whichever comes first. Ask sooner and we will usually say yes.'],
];

/* What separates a report we can act on from one that sits in triage for a week. Concrete, because
   "write a good report" is not actionable advice. */
const GOOD_REPORT = [
  'The exact URL or endpoint, and which account you used',
  'Numbered steps someone can follow without guessing',
  'What you could reach that you should not have been able to',
  'A short video or a curl command — either, not both',
  'Your own assessment of severity, and why',
];

/* Named researchers, most recent first. A hall of fame is not decoration: it is the proof that
   reports here get read and paid, and it is the reference a researcher shows an employer. */
const HALL_OF_FAME = [
  { handle: '@thabo_sec', finding: 'IDOR on booking receipts', month: 'Jul 2026', sev: 'High' },
  { handle: '@n1ghtjar', finding: 'Access-window token replay', month: 'Jun 2026', sev: 'Critical' },
  { handle: '@mariedt', finding: 'Price manipulation on recurring plans', month: 'Jun 2026', sev: 'High' },
  { handle: '@0xkgomotso', finding: 'Stored XSS in Xooter profile bio', month: 'May 2026', sev: 'High' },
  { handle: '@sipho.h', finding: 'Rate limit bypass on OTP', month: 'Apr 2026', sev: 'Medium' },
  { handle: '@fuzzyduck', finding: 'Document upload MIME confusion', month: 'Mar 2026', sev: 'Medium' },
];

const SEV_TONE = { Critical: 'careplus', High: 'honey', Medium: 'mist', Low: 'sage' };

const DOCK_ITEMS = [
  { title: 'Safe harbour', icon: 'shield-check', href: '#safe-harbour' },
  { title: 'Rewards', icon: 'wallet', href: '#rewards' },
  { title: 'Scope', icon: 'list-checks', href: '#scope' },
  { title: 'Rules', icon: 'key', href: '#rules' },
  { title: 'Timeline', icon: 'clock', href: '#timeline' },
  { title: 'Report', icon: 'circle-alert', href: '#report' },
];

function BugBountyPage() {
  /* Published by SiteBody — read at render time, not module-eval time, because the load order of
     the two files is not guaranteed. */
  const { Section, SectionHead, SiteFooter } = window;

  return (
    <>
      <main>
        {/* ── Hero ── */}
        <Section>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'clamp(20px, 3vw, 32px)', textAlign: 'center' }}>
            <Badge tone="neutral" icon="shield-check">Security at Xoot</Badge>

            <TextFlippingBoard text={'REPORT A BUG\nGET PAID'} duration={2.4} />

            <h1 style={{ fontSize: 'clamp(34px, 4.6vw, 62px)', lineHeight: 1.04, letterSpacing: '-.02em', maxWidth: 820 }}>
              <EncryptedText
                text="Bug Bounty Program"
                revealDelayMs={46}
                flipDelayMs={42}
                encryptedStyle={{ color: 'var(--xoot-violet-400)', fontFamily: 'var(--xoot-font-mono)' }}
                revealedStyle={{ color: 'var(--xoot-text-primary)' }}
              />
            </h1>

            <p style={{ maxWidth: 620, fontSize: 'var(--xoot-body-lg)', lineHeight: 1.6, color: 'var(--xoot-text-secondary)' }}>
              Xoot holds home addresses, gate codes and payment details. We would rather pay a
              researcher than explain a breach — so if you find something, there is money in it
              and a person who will read your report.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
              <Button variant="ink" size="lg" icon="circle-alert" as="a" href={SECURITY_MAIL}>Report a finding</Button>
              <Button variant="outline" size="lg" icon="list-checks" as="a" href="#scope">Read the scope</Button>
            </div>

            {/* Three numbers a researcher uses to decide whether this programme is serious. */}
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 'clamp(18px, 4vw, 54px)', marginTop: 8 }}>
              {[['2 days', 'to a human reply'], ['R0', 'reports rejected as "informational"'], ['90 days', 'to publish, or sooner']].map(([n, l]) => (
                <span key={l} style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--xoot-font-display)', fontSize: 'clamp(24px, 3vw, 34px)', lineHeight: 1 }}>{n}</span>
                  <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)', maxWidth: 160 }}>{l}</span>
                </span>
              ))}
            </div>
          </div>
        </Section>

        {/* ── Safe harbour ── first, because it is what a researcher checks before anything else */}
        <Section id="safe-harbour" tone="alt">
          <ScrollReveal>
            <Card pad="lg" radius="lg" style={{
              display: 'flex', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap',
              background: 'var(--xoot-sage-wash)', boxShadow: 'none',
            }}>
              <Icon name="shield-check" size={28} color="var(--xoot-sage-ink)" strokeWidth={1.8} style={{ marginTop: 2, flex: '0 0 auto' }} />
              <div style={{ flex: '1 1 320px', minWidth: 0 }}>
                <h2 style={{ fontSize: 'var(--xoot-title-1)', fontWeight: 500, color: 'var(--xoot-sage-ink)', marginBottom: 10 }}>
                  Safe harbour
                </h2>
                <p style={{ fontSize: 'var(--xoot-body-lg)', lineHeight: 1.6, color: 'var(--xoot-sage-ink)', maxWidth: 760 }}>
                  Research conducted in good faith under this policy will not be met with legal
                  action. Stay in scope, use only accounts you own or have permission to test, stop
                  at the point you have proven impact, and never access, modify or retain another
                  person's data. Tell us, then give us 90 days before publishing.
                </p>
                <p style={{ fontSize: 'var(--xoot-body-sm)', lineHeight: 1.6, color: 'var(--xoot-sage-ink)', opacity: .82, maxWidth: 760, marginTop: 12 }}>
                  In South African terms: we will not lay a complaint under the Cybercrimes Act 19
                  of 2020 for testing that follows this policy, and we treat you as an authorised
                  operator for the purposes of section 2. If a third party comes after you for work
                  done inside this scope, tell us and we will confirm in writing that it was
                  authorised.
                </p>
              </div>
            </Card>
          </ScrollReveal>
        </Section>

        {/* ── Rewards ── */}
        <Section id="rewards">
          <SectionHead
            eyebrow="What we pay"
            title="Paid on impact, not on severity labels."
            squiggle="on impact"
            sub="We assess what an attacker could actually reach. A clean proof-of-concept moves you up a tier."
            maxWidth={620}
          />
          <Card pad="lg" radius="lg" tone="flat" style={{ display: 'flex', gap: 13, marginTop: -14, alignItems: 'flex-start' }}>
            <Icon name="wallet" size={20} strokeWidth={1.9} color="var(--xoot-violet-600)" style={{ flex: '0 0 auto', marginTop: 2 }} />
            <p style={{ maxWidth: '70ch', fontSize: 'var(--xoot-body)', lineHeight: 1.58, color: 'var(--xoot-text-secondary)' }}>{REWARD_NOTE}</p>
          </Card>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: 18, marginTop: 'clamp(28px, 4vw, 48px)' }}>
            {BOUNTY_TIERS.map((t, i) => {
              const c = BOUNTY_TINT[t.tint];
              return (
                <ScrollReveal key={t.sev} delay={i * 80}>
                  <Card pad="lg" radius="lg" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 13 }}>
                    <span className="xoot-label" style={{
                      alignSelf: 'flex-start', padding: '7px 12px',
                      borderRadius: 'var(--xoot-radius-pill)', background: c.wash, color: c.ink,
                    }}>{t.sev}</span>
                    <span style={{
                      fontFamily: 'var(--xoot-font-display)', fontSize: 'var(--xoot-title-2)',
                      lineHeight: 1.15, color: 'var(--xoot-text-primary)',
                    }}>{t.range}</span>
                    <p style={{ fontSize: 'var(--xoot-body-sm)', lineHeight: 1.55, color: 'var(--xoot-text-secondary)', flex: 1 }}>{t.detail}</p>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 7, paddingTop: 4 }}>
                      <Icon name="clock" size={13} strokeWidth={2} color="var(--xoot-text-muted)" />
                      <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)', fontWeight: 600 }}>{t.sla}</span>
                    </span>
                  </Card>
                </ScrollReveal>
              );
            })}
          </div>
        </Section>

        {/* ── Scope ── */}
        <Section id="scope" tone="alt">
          <SectionHead eyebrow="Scope" title="What counts, and what doesn't." maxWidth={560} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 18, marginTop: -14 }}>
            {[['In scope', IN_SCOPE, 'circle-check', 'var(--xoot-sage-500)'],
              ['Out of scope', OUT_OF_SCOPE, 'x', 'var(--xoot-neutral-400)']].map(([title, items, ic, col], i) => (
              <ScrollReveal key={title} delay={i * 90}>
                <Card pad="lg" radius="lg" style={{ height: '100%' }}>
                  <h3 style={{ fontSize: 'var(--xoot-title-2)', fontWeight: 500, marginBottom: 18 }}>{title}</h3>
                  <ul style={{ display: 'flex', flexDirection: 'column', gap: 12, margin: 0, padding: 0, listStyle: 'none' }}>
                    {items.map(it => (
                      <li key={it} style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
                        <Icon name={ic} size={16} color={col} strokeWidth={2.2} style={{ marginTop: 3, flex: '0 0 auto' }} />
                        <span style={{ fontSize: 'var(--xoot-body-sm)', lineHeight: 1.55, color: 'var(--xoot-text-secondary)' }}>{it}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </ScrollReveal>
            ))}
          </div>
        </Section>

        {/* ── Rules of engagement ── */}
        <Section id="rules">
          <SectionHead
            eyebrow="Rules of engagement"
            title="Four rules. Two of them are about people's homes."
            squiggle="people's homes"
            sub="Everything else is negotiable — ask us. These are not."
            maxWidth={620}
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 18, marginTop: -14 }}>
            {RULES.map((r, i) => (
              <ScrollReveal key={r.title} delay={i * 70}>
                <Card pad="lg" radius="lg" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <span style={{
                    display: 'grid', placeItems: 'center', width: 42, height: 42,
                    borderRadius: 'var(--xoot-radius-md)', background: 'var(--xoot-violet-50)',
                  }}>
                    <Icon name={r.icon} size={19} strokeWidth={1.9} color="var(--xoot-violet-700)" />
                  </span>
                  <span style={{ fontSize: 'var(--xoot-body-lg)', fontWeight: 700, lineHeight: 1.3 }}>{r.title}</span>
                  <p style={{ fontSize: 'var(--xoot-body-sm)', lineHeight: 1.55, color: 'var(--xoot-text-secondary)' }}>{r.body}</p>
                </Card>
              </ScrollReveal>
            ))}
          </div>
        </Section>

        {/* ── Timeline ── */}
        <Section id="timeline" tone="alt">
          <SectionHead
            eyebrow="What happens next"
            title="The clock, and who is holding it."
            sub="Every step below is on us, with a date attached. If we miss one, say so in the thread and it gets escalated."
            maxWidth={640}
          />
          <ScrollReveal>
            <Card pad="none" radius="lg" style={{ overflow: 'hidden', marginTop: -14 }}>
              {TIMELINE.map(([step, when, detail], i) => (
                <div key={step} style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr)',
                  gap: 6,
                  padding: 'clamp(16px, 2.4vw, 22px) clamp(18px, 3vw, 28px)',
                  background: i % 2 ? 'var(--xoot-surface-page-alt)' : 'transparent',
                }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '4px 14px' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: 24, height: 24, borderRadius: '50%', flex: '0 0 auto',
                      background: 'var(--xoot-violet-600)', color: '#fff',
                      fontSize: 12, fontWeight: 800, fontFamily: 'var(--xoot-font-mono)',
                    }}>{i + 1}</span>
                    <span style={{ fontSize: 'var(--xoot-body)', fontWeight: 700 }}>{step}</span>
                    <span style={{
                      fontFamily: 'var(--xoot-font-mono)', fontSize: 'var(--xoot-caption)',
                      color: 'var(--xoot-violet-700)', fontWeight: 700,
                    }}>{when}</span>
                  </div>
                  <span style={{ fontSize: 'var(--xoot-body-sm)', lineHeight: 1.55, color: 'var(--xoot-text-secondary)', paddingLeft: 38 }}>{detail}</span>
                </div>
              ))}
            </Card>
          </ScrollReveal>
        </Section>

        {/* ── Hall of fame ── */}
        <Section id="credits">
          <SectionHead
            eyebrow="Hall of fame"
            title="People who found something."
            squiggle="found something"
            sub="Named with permission, most recent first. If you would rather stay anonymous, say so and you will not appear here."
            maxWidth={620}
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: 14, marginTop: -14 }}>
            {HALL_OF_FAME.map((h, i) => {
              const c = BOUNTY_TINT[SEV_TONE[h.sev]];
              return (
                <ScrollReveal key={h.handle} delay={i * 55}>
                  <Card pad="md" radius="md" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 9 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <span style={{ fontFamily: 'var(--xoot-font-mono)', fontSize: 'var(--xoot-body-sm)', fontWeight: 700 }}>{h.handle}</span>
                      <span style={{
                        padding: '4px 9px', borderRadius: 'var(--xoot-radius-pill)',
                        background: c.wash, color: c.ink, fontSize: 11, fontWeight: 800,
                      }}>{h.sev}</span>
                    </div>
                    <span style={{ fontSize: 'var(--xoot-body-sm)', lineHeight: 1.45, color: 'var(--xoot-text-secondary)', flex: 1 }}>{h.finding}</span>
                    <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)' }}>{h.month}</span>
                  </Card>
                </ScrollReveal>
              );
            })}
          </div>
        </Section>

        {/* ── How to report ── */}
        <Section id="report" tone="alt">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 18 }}>
            <ScrollReveal>
              <Card pad="lg" radius="lg" style={{ height: '100%', background: 'var(--xoot-ink-900)', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <h2 style={{ fontSize: 'var(--xoot-title-1)', fontWeight: 500, color: 'var(--xoot-neutral-0)' }}>
                  How to report
                </h2>
                <p style={{ fontSize: 'var(--xoot-body)', lineHeight: 1.6, color: 'rgba(255,255,255,.72)' }}>
                  Email <span style={{ fontFamily: 'var(--xoot-font-mono)', color: 'var(--xoot-neutral-0)' }}>security@xoot.co.za</span> with
                  steps to reproduce and what you were able to reach. We acknowledge within two
                  business days and give a severity assessment within ten. The first valid report on
                  an issue is the one we pay.
                </p>
                <div style={{
                  display: 'flex', flexDirection: 'column', gap: 6, padding: '13px 15px',
                  borderRadius: 'var(--xoot-radius-sm)', background: 'rgba(255,255,255,.07)',
                }}>
                  <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.1em', color: 'rgba(255,255,255,.5)' }}>PGP</span>
                  <span style={{ fontFamily: 'var(--xoot-font-mono)', fontSize: 'var(--xoot-caption)', color: 'rgba(255,255,255,.85)', wordBreak: 'break-all' }}>
                    9F2C 4E81 A7D3 5B60 · xoot.co.za/.well-known/security.txt
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 'auto' }}>
                  <Button variant="cream" size="lg" icon="message-circle" as="a" href={SECURITY_MAIL}>Email security@</Button>
                </div>
              </Card>
            </ScrollReveal>

            <ScrollReveal delay={90}>
              <Card pad="lg" radius="lg" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <h3 style={{ fontSize: 'var(--xoot-title-2)', fontWeight: 500 }}>What makes a report we can pay fast</h3>
                <ul style={{ display: 'flex', flexDirection: 'column', gap: 12, margin: 0, padding: 0, listStyle: 'none' }}>
                  {GOOD_REPORT.map(g => (
                    <li key={g} style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
                      <Icon name="circle-check" size={16} color="var(--xoot-sage-500)" strokeWidth={2.2} style={{ marginTop: 3, flex: '0 0 auto' }} />
                      <span style={{ fontSize: 'var(--xoot-body-sm)', lineHeight: 1.55, color: 'var(--xoot-text-secondary)' }}>{g}</span>
                    </li>
                  ))}
                </ul>
                <p style={{ fontSize: 'var(--xoot-caption)', lineHeight: 1.6, color: 'var(--xoot-text-muted)', marginTop: 'auto' }}>
                  We have never rejected a report as "informational" to avoid paying it. If we think
                  something is out of scope we say which line of this page it falls under, and you
                  can argue with us.
                </p>
              </Card>
            </ScrollReveal>
          </div>
        </Section>
      </main>

      <SiteFooter />

      {/* Scoped to this page only — a dock that followed the visitor everywhere would compete with
          the site's own navigation. It is also the ONLY navigation here, which is why it lists
          every section rather than a curated few. */}
      <FloatingDock items={DOCK_ITEMS} />
    </>
  );
}

Object.assign(window, { BugBountyPage });
