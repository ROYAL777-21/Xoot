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
