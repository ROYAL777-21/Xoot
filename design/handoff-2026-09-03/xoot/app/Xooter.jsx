/* The Xooter side. A different job to the customer app: this is someone's income, so the
   screens are denser, more factual, and lead with money and certainty.

   Two rules from the platform docs that shape everything here:
     · Rank points are recognition, NOT pay. Never imply a badge raises a rate.
     · Payouts land only after a visit is verified complete. Say so plainly. */
const {
  Card, Badge, Button, Icon, Avatar, Progress, SectionLabel, Rating, Tabs,
  ServiceIcon, SensitiveAccess, Orb, MemberRing, Toast, XooterCard,
} = window.XootNS;
const XH = window.XootNS.Haptics;

/* The real training modules and the badges they award. Points are 25–40 per module. */
/* Xoot Standard is the required baseline every Xooter completes before their first job — it's
   what "vetted" actually means. The specialisms below it are optional and earn badges. */
const STANDARD = [
  { id: 'std-safety', title: 'Home safety & entry', points: 40, done: true },
  { id: 'std-privacy', title: 'Privacy & access codes', points: 40, done: true },
  { id: 'std-quality', title: 'The Xoot clean, room by room', points: 40, done: true },
  { id: 'std-conduct', title: 'Conduct & communication', points: 40, done: false },
];

const TRAINING = [
  { id: 'turnover', title: 'Airbnb turnover readiness', badge: 'Turnover Pro', points: 35, tint: 'blush', done: true },
  { id: 'surface', title: 'Premium surface protection', badge: 'Surface Safe', points: 35, tint: 'mist', done: true },
  { id: 'office', title: 'Office quick-clean standard', badge: 'Office Ready', points: 30, tint: 'sage', done: false },
  { id: 'wellness', title: 'Eco and fragrance-free care', badge: 'Wellness Ready', points: 25, tint: 'moss', done: false },
  { id: 'comms', title: 'Quiet luxury communication', badge: 'Client Care', points: 25, tint: 'lilac', done: false },
];

function XooterHomeScreen({ onOpenJob, onOpenEarnings, onOpenGrowth }) {
  const earned = TRAINING.filter(t => t.done).reduce((s, t) => s + t.points, 0);
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '2px 20px 14px' }}>
        <Avatar name="Nomsa Mahlangu" size="md" badge="verified" />
        <span style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>Good morning</span>
          <h1 style={{ fontSize: 'var(--xoot-title-1)', lineHeight: 1.1, marginTop: 3 }}>Nomsa</h1>
        </span>
        <Badge tone="success" icon="badge-check">Available</Badge>
      </div>

      <Scroll bottom={100}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--xoot-space-7)' }}>
          <Card tone="ink" pad="lg" radius="lg" interactive onClick={onOpenEarnings}
            style={{ display: 'flex', flexDirection: 'column', gap: 6, cursor: 'pointer' }}>
            <span className="xoot-label" style={{ color: 'rgba(255,255,255,.55)' }}>Paid out this week</span>
            <span style={{ fontFamily: 'var(--xoot-font-display)', fontSize: 'var(--xoot-display-2)', lineHeight: 1, color: '#fff' }}>R2 840</span>
            <span style={{ fontSize: 'var(--xoot-body-sm)', color: 'rgba(255,255,255,.62)' }}>
              R680 clearing — released as each visit is verified.
            </span>
          </Card>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--xoot-space-3)' }}>
            <SectionLabel slot="morning" label="Today" count={2} />
            {[['airbnb', 'Airbnb turnover', '08:00 · 5,5 hrs · Sandton', 'R355', true],
              ['express', 'Express clean', '15:00 · 2 hrs · Rosebank', 'R280', false]].map(([svc, t, m, pay, next]) => (
              <Card key={t} pad="md" interactive onClick={onOpenJob}
                style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                  boxShadow: next ? 'var(--xoot-shadow-3), inset 0 0 0 1.5px var(--xoot-violet-300)' : 'var(--xoot-shadow-2)' }}>
                <ServiceIcon service={svc} size={44} shape="circle" motion={next ? 'breathe' : 'still'} />
                <span style={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 'var(--xoot-body)', fontWeight: 700 }}>{t}</span>
                  <span style={{ fontSize: 'var(--xoot-body-sm)', color: 'var(--xoot-text-muted)' }}>{m}</span>
                </span>
                <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                  <span style={{ fontFamily: 'var(--xoot-font-mono)', fontSize: 'var(--xoot-body-sm)', fontWeight: 500 }}>{pay}</span>
                  {next && <Badge tone="brand" size="sm">Next</Badge>}
                </span>
              </Card>
            ))}
          </div>

          <Card tone="flat" pad="md" interactive onClick={onOpenGrowth}
            style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}>
            <Orb size={48} palette="violet" motion="breathe" />
            <span style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
              <span style={{ fontSize: 'var(--xoot-body)', fontWeight: 700 }}>{earned} rank points</span>
              <span style={{ fontSize: 'var(--xoot-body-sm)', color: 'var(--xoot-text-muted)' }}>
                Two badges earned · three more available
              </span>
              <Progress value={earned} max={150} size="sm" style={{ marginTop: 4 }} />
            </span>
            <Icon name="chevron-right" size={18} color="var(--xoot-neutral-400)" />
          </Card>

          <Card tone="flat" pad="md" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>This month</span>
            <div style={{ display: 'flex', gap: 18 }}>
              {[['24', 'visits'], ['4,9', 'rating'], ['98%', 'on time']].map(([v, l]) => (
                <span key={l} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <span style={{ fontFamily: 'var(--xoot-font-display)', fontSize: 'var(--xoot-title-1)', lineHeight: 1 }}>{v}</span>
                  <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)' }}>{l}</span>
                </span>
              ))}
            </div>
          </Card>
        </div>
      </Scroll>
    </>
  );
}

function XooterEarningsScreen({ onBack }) {
  const [tab, setTab] = React.useState('week');
  return (
    <>
      <TopBar onBack={onBack} title="Earnings" subtitle="Paid weekly, every Friday" />
      <div style={{ padding: '0 20px 14px' }}>
        <Tabs items={[{ value: 'week', label: 'This week' }, { value: 'month', label: 'This month' }]} value={tab} onChange={setTab} />
      </div>
      <Scroll bottom={100}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--xoot-space-7)' }}>
          <Card tone="ink" pad="lg" radius="lg" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className="xoot-label" style={{ color: 'rgba(255,255,255,.55)' }}>Cleared</span>
            <span style={{ fontFamily: 'var(--xoot-font-display)', fontSize: 'var(--xoot-display-1)', lineHeight: 1, color: '#fff' }}>
              R{tab === 'week' ? '2 840' : '11 260'}
            </span>
            <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
              {[['R680', 'clearing'], [tab === 'week' ? 'R0' : 'R240', 'tips']].map(([v, l]) => (
                <span key={l} style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontFamily: 'var(--xoot-font-mono)', fontSize: 'var(--xoot-body)', color: '#fff' }}>{v}</span>
                  <span style={{ fontSize: 'var(--xoot-caption)', color: 'rgba(255,255,255,.55)' }}>{l}</span>
                </span>
              ))}
            </div>
          </Card>

          <Card tone="flat" pad="md" style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>Recent visits</span>
            {[['Airbnb turnover', 'Wed · Sandton', 'R355', 'Cleared'],
              ['Regular clean', 'Tue · Rosebank', 'R280', 'Cleared'],
              ['Office clean', 'Mon · Bryanston', 'R400', 'Clearing']].map(([t, m, pay, st]) => (
              <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                <span style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 'var(--xoot-body-sm)', fontWeight: 600 }}>{t}</span>
                  <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)' }}>{m}</span>
                </span>
                <span style={{ fontFamily: 'var(--xoot-font-mono)', fontSize: 'var(--xoot-body-sm)' }}>{pay}</span>
                <Badge tone={st === 'Cleared' ? 'success' : 'warning'} size="sm">{st}</Badge>
              </div>
            ))}
          </Card>

          <Card tone="flat" pad="md" style={{ display: 'flex', gap: 11 }}>
            <Icon name="info" size={18} color="var(--xoot-icon-outline)" strokeWidth={1.9} style={{ marginTop: 1 }} />
            <span style={{ fontSize: 'var(--xoot-body-sm)', lineHeight: 1.5, color: 'var(--xoot-text-secondary)' }}>
              Customers pay up front and Xoot holds it. Your share clears once a visit is verified complete —
              usually within an hour — and pays out every Friday.
            </span>
          </Card>

          <Button variant="outline" block icon="book-open">Download a statement</Button>
        </div>
      </Scroll>
    </>
  );
}

function XooterGrowthScreen({ onBack }) {
  const [done, setDone] = React.useState(TRAINING.filter(t => t.done).map(t => t.id));
  const earned = TRAINING.filter(t => done.includes(t.id)).reduce((s, t) => s + t.points, 0);
  return (
    <>
      <TopBar onBack={onBack} title="Your badges" subtitle="Recognition, not a pay grade" />
      <Scroll bottom={100}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--xoot-space-7)' }}>
          <Card tone="dawn" pad="lg" radius="lg" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center' }}>
            <Orb size={68} palette="violet" motion="breathe" />
            <span style={{ fontFamily: 'var(--xoot-font-display)', fontSize: 'var(--xoot-display-3)', lineHeight: 1, color: 'var(--xoot-ink-900)' }}>{earned} points</span>
            <span style={{ fontSize: 'var(--xoot-body-sm)', color: 'var(--xoot-ink-700)', maxWidth: 260 }}>
              Badges show customers what you're good at. They don't change your rate — your rate is your rate.
            </span>
            <Progress value={earned} max={150} style={{ width: '100%', marginTop: 4 }} />
          </Card>

          {/* The required baseline, shown first and separately — it isn't a badge to collect. */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--xoot-space-3)' }}>
            <SectionLabel slot="plain" label="Xoot Standard" count={STANDARD.length} />
            <Card tone="flat" pad="md" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--xoot-space-4)' }}>
              <span style={{ fontSize: 'var(--xoot-body-sm)', color: 'var(--xoot-text-secondary)', lineHeight: 1.5 }}>
                Required before your first job. This is what customers mean when they read “vetted”.
              </span>
              {STANDARD.map(m => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{
                    display: 'grid', placeItems: 'center', width: 26, height: 26, flex: '0 0 auto',
                    borderRadius: '50%',
                    background: m.done ? 'var(--xoot-sage-500)' : 'transparent',
                    boxShadow: m.done ? 'none' : 'inset 0 0 0 2px var(--xoot-neutral-300)',
                  }}>
                    {m.done && <Icon name="check" size={14} color="#fff" strokeWidth={3.2} />}
                  </span>
                  <span style={{ flex: 1, fontSize: 'var(--xoot-body-sm)', fontWeight: 600, color: m.done ? 'var(--xoot-text-muted)' : 'var(--xoot-text-primary)' }}>{m.title}</span>
                  <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)' }}>+{m.points}</span>
                </div>
              ))}
              <Progress value={STANDARD.filter(m => m.done).length} max={STANDARD.length} tone="success" size="sm" />
            </Card>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--xoot-space-3)' }}>
            <SectionLabel slot="plain" label="Specialisms" count={TRAINING.length} />
            {TRAINING.map(t => {
              const isDone = done.includes(t.id);
              return (
                <Card key={t.id} tone="flat" pad="md" interactive={!isDone}
                  onClick={isDone ? undefined : () => { XH.haptic('success'); setDone(d => [...d, t.id]); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: isDone ? 'default' : 'pointer' }}>
                  <span style={{
                    display: 'grid', placeItems: 'center', width: 42, height: 42, flex: '0 0 auto',
                    borderRadius: 'var(--xoot-radius-key)', background: `var(--xoot-${t.tint}-wash)`,
                  }}>
                    <Icon name={isDone ? 'badge-check' : 'graduation-cap'} size={20}
                      color="var(--xoot-icon-outline)" strokeWidth={1.9} />
                  </span>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 'var(--xoot-body-sm)', fontWeight: 700 }}>{t.title}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Badge tone={isDone ? 'success' : 'neutral'} size="sm">{t.badge}</Badge>
                      <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)' }}>+{t.points}</span>
                    </span>
                  </span>
                  {isDone
                    ? <Icon name="circle-check" size={20} color="var(--xoot-sage-500)" strokeWidth={2} />
                    : <span style={{ fontSize: 'var(--xoot-caption)', fontWeight: 700, color: 'var(--xoot-text-brand)' }}>Start</span>}
                </Card>
              );
            })}
          </div>

          <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)', lineHeight: 1.5 }}>
            Every module is optional. Take them when you have time — nothing expires, and skipping one
            never affects the jobs you're offered.
          </span>
        </div>
      </Scroll>
    </>
  );
}

Object.assign(window, { XooterHomeScreen, XooterEarningsScreen, XooterGrowthScreen, XOOTER_TRAINING: TRAINING });
