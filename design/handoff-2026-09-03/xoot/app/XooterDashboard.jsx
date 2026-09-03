/* The Xooter dashboard.

   A worker dashboard is not a customer analytics page, and the difference decides the whole
   layout. Someone opening this is asking three questions in order:

     1. How much have I made, and when does it land?
     2. Am I getting enough work — and am I near the safety cap?
     3. Is anything about how I'm working costing me offers?

   So earnings lead, capacity sits second, and reliability third. Nothing here is a vanity
   metric: every figure is paired with either a date, a limit, or the thing it affects, because
   a percentage with no consequence attached is a scold rather than information.

   Two rules from the platform docs are load-bearing and easy to erode:

     · RANK POINTS ARE RECOGNITION, NOT PAY. They are deliberately placed in their own section,
       away from every earnings figure. Put a badge count beside a rand total and you have
       implied a pay rise that does not exist.
     · PAYOUTS LAND AFTER VERIFIED COMPLETION. The pending figure says so on the same line,
       every time, rather than in a footnote nobody reads. */
const D = window.XootData;
const {
  Card, Badge, Button, Icon, Avatar, Progress, SectionLabel, Rating, Tabs,
  ServiceIcon, XOOT_SERVICES, CountUp, MemberRing,
} = window.XootNS;
const XH = window.XootNS.Haptics;

/* ── The earnings chart ───────────────────────────────────────────────────
   CSS bars rather than a chart library. At seven data points a library is all cost and no
   benefit, and hand-built bars can carry the one thing most chart defaults get wrong here:
   a zero-earning day still gets a visible track, so "I didn't work Wednesday" reads as a fact
   rather than as missing data. */
function WeekChart({ week, onSelect, selected }) {
  const max = Math.max(...week.map(d => d.earned), 1);
  /* Round the axis up to the next R100 so the tallest bar doesn't touch the ceiling — a bar at
     100% height reads as capped rather than as the week's best day. */
  const axis = Math.ceil(max / 100) * 100;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>This week</span>
        <span style={{ fontFamily: 'var(--xoot-font-mono)', fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)' }}>
          peak {D.rand(axis)}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 132 }}>
        {week.map((d, i) => {
          const worked = d.earned > 0;
          const on = selected === d.day;
          const h = worked ? Math.max(8, (d.earned / axis) * 100) : 0;
          return (
            <button
              key={d.day} type="button"
              onClick={() => { XH.haptic('selection'); onSelect && onSelect(on ? null : d.day); }}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 7, height: '100%', padding: 0, border: 'none',
                background: 'none', cursor: 'pointer',
              }}
            >
              {/* The track. Present on every day including the empty ones, so the week reads
                  as seven days rather than five. */}
              <span style={{
                position: 'relative', flex: 1, width: '100%',
                borderRadius: 'var(--xoot-radius-xs)',
                background: 'var(--xoot-surface-sunken)',
                display: 'flex', alignItems: 'flex-end', overflow: 'hidden',
              }}>
                <span style={{
                  width: '100%', height: `${h}%`,
                  borderRadius: 'var(--xoot-radius-xs)',
                  background: on ? 'var(--xoot-sage-500)' : 'var(--xoot-sage-mid)',
                  transition: `height 520ms var(--xoot-ease-settle) ${i * 45}ms, background var(--xoot-dur-fast) var(--xoot-ease-out)`,
                }} />
              </span>
              <span style={{
                fontSize: 'var(--xoot-micro)', fontWeight: 700,
                letterSpacing: 'var(--xoot-track-label)', textTransform: 'uppercase',
                color: on ? 'var(--xoot-text-primary)' : worked ? 'var(--xoot-text-secondary)' : 'var(--xoot-text-muted)',
              }}>{d.day}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Reliability ──────────────────────────────────────────────────────────
   Each metric names what it affects. "92% acceptance" alone is a number a Xooter can only
   feel judged by; "92% — more offers come to Xooters above 90%" is something they can act on.

   Thresholds are stated honestly, including when someone is below one. Hiding that until it
   costs them work would be the dishonest version. */
const RELIABILITY = [
  { key: 'accepted', label: 'Offers accepted', target: 90,
    affects: 'More offers go to Xooters above 90%.' },
  { key: 'onTime', label: 'On time', target: 95,
    affects: 'Late arrivals are the single most common complaint.' },
  { key: 'completed', label: 'Jobs completed', target: 98,
    affects: 'A cancelled job after acceptance affects your standing.' },
];

function ReliabilityRow({ value, label, target, affects }) {
  const ok = value >= target;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <span style={{ fontSize: 'var(--xoot-body-sm)', fontWeight: 700 }}>{label}</span>
        <span style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{
            fontFamily: 'var(--xoot-font-display)', fontSize: 'var(--xoot-title-3)', lineHeight: 1,
            color: ok ? 'var(--xoot-sage-ink)' : 'var(--xoot-honey-ink)',
          }}>{value}%</span>
          <span style={{ fontSize: 'var(--xoot-micro)', color: 'var(--xoot-text-muted)' }}>
            target {target}%
          </span>
        </span>
      </div>
      <span style={{
        position: 'relative', height: 6, borderRadius: 3,
        background: 'var(--xoot-surface-sunken)', overflow: 'hidden',
      }}>
        <span style={{
          display: 'block', width: `${value}%`, height: '100%', borderRadius: 3,
          background: ok ? 'var(--xoot-sage-500)' : 'var(--xoot-honey-500)',
          transition: 'width 620ms var(--xoot-ease-settle)',
        }} />
        {/* The target marker. A bar with no reference line can't show whether you cleared it. */}
        <span aria-hidden="true" style={{
          position: 'absolute', top: -2, bottom: -2, left: `${target}%`,
          width: 2, background: 'var(--xoot-ink-900)', opacity: .28,
        }} />
      </span>
      <span style={{ fontSize: 'var(--xoot-caption)', lineHeight: 1.45, color: 'var(--xoot-text-muted)' }}>
        {affects}
      </span>
    </div>
  );
}

function XooterDashboardScreen({ onBack, onOpenGrowth, onOpenJobs }) {
  const x = D.xooter;
  const [period, setPeriod] = React.useState('week');
  const [day, setDay] = React.useState(null);

  const picked = day ? x.week.find(w => w.day === day) : null;
  const weekTotal = x.week.reduce((s, w) => s + w.earned, 0);
  const weekHours = x.week.reduce((s, w) => s + w.hours, 0);
  const daysWorked = x.week.filter(w => w.earned > 0).length;

  /* Per-hour is the figure that actually tells a Xooter which work is worth taking, and it is
     nowhere else in the app. Guarded against a zero-hour week rather than rendering NaN. */
  const perHour = weekHours > 0 ? Math.round(weekTotal / weekHours) : 0;

  const capPct = Math.min(100, Math.round((x.hoursBooked / x.hoursCap) * 100));
  const nearCap = capPct >= 80;

  const serviceMax = Math.max(...x.byService.map(s => s.earned), 1);

  return (
    <>
      <TopBar onBack={onBack} title="Dashboard" subtitle={`${x.suburb} · since ${x.memberSince}`} />

      <Scroll bottom={40}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--xoot-space-5)' }}>

          {/* ── 1 · Earnings ──────────────────────────────────────────────
              First, because it is why anyone opens this screen. */}
          <Card pad="lg" radius="lg" style={{
            display: 'flex', flexDirection: 'column', gap: 'var(--xoot-space-4)',
            background: 'var(--xoot-sage-wash)', boxShadow: 'none',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <span className="xoot-label" style={{ display: 'block', marginBottom: 8, color: 'var(--xoot-sage-ink)', opacity: .82 }}>
                  {picked ? picked.day : 'Earned this week'}
                </span>
                <span style={{
                  fontFamily: 'var(--xoot-font-display)', fontSize: 'var(--xoot-display-2)',
                  lineHeight: 1, color: 'var(--xoot-sage-ink)',
                }}>
                  R<CountUp value={picked ? picked.earned : weekTotal} />
                </span>
              </div>
              {/* Rate per hour, which exists nowhere else in the app and is the number that
                  tells a Xooter which work is worth accepting. */}
              <div style={{ textAlign: 'right' }}>
                <span className="xoot-label" style={{ display: 'block', marginBottom: 8, color: 'var(--xoot-sage-ink)', opacity: .82 }}>
                  Per hour
                </span>
                <span style={{
                  fontFamily: 'var(--xoot-font-display)', fontSize: 'var(--xoot-title-1)',
                  lineHeight: 1, color: 'var(--xoot-sage-ink)',
                }}>
                  R<CountUp value={picked ? (picked.hours ? Math.round(picked.earned / picked.hours) : 0) : perHour} />
                </span>
              </div>
            </div>

            <span style={{ fontSize: 'var(--xoot-body-sm)', lineHeight: 1.5, color: 'var(--xoot-sage-ink)', opacity: .88 }}>
              {picked
                ? `${picked.hours} ${picked.hours === 1 ? 'hour' : 'hours'} worked. Tap again to see the full week.`
                : `${daysWorked} ${daysWorked === 1 ? 'day' : 'days'} worked, ${weekHours} hours. Tap a bar for one day.`}
            </span>

            <WeekChart week={x.week} selected={day} onSelect={setDay} />
          </Card>

          {/* ── Payout ── the promise, restated where the money is */}
          <Card tone="flat" pad="md" radius="md" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{
              display: 'grid', placeItems: 'center', width: 40, height: 40, flex: '0 0 auto',
              borderRadius: 'var(--xoot-radius-key)', background: 'var(--xoot-honey-wash)',
            }}>
              <Icon name="wallet" size={19} color="var(--xoot-honey-ink)" strokeWidth={1.9} />
            </span>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 'var(--xoot-body-sm)', fontWeight: 700 }}>
                {D.rand(x.pending)} waiting to pay out
              </span>
              {/* The rule, on the same line as the number rather than in a footnote. */}
              <span style={{ fontSize: 'var(--xoot-caption)', lineHeight: 1.45, color: 'var(--xoot-text-muted)' }}>
                Verified jobs pay out on {x.nextPayout}. {D.rand(x.paidThisMonth)} paid this month.
              </span>
            </span>
          </Card>

          {/* ── 2 · Capacity ──────────────────────────────────────────────
              The cap is a safety limit, so it is shown plainly rather than only enforced at
              the moment of refusal. Someone planning their week needs to see the ceiling
              before they hit it. */}
          <Card pad="lg" radius="lg" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--xoot-space-3)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
              <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>Hours booked</span>
              <span style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                <span style={{ fontFamily: 'var(--xoot-font-display)', fontSize: 'var(--xoot-title-1)', lineHeight: 1 }}>
                  {x.hoursBooked}
                </span>
                <span style={{ fontSize: 'var(--xoot-body-sm)', color: 'var(--xoot-text-muted)' }}>
                  of {x.hoursCap} this week
                </span>
              </span>
            </div>

            <Progress value={x.hoursBooked} max={x.hoursCap} tone={nearCap ? 'streak' : 'success'} size="lg" />

            <span style={{ fontSize: 'var(--xoot-body-sm)', lineHeight: 1.5, color: 'var(--xoot-text-secondary)' }}>
              {nearCap
                ? `You're close to your weekly limit. We'll stop sending offers at ${x.hoursCap} hours — the cap is there so nobody works themselves into the ground.`
                : `Room for ${x.hoursCap - x.hoursBooked} more hours. Xooters work 07:00–17:00, and the weekly cap keeps that sustainable.`}
            </span>

            {!nearCap && (
              <Button variant="outline" block icon="briefcase" onClick={onOpenJobs} style={{ marginTop: 4 }}>
                See available offers
              </Button>
            )}
          </Card>

          {/* ── 3 · Reliability ───────────────────────────────────────────── */}
          <Card pad="lg" radius="lg" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--xoot-space-5)' }}>
            <div>
              <span className="xoot-label" style={{ display: 'block', marginBottom: 6, color: 'var(--xoot-text-muted)' }}>
                How you're working
              </span>
              <span style={{ fontSize: 'var(--xoot-body-sm)', lineHeight: 1.5, color: 'var(--xoot-text-secondary)' }}>
                These three decide how many offers reach you. Nothing else does.
              </span>
            </div>
            {RELIABILITY.map(r => (
              <ReliabilityRow key={r.key} value={x.reliability[r.key]} label={r.label}
                target={r.target} affects={r.affects} />
            ))}
          </Card>

          {/* ── Where the work comes from ──────────────────────────────────
              The one genuinely strategic view a Xooter has: which service is actually paying.
              Ordered by earnings, not by job count — 14 small jobs can be worth less than 5
              large ones, and ranking by volume would hide that. */}
          <Card pad="lg" radius="lg" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--xoot-space-4)' }}>
            <div>
              <span className="xoot-label" style={{ display: 'block', marginBottom: 6, color: 'var(--xoot-text-muted)' }}>
                Where your money came from
              </span>
              <span style={{ fontSize: 'var(--xoot-body-sm)', lineHeight: 1.5, color: 'var(--xoot-text-secondary)' }}>
                Last 30 days, highest earning first.
              </span>
            </div>

            {[...x.byService].sort((a, b) => b.earned - a.earned).map(s => {
              const svc = XOOT_SERVICES[s.key];
              return (
                <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <ServiceIcon service={s.key} size={38} shape="circle" motion="still" />
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
                      <span style={{ fontSize: 'var(--xoot-body-sm)', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {svc ? svc.label : s.key}
                      </span>
                      <span style={{ fontFamily: 'var(--xoot-font-mono)', fontSize: 'var(--xoot-body-sm)', flex: '0 0 auto' }}>
                        {D.rand(s.earned)}
                      </span>
                    </span>
                    <span style={{ position: 'relative', height: 5, borderRadius: 3, background: 'var(--xoot-surface-sunken)', overflow: 'hidden' }}>
                      <span style={{
                        display: 'block', width: `${(s.earned / serviceMax) * 100}%`, height: '100%',
                        borderRadius: 3, background: 'var(--xoot-violet-400)',
                        transition: 'width 620ms var(--xoot-ease-settle)',
                      }} />
                    </span>
                    <span style={{ fontSize: 'var(--xoot-micro)', color: 'var(--xoot-text-muted)' }}>
                      {s.jobs} {s.jobs === 1 ? 'job' : 'jobs'} · {D.rand(Math.round(s.earned / s.jobs))} average
                    </span>
                  </span>
                </div>
              );
            })}
          </Card>

          {/* ── Standing ──────────────────────────────────────────────────
              Rank and badges live HERE, in their own card, deliberately far from every rand
              figure above. Rank points are recognition, not pay, and putting them next to
              earnings would imply a rate rise that does not exist. The copy says so. */}
          <Card pad="lg" radius="lg" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--xoot-space-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <MemberRing>
                <Avatar name={x.name} size="lg" badge="verified" />
              </MemberRing>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}>
                <span style={{ fontFamily: 'var(--xoot-font-display)', fontSize: 'var(--xoot-title-2)', lineHeight: 1.2 }}>
                  {x.name}
                </span>
                <Rating value={x.rating} count={x.reviews} size={14} />
                <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)' }}>
                  {x.jobsAllTime} visits all time
                </span>
              </span>
            </div>

            <span style={{ height: 1, background: 'var(--xoot-border-color)' }} />

            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
              <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>Rank points</span>
              <span style={{ fontFamily: 'var(--xoot-font-display)', fontSize: 'var(--xoot-title-2)', lineHeight: 1 }}>
                {x.rank}
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {x.badges.map(b => <Badge key={b} tone="success" size="sm" icon="badge-check">{b}</Badge>)}
            </div>
            {/* Stated outright, because the alternative is a Xooter believing a badge pays. */}
            <span style={{ fontSize: 'var(--xoot-caption)', lineHeight: 1.5, color: 'var(--xoot-text-muted)' }}>
              Rank points and badges show customers what you're trained in. They don't change
              your rate — your rate is set by the job.
            </span>

            <Button variant="outline" block icon="graduation-cap" onClick={onOpenGrowth}>
              Earn another badge
            </Button>
          </Card>
        </div>
      </Scroll>
    </>
  );
}

Object.assign(window, { XooterDashboardScreen });
