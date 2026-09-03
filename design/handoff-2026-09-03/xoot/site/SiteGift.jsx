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
