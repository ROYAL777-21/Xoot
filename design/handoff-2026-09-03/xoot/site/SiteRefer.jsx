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
