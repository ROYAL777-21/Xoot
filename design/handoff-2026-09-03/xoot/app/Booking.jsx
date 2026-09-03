/* SweepSouth-equivalent booking flow: service → home details → when → pro → confirm. */
const {
  ServiceIcon, XOOT_SERVICES, ServiceRow, Stepper, DayKeys, Checkbox, Input, Select,
  Button, Card, Badge, Tabs, Tag, XooterCard, TrialTimeline, Progress, Icon, Sheet, IconButton,
  BookingSummary, Switch, RecurringToggle, CarePlusNudge, Picker, JOBURG_SUBURBS, RadioGroup,
  LaundryPicker, PaymentFlow, GiftCreditRow,
} = window.XootNS;
const { CrewPicker } = window.XootNS;
const haptic = window.XootNS.Haptics.haptic;

function BookingFlow({ onDone, onCancel }) {
  const D = window.XootData;
  const [stage, setStage] = React.useState(0);
  /* 'regular' — not 'indoor'. There is no 'indoor' service key (the seven are regular,
     airbnb, express, office, moving, laundry, lux), so this state opened the flow on a service
     that matched nothing. It went unnoticed while price came from the size tier; the moment
     pricing moved to the per-service ladder it surfaced as a Pay button reading "Pay R0". */
  const [service, setService] = React.useState('regular');
  const [rooms, setRooms] = React.useState({ bed: 2, bath: 1 });
  /* What kind of place it is, which decides which service is CORRECT — a move-out booked as a
     regular clean is eight hours of work priced as four, and the Xooter absorbs the difference.
     See `D.serviceFit` and the enforcement in quote.js. */
  const [property, setProperty] = React.useState('house');
  /* What a friend's link is worth on this first booking, or null. */
  const referral = window.XootRefer ? window.XootRefer.pendingDiscount() : null;
  const [extras, setExtras] = React.useState(() => (D.user.usualExtras && D.user.usualExtras.length) ? D.user.usualExtras : ['laundry']);
  const [days, setDays] = React.useState([3]);
  const [time, setTime] = React.useState('08:00');
  /* Once a week by default. It is the frequency that earns the recurring discount, so it is
     the one that most often suits both sides — and a returning user's own choice still wins. */
  const [freq, setFreq] = React.useState(() => D.user.usualFreq || 'weekly');
  const [pro, setPro] = React.useState(0);
  const [useCredit, setUseCredit] = React.useState(true);
  /* Laundry add-ons are laundry's own — "interior windows" on a wash is nonsense. Held
     separately so switching service can't carry a clean's extras onto a laundry quote. */
  const [laundryExtras, setLaundryExtras] = React.useState([]);
  /* Where the washing actually happens. On-site needs a working machine; drop-off doesn't, and
     it is the difference between a bookable job and a wasted visit. */
  const [laundryWhere, setLaundryWhere] = React.useState('onsite');
  const [day, setDay] = React.useState('tomorrow');
  /* ISO date, only meaningful when day === 'later'. Defaults three days out — far enough that
     supply is reliable, near enough to feel soon. */
  const [pickedDate, setPickedDate] = React.useState(() => {
    const d = new Date(Date.now() + 3 * 86400000);
    return d.toISOString().slice(0, 10);
  });
  /* Care+ only. Holding one Xooter's slot has a real supply cost and it is sold as a
     membership benefit — offering it to everyone both undercut the paywall and promised
     something the business would have to walk back. Non-members see the upsell instead. */
  const [sameXooter, setSameXooter] = React.useState(() => !!D.user.carePlus);
  /* One Xooter unless the user asks for more. Crew is opt-in: defaulting a household clean to
     two people would inflate every quote for the majority who don't need it. */
  const [crew, setCrew] = React.useState(1);
  /* Laundry is measured in loads, not hours or rooms. Held separately because it replaces the
     rooms step rather than extending it — asking a washing customer for bedroom counts tells
     them the flow wasn't built for them. */
  const [laundry, setLaundry] = React.useState({ washLoads: 3, ironLoads: 1 });
  /* Guest check-in or office opening. Only offered where the service has a real hard stop. */
  const [deadline, setDeadline] = React.useState(null);
  /* Controlled, so the summary can quote them back. Uncontrolled inputs meant the user typed a
     gate code and the confirmation screen never mentioned it. */
  const [access, setAccess] = React.useState("I'll be home");
  const [notes, setNotes] = React.useState('');

  const svc = D.services.find(s => s.key === service) || D.services[0];
  /* Laundry is not a clean. It is measured in loads, it has its own price ladder, and asking a
     washing customer how many bedrooms they have tells them the flow wasn't built for them. */
  const isLaundry = service === 'laundry';

  /* Size still sets the DEFAULT hours and the copy — it no longer sets the price. */
  const tier = D.sizeFor(rooms.bed, rooms.bath);

  /* null when the service and the property agree; otherwise the swap to offer. The laundry
     exemption lives in `serviceFit`, not here — it was in this line only, so the app hid the
     warning while the resolver still re-priced the booking as office cleaning. */
  const fit = D.serviceFit(service, property);

  /* Which services run against a clock. A turnover has a check-in; an office has an opening
     time; a moving clean has a handover. A regular home clean has none of those, so offering a
     deadline there invites a constraint the user doesn't have. */
  const DEADLINE_SERVICES = ['airbnb', 'office', 'moving'];
  const wantsDeadline = DEADLINE_SERVICES.includes(service);

  /* Crew is capped by floor space AND by what the service needs — a turnover, an office and a
     moving clean all run against a clock, so they may exceed what size alone would allow. Laundry
     is machine-bound: a second person cannot make a wash cycle finish sooner, so crew is not
     offered. */
  const maxCrew = D.crewCapFor(service, tier.key);

  /* ── PRICING IS NOT DONE HERE ──────────────────────────────────────────────
     Every number below comes back from XootQuote, the authoritative pricing service. This
     component performs no arithmetic on money at all: it renders `quote.lines` and
     `quote.total` verbatim and submits `quote.token` to pay.

     That is what stops the frequency tabs from manipulating the price. Previously the discount
     was a front-end `price * 0.15` gated on a separate `recurring` boolean, so tapping between
     frequencies fast enough left a plan saving applied to a one-off booking. Now the recurrence
     IS the only input to the discount, the engine sequences its responses, and a superseded
     quote is dropped rather than rendered. */
  const quoteInput = React.useMemo(() => ({
    service,
    sizeKey: isLaundry ? null : tier.key,
    /* Sent so the RESOLVER reconciles service against property, not this screen. See quote.js. */
    propertyType: property,
    /* A friend's link, priced as a named line by the engine — same as the site. */
    referralCredit: referral ? referral.amount : 0,
    referralFrom: referral ? referral.from : null,
    addOns: isLaundry ? laundryExtras : extras,
    crew,
    freq,
    dayCount: freq === 'once' ? 0 : days.length,
    washLoads: isLaundry ? laundry.washLoads : 0,
    ironLoads: isLaundry ? laundry.ironLoads : 0,
    carePlus: !!D.user.carePlus,
    isNewUser: !!D.user.isNew,
    useCredit,
    creditAvailable: D.user.credit,
  }), [service, isLaundry, tier.key, property, extras, laundryExtras, crew, freq, days.length,
       laundry.washLoads, laundry.ironLoads, useCredit, referral && referral.code]);

  const { quote, pending } = window.XootQuote.useQuote(quoteInput);

  /* Scheduling reads the quote's hours too, so the slot list, the latest start and the finish
     time can never describe a different visit from the one being priced. */
  const hours = quote.hours || D.crewHours(tier.hours, crew);
  const soloHours = isLaundry ? hours : tier.hours + extras.length * 0.5;
  const dueNow = quote.total;
  const creditUsed = quote.creditUsed;

  /* Availability. A visit must finish inside the 07:00–17:00 window, and a same-day booking
     needs enough lead time for a Xooter to actually travel. Pretend it's 09:00. */
  const NOW_HOUR = 9;
  const todaySlots = D.slotsFor(hours, NOW_HOUR);
  const slots = day === 'today' ? todaySlots : D.allSlotsFor(hours);
  const latestStart = String(D.workday.close - Math.ceil(hours)).padStart(2, '0') + ':00';

  /* Three weeks out. Beyond that people are guessing, and a longer list makes the strip feel
     like a chore rather than a choice. */
  const dateOptions = React.useMemo(() => {
    const out = [];
    for (let i = 2; i <= 22; i++) {
      const d = new Date(Date.now() + i * 86400000);
      out.push({
        iso: d.toISOString().slice(0, 10),
        dow: d.toLocaleDateString('en-ZA', { weekday: 'short' }),
        num: d.getDate(),
        month: d.toLocaleDateString('en-ZA', { month: 'short' }),
      });
    }
    return out;
  }, []);

  /* ONE function turns the day/date state into words, so the picker, the availability note and
     the summary can never describe the same booking differently. */
  const chosenDate = React.useMemo(() => {
    const fmt = d => d.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' });
    if (day === 'today') return { label: 'Today', long: fmt(new Date()) };
    if (day === 'tomorrow') return { label: 'Tomorrow', long: fmt(new Date(Date.now() + 86400000)) };
    return { label: fmt(new Date(pickedDate + 'T00:00:00')), long: fmt(new Date(pickedDate + 'T00:00:00')) };
  }, [day, pickedDate]);

  /* Recurrence, in the user's words. DayKeys is Sunday-first. */
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const repeatLabel = React.useMemo(() => {
    if (freq === 'once') return null;
    const named = days.length ? days.map(i => DOW[i]).join(' & ') : 'no day yet';
    return freq === 'weekly' ? `Every ${named}` : `Every other ${named}`;
  }, [freq, days]);

  /* Finish time, honest about half hours — add-ons extend the estimate by 30 min each, so
     rounding to the hour under-promised on exactly the bookings with the most extras. */
  const endTime = React.useMemo(() => {
    const startH = Number(time.slice(0, 2));
    const total = startH + hours;
    const h = Math.floor(total);
    const m = Math.round((total - h) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }, [time, hours]);

  const STAGES = ['Service', isLaundry ? 'Your laundry' : 'Your home', 'When', 'Your Xooter', 'Confirm'];
  const back = () => (stage === 0 ? onCancel() : setStage(stage - 1));
  const next = () => (stage === STAGES.length - 1 ? onDone() : setStage(stage + 1));

  return (
    <>
      <TopBar onBack={back} title={STAGES[stage]} subtitle={`Step ${stage + 1} of ${STAGES.length}`}
        trailing={null} />
      <div style={{ padding: '0 20px 12px', flex: '0 0 auto' }}>
        <Progress segments={STAGES.length} value={stage + 1} size="sm" />
      </div>

      <Scroll bottom={140}>
        {stage === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h2 style={{ fontSize: 'var(--xoot-title-1)' }}>What do you need done?</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {D.services.map((s, i) => (
                <button key={s.key} onClick={() => { haptic('selection'); setService(s.key); }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '14px 8px',
                    border: 'none', borderRadius: 'var(--xoot-radius-md)', cursor: 'pointer',
                    background: service === s.key ? 'var(--xoot-surface-card)' : 'transparent',
                    boxShadow: service === s.key ? 'var(--xoot-shadow-3), inset 0 0 0 2px var(--xoot-violet-500)' : 'inset 0 0 0 1px var(--xoot-border-color)',
                    transform: service === s.key ? 'scale(1.03)' : 'none',
                    animation: service === s.key ? 'xoot-pop var(--xoot-dur-base) var(--xoot-ease-spring)' : 'none',
                    transition: 'box-shadow var(--xoot-dur-fast) var(--xoot-ease-out), transform var(--xoot-dur-base) var(--xoot-ease-spring)' }}>
                  <ServiceIcon service={s.key} size={46} delay={i * 70} active={service === s.key} />
                  <span style={{ fontSize: 11.5, fontWeight: 700, textAlign: 'center', lineHeight: 1.25, color: 'var(--xoot-text-primary)' }}>{s.title}</span>
                  <span style={{ fontFamily: 'var(--xoot-font-mono)', fontSize: 10, color: 'var(--xoot-text-muted)' }}>{s.est}</span>
                </button>
              ))}
            </div>

          </div>
        )}

        {stage === 1 && isLaundry && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <h2 style={{ fontSize: 'var(--xoot-title-1)' }}>How much is there?</h2>
            <p style={{ fontSize: 'var(--xoot-body)', color: 'var(--xoot-text-secondary)', lineHeight: 1.55, marginTop: -8 }}>
              A load is about one full machine — roughly a full basket. Washing and ironing are
              counted separately, because ironing four loads takes far longer than washing them.
            </p>
            <Input label="Where do you need us?" icon="map-pin" defaultValue="14 Fredman Dr, Sandton" />

            {/* The system's own loads picker. Its inline estimate is switched OFF: the component
                carries a private copy of the loads ladder, and two prices on one screen that can
                drift apart is worse than one. The engine's estimate is the card below. */}
            <LaundryPicker
              washLoads={laundry.washLoads} ironLoads={laundry.ironLoads} showEstimate={false}
              onChange={v => { haptic('selection'); setLaundry(v); }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>Where should it happen?</span>
              <RadioGroup value={laundryWhere} onChange={v => { haptic('selection'); setLaundryWhere(v); }} options={[
                { value: 'onsite', label: 'At my place', description: 'Your machine, your detergent. Nothing leaves the house.' },
                { value: 'handwash', label: 'Hand-wash only', description: 'No machine needed — delicates and smalls.' },
              ]} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>Anything extra? R{D.pricing.addOn} each</span>
              {[['fold', 'Fold and put away', 'Into the right cupboards'],
                ['delicates', 'Hand-wash the delicates', 'Separated and done by hand'],
                ['stains', 'Treat stains first', 'Pre-soak before the wash']].map(([k, l, d]) => (
                <Checkbox key={k} boxed label={l} description={d} checked={laundryExtras.includes(k)}
                  onChange={() => setLaundryExtras(e => e.includes(k) ? e.filter(x => x !== k) : [...e, k])} />
              ))}
            </div>

            {/* The estimate is the ENGINE's, not a local sum. */}
            <Card tone="brand" pad="md" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Icon name="clock" size={22} color="var(--xoot-violet-600)" strokeWidth={1.8} />
              <span style={{ fontSize: 'var(--xoot-body-sm)', color: 'var(--xoot-ink-900)' }}>
                {quote.empty
                  ? <>Add a load to see how long it takes.</>
                  : <><strong>Estimate: {hours % 1 === 0 ? hours : hours.toFixed(1)} hrs</strong> · {quote.sizeLabel}
                      {quote.laundry && quote.laundry.capped ? ' · capped at a full day' : ''}</>}
              </span>
            </Card>
          </div>
        )}

        {stage === 1 && !isLaundry && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <h2 style={{ fontSize: 'var(--xoot-title-1)' }}>Tell us about your place</h2>
            <Input label="Where do you need us?" icon="map-pin" defaultValue="14 Fredman Dr, Sandton" />

            {/* WHAT IS IT, before HOW BIG. The answer decides which service is correct, and asking
                it after the price is on screen means arguing with a number already accepted. */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>What kind of place is it?</span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 148px), 1fr))', gap: 8 }}>
                {D.propertyTypes.map(p => {
                  const on = property === p.key;
                  return (
                    <button key={p.key} type="button" onClick={() => setProperty(p.key)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 9, minHeight: 48,
                        padding: '11px 13px', border: 'none', cursor: 'pointer', textAlign: 'left',
                        borderRadius: 'var(--xoot-radius-sm)',
                        background: on ? 'var(--xoot-action-brand-soft)' : 'var(--xoot-surface-sunken)',
                        boxShadow: on ? 'inset 0 0 0 2px var(--xoot-violet-500)' : 'none',
                        fontFamily: 'var(--xoot-font-core)',
                        transition: 'all var(--xoot-dur-fast) var(--xoot-ease-ios-snap)',
                      }}>
                      <Icon name={p.icon} size={16} strokeWidth={1.9}
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

            {/* The swap, offered rather than enforced here — the resolver enforces it. */}
            {fit && (
              <Card pad="md" style={{
                display: 'flex', gap: 11, alignItems: 'flex-start',
                background: 'var(--xoot-honey-wash)', border: '1px solid var(--xoot-honey-mid)',
              }}>
                <Icon name="lightbulb" size={16} strokeWidth={2} color="var(--xoot-honey-ink)" style={{ flex: '0 0 auto', marginTop: 2 }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
                  <span style={{ fontSize: 'var(--xoot-body-sm)', fontWeight: 700, lineHeight: 1.35, color: 'var(--xoot-honey-ink)' }}>
                    {fit.service.title} is the right one for this
                  </span>
                  <span style={{ fontSize: 'var(--xoot-caption)', lineHeight: 1.55, color: 'var(--xoot-text-secondary)' }}>
                    {fit.why}
                  </span>
                  <Button size="sm" variant="primary" onClick={() => setService(fit.to)}>
                    Switch to {fit.service.title.toLowerCase()}
                  </Button>
                </div>
              </Card>
            )}

            <Card tone="flat" pad="md" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Stepper label="Bedrooms" sublabel="Common areas always included" value={rooms.bed} onChange={v => setRooms({ ...rooms, bed: v })} max={8} />
              <span style={{ height: 1, background: 'var(--xoot-border-color)' }} />
              <Stepper label="Bathrooms" value={rooms.bath} onChange={v => setRooms({ ...rooms, bath: v })} max={6} />
            </Card>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>Anything extra?</span>
              {[['laundry', 'Laundry & ironing', 'Adds about an hour'],
                ['fridge', 'Inside the fridge', 'Adds 30 minutes'],
                ['windows', 'Interior windows', 'Adds 45 minutes']].map(([k, l, d]) => (
                <Checkbox key={k} boxed label={l} description={d} checked={extras.includes(k)}
                  onChange={() => setExtras(e => e.includes(k) ? e.filter(x => x !== k) : [...e, k])} />
              ))}
            </div>
            <Card tone="brand" pad="md" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Icon name="clock" size={22} color="var(--xoot-violet-600)" strokeWidth={1.8} />
              <span style={{ fontSize: 'var(--xoot-body-sm)', color: 'var(--xoot-ink-900)' }}>
                <strong>Estimate: {hours % 1 === 0 ? hours : hours.toFixed(1)} hrs</strong> · {tier.label} place
              </span>
            </Card>
          </div>
        )}

        {stage === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <h2 style={{ fontSize: 'var(--xoot-title-1)' }}>When suits you?</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>How often</span>
              <Tabs items={[{ value: 'weekly', label: 'Once a week' }, { value: 'fortnightly', label: 'Twice a month' }, { value: 'once', label: 'Just once' }]}
                value={freq} onChange={setFreq} />
            </div>

            {/* Day choice drives which slots are even possible. */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>Which day</span>
              <div style={{ display: 'flex', gap: 8 }}>
                {[['today', 'Today'], ['tomorrow', 'Tomorrow'], ['later', 'Pick a date']].map(([v, l]) => {
                  const none = v === 'today' && todaySlots.length === 0;
                  return (
                    <button key={v} type="button" disabled={none}
                      onClick={() => { haptic('selection'); setDay(v); setTime(v === 'today' ? todaySlots[0] : '08:00'); }}
                      style={{
                        flex: 1, minHeight: 56, border: 'none', borderRadius: 'var(--xoot-radius-sm)',
                        cursor: none ? 'not-allowed' : 'pointer',
                        background: day === v ? 'var(--xoot-action-brand)' : 'var(--xoot-surface-card)',
                        color: none ? 'var(--xoot-text-disabled)' : day === v ? '#fff' : 'var(--xoot-text-primary)',
                        boxShadow: day === v ? 'var(--xoot-shadow-brand)' : 'inset 0 0 0 1px var(--xoot-border-color)',
                        fontFamily: 'var(--xoot-font-core)', fontSize: 'var(--xoot-body-sm)', fontWeight: 700,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                      }}>
                      {l}
                      {v === 'today' && <span style={{ fontSize: 'var(--xoot-micro)', fontWeight: 600, opacity: .75 }}>
                        {none ? 'too late today' : `${todaySlots.length} left`}
                      </span>}
                      {v === 'tomorrow' && <span style={{ fontSize: 'var(--xoot-micro)', fontWeight: 600, opacity: .75 }}>best pick</span>}
                    </button>
                  );
                })}
              </div>
              {day === 'today' && (
                <span style={{ display: 'flex', alignItems: 'flex-start', gap: 7, fontSize: 'var(--xoot-caption)', color: 'var(--xoot-warning-text)', lineHeight: 1.45 }}>
                  <Icon name="clock" size={13} strokeWidth={2.1} style={{ marginTop: 1 }} />
                  Same-day depends on who's free nearby. Tomorrow or later, we can almost always match you.
                </span>
              )}

              {/* Inline, not a sheet: the start-time row below depends on this date, and a modal
                  would hide that relationship exactly when it matters. */}
              {day === 'later' && (
                <div style={{
                  display: 'flex', gap: 8, margin: '0 -20px', padding: '4px 20px 8px',
                  overflowX: 'auto', scrollSnapType: 'x mandatory', scrollbarWidth: 'none',
                  animation: 'xoot-appear var(--xoot-dur-base) var(--xoot-ease-ios-nav) both',
                  ['--xoot-appear-y']: '8px',
                }}>
                  {dateOptions.map(d => {
                    const on = pickedDate === d.iso;
                    return (
                      <button key={d.iso} type="button"
                        onClick={() => { haptic('selection'); setPickedDate(d.iso); }}
                        style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                          flex: '0 0 auto', width: 58, padding: '9px 0 11px', border: 'none',
                          borderRadius: 'var(--xoot-radius-md)', cursor: 'pointer',
                          scrollSnapAlign: 'start',
                          background: on ? 'var(--xoot-action-brand)' : 'var(--xoot-surface-card)',
                          color: on ? '#fff' : 'var(--xoot-text-primary)',
                          boxShadow: on ? 'var(--xoot-shadow-brand)' : 'inset 0 0 0 1px var(--xoot-border-color)',
                          transition: 'background var(--xoot-dur-fast) var(--xoot-ease-out)',
                        }}>
                        <span style={{ fontSize: 'var(--xoot-micro)', fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', opacity: .72 }}>{d.dow}</span>
                        <span style={{ fontFamily: 'var(--xoot-font-display)', fontSize: 21, lineHeight: 1.15 }}>{d.num}</span>
                        <span style={{ fontSize: 'var(--xoot-micro)', fontWeight: 600, opacity: .7 }}>{d.month}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Only slots where a {hours}-hour visit still finishes by 17:00. */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>Start time</span>
              {slots.length === 0 ? (
                <span style={{
                  display: 'flex', alignItems: 'center', minHeight: 54, padding: '0 16px',
                  border: 'var(--xoot-border-dashed)', borderRadius: 'var(--xoot-radius-md)',
                  fontSize: 'var(--xoot-body-sm)', color: 'var(--xoot-text-muted)',
                }}>
                  Nothing left today for a {hours}-hour visit — try tomorrow.
                </span>
              ) : (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {slots.map(t => (
                    <Tag key={t} selected={time === t} onClick={() => { haptic('selection'); setTime(t); }}>{t}</Tag>
                  ))}
                </div>
              )}
              <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)' }}>
                Xooters work 07:00–17:00, so a {hours}-hour visit starts by {latestStart} at the latest.
              </span>
            </div>

            {/* Crew sits AFTER the start time, because every finish time it quotes is computed
                from that start. Offering it first would show times against a slot the user
                hasn't picked.

                Only where more than one Xooter can actually help — a studio caps at two, and
                hiding the control at cap 1 is better than showing a single dead option. */}
            {maxCrew > 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>
                  {wantsDeadline ? 'Working to a deadline?' : 'Want it done sooner?'}
                </span>
                <CrewPicker
                  value={crew} onChange={setCrew}
                  soloHours={soloHours} soloPrice={window.XootQuote.resolve({ ...quoteInput, crew: 1 }).base}
                  startTime={time} maxCrew={maxCrew}
                  deadline={deadline}
                  onDeadlineChange={wantsDeadline ? setDeadline : undefined}
                />
              </div>
            )}

            {freq !== 'once' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>Which days</span>
                <DayKeys value={days} onChange={setDays} />
                <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)' }}>Every day is bookable — plenty of Xooters choose to work weekends.</span>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>Getting in</span>
              {/* Grouped list with a checkmark — the iOS pattern for a few exclusive options.
                  A <select> would open the OS wheel, which covers half the screen and matches
                  nothing else in this flow. */}
              <div style={{ borderRadius: 'var(--xoot-radius-md)', overflow: 'hidden', background: 'var(--xoot-surface-card)', boxShadow: 'var(--xoot-shadow-2)' }}>
                {["I'll be home", 'Key with the concierge', 'Gate code — see notes', 'Key in the lockbox'].map((opt, i, arr) => {
                  const on = access === opt;
                  return (
                    <button key={opt} type="button"
                      onClick={() => { haptic('selection'); setAccess(opt); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                        minHeight: 52, padding: '0 16px', border: 'none', textAlign: 'left',
                        cursor: 'pointer', background: on ? 'var(--xoot-action-brand-soft)' : 'transparent',
                        boxShadow: i < arr.length - 1 ? 'inset 0 -1px 0 var(--xoot-neutral-100)' : 'none',
                        transition: 'background var(--xoot-dur-fast) var(--xoot-ease-ios-snap)',
                      }}>
                      <span style={{
                        flex: 1, fontSize: 'var(--xoot-body)', fontWeight: on ? 700 : 500,
                        color: on ? 'var(--xoot-violet-700)' : 'var(--xoot-text-primary)',
                      }}>{opt}</span>
                      {on && (
                        <Icon name="check" size={18} strokeWidth={2.6} color="var(--xoot-violet-600)"
                          style={{ animation: 'xoot-pop var(--xoot-dur-fast) var(--xoot-ease-ios-snap)' }} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            <Input label="Anything your Xooter should know?" icon="pencil" value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="The gate code is 1408, and Biscuit is friendly."
              hint="Totally optional — preferably add information to make your experience seamless." />
          </div>
        )}

        {stage === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <h2 style={{ fontSize: 'var(--xoot-title-1)' }}>These Xooters are available</h2>
              <p style={{ fontSize: 'var(--xoot-body)', color: 'var(--xoot-text-secondary)', marginTop: 6 }}>
                All vetted, ID-checked and insured. Pick whoever feels right — or let us choose.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {D.pros.map((p, i) => (
                <div key={p.name} onClick={() => { haptic('selection'); setPro(i); }} style={{ position: 'relative', borderRadius: 'var(--xoot-radius-md)',
                  boxShadow: pro === i ? 'inset 0 0 0 2px var(--xoot-violet-500), var(--xoot-shadow-brand)' : 'none',
                  transform: pro === i ? 'scale(1.01)' : 'none', cursor: 'pointer',
                  transition: 'transform var(--xoot-dur-base) var(--xoot-ease-spring), box-shadow var(--xoot-dur-fast) var(--xoot-ease-out)' }}>
                  <XooterCard {...p} onClick={() => { haptic('selection'); setPro(i); }} />
                  {pro === i && (
                    <span style={{ position: 'absolute', top: 10, right: 10, display: 'inline-flex', alignItems: 'center', gap: 4, height: 24, padding: '0 9px',
                      borderRadius: 'var(--xoot-radius-pill)', background: 'var(--xoot-action-brand)', color: 'var(--xoot-text-on-brand)',
                      fontSize: 'var(--xoot-micro)', fontWeight: 700, letterSpacing: 'var(--xoot-track-label)', textTransform: 'uppercase' }}>
                      <Icon name="check" size={11} strokeWidth={3} />Chosen
                    </span>
                  )}
                </div>
              ))}
            </div>
            <Button variant="outline" block icon="sparkles"
              onClick={() => { haptic('success'); setPro(Math.floor(Math.random() * D.pros.length)); setStage(4); }}>
              Any of them is fine
            </Button>
          </div>
        )}

        {stage === 4 && (
          <>
          {/* A re-price must be disclosed where the money is shown. The website already did this;
              the app passed propertyType to the resolver, got a different service back, and said
              nothing — so declining the stage-1 swap and continuing charged R491 instead of R335
              with the base line label as the only clue. Same engine, so the same disclosure. */}
          {quote.mismatch && (
            <Card pad="md" style={{
              display: 'flex', gap: 11, alignItems: 'flex-start',
              background: 'var(--xoot-honey-wash)', marginBottom: 'var(--xoot-space-4)',
            }}>
              <Icon name="info" size={16} strokeWidth={2} color="var(--xoot-honey-ink)" style={{ flex: '0 0 auto', marginTop: 2 }} />
              <span style={{ fontSize: 'var(--xoot-caption)', lineHeight: 1.55, color: 'var(--xoot-text-secondary)' }}>
                Priced as <strong>{quote.mismatch.title.toLowerCase()}</strong> — that is what this
                property needs, and it is what your Xooter is scheduled and paid for. You are
                charged this, not the regular rate.
              </span>
            </Card>
          )}
          {(() => {
            /* Both sides of the comparison are ENGINE quotes, so the saving shown is the saving
               actually charged. The toggle now moves `freq` itself rather than setting a second
               flag beside it — one source of truth means the discount cannot survive a switch
               back to a one-off, which is exactly what fast tapping used to achieve. */
            if (freq === 'once') return null;
            const once = window.XootQuote.resolve({ ...quoteInput, freq: 'once', dayCount: 0 });
            if (quote.total >= once.total) return null;
            return (
              <RecurringToggle
                on={true} onChange={on => { haptic('selection'); if (!on) setFreq('once'); }}
                frequency={repeatLabel || (freq === 'weekly' ? 'Once a week' : 'Twice a month')}
                saving={once.total - quote.total}
                currentTotal={once.total} newTotal={quote.total}
                style={{ marginBottom: 'var(--xoot-space-4)' }} />
            );
          })()}

          <BookingSummary
            facts={[
              { label: 'Service', value: svc.title },
              isLaundry
                ? { label: 'Laundry', value: `${laundry.washLoads} to wash · ${laundry.ironLoads} to iron${laundryExtras.length ? ` · ${laundryExtras.length} extra` : ''}` }
                : { label: 'Home', value: `${tier.label} · ${rooms.bed} bed · ${rooms.bath} bath${extras.length ? ` · ${extras.length} extra` : ''}` },
              ...(isLaundry ? [{ label: 'Washing', value: laundryWhere === 'onsite' ? 'At your place, your machine' : 'Hand-wash only' }] : []),
              /* Crew named explicitly, not folded into the price line. Someone paying for two
                 people needs to see that two people were booked — a total that quietly
                 includes a premium reads as an error, and "2 Xooters" is also what they'll
                 check against who actually turns up. */
              ...(crew > 1 ? [{ label: 'Crew', value: `${crew} Xooters, working together` }] : []),
              /* First visit always names a real date; the repeat pattern is stated separately
                 rather than replacing it, because "Every Wed" alone never told anyone when the
                 first clean actually happens. */
              { label: 'When', value: `${chosenDate.long} · ${time}–${endTime}` },
              ...(repeatLabel ? [{ label: 'Repeats', value: `${repeatLabel}, from then on` }] : []),
              { label: 'Where', value: D.user.address || '14 Fredman Dr, Sandton 2196' },
              { label: 'Getting in', value: access },
              ...(notes.trim() ? [{ label: 'Your note', value: notes.trim() }] : []),
              { label: 'Xooter', value: sameXooter ? `${D.pros[pro].name} · held for you` : D.pros[pro].name },
            ]}
            /* Rendered verbatim from the pricing service. There is deliberately no arithmetic
               left in this component for the lines and the total to drift apart. */
            lines={quote.lines}
            credit={{
              available: quote.creditAvailable,
              applied: useCredit,
              max: quote.creditMax,
              onToggle: v => { haptic('selection'); setUseCredit(v); },
            }}
            total={quote.total}
            note="You pay now to confirm the visit. We hold it securely and release it to your Xooter once the job is done. XootCover is included. Status, ETA and chat open from this booking."
          />

          {/* Add-ons stay editable right up to the last screen — R30 each, no ceremony. */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--xoot-space-2)', marginTop: 'var(--xoot-space-4)' }}>
            <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>Add anything else? R{D.pricing.addOn} each</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {(isLaundry
                ? [['fold', 'Fold and put away'], ['delicates', 'Hand-wash delicates'], ['stains', 'Treat stains first']]
                : [['fridge', 'Inside the fridge'], ['oven', 'Inside the oven'], ['ironing', 'An hour of ironing'], ['windows', 'Interior windows']]
              ).map(([v, l]) => {
                const list = isLaundry ? laundryExtras : extras;
                const setList = isLaundry ? setLaundryExtras : setExtras;
                return (
                  <Tag key={v} selected={list.includes(v)} icon={list.includes(v) ? 'check' : 'plus'}
                    onClick={() => { haptic('selection'); setList(e => e.includes(v) ? e.filter(x => x !== v) : [...e, v]); }}>{l}</Tag>
                );
              })}
            </div>
          </div>

          {/* Points are informational — what they are worth — so they stay outside the receipt.
              The XootCred CONTROL lives inside BookingSummary, next to the number it changes. */}
          {D.user.points >= D.referral.pointsPerRand && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 'var(--xoot-space-4)' }}>
              <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>Your points</span>
              {D.user.points >= D.referral.pointsPerRand && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12, minHeight: 56, padding: '0 16px',
                  borderRadius: 'var(--xoot-radius-md)', background: 'var(--xoot-lilac-wash)',
                }}>
                  <Icon name="sparkles" size={20} color="var(--xoot-lilac-ink)" strokeWidth={1.9} />
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1 }}>
                    <span style={{ fontSize: 'var(--xoot-body-sm)', fontWeight: 700, color: 'var(--xoot-lilac-ink)' }}>
                      {D.user.points} Xoot Points
                    </span>
                    <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-lilac-ink)', opacity: .82 }}>
                      Worth R{Math.floor(D.user.points / D.referral.pointsPerRand)} as credit
                    </span>
                  </span>
                  <button type="button" onClick={() => haptic('success')}
                    style={{
                      flex: '0 0 auto', height: 34, padding: '0 13px', border: 'none',
                      borderRadius: 'var(--xoot-radius-pill)', background: 'var(--xoot-lilac-500)',
                      color: '#fff', fontFamily: 'var(--xoot-font-core)', fontSize: 'var(--xoot-caption)',
                      fontWeight: 700, cursor: 'pointer',
                    }}>Convert</button>
                </div>
              )}
            </div>
          )}

          {/* The upsell lands here, beside a real number — not on launch. */}
          {!D.user.carePlus && (
            <CarePlusNudge saving={window.XootQuote.resolve({ ...quoteInput, carePlus: true }).total
              ? quote.total - window.XootQuote.resolve({ ...quoteInput, carePlus: true }).total
              : 0} onJoin={() => {}} style={{ marginTop: 'var(--xoot-space-4)' }} />
          )}
          </>
        )}
      </Scroll>

      <DockedCTA note={stage === 4 ? 'Charged now to confirm. Cancel free up to 24 hours before — full refund. Inside 24 hours, half is retained.' : undefined}>
        <Button variant="primary" size="lg" block
          /* Nothing is payable until a quote has come back confirmed, so the button can never
             submit a price the pricing service has not issued. */
          loading={stage === 4 && pending}
          disabled={stage === 4 && (pending || quote.empty)}
          onClick={() => { haptic(stage === 4 ? 'heavy' : 'medium'); next(); }}
          iconRight={stage === 4 ? 'lock' : 'arrow-right'}>
          {stage === 4
            ? (pending ? 'Checking price' : `Pay ${D.rand(quote.total)}${quote.creditUsed ? ' with credit' : ''}`)
            : 'Continue'}
        </Button>
      </DockedCTA>
    </>
  );
}

Object.assign(window, { BookingFlow });
