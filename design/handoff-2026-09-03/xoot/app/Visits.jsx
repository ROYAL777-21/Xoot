/* Visit detail + the live "on the way" state + rate-your-visit. */
const {
  ServiceIcon, XooterCard, Avatar, Rating, Badge, Button, Card, Bloom, IconButton,
  Icon, Progress, Tabs, TaskRow, SectionLabel, Switch, Toast, RebookBar,
} = window.XootNS;
const XH = window.XootNS.Haptics;

function VisitScreen({ onBack, onRate }) {
  const D = window.XootData;
  const pro = D.pros[0];
  return (
    <>
      <TopBar onBack={onBack} title="Wednesday's visit" trailing={<IconButton icon="ellipsis" label="More" />} />
      <Scroll bottom={130}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Card tone="dawn" pad="md" radius="lg" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <ServiceIcon service="regular" size={56} shape="circle" />
            <span style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
              <span className="xoot-label" style={{ color: 'var(--xoot-blush-ink)' }}>On the way</span>
              <span style={{ fontFamily: 'var(--xoot-font-display)', fontSize: 'var(--xoot-title-1)' }}>Nomsa arrives 08:00</span>
              <span style={{ fontSize: 'var(--xoot-body-sm)', color: 'var(--xoot-text-secondary)' }}>About 12 minutes away — you don't need to be home.</span>
            </span>
          </Card>

          <Card pad="md" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <XooterCard {...pro} />
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="outline" block icon="message-circle">Message</Button>
              <Button variant="outline" block icon="phone">Call</Button>
            </div>
          </Card>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            <SectionLabel slot="plain" label="What she'll do" count={3} />
            <Card tone="flat" pad="md" style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              {[['Kitchen & dishes', true], ['Bathrooms', false], ['Bed linen changed', false]].map(([t, d]) => (
                <span key={t} style={{ display: 'flex', alignItems: 'center', gap: 11, fontSize: 'var(--xoot-body)' }}>
                  <span style={{ display: 'grid', placeItems: 'center', width: 22, height: 22, borderRadius: '50%',
                    background: d ? 'var(--xoot-sage-500)' : 'transparent',
                    boxShadow: d ? 'none' : 'inset 0 0 0 1.5px var(--xoot-neutral-300)' }}>
                    {d && <Icon name="check" size={12} color="#fff" strokeWidth={3.4} />}
                  </span>
                  <span style={{ color: d ? 'var(--xoot-text-muted)' : 'var(--xoot-text-primary)', textDecoration: d ? 'line-through' : 'none' }}>{t}</span>
                </span>
              ))}
            </Card>
          </div>

          <Card tone="flat" pad="md" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>Payment</span>
            {[['Visit · 4 hrs', 332], ['Laundry & ironing', 85], ['XootCredit', -120]].map(([l, v]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--xoot-body-sm)', color: 'var(--xoot-text-secondary)' }}>
                <span>{l}</span><span style={{ fontFamily: 'var(--xoot-font-mono)' }}>{v < 0 ? '−' : ''}{D.rand(Math.abs(v))}</span>
              </div>
            ))}
            <span style={{ height: 1, background: 'var(--xoot-neutral-200)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontWeight: 700 }}>Due after the visit</span>
              <span style={{ fontFamily: 'var(--xoot-font-display)', fontSize: 'var(--xoot-title-1)' }}>{D.rand(297)}</span>
            </div>
          </Card>

          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="ghost" block>Reschedule</Button>
            <Button variant="ghost" block style={{ color: 'var(--xoot-danger-text)' }}>Cancel visit</Button>
          </div>
        </div>
      </Scroll>
      <DockedCTA note="Free to cancel up to 24 hours before.">
        <Button variant="primary" size="lg" block onClick={onRate} iconRight="star">Visit finished — rate it</Button>
      </DockedCTA>
    </>
  );
}

function RateScreen({ onDone }) {
  const D = window.XootData;
  const [stars, setStars] = React.useState(0);
  /* Nothing preselected — a default tip is a nudge dressed up as a convenience. */
  const [tip, setTip] = React.useState(0);
  const [again, setAgain] = React.useState(true);
  return (
    <>
      <TopBar onBack={onDone} title="How did it go?" />
      <Scroll bottom={130}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, paddingTop: 8 }}>
          {stars >= 4 ? <Bloom size={82} palette="red" motion="bloom" /> : <ServiceIcon service="regular" size={82} shape="circle" />}
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: 'var(--xoot-display-3)', lineHeight: 1.1 }}>
              {stars === 0 ? 'Nomsa was here for 4 hours' : stars >= 4 ? 'That\u2019s lovely to hear' : 'Thanks for being honest'}
            </h2>
            <p style={{ fontSize: 'var(--xoot-body)', color: 'var(--xoot-text-secondary)', marginTop: 8, maxWidth: 280 }}>
              {stars === 0 ? 'Your rating stays private until she rates you too.' : stars >= 4 ? "We'll keep pairing you with her." : "We'll look into it and follow up with you."}
            </p>
          </div>
          <Rating editable value={stars} onChange={setStars} size={40} showNumber={false} />

          {stars > 0 && (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 14, animation: 'xoot-rise var(--xoot-dur-base) var(--xoot-ease-out)' }}>
              <Card tone="flat" pad="md" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>Add a tip? Entirely up to you</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[0, 20, 50, 100].map(v => (
                    <button key={v} onClick={() => setTip(v)} style={{ flex: 1, height: 52, border: 'none',
                      borderRadius: 'var(--xoot-radius-key)', cursor: 'pointer',
                      background: tip === v ? 'var(--xoot-action-primary)' : 'var(--xoot-surface-card)',
                      color: tip === v ? '#fff' : 'var(--xoot-text-primary)',
                      boxShadow: tip === v ? 'var(--xoot-shadow-brand-press)' : 'var(--xoot-shadow-1), var(--xoot-inset-key)',
                      fontFamily: 'var(--xoot-font-mono)', fontSize: 14, fontWeight: 500 }}>
                      {v === 0 ? 'None' : D.rand(v)}
                    </button>
                  ))}
                </div>
                <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)' }}>
                  Tips go straight to Nomsa — Xoot takes nothing.
                </span>
              </Card>
              <Card tone="flat" pad="md"><Switch checked={again} onChange={() => setAgain(!again)}
                label="Book Nomsa again next week" description="Same day, same time" /></Card>
            </div>
          )}
        </div>
      </Scroll>
      <DockedCTA>
        <Button variant="ink" size="lg" block onClick={onDone} disabled={stars === 0}>
          {stars === 0 ? 'Pick a rating' : `Pay ${D.rand(297 + tip)}`}
        </Button>
      </DockedCTA>
    </>
  );
}

/* Past visits keep the Xooter attached — that's what makes "book her again" possible. */
const PAST = [
  { service: 'airbnb',  title: 'Airbnb turnaround',  when: 'Wed 22 Jul', paid: 'R325', rating: 4.9, xooter: 'Nomsa Mahlangu', suburb: 'Sandton',  together: 12 },
  { service: 'laundry', title: 'Laundry & ironing',  when: 'Mon 20 Jul', paid: 'R280', rating: 5,   xooter: 'Grace Ndlovu',   suburb: 'Rosebank', together: 3 },
  { service: 'regular', title: 'Regular cleaning',   when: 'Wed 15 Jul', paid: 'R280', rating: 4.9, xooter: 'Nomsa Mahlangu', suburb: 'Sandton',  together: 12 },
];

function VisitsListScreen({ onOpen, onRebook, onChat }) {
  const D = window.XootData;
  const [tab, setTab] = React.useState('upcoming');
  return (
    <>
      <div style={{ padding: '2px 20px 12px' }}>
        <h1 style={{ fontSize: 'var(--xoot-display-2)', lineHeight: 1.04 }}>Visits</h1>
      </div>
      <div style={{ padding: '0 20px 14px' }}>
        <Tabs items={[{ value: 'upcoming', label: 'Upcoming' }, { value: 'past', label: 'Past' }]} value={tab} onChange={setTab} />
      </div>
      <Scroll bottom={100}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {tab === 'upcoming' ? (
            <>
              <SectionLabel slot="plain" label="This week" count={2} />
              <TaskRow service="regular" title="Regular clean" meta="Wed 08:00 · 4 hrs · Nomsa M." onClick={onOpen}
                right={<Badge tone="success" size="sm">Confirmed</Badge>} />
              <TaskRow service="office" title="Office reset" meta="Fri 09:00 · 3 hrs · Sipho D."
                right={<Badge tone="warning" size="sm">Finding a Xooter</Badge>} />
              <SectionLabel slot="plain" label="Next week" count={1} />
              <TaskRow service="regular" title="Regular clean" meta="Wed 08:00 · 4 hrs · Nomsa M." right={<Badge tone="neutral" size="sm">Repeats</Badge>} />
            </>
          ) : (
            <>
              {PAST.map((p, i) => (
                <Card key={i} pad="md" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <ServiceIcon service={p.service} size={40} shape="circle" motion="still" />
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 'var(--xoot-body)', fontWeight: 700 }}>{p.title}</span>
                      <span style={{ fontSize: 'var(--xoot-body-sm)', color: 'var(--xoot-text-muted)' }}>{p.when} · {p.paid}</span>
                    </span>
                    <Rating value={p.rating} size={12} showNumber={false} />
                  </div>

                  {/* The Xooter who did it, so rebooking them takes one tap rather than a search. */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 11, padding: 'var(--xoot-space-3)',
                    borderRadius: 'var(--xoot-radius-sm)', background: 'var(--xoot-surface-sunken)',
                  }}>
                    <Avatar name={p.xooter} size="sm" badge="verified" />
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 'var(--xoot-body-sm)', fontWeight: 700 }}>{p.xooter}</span>
                      <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)' }}>
                        {p.suburb} · {p.together} visits together
                      </span>
                    </span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <IconButton icon="message-circle" label={`Message ${p.xooter}`} variant="surface" size="sm" onClick={onChat} />
                      <button type="button" onClick={onRebook}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5, height: 34, padding: '0 13px',
                          border: 'none', borderRadius: 'var(--xoot-radius-pill)',
                          background: 'var(--xoot-action-primary)', color: 'var(--xoot-text-inverse)',
                          fontFamily: 'var(--xoot-font-core)', fontSize: 'var(--xoot-caption)',
                          fontWeight: 700, cursor: 'pointer',
                        }}>
                        <Icon name="repeat" size={13} strokeWidth={2.4} />Rebook
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </>
          )}
        </div>
      </Scroll>
    </>
  );
}

Object.assign(window, { VisitScreen, RateScreen, VisitsListScreen });
