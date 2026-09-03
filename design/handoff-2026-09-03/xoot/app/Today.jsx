/* The Tiimo-style calendar home: serif weekday, week strip, nudge widgets, time-of-day sections. */
const {
  DayStrip, SectionLabel, TaskRow, EmptyRow, WidgetCard, Badge, IconButton, Avatar, Icon, Button,
  RebookBar, BookBar, WinCard, WinSheet, QuietUpdate, SurpriseCard,
} = window.XootNS;

/* ── When the win appears ──────────────────────────────────────────────────
   Lives here rather than on the namespace because the DS compiler only exposes exports whose
   names start with a capital letter — a `useWinMoment` export is silently dropped, so
   destructuring it above gave `undefined` and calling it threw. Renaming it to satisfy the
   compiler would mean a hook that doesn't look like a hook, which is worse.

   The cadence is a product decision anyway, and it belongs next to the screen that shows the
   win. Two floors hold whatever the number: never on first launch (a gift before the user
   knows the product is a sales pitch) and never twice in a session (two gifts devalue both).
   `everyNthOpen` is the dial — 3 while acquiring, 8–10 as retention improves. */
function useWinMoment({ everyNthOpen = 3, enabled = true, storageKey = 'xoot.win' } = {}) {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (!enabled) return;
    let state = { opens: 0, lastShown: 0 };
    try {
      const raw = window.sessionStorage.getItem(storageKey);
      if (raw) state = JSON.parse(raw);
    } catch (e) {}

    state.opens += 1;
    const firstEver = state.opens === 1;
    const alreadyShown = state.lastShown > 0;
    const due = state.opens % everyNthOpen === 0;

    if (!firstEver && !alreadyShown && due) {
      state.lastShown = state.opens;
      /* A beat after mount, so it rises into a settled screen rather than racing it. */
      const t = window.setTimeout(() => {
        if (window.XootNS && window.XootNS.Haptics) window.XootNS.Haptics.haptic('success');
        setOpen(true);
      }, 900);
      try { window.sessionStorage.setItem(storageKey, JSON.stringify(state)); } catch (e) {}
      return () => window.clearTimeout(t);
    }
    try { window.sessionStorage.setItem(storageKey, JSON.stringify(state)); } catch (e) {}
  }, [enabled, everyNthOpen, storageKey]);

  return [open, setOpen];
}

function TodayScreen({ onOpenVisit, onBook, onProfile, onNotifications, onSearch }) {
  const D = window.XootData;
  const [gift, setGift] = React.useState(true);
  /* Rises periodically rather than sitting in the feed. Must come AFTER `D` is declared —
     Babel hoists the const as `var`, so reading D.user above this line throws. */
  const [winOpen, setWinOpen] = useWinMoment({ everyNthOpen: 3, enabled: !D.user.isNew });
  /* Today, from the clock — not a hardcoded date. Locale-independent via the date parts rather
     than toISOString(), which shifts to UTC and can land on yesterday for SAST users. */
  const [day, setDay] = React.useState(() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
  });
  const [done, setDone] = React.useState({});
  const [open, setOpen] = React.useState({ anytime: true, morning: true, afternoon: true, evening: true });
  const [widgets, setWidgets] = React.useState(['address', 'weekly', 'credit']);
  const [expanded, setExpanded] = React.useState(null);

  const items = D.schedule[day] || [];
  const bySlot = s => items.filter(i => i.slot === s);
  const weekday = new Date(day + 'T00:00:00').toLocaleDateString('en-ZA', { weekday: 'long' });
  const toggleSection = s => setOpen(o => ({ ...o, [s]: !o[s] }));

  const WIDGETS = {
    address: { tint: 'mist', icon: 'map-pin', title: 'Add your home address' },
    weekly:  { tint: 'lilac', icon: 'repeat', title: 'Set up a weekly visit' },
    credit:  { tint: 'moss', icon: 'wallet', title: 'R120 XootCredit to use' },
  };

  const SECTIONS = [
    ['anytime', 'Anytime', "Anytime today works — add something when you're ready"],
    ['morning', 'Morning', 'Nothing booked this morning, and that\u2019s fine'],
    ['afternoon', 'Afternoon', 'Your afternoon is free'],
    ['evening', 'Evening', 'Evenings are yours'],
  ];

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '2px 20px 0', flex: '0 0 auto' }}>
        <div>
          <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>Good morning, {D.user.firstName}</span>
          <h1 style={{ fontSize: 'var(--xoot-display-2)', lineHeight: 1.04, marginTop: 6 }}>{weekday}</h1>
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <IconButton icon="search" label="Search" onClick={onSearch} />
          {/* An unread dot is the only reason a bell earns attention. */}
          <span style={{ position: 'relative' }}>
            <IconButton icon="bell" label="Notifications" onClick={onNotifications} />
            <span style={{
              position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: '50%',
              background: 'var(--xoot-action-brand)', boxShadow: '0 0 0 2px var(--xoot-surface-page)',
              pointerEvents: 'none',
            }} />
          </span>
          <button type="button" aria-label="Your profile" onClick={onProfile}
            style={{ border: 'none', background: 'none', padding: 0, marginLeft: 4, cursor: 'pointer', borderRadius: '50%' }}>
            <Avatar name={D.user.name} size="sm" />
          </button>
        </div>
      </div>

      <div style={{ padding: '10px 14px 6px', flex: '0 0 auto' }}>
        <DayStrip value={day} onChange={setDay} days={D.week.map(d => ({ date: d, dot: !!D.schedule[d] }))} />
      </div>

      <Scroll pad={0} bottom={100}>
        {D.user.isNew && (
          <div style={{ padding: '4px 20px 14px' }}>
            <WinCard amount={30} title="R30 is already yours"
              detail="Your first add-on is on us — put it towards whatever helps most."
              cta="Use it on my first booking" onCta={onBook} />
          </div>
        )}

        {/* One or the other, never both — each asserts a different thing about the user's
            history, so showing both would mean one of them is wrong. */}
        <div style={{ padding: '4px 20px 14px' }}>
          {D.user.isNew ? (
            <BookBar credit={D.user.credit} onBook={onBook} />
          ) : (
            <RebookBar xooter="Nomsa" service="regular" serviceLabel="Regular cleaning"
              when="Wednesday 08:00" onRebook={onBook} onChange={onBook} />
          )}
        </div>

        {/* Earned, not advertised: only for someone with visits behind them, and dismissible.
            A brand-new user gets WinCard instead — an unearned gift reads as marketing. */}
        {!D.user.isNew && gift && (
          <div style={{ padding: '0 20px 14px' }}>
            {/* A free add-on, not cash off. Costs R30 rather than R50 (46% of gross on a
                first small booking), reads as more generous because it's a whole extra
                thing, and nudges toward add-ons — the behaviour we want. Cash-off is
                reserved for winning back someone who has stopped booking. */}
            <SurpriseCard
              tint="sage" icon="sparkles"
              value="A free add-on" title="Something for sticking with us"
              detail="Pick any extra on your next visit — inside the fridge, windows, laundry"
              expires="Yours until Sunday"
              onClaim={onBook} onDismiss={() => setGift(false)}
            />
          </div>
        )}

        {widgets.length > 0 && (
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '8px 20px 14px', scrollbarWidth: 'none' }}>
            {widgets.map(k => (
              <WidgetCard key={k} {...WIDGETS[k]} onClick={onBook} onDismiss={() => setWidgets(w => w.filter(x => x !== k))} />
            ))}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 20px' }}>
          {SECTIONS.map(([slot, label, emptyCopy]) => {
            const rows = bySlot(slot);
            return (
              <div key={slot} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <SectionLabel slot={slot} label={label} count={rows.length} open={open[slot]}
                  onToggle={() => toggleSection(slot)} onAdd={onBook} />
                {open[slot] && (rows.length === 0
                  ? <EmptyRow label={emptyCopy} onAdd={onBook} />
                  : rows.map((r, i) => (
                    <TaskRow key={r.title} service={r.service} title={r.title} meta={r.meta}
                      done={!!done[r.title]} onToggle={() => setDone(d => ({ ...d, [r.title]: !d[r.title] }))}
                      progress={r.progress} expanded={expanded === r.title}
                      onExpand={r.progress ? () => setExpanded(e => e === r.title ? null : r.title) : undefined}
                      right={r.price ? <Badge tone="neutral" size="sm">{D.rand(r.price)}</Badge> : undefined}
                      onClick={onOpenVisit} style={{ animation: `xoot-rise var(--xoot-dur-base) var(--xoot-ease-out) ${i * 70}ms both` }} />
                  )))}
                {open[slot] && expanded && rows.some(r => r.title === expanded) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '2px 0 4px 14px' }}>
                    {['Kitchen & dishes', 'Bathrooms', 'Bed linen changed'].map((t, i) => (
                      <span key={t} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 'var(--xoot-body-sm)', color: i === 0 ? 'var(--xoot-text-muted)' : 'var(--xoot-text-secondary)' }}>
                        <span style={{ display: 'grid', placeItems: 'center', width: 19, height: 19, borderRadius: '50%',
                          background: i === 0 ? 'var(--xoot-sage-500)' : 'transparent',
                          boxShadow: i === 0 ? 'none' : 'inset 0 0 0 1.5px var(--xoot-neutral-300)' }}>
                          {i === 0 && <Icon name="check" size={11} color="#fff" strokeWidth={3.4} />}
                        </span>
                        <span style={{ textDecoration: i === 0 ? 'line-through' : 'none' }}>{t}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6, padding: 'var(--xoot-space-4)',
            borderRadius: 'var(--xoot-radius-lg)', background: 'var(--xoot-blush-wash)' }}>
            <Icon name="flame" size={26} color="var(--xoot-blush-ink)" strokeWidth={1.7} />
            <span style={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1 }}>
              <span style={{ fontSize: 'var(--xoot-body)', fontWeight: 700, color: 'var(--xoot-blush-ink)' }}>{D.user.streak} weeks looked after</span>
              <span style={{ fontSize: 'var(--xoot-body-sm)', color: 'var(--xoot-blush-ink)', opacity: .8 }}>Two more and you unlock a free deep clean.</span>
            </span>
          </div>
        </div>
      </Scroll>

      {/* The win rises over the screen rather than sitting in the feed — a gift you scroll
          past isn't a gift. useWinMoment owns the cadence. */}
      <WinSheet
        open={winOpen} onClose={() => setWinOpen(false)}
        onCta={() => { setWinOpen(false); onBook && onBook(); }}
        amount={30} icon="gift"
        title="R30 is already yours"
        detail="Put it towards an add-on on your next visit — inside the fridge, windows, laundry. No card, no catch."
        cta="Use it on my next visit"
      />
    </>
  );
}

Object.assign(window, { TodayScreen });
