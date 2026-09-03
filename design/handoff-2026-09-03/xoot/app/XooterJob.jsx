/* The Xooter job flow — offer through payout.

   This is the working side of Xoot, and it is governed by rules that are easy to erode:

     · Rank points are RECOGNITION, never pay. No screen here may imply a badge raises a rate.
     · Payout lands after a visit is verified complete, not on acceptance. Say so plainly.
     · Household access details appear only inside the access window (45 min before start until
       30 min after verified completion) and vanish afterwards.

   The flow is one state machine rather than separate screens, because the Xooter's day is one
   continuous thing — offered → accepted → travelling → arrived → working → done — and building
   it as discrete pages is what makes worker apps feel like paperwork. */
const D = window.XootData;
const {
  Card, Badge, Button, Icon, Avatar, Progress, SectionLabel, Rating,
  ServiceIcon, XOOT_SERVICES, SensitiveAccess, CameraCard, SOSButton, Toast, Pressable, CountUp,
} = window.XootNS;
const XH = window.XootNS.Haptics;

/* An offer carries everything needed to say yes or no WITHOUT the address. Deciding on a job
   should never require access to the customer's home details. */
const OFFERS = [
  {
    id: 'j1', service: 'airbnb', suburb: 'Rosebank', when: 'Tomorrow · 08:00',
    hours: 5.5, pay: 244, distanceKm: 3.2, repeat: false,
    note: 'Guest checkout 10:00, next check-in 15:00.',
  },
  {
    id: 'j2', service: 'regular', suburb: 'Sandton', when: 'Tomorrow · 14:00',
    hours: 4, pay: 210, distanceKm: 1.4, repeat: true,
    note: 'You have cleaned here 6 times before.',
  },
  {
    id: 'j3', service: 'office', suburb: 'Bryanston', when: 'Friday · 17:30',
    hours: 3, pay: 180, distanceKm: 6.8, repeat: false,
    note: 'After hours. Building access via reception.',
  },
];

const CHECKLIST = {
  airbnb: ['Strip and remake all beds', 'Bathrooms and towels', 'Kitchen and dishes', 'Floors throughout', 'Bin out, restock basics', 'Final photos for the host'],
  regular: ['Kitchen', 'Bathrooms', 'Bedrooms', 'Living areas', 'Floors throughout'],
  office:  ['Desks and surfaces', 'Kitchen and dishwasher', 'Bathrooms', 'Bins', 'Floors and entrance'],
};

/* ── Job feed ─────────────────────────────────────────────────────────────
   Pay is shown before anything else, because that is the first thing anyone deciding whether
   to take work needs to know. Hiding it below the fold is a dark pattern in a worker app. */
/* The working day, and how much of it is already committed. Travel is charged at a flat 30
   minutes between jobs rather than modelled properly — a real build uses the routing distance,
   but the point of the ceiling is the same and this keeps the arithmetic legible. */
const DAY_HOURS = 10;          /* 07:00–17:00 */
const TRAVEL_BUFFER = 0.5;

function JobFeed({ onAccept, onOpenEarnings, onOpenGrowth, onOpenDash, accepted = [] }) {
  const [dismissed, setDismissed] = React.useState([]);
  const [toast, setToast] = React.useState(null);
  const open = OFFERS.filter(o => !dismissed.includes(o.id));

  /* Committed hours include a travel buffer per job — a day of three short jobs is not the same
     as one long one, and ignoring that is how a schedule looks fine and runs late. */
  const committed = accepted.reduce((s, j2) => s + j2.hours + TRAVEL_BUFFER, 0);
  const remaining = Math.max(0, DAY_HOURS - committed);
  const fits = o => o.hours + TRAVEL_BUFFER <= remaining;

  const decline = id => {
    XH.haptic('light');
    setDismissed(d => [...d, id]);
    setToast('Passed. It goes to the next Xooter nearby.');
    window.setTimeout(() => setToast(null), 2600);
  };

  return (
    <>
      <div style={{ padding: '2px 20px 14px', flex: '0 0 auto' }}>
        <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>Wednesday · Sandton</span>
        <h1 style={{ fontSize: 'var(--xoot-display-2)', lineHeight: 1.04, marginTop: 6 }}>Work</h1>
      </div>

      <Scroll bottom={110}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {toast && <Toast tone="info" title={toast} onDismiss={() => setToast(null)} />}

          {/* Today at a glance. Two numbers, no chart — a Xooter checks this between jobs. */}
          {/* Both figures pin to the BOTTOM of the box rather than sitting after the label in
              normal flow. "Waiting to pay out" wraps to two lines while "This week" doesn't, and
              in normal flow that pushed its number down 11px — two adjacent KPI figures out of
              alignment read as a bug. space-between makes the label length irrelevant, so the
              next label that wraps can't reintroduce it. */}
          <div style={{ display: 'flex', gap: 12 }}>
            {[['This week', D.rand(D.xooter.earnedThisWeek), 'sage'], ['Waiting to pay out', D.rand(D.xooter.pending), 'honey']].map(([l, v, tint]) => (
              <Card key={l} pad="md" radius="lg" interactive onClick={onOpenDash}
                style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 6, background: `var(--xoot-${tint}-wash)`, boxShadow: 'none', cursor: 'pointer' }}>
                <span className="xoot-label" style={{ color: `var(--xoot-${tint}-ink)`, opacity: .8 }}>{l}</span>
                {/* CountUp, because these tick up as jobs complete — a payout total that
                    snaps is a payout total the Xooter has to double-check. */}
                <span style={{ fontFamily: 'var(--xoot-font-display)', fontSize: 'var(--xoot-title-1)', lineHeight: 1, color: `var(--xoot-${tint}-ink)` }}>
                  R<CountUp value={Number(String(v).replace(/[^\d]/g, '')) || 0} />
                </span>
              </Card>
            ))}
          </div>

          {/* The ceiling, stated plainly. A Xooter deciding whether to take a job needs to know
              what is left in the day, and it is also the explanation for any greyed-out offer
              below — so it sits directly above them rather than in a settings screen. */}
          {committed > 0 && (
            <Card tone="flat" pad="md" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ display: 'grid', placeItems: 'center', width: 38, height: 38, flex: '0 0 auto', borderRadius: 'var(--xoot-radius-key)', background: 'var(--xoot-surface-sunken)' }}>
                <Icon name="timer" size={19} color="var(--xoot-icon-outline)" strokeWidth={1.9} />
              </span>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 'var(--xoot-body-sm)', fontWeight: 700 }}>
                  {remaining > 0 ? `${remaining} hrs left today` : 'Your day is full'}
                </span>
                <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)', lineHeight: 1.45 }}>
                  {committed} of {DAY_HOURS} hrs committed, travel included. Xooters work 07:00–17:00.
                </span>
              </span>
            </Card>
          )}

          <SectionLabel slot="plain" label={`Offers (${open.length})`} />

          {open.length === 0 && (
            <Card tone="flat" pad="lg" style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 'var(--xoot-body)', color: 'var(--xoot-text-secondary)', lineHeight: 1.6 }}>
                Nothing right now. We'll notify you the moment something comes up near Sandton —
                you don't need to keep the app open.
              </p>
            </Card>
          )}

          {open.map(o => {
            const svc = XOOT_SERVICES[o.service];
            const tooLong = !fits(o);
            return (
              <Card key={o.id} pad="lg" radius="lg" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Pay first. Anyone deciding whether to take work needs the number up front. */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ display: 'flex', gap: 12, minWidth: 0 }}>
                    <ServiceIcon service={o.service} size={46} motion="still" />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                      <span style={{ fontFamily: 'var(--xoot-font-display)', fontSize: 'var(--xoot-title-2)', lineHeight: 1.2 }}>{svc.label}</span>
                      <span style={{ fontSize: 'var(--xoot-body-sm)', color: 'var(--xoot-text-secondary)' }}>
                        {o.suburb} · {o.distanceKm} km away
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flex: '0 0 auto' }}>
                    <span style={{ display: 'block', fontFamily: 'var(--xoot-font-display)', fontSize: 'var(--xoot-title-1)', lineHeight: 1 }}>
                      {D.rand(o.pay)}
                    </span>
                    <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)' }}>{o.hours} hrs</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  <Badge tone="neutral" size="sm" icon="clock">{o.when}</Badge>
                  {o.repeat && <Badge tone="success" size="sm" icon="repeat">You know this place</Badge>}
                </div>

                <p style={{ fontSize: 'var(--xoot-body-sm)', lineHeight: 1.55, color: 'var(--xoot-text-secondary)' }}>{o.note}</p>

                {/* No address until accepted — deciding on a job must never require access to
                    someone's home details. */}
                <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)' }}>
                  <Icon name="lock" size={13} strokeWidth={2} />
                  Full address unlocks 45 minutes before you start
                </span>

                {/* Shown, not hidden. A silent feed makes a Xooter think the app is broken;
                    "this does not fit" is something they can act on. */}
                {tooLong && (
                  <span style={{
                    display: 'flex', alignItems: 'flex-start', gap: 8,
                    padding: 'var(--xoot-space-3)', borderRadius: 'var(--xoot-radius-sm)',
                    background: 'var(--xoot-honey-wash)',
                  }}>
                    <Icon name="circle-alert" size={15} color="var(--xoot-honey-ink)" strokeWidth={2.1} style={{ marginTop: 1, flex: '0 0 auto' }} />
                    <span style={{ fontSize: 'var(--xoot-caption)', lineHeight: 1.5, color: 'var(--xoot-honey-ink)' }}>
                      This needs {o.hours + TRAVEL_BUFFER} hrs with travel and you have {remaining} left.
                      Pass on something else first, or take it another day.
                    </span>
                  </span>
                )}

                <div style={{ display: 'flex', gap: 10 }}>
                  <Button variant="outline" block onClick={() => decline(o.id)}>Pass</Button>
                  <Button variant="primary" block disabled={tooLong}
                    onClick={() => { XH.haptic('success'); onAccept(o); }}>
                    {tooLong ? "Won't fit today" : 'Accept'}
                  </Button>
                </div>
              </Card>
            );
          })}

          {/* Dashboard gets the full-width row because it's the considered view; earnings and
              training split the line beneath it. */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
            <Button variant="ink" block icon="chart-column" onClick={onOpenDash}>Dashboard</Button>
            <div style={{ display: 'flex', gap: 10 }}>
              <Button variant="outline" block icon="wallet" onClick={onOpenEarnings}>Earnings</Button>
              <Button variant="outline" block icon="graduation-cap" onClick={onOpenGrowth}>Training</Button>
            </div>
          </div>
        </div>
      </Scroll>
    </>
  );
}

/* ── The job itself ───────────────────────────────────────────────────────
   One screen that advances through the day rather than a stack of pages. */
const JOB_STAGES = ['accepted', 'en_route', 'arrived', 'in_progress', 'completed'];

function ActiveJob({ job, onBack, onDone }) {
  const [stage, setStage] = React.useState('accepted');
  const [ticks, setTicks] = React.useState([]);
  const [camera, setCamera] = React.useState(false);
  const [photos, setPhotos] = React.useState(0);
  const [toast, setToast] = React.useState(null);

  const svc = XOOT_SERVICES[job.service];
  const list = CHECKLIST[job.service] || CHECKLIST.regular;
  const idx = JOB_STAGES.indexOf(stage);
  const allDone = ticks.length === list.length;

  /* Access opens 45 min before start and closes 30 min after verified completion. Modelled on
     stage rather than a real clock here, but the states are the real ones. */
  const accessState = stage === 'accepted' ? 'locked'
    : stage === 'completed' ? 'expired'
    : 'open';

  const advance = () => {
    XH.haptic(stage === 'in_progress' ? 'heavy' : 'medium');
    const next = JOB_STAGES[Math.min(JOB_STAGES.length - 1, idx + 1)];
    setStage(next);
    if (next === 'completed') {
      setToast('Sent to Xoot for verification.');
      window.setTimeout(() => setToast(null), 3000);
    }
  };

  if (camera) {
    return (
      <div style={{ position: 'absolute', inset: 0, zIndex: 60, background: 'var(--xoot-surface-page)' }}>
        <CameraCard
          title="Photo for the customer"
          hint="Show the finished room — this is what they see when the job closes"
          onCapture={() => { setPhotos(p => p + 1); setCamera(false); }}
          onClose={() => setCamera(false)}
        />
      </div>
    );
  }

  const CTA = {
    accepted:    ['Start travelling', 'truck'],
    en_route:    ["I've arrived", 'map-pin'],
    arrived:     ['Start the job', 'timer'],
    in_progress: [allDone ? 'Finish and submit' : `Tick everything first (${ticks.length}/${list.length})`, 'circle-check'],
  }[stage];

  return (
    <>
      <TopBar onBack={onBack} title={svc.label} subtitle={`${job.suburb} · ${job.when}`} />

      <Scroll bottom={CTA ? 130 : 40}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {toast && <Toast tone="success" title={toast} onDismiss={() => setToast(null)} />}

          {/* Where you are in the day. */}
          <div style={{ display: 'flex', gap: 4 }}>
            {JOB_STAGES.map((s, i) => (
              <span key={s} style={{
                flex: 1, height: 5, borderRadius: 3,
                background: i <= idx ? 'var(--xoot-violet-500)' : 'var(--xoot-neutral-200)',
                transition: `background var(--xoot-dur-base) var(--xoot-ease-out) ${i * 40}ms`,
              }} />
            ))}
          </div>

          {/* Pay, restated. A Xooter mid-job should never have to go looking for what they
              are earning, and the payout timing is stated every single time. */}
          <Card pad="lg" radius="lg" style={{ background: 'var(--xoot-sage-wash)', boxShadow: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <span className="xoot-label" style={{ color: 'var(--xoot-sage-ink)', opacity: .85 }}>You earn</span>
              <span style={{ fontFamily: 'var(--xoot-font-display)', fontSize: 'var(--xoot-display-3)', lineHeight: 1, color: 'var(--xoot-sage-ink)' }}>
                {D.rand(job.pay)}
              </span>
            </div>
            <p style={{ marginTop: 8, fontSize: 'var(--xoot-body-sm)', lineHeight: 1.5, color: 'var(--xoot-sage-ink)', opacity: .88 }}>
              {stage === 'completed'
                ? 'Verified visits pay out on the next Tuesday run.'
                : 'Paid out after Xoot verifies the visit is complete — usually within an hour of you finishing.'}
            </p>
          </Card>

          {/* SensitiveAccess takes a flat label/value list, not code/address/note — passing the
              props I assumed rendered an empty card, which left a Xooter with no way in.
              opensIn is printed after the word "in", so it must be a bare duration. */}
          <SensitiveAccess
            state={accessState}
            opensIn={accessState === 'locked' ? '45 min' : undefined}
            fields={[
              { label: 'Gate code', value: '1408' },
              { label: 'Address', value: `14 Fredman Drive, ${job.suburb}` },
              { label: 'Entry note', value: 'Gate on the left. Dog is friendly but keep the side gate shut.' },
            ]}
          />

          {stage === 'in_progress' && (
            <>
              <SectionLabel slot="plain" label={`Checklist (${ticks.length}/${list.length})`} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {list.map(item => {
                  const on = ticks.includes(item);
                  return (
                    <button key={item} type="button"
                      onClick={() => { XH.haptic('selection'); setTicks(t => on ? t.filter(x => x !== item) : [...t, item]); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                        padding: 'var(--xoot-space-4)', border: 'none', textAlign: 'left',
                        borderRadius: 'var(--xoot-radius-md)', cursor: 'pointer',
                        background: on ? 'var(--xoot-action-brand-soft)' : 'var(--xoot-surface-card)',
                        boxShadow: on ? 'inset 0 0 0 1.5px var(--xoot-violet-400)' : 'var(--xoot-shadow-2)',
                        transition: 'all var(--xoot-dur-fast) var(--xoot-ease-out)',
                      }}>
                      <span style={{
                        display: 'grid', placeItems: 'center', width: 26, height: 26, flex: '0 0 auto',
                        borderRadius: '50%', background: on ? 'var(--xoot-violet-500)' : 'transparent',
                        boxShadow: on ? 'none' : 'inset 0 0 0 2px var(--xoot-neutral-300)',
                      }}>
                        {on && <Icon name="check" size={14} color="#fff" strokeWidth={3.2} />}
                      </span>
                      <span style={{
                        fontSize: 'var(--xoot-body)', fontWeight: 600,
                        color: on ? 'var(--xoot-violet-700)' : 'var(--xoot-text-primary)',
                        textDecoration: on ? 'line-through' : 'none',
                      }}>{item}</span>
                    </button>
                  );
                })}
              </div>

              <Button variant="outline" block icon="camera" onClick={() => setCamera(true)}>
                {photos > 0 ? `${photos} photo${photos > 1 ? 's' : ''} added` : 'Add finish photos'}
              </Button>
            </>
          )}

          {stage === 'completed' && (
            <Card pad="lg" radius="lg" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>Payout</span>
              {[[`${svc.label} · ${job.hours} hrs`, job.pay],
                ['Travel', 0]].map(([l, v]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--xoot-body-sm)' }}>
                  <span style={{ color: 'var(--xoot-text-secondary)' }}>{l}</span>
                  <span style={{ fontFamily: 'var(--xoot-font-mono)' }}>{D.rand(v)}</span>
                </div>
              ))}
              <span style={{ height: 1, background: 'var(--xoot-neutral-200)' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontWeight: 700 }}>Total</span>
                <span style={{ fontFamily: 'var(--xoot-font-display)', fontSize: 'var(--xoot-title-1)' }}>{D.rand(job.pay)}</span>
              </div>
              <p style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)', lineHeight: 1.55 }}>
                Access to this home's details has closed. It reopens only if you're booked there again.
              </p>
              <Button variant="primary" block onClick={onDone}>Back to work</Button>
            </Card>
          )}

          {/* Safety is one tap from the job, at every stage. A panic button four taps deep is
              decoration. */}
          {stage !== 'completed' && stage !== 'accepted' && (
            <SOSButton label="Hold for help" />
          )}
        </div>
      </Scroll>

      {CTA && (
        <DockedCTA note={stage === 'accepted' ? 'The customer has been told you accepted.' : undefined}>
          <Button
            variant={stage === 'in_progress' && !allDone ? 'outline' : 'primary'}
            size="lg" block icon={CTA[1]}
            disabled={stage === 'in_progress' && !allDone}
            onClick={advance}
          >
            {CTA[0]}
          </Button>
        </DockedCTA>
      )}
    </>
  );
}

Object.assign(window, { JobFeed, ActiveJob, XOOTER_OFFERS: OFFERS });
