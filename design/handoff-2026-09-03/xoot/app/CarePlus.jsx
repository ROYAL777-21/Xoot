/* Care+ membership management, and the retention path when someone wants out.

   The friction here is deliberate but honest: one screen that shows what they'd lose, one
   genuine offer, and then the cancel link — no dark patterns, no hidden button, no fake
   "are you sure" loop. If the offer doesn't land, they leave. */
const { Card, Badge, Button, Icon, Switch, Paywall, MemberBadge,
        CarePlusMark, Progress, ServiceIcon, Toast } = window.XootNS;
const XH = window.XootNS.Haptics;

function CarePlusManageScreen({ onBack, onCancelled, onGift }) {
  const D = window.XootData;
  const [step, setStep] = React.useState('manage');
  const [toast, setToast] = React.useState(null);

  /* The retention offer: Xoot Lux at Regular rates. Real value, and it costs us the margin
     difference rather than the whole subscription. */
  if (step === 'offer') {
    return (
      <>
        <TopBar onBack={() => setStep('manage')} title="Before you go" />
        <Scroll bottom={150}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Card pad="lg" radius="lg" style={{ background: 'var(--xoot-careplus-wash)', boxShadow: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' }}>
              <CarePlusMark size={62} />
              <span style={{ fontFamily: 'var(--xoot-font-display)', fontSize: 'var(--xoot-display-3)', lineHeight: 1.1, color: 'var(--xoot-careplus-ink)' }}>
                One thing first.
              </span>
              <span style={{ fontSize: 'var(--xoot-body)', color: 'var(--xoot-careplus-ink)', opacity: .9, maxWidth: 270, lineHeight: 1.5 }}>
                We'd rather keep you than win the argument. Here's the best we can do.
              </span>
            </Card>

            {/* The retention offer gets the Lux surface. This is the last card Care+ has to
                play before a cancellation, and a premium tier offered on a plain grey panel is
                worth less than the same tier offered on its own black. */}
            <Card pad="md" style={{
              position: 'relative', overflow: 'hidden',
              display: 'flex', flexDirection: 'column', gap: 14,
              background: 'var(--xoot-lux-surface)',
              border: '1px solid var(--xoot-lux-hairline)',
              boxShadow: 'var(--xoot-lux-shadow)',
            }}>
              <span style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'var(--xoot-lux-metal-line)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{
                  display: 'grid', placeItems: 'center', width: 48, height: 48, flex: '0 0 auto',
                  borderRadius: 'var(--xoot-radius-key)',
                  background: 'var(--xoot-lux-raise)', border: '1px solid var(--xoot-lux-hairline)',
                }}>
                  <Icon name="sparkles" size={22} strokeWidth={1.6} color="var(--xoot-lux-metal)" />
                </span>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
                  <span style={{ fontFamily: 'var(--xoot-font-display)', fontSize: 'var(--xoot-title-2)', color: 'var(--xoot-lux-ink)' }}>Xoot Lux, at Regular rates</span>
                  <span style={{ fontSize: 'var(--xoot-body-sm)', color: 'var(--xoot-lux-ink-soft)' }}>Our top Xooters, our own supplies</span>
                </span>
              </div>
              <span style={{ height: 1, background: 'var(--xoot-border-color)' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 'var(--xoot-body-sm)', color: 'var(--xoot-text-secondary)' }}>Normally R400 a visit</span>
                <span style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontFamily: 'var(--xoot-font-mono)', fontSize: 'var(--xoot-body-sm)', color: 'var(--xoot-text-muted)', textDecoration: 'line-through' }}>R400</span>
                  <span style={{ fontFamily: 'var(--xoot-font-display)', fontSize: 'var(--xoot-title-1)' }}>R280</span>
                </span>
              </div>
              <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)', lineHeight: 1.5 }}>
                For the next three months, on top of everything Care+ already gives you.
              </span>
            </Card>

            <Card tone="flat" pad="md" style={{ display: 'flex', gap: 11 }}>
              <Icon name="book-open" size={18} color="var(--xoot-icon-outline)" strokeWidth={1.9} style={{ marginTop: 1 }} />
              <span style={{ fontSize: 'var(--xoot-body-sm)', lineHeight: 1.5, color: 'var(--xoot-text-secondary)' }}>
                We've emailed this to you as well, so it's there if you want to think about it.
                Nothing changes until you say so.
              </span>
            </Card>
          </div>
        </Scroll>
        <DockedCTA>
          <Button variant="primary" size="lg" block
            onClick={() => { XH.haptic('success'); setToast('Kept — Lux at Regular rates for three months'); setStep('manage'); }}>
            I'll take that
          </Button>
          <Button variant="ghost" block onClick={() => { XH.haptic('light'); setStep('confirm'); }}
            style={{ color: 'var(--xoot-text-muted)' }}>
            No thanks, cancel my membership
          </Button>
        </DockedCTA>
      </>
    );
  }

  /* The actual cancellation. Plain, honest, and it goes through. */
  if (step === 'confirm') {
    return (
      <>
        <TopBar onBack={() => setStep('offer')} title="Cancel Care+" />
        <Scroll bottom={150}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Card tone="flat" pad="md" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>What happens</span>
              {[['Care+ runs until 1 September', 'You keep everything until then.'],
                ['Your R30 credit stays', "Unused credit doesn't disappear."],
                ['Your bookings are untouched', 'Every scheduled visit goes ahead as planned.'],
                ['Booking fees come back', 'R39 applies to one-off bookings again.']].map(([t, d]) => (
                <div key={t} style={{ display: 'flex', gap: 10 }}>
                  <Icon name="circle-check" size={17} color="var(--xoot-sage-500)" strokeWidth={2} style={{ marginTop: 2, flex: '0 0 auto' }} />
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <span style={{ fontSize: 'var(--xoot-body-sm)', fontWeight: 700 }}>{t}</span>
                    <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)', lineHeight: 1.45 }}>{d}</span>
                  </span>
                </div>
              ))}
            </Card>
            <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)', lineHeight: 1.5, padding: '0 4px' }}>
              You can rejoin any time, and your Xooter history comes with you.
            </span>
          </div>
        </Scroll>
        <DockedCTA note="No notice period, no cancellation fee.">
          <Button variant="primary" size="lg" block
            onClick={() => { XH.haptic('warning'); setStep('done'); }}
            style={{ background: 'var(--xoot-coral-500)', boxShadow: 'none' }}>
            Cancel Care+
          </Button>
          <Button variant="ghost" block onClick={() => { XH.haptic('light'); setStep('manage'); }}>Keep my membership</Button>
        </DockedCTA>
      </>
    );
  }

  if (step === 'done') {
    return (
      <>
        <TopBar onBack={onBack} title="Care+ cancelled" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, padding: '0 30px 40px', textAlign: 'center' }}>
          <span style={{ display: 'grid', placeItems: 'center', width: 76, height: 76, borderRadius: '50%', background: 'var(--xoot-surface-sunken)' }}>
            <Icon name="handshake" size={34} color="var(--xoot-text-secondary)" strokeWidth={1.6} />
          </span>
          <span style={{ fontFamily: 'var(--xoot-font-display)', fontSize: 'var(--xoot-display-3)', lineHeight: 1.1 }}>
            Done. No hard feelings.
          </span>
          <span style={{ fontSize: 'var(--xoot-body)', color: 'var(--xoot-text-secondary)', lineHeight: 1.5, maxWidth: 280 }}>
            Care+ runs until 1 September. Everything you have booked still happens, and Xoot works
            exactly as before without it.
          </span>
          <Button variant="outline" onClick={() => { XH.haptic('light'); onCancelled ? onCancelled() : onBack(); }} style={{ marginTop: 8 }}>
            Back to your account
          </Button>
        </div>
      </>
    );
  }

  /* The management screen itself. */
  return (
    <>
      <TopBar onBack={onBack} title="Care+ membership" />
      <Scroll bottom={100}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {toast && <Toast tone="success" title={toast} onDismiss={() => setToast(null)} />}

          <Card pad="lg" radius="lg" style={{ background: 'var(--xoot-careplus-wash)', boxShadow: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <MemberBadge />
              <span style={{ flex: 1 }} />
              <Badge tone="success" size="sm" icon="check">Active</Badge>
            </div>
            <span style={{ fontFamily: 'var(--xoot-font-display)', fontSize: 'var(--xoot-display-3)', lineHeight: 1, color: 'var(--xoot-careplus-ink)' }}>
              R99 <span style={{ fontSize: 'var(--xoot-body)', fontWeight: 500 }}>a month</span>
            </span>
            <span style={{ fontSize: 'var(--xoot-body-sm)', color: 'var(--xoot-careplus-ink)', opacity: .85 }}>
              Member since March · renews 1 September
            </span>
          </Card>

          <Card tone="flat" pad="md" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>This month</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--xoot-body-sm)' }}>
                <span style={{ fontWeight: 600 }}>You've saved R187</span>
                <span style={{ fontFamily: 'var(--xoot-font-mono)', color: 'var(--xoot-sage-ink)' }}>vs R99 paid</span>
              </div>
              <Progress value={187} max={200} tone="success" size="sm" />
              <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)' }}>
                R117 in waived booking fees, R30 add-on credit, R40 in plan savings.
              </span>
            </div>
          </Card>

          <Card tone="flat" pad="md" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>What you get</span>
            {[['wallet', 'R30 add-on credit', 'Used this month'],
              ['zap', 'Priority slots', 'Yours'],
              ['repeat', 'Nomsa held for you', 'Every Wednesday'],
              ['ticket-percent', 'No booking fee', 'Saved R117 so far'],
              ['message-circle', 'Priority support', 'Yours']].map(([ic, t, d]) => (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                <Icon name={ic} size={18} color="var(--xoot-careplus-600)" strokeWidth={1.9} />
                <span style={{ flex: 1, fontSize: 'var(--xoot-body-sm)', fontWeight: 600 }}>{t}</span>
                <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)' }}>{d}</span>
              </div>
            ))}
          </Card>

          <Card tone="flat" pad="md" style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)', marginBottom: 6 }}>Manage</span>
            {[['credit-card', 'Billing & payment method', 'Visa ·· 4821'],
              ['book-open', 'Membership invoices', 'Six months of receipts'],
              ['clock', 'Pause for a month', 'Keep your Xooter, skip the fee']].map(([ic, t, d], i) => (
              <button key={t} type="button" onClick={() => XH.haptic('light')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: 56,
                  padding: '10px 0', border: 'none', background: 'transparent', textAlign: 'left',
                  borderBottom: i < 2 ? '1px solid var(--xoot-neutral-100)' : 'none', cursor: 'pointer',
                }}>
                <Icon name={ic} size={19} color="var(--xoot-icon-outline)" strokeWidth={1.85} />
                <span style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <span style={{ fontSize: 'var(--xoot-body)', fontWeight: 600 }}>{t}</span>
                  <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)' }}>{d}</span>
                </span>
                <Icon name="chevron-right" size={17} color="var(--xoot-neutral-400)" />
              </button>
            ))}
          </Card>

          <GiftCrossSell onOpen={() => { XH.haptic('light'); onGift && onGift(); }} />

          {/* The cancel entry is visible and plainly labelled — hiding it would be the dark pattern. */}
          <Button variant="ghost" block onClick={() => { XH.haptic('light'); setStep('offer'); }}
            style={{ color: 'var(--xoot-text-muted)' }}>
            Cancel Care+
          </Button>
          <span style={{ textAlign: 'center', fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-disabled)', lineHeight: 1.5, paddingBottom: 8 }}>
            No notice period. Cancel today and Care+ still runs to 1 September.
          </span>
        </div>
      </Scroll>
    </>
  );
}

/* Joining, for non-members — the paywall plus its payment sheet. */
function CarePlusJoinScreen({ onDone, onBack }) {
  const [state, setState] = React.useState('paywall');

  React.useEffect(() => {
    if (state !== 'processing') return;
    /* Haptic fires on the RESULT, not on the button. A tap that buzzes before the payment
       clears teaches people the buzz means nothing. */
    const t = window.setTimeout(() => { XH.haptic('success'); setState('done'); }, 1500);
    return () => window.clearTimeout(t);
  }, [state]);

  React.useEffect(() => {
    if (state !== 'done') return;
    const t = window.setTimeout(() => onDone && onDone(), 1600);
    return () => window.clearTimeout(t);
  }, [state]);

  if (state === 'paywall') {
    return <Paywall trialDays={30} onJoin={() => setState('pay')} onDismiss={onBack} />;
  }

  if (state === 'pay') {
    return (
      <>
        <TopBar onBack={() => setState('paywall')} title="Start your free trial" subtitle="One month free, then R99 a month" />
        <Scroll bottom={130}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>Pay with</span>
              {[['apple', 'Apple Pay', 'One tap, nothing to type', true],
                ['card', 'Card', 'Visa ·· 4821', false]].map(([k, t, d, primary]) => (
                <button key={k} type="button" onClick={() => setState('processing')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, minHeight: 62, padding: '0 18px',
                    border: 'none', borderRadius: 'var(--xoot-radius-md)', cursor: 'pointer', textAlign: 'left',
                    background: primary ? 'var(--xoot-action-primary)' : 'var(--xoot-surface-card)',
                    color: primary ? 'var(--xoot-text-inverse)' : 'var(--xoot-text-primary)',
                    boxShadow: primary ? 'var(--xoot-shadow-ink)' : 'inset 0 0 0 1px var(--xoot-border-color)',
                  }}>
                  <Icon name={k === 'apple' ? 'wallet' : 'credit-card'} size={21} strokeWidth={1.9} />
                  <span style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <span style={{ fontSize: 'var(--xoot-body)', fontWeight: 700 }}>{t}</span>
                    <span style={{ fontSize: 'var(--xoot-caption)', opacity: .7 }}>{d}</span>
                  </span>
                  <Icon name="chevron-right" size={17} />
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 'var(--xoot-space-4)', borderRadius: 'var(--xoot-radius-md)', background: 'var(--xoot-careplus-wash)' }}>
              {[['R0', 'today — your first month is free'], ['Day 28', "we'll remind you"], ['R99', 'a month from 30 September']].map(([a, b]) => (
                <span key={b} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--xoot-body-sm)', color: 'var(--xoot-careplus-ink)' }}>
                  <span style={{ fontWeight: 700 }}>{a}</span><span style={{ opacity: .85 }}>{b}</span>
                </span>
              ))}
            </div>
          </div>
        </Scroll>
      </>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, padding: 30 }}>
      {state === 'processing' ? (
        <>
          <span style={{ width: 38, height: 38, borderRadius: '50%', border: '3px solid var(--xoot-careplus-100)', borderTopColor: 'var(--xoot-careplus-500)', animation: 'xoot-spin-slow 700ms linear infinite' }} />
          <span style={{ fontSize: 'var(--xoot-body)', fontWeight: 600, color: 'var(--xoot-text-secondary)' }}>Setting up your trial…</span>
        </>
      ) : (
        <>
          <CarePlusMark size={78} />
          <span style={{ fontFamily: 'var(--xoot-font-display)', fontSize: 'var(--xoot-display-3)', textAlign: 'center', lineHeight: 1.1 }}>
            You're in, free for a month.
          </span>
          <span style={{ fontSize: 'var(--xoot-body)', color: 'var(--xoot-text-secondary)', textAlign: 'center', maxWidth: 260 }}>
            Your R30 add-on credit is ready to use.
          </span>
        </>
      )}
    </div>
  );
}

/* Members are the likeliest gifters — they already pay monthly for this. Quiet row at the
   bottom of the membership screen, never a banner. */
function GiftCrossSell({ onOpen }) {
  return (
    <Card tone="flat" pad="md" interactive onClick={onOpen}
      style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
      <span style={{ display: 'grid', placeItems: 'center', width: 40, height: 40, flex: '0 0 auto', borderRadius: 'var(--xoot-radius-key)', background: 'var(--xoot-petal-wash)' }}>
        <Icon name="gift" size={20} color="var(--xoot-icon-outline)" strokeWidth={1.9} />
      </span>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 'var(--xoot-body)', fontWeight: 700 }}>Gift a clean</span>
        <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)' }}>
          Give someone a visit — or a year of them
        </span>
      </span>
      <Icon name="chevron-right" size={17} color="var(--xoot-neutral-400)" />
    </Card>
  );
}

Object.assign(window, { GiftCrossSell, CarePlusManageScreen, CarePlusJoinScreen });
