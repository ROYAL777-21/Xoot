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
