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
