/* ── Xoot app bundle — GENERATED, do not edit ──────────────────────────────────
 *
 * Concatenation of xoot/app/*.jsx (the screens), each wrapped in an IIFE. Source order:
 *   Frame, Today, Overlays, Onboarding, Booking, Profile, Visits, Tracking, Rewards, Gift, Search, CarePlus, Xooter, XooterJob, XooterDashboard, XooterOnboarding
 *
 * WHY: the DC runtime resolves a module list serially, so sixteen screens cost sixteen round
 * trips at ~310ms each before the app can finish painting — and the cost is the request, not the
 * bytes. Frame and Today are the only two visible on launch; the other fourteen were queueing
 * ahead of or behind them for no reason a user could see.
 *
 * WHY IIFEs: several screens declare their own top-level `D`, `STEPS` or `TABS`. Raw
 * concatenation is a SyntaxError on the first duplicate. Every screen publishes through
 * Object.assign(window, …), so wrapping changes nothing observable.
 *
 * NOT INCLUDED: ns.js and data.js are in engine-bundle.js (shared with the website); session.js,
 * referral.js and nudges.js load in the helmet.
 *
 * TO REGENERATE: edit the files in xoot/app/, then rebuild this bundle from them.
 */


/* ═══ app/Frame.jsx ═════════════════════════════════════════════════════════ */
(function(){
/* Phone shell + the shared chrome every screen sits inside. */
const { IconButton, Wordmark, TabBar, Avatar } = window.XootNS;

function Phone({ children, dark = false, lockTheme, tab, onTab, onBook, showTabBar = true }) {
  return (
    /* No `transform` on this element, deliberately.

       An earlier attempt added translateZ(0) here to "keep glyph rasterisation on whole
       pixels". It does the opposite: it promotes the entire frame subtree to a GPU layer, and
       because the frame is centred by flex it routinely lands on a fractional x — so every
       glyph inside got resampled. That is the blur in Visits and the tab bar.

       Crisp text needs the frame to stay in normal document flow. The only layer promotion in
       here is the tab bar's own backdrop-filter, which is scoped to the bar itself.

       `contain: paint` gives the clipping and stacking context the layout needs without
       creating a compositing layer. */
    <div data-phone data-theme-lock={lockTheme} style={{
      position: 'relative', width: 390, height: 844, flex: '0 0 auto',
      contain: 'paint',
      borderRadius: 46, overflow: 'hidden',
      background: dark ? 'var(--xoot-grad-onboard)' : 'var(--xoot-surface-page)',
      /* Re-resolves --xoot-text-primary INSIDE the themed scope. Without this, body's
         computed colour (resolved against :root) inherits past the boundary. */
      color: 'var(--xoot-text-primary)',
      boxShadow: 'var(--xoot-shadow-5), inset 0 0 0 1px rgba(20,18,16,.08)',
      display: 'flex', flexDirection: 'column',
    }}>
      <StatusBar dark={dark} />
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', position: 'relative' }}>{children}</div>
      {showTabBar && (
        <div style={{ position: 'absolute', left: 16, right: 16, bottom: 14, zIndex: 30 }}>
          <TabBar value={tab} onChange={onTab} onBook={onBook} items={[
            { value: 'today',   label: 'Home',    icon: 'house' },
            { value: 'visits',  label: 'Visits',  icon: 'list-checks', dot: true },
            { value: 'rewards', label: 'Rewards', icon: 'trophy' },
            { value: 'you',     label: 'You',     icon: 'circle-user' },
          ]} />
        </div>
      )}
    </div>
  );
}

function StatusBar({ dark }) {
  /* Semantic alias, not --xoot-ink-900: palette tokens don't flip with the theme, so the
     clock stayed #151515 on the dark page. */
  const fg = dark ? 'rgba(255,255,255,.92)' : 'var(--xoot-text-primary)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 30px 6px', flex: '0 0 auto' }}>
      <span style={{ fontSize: 14, fontWeight: 700, color: fg, letterSpacing: '-.01em' }}>9:41</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        {[7, 10, 13, 16].map(h => <span key={h} style={{ width: 3, height: h, borderRadius: 1.5, background: fg, opacity: h === 16 ? .35 : 1 }} />)}
        <span style={{ width: 22, height: 11, marginLeft: 3, borderRadius: 3, border: `1.5px solid ${fg}`, position: 'relative', opacity: .9 }}>
          <span style={{ position: 'absolute', inset: 1.5, right: '32%', borderRadius: 1.5, background: fg }} />
        </span>
      </span>
    </div>
  );
}

/* Standard in-app header: back / title / trailing. */
function TopBar({ title, onBack, trailing, subtitle }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 16px 10px', flex: '0 0 auto' }}>
      {onBack && <IconButton icon="arrow-left" label="Back" onClick={onBack} />}
      <span style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
        {title && <span style={{ fontFamily: 'var(--xoot-font-display)', fontSize: 'var(--xoot-title-2)', letterSpacing: 'var(--xoot-track-display)' }}>{title}</span>}
        {subtitle && <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)' }}>{subtitle}</span>}
      </span>
      {trailing}
    </div>
  );
}

/* Scroll region with the tab-bar clearance baked in. */
function Scroll({ children, pad = 20, bottom = 104, style = {} }) {
  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', padding: `0 ${pad}px ${bottom}px`, ...style }}>
      {children}
    </div>
  );
}

/* Bottom-docked CTA with a protection fade above it. */
function DockedCTA({ children, note }) {
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 20, padding: '30px 20px 20px', pointerEvents: 'none',
      background: 'linear-gradient(180deg, rgba(250,249,248,0) 0%, var(--xoot-surface-page) 44%)' }}>
      <div style={{ pointerEvents: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {note && <span style={{ textAlign: 'center', fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)' }}>{note}</span>}
        {children}
      </div>
    </div>
  );
}

Object.assign(window, { Phone, StatusBar, TopBar, Scroll, DockedCTA });
})();

/* ═══ app/Today.jsx ═════════════════════════════════════════════════════════ */
(function(){
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
})();

/* ═══ app/Overlays.jsx ═════════════════════════════════════════════════════════ */
(function(){
/* Overlays the tracking and chat screens rely on: an iOS action menu, a share sheet, a call
   screen, and a camera view — each asking for its permission only when it's actually used. */
const { Icon, Avatar, Button, CameraCard } = window.XootNS;
const XH = window.XootNS.Haptics;

/* iOS-style action sheet. Destructive actions sit last and separate, as on iOS. */
function ActionMenu({ items = [], onClose }) {
  const safe = items.filter(i => !i.danger);
  const danger = items.filter(i => i.danger);
  const group = (list, key) => (
    <div key={key} style={{ borderRadius: 14, overflow: 'hidden', background: 'rgba(250,250,250,.94)', backdropFilter: 'blur(20px)' }}>
      {list.map((i, n) => (
        <button key={i.label} type="button" onClick={() => { XH.haptic('light'); i.onClick && i.onClick(); onClose(); }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
            width: '100%', minHeight: 56, padding: '0 18px', border: 'none', cursor: 'pointer',
            background: 'transparent',
            boxShadow: n > 0 ? 'inset 0 1px 0 var(--xoot-ios-hairline)' : 'none',
            fontFamily: 'var(--xoot-font-core)', fontSize: 17, fontWeight: 500,
            color: i.danger ? 'var(--xoot-ios-danger)' : 'var(--xoot-text-primary)',
          }}>
          {i.label}
          <Icon name={i.icon} size={19} strokeWidth={1.9} />
        </button>
      ))}
    </div>
  );

  return (
    <div onClick={onClose} style={{
      position: 'absolute', inset: 0, zIndex: 70, display: 'flex', flexDirection: 'column',
      justifyContent: 'flex-end', gap: 8, padding: 10,
      background: 'rgba(0,0,0,.35)',
    }}>
      <div onClick={e => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', gap: 8, animation: 'xoot-rise var(--xoot-dur-base) var(--xoot-ease-settle)' }}>
        {safe.length > 0 && group(safe, 'safe')}
        {danger.length > 0 && group(danger, 'danger')}
        <button type="button" onClick={onClose}
          style={{
            minHeight: 56, border: 'none', borderRadius: 14, cursor: 'pointer',
            background: 'var(--xoot-ios-sheet)', backdropFilter: 'blur(20px)',
            fontFamily: 'var(--xoot-font-core)', fontSize: 17, fontWeight: 700, color: 'var(--xoot-text-primary)',
          }}>Cancel</button>
      </div>
    </div>
  );
}

/* Share ETA. The point is that the person waiting doesn't have to be a Xoot user. */
const CHANNELS = [
  { id: 'whatsapp', label: 'WhatsApp', icon: 'message-circle', tint: 'sage' },
  { id: 'messages', label: 'Messages', icon: 'message-circle', tint: 'mist' },
  { id: 'telegram', label: 'Telegram', icon: 'phone', tint: 'mist' },
  { id: 'instagram', label: 'Instagram', icon: 'camera', tint: 'petal' },
  { id: 'notes', label: 'Notes', icon: 'pencil', tint: 'honey' },
  { id: 'copy', label: 'Copy link', icon: 'book-open', tint: 'lilac' },
];

function ShareSheet({ onClose, onShared, eta, name = 'your Xooter' }) {
  const text = `${name} is on the way — ${eta || 'arriving soon'}. Track it live:`;
  return (
    <div onClick={onClose} style={{
      position: 'absolute', inset: 0, zIndex: 70, display: 'flex', flexDirection: 'column',
      justifyContent: 'flex-end', background: 'rgba(0,0,0,.35)',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--xoot-surface-card)', borderRadius: '20px 20px 0 0',
        padding: '14px 20px 24px', display: 'flex', flexDirection: 'column', gap: 18,
        animation: 'xoot-rise var(--xoot-dur-slow) var(--xoot-ease-settle)',
      }}>
        <span style={{ display: 'block', width: 40, height: 4, margin: '0 auto', borderRadius: 4, background: 'var(--xoot-neutral-300)' }} />

        <div style={{
          display: 'flex', alignItems: 'center', gap: 11, padding: 'var(--xoot-space-4)',
          borderRadius: 'var(--xoot-radius-md)', background: 'var(--xoot-surface-sunken)',
        }}>
          <Avatar name={name} size="sm" />
          <span style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 'var(--xoot-body-sm)', fontWeight: 700 }}>{text}</span>
            <span style={{ fontFamily: 'var(--xoot-font-mono)', fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)' }}>xoot.co.za/t/9f2a</span>
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>Share with</span>
          <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 4 }}>
            {CHANNELS.map(c => (
              <button key={c.id} type="button"
                onClick={() => { XH.haptic('success'); onShared && onShared(); onClose(); }}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
                  border: 'none', background: 'none', cursor: 'pointer', flex: '0 0 auto', width: 64,
                }}>
                <span style={{
                  display: 'grid', placeItems: 'center', width: 56, height: 56,
                  borderRadius: 'var(--xoot-radius-md)', background: `var(--xoot-${c.tint}-wash)`,
                }}>
                  <Icon name={c.icon} size={24} color="var(--xoot-icon-outline)" strokeWidth={1.9} />
                </span>
                <span style={{ fontSize: 'var(--xoot-micro)', fontWeight: 700, color: 'var(--xoot-text-secondary)', textAlign: 'center' }}>{c.label}</span>
              </button>
            ))}
          </div>
        </div>

        <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)', lineHeight: 1.45 }}>
          The link shows the ETA and nothing else — not your address, and not your access codes.
        </span>
      </div>
    </div>
  );
}

/* Calling. Microphone permission is requested here, at the moment of the call. */
function CallScreen({ name = 'Nomsa Mahlangu', onEnd }) {
  const [phase, setPhase] = React.useState('permission');
  const [secs, setSecs] = React.useState(0);
  const [muted, setMuted] = React.useState(false);
  const [speaker, setSpeaker] = React.useState(false);

  React.useEffect(() => {
    if (phase !== 'ringing') return;
    const t = window.setTimeout(() => { XH.haptic('success'); setPhase('live'); }, 2200);
    return () => window.clearTimeout(t);
  }, [phase]);

  React.useEffect(() => {
    if (phase !== 'live') return;
    const t = window.setInterval(() => setSecs(s => s + 1), 1000);
    return () => window.clearInterval(t);
  }, [phase]);

  const mmss = `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;

  if (phase === 'permission') {
    return (
      <div style={{ position: 'absolute', inset: 0, zIndex: 80, background: 'var(--xoot-ink-900)' }}>
        <PermissionSheet icon="phone" title={'"Xoot" would like to\naccess the Microphone'}
          body="So you can talk to your Xooter in the app, without sharing your number."
          allow="OK" deny="Don't Allow"
          onAllow={() => { XH.haptic('medium'); setPhase('ringing'); }} onDeny={onEnd} />
      </div>
    );
  }

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 80,
      background: 'linear-gradient(180deg,#3B3430 0%,#1A1614 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '70px 24px 34px',
    }}>
      <Avatar name={name} size="xl" style={{ marginBottom: 18 }} />
      <span style={{ fontFamily: 'var(--xoot-font-display)', fontSize: 30, lineHeight: 1.1, color: '#fff' }}>{name.split(' ')[0]}</span>
      <span style={{ marginTop: 6, fontFamily: 'var(--xoot-font-mono)', fontSize: 15, color: 'rgba(255,255,255,.6)' }}>
        {phase === 'ringing' ? 'Calling…' : mmss}
      </span>
      <span style={{
        marginTop: 14, display: 'inline-flex', alignItems: 'center', gap: 6, height: 26, padding: '0 11px',
        borderRadius: 'var(--xoot-radius-pill)', background: 'rgba(255,255,255,.1)',
        fontSize: 'var(--xoot-caption)', fontWeight: 600, color: 'rgba(255,255,255,.7)',
      }}>
        <Icon name="shield-check" size={12} strokeWidth={2.2} />Numbers stay private
      </span>

      <span style={{ flex: 1 }} />

      <div style={{ display: 'flex', gap: 18, marginBottom: 26 }}>
        {[['mute', muted ? 'x' : 'phone', muted, () => setMuted(m => !m), 'Mute'],
          ['speaker', 'zap', speaker, () => setSpeaker(s => !s), 'Speaker'],
          ['keypad', 'plus', false, () => {}, 'Keypad']].map(([k, ic, on, fn, label]) => (
          <button key={k} type="button" aria-label={label} onClick={() => { XH.haptic('light'); fn(); }}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
              border: 'none', background: 'none', cursor: 'pointer',
            }}>
            <span style={{
              display: 'grid', placeItems: 'center', width: 62, height: 62, borderRadius: '50%',
              background: on ? '#fff' : 'rgba(255,255,255,.14)',
              color: on ? 'var(--xoot-ink-900)' : '#fff',
            }}>
              <Icon name={ic} size={23} strokeWidth={2} />
            </span>
            <span style={{ fontSize: 'var(--xoot-micro)', color: 'rgba(255,255,255,.6)', fontWeight: 600 }}>{label}</span>
          </button>
        ))}
      </div>

      <button type="button" aria-label="End call" onClick={() => { XH.haptic('heavy'); onEnd(); }}
        style={{
          display: 'grid', placeItems: 'center', width: 70, height: 70, border: 'none',
          borderRadius: '50%', background: 'var(--xoot-coral-500)', color: '#fff', cursor: 'pointer',
          boxShadow: '0 8px 24px -8px rgba(230,75,54,.6)',
        }}>
        <Icon name="phone" size={26} strokeWidth={2.2} style={{ transform: 'rotate(135deg)' }} />
      </button>
    </div>
  );
}

/* Camera. Back lens only — this is for photographing a room, never a selfie.
   The permission gate stays here; the viewfinder itself is CameraCard, so the app's surface
   stays visible around the frame instead of a full-screen blackout. */
function CameraScreen({ onClose, onCapture }) {
  const [granted, setGranted] = React.useState(false);

  if (!granted) {
    return (
      <div style={{ position: 'absolute', inset: 0, zIndex: 80, background: 'var(--xoot-ink-900)' }}>
        <PermissionSheet icon="camera" title={'"Xoot" would like to\naccess the Camera'}
          body="To show your Xooter what needs doing. Photos go only to them, and only on this booking."
          allow="OK" deny="Don't Allow"
          onAllow={() => { XH.haptic('medium'); setGranted(true); }} onDeny={onClose} />
      </div>
    );
  }

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 80, background: 'var(--xoot-surface-page)' }}>
      <CameraCard
        title="Show your Xooter the spot"
        hint="Point at the area you'd like extra attention on"
        onCapture={() => { onCapture && onCapture(); }}
        onClose={onClose}
      />
    </div>
  );
}

Object.assign(window, { ActionMenu, ShareSheet, CallScreen, CameraScreen });
})();

/* ═══ app/Onboarding.jsx ═════════════════════════════════════════════════════════ */
(function(){
/* Onboarding — the arrival sequence and the questions.

   Structure, in order:
     splash → auth (choose method) → method flow → questions → address → paywall → win

   Two rules the earlier version got wrong:
     · Permissions are asked WHERE THEY'RE NEEDED, not up front. Location appears at address
       entry; notifications appear once there's something to notify about.
     · A question can be answered or skipped, never bypassed by an inert Continue. */
const {
  StepHeader, ChoiceRow, ChipGrid, TestimonialStack, TrialTimeline, Button, Bloom, BloomField,
  Logo, LogoScript, LogoAssemble, ServiceIcon, XOOT_SERVICES, Icon, Paywall, WinCard, CarePlusMark,
  Input, Select,
} = window.XootNS;
const XH = window.XootNS.Haptics;
const tap = i => XH.haptic(i);

const QUESTION_STEPS = ['goals', 'places', 'extras', 'frequency', 'social', 'plan'];

/* Everything the flow learned, handed to the rest of the app. Called once, on completion —
   not per step, because a half-finished answer set is worse than none: it would pre-fill
   booking with things the user was still in the middle of deciding. */
function persistOnboarding({ goals, rooms, extras, freq, address, member }) {
  const D = window.XootData;
  if (!D) return;
  D.onboarding = {
    completedAt: Date.now(),
    /* Service intents in the user's own words, mapped to catalogue keys where they line up. */
    goals, rooms, extras, freq: freq || null, address: address || null, member: !!member,
  };
  /* The pieces Booking can genuinely pre-fill. Nothing is guessed: if the user skipped a step,
     the field stays null and Booking falls back to its own default rather than inventing one. */
  if (address) D.user.address = address;
  if (extras && extras.length) D.user.usualExtras = extras;
  if (freq) D.user.usualFreq = freq;
  if (member) D.user.carePlus = true;
}

function OnboardingFlow({ onDone, onBook, onXooter }) {
  const [stage, setStage] = React.useState('splash');
  const [goals, setGoals] = React.useState([]);
  const [rooms, setRooms] = React.useState([]);
  const [extras, setExtras] = React.useState([]);
  const [freq, setFreq] = React.useState(null);
  const [ti, setTi] = React.useState(0);
  const [address, setAddress] = React.useState('');
  const [member, setMember] = React.useState(false);

  const qIndex = QUESTION_STEPS.indexOf(stage);
  const isQuestion = qIndex >= 0;
  const next = to => { tap('medium'); setStage(to); };

  if (stage === 'splash') return <SplashScreen onDone={() => setStage('auth')} />;
  if (stage === 'auth') return <AuthScreen onNext={m => (m === 'xooter' ? onXooter && onXooter() : next(m === 'signin' ? 'login' : m === 'phone' ? 'phone' : 'sso'))} method={null} />;
  if (stage === 'phone') return <PhoneFlow onDone={() => next('welcome')} onBack={() => setStage('auth')} />;
  if (stage === 'sso') return <SsoFlow onDone={() => next('welcome')} onBack={() => setStage('auth')} />;
  if (stage === 'login') return <LoginFlow onDone={onDone} onBack={() => setStage('auth')} />;
  if (stage === 'address') return <AddressStep value={address} onChange={setAddress} onNext={() => next('paywall')} onSkip={() => next('paywall')} />;
  if (stage === 'paywall') {
    return (
      <Phone lockTheme="light" showTabBar={false}>
        <Paywall onJoin={() => { setMember(true); next('payment'); }} onDismiss={() => next('win')} />
      </Phone>
    );
  }
  if (stage === 'payment') return <CarePlusPayment onDone={() => next('win')} onBack={() => setStage('paywall')} />;
  if (stage === 'win') {
    return (
      <Phone lockTheme="light" showTabBar={false}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 22, padding: '0 24px 32px' }}>
          <h1 style={{ fontSize: 'var(--xoot-display-2)', lineHeight: 1.06, textAlign: 'center' }}>
            {member ? "You're a Care+ member. Here's your credit." : "You're set up. Here's something to start with."}
          </h1>
          <WinCard amount={30} title="R30 is already yours"
            detail={member
              ? 'Your first month of add-on credit, ready to use on any booking.'
              : 'Your first add-on is on us — whichever one helps most.'} />
          <Button variant="primary" size="lg" block iconRight="arrow-right"
            onClick={() => {
              tap('success');
              persistOnboarding({ goals, rooms, extras, freq, address, member });
              onBook ? onBook() : onDone();
            }}>Find someone for me</Button>
          <button onClick={() => {
            tap('light');
            persistOnboarding({ goals, rooms, extras, freq, address, member });
            onDone();
          }}
            style={{ border: 'none', background: 'none', color: 'var(--xoot-text-muted)', fontSize: 'var(--xoot-body-sm)', fontWeight: 600, cursor: 'pointer' }}>
            I'll look around first
          </button>
        </div>
      </Phone>
    );
  }

  /* A question is answered, or explicitly skipped. Continue stays inert until then —
     a live button that does nothing teaches people to distrust the whole flow. */
  const ANSWERED = {
    welcome: true,
    goals: goals.length > 0,
    places: rooms.length > 0,
    extras: extras.length > 0,
    frequency: !!freq,
    social: true,
    plan: true,
  }[stage];

  const BODY = {
    welcome: <Welcome />,
    goals: (
      <Question title="What would help most right now?" sub="Pick as many as you like — we'll start there."
        body={<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[['clean', 'Keep my home clean', 'Once a week, or just once'],
            ['hands', 'Have an extra pair of hands', 'Someone alongside you'],
            ['turnover', 'Turn around a short-let', 'Guest out, guest in'],
            ['office', 'Sort out the office', 'After hours or weekends'],
            ['time', 'Get my weekends back', null]].map(([v, l, d]) =>
            <ChoiceRow theme="light" key={v} multi label={l} description={d} selected={goals.includes(v)}
              onClick={() => { tap('selection'); setGoals(g => g.includes(v) ? g.filter(x => x !== v) : [...g, v]); }} />)}
        </div>} />
    ),
    places: (
      <Question title="Which parts weigh on you?" sub="No wrong answers. You can change this later."
        body={<ChipGrid theme="light" value={rooms} onChange={v => { tap('selection'); setRooms(v); }} options={[
          { value: 'kitchen', label: 'Kitchen', icon: 'spray-can' },
          { value: 'bath', label: 'Bathrooms', icon: 'droplet' },
          { value: 'laundry', label: 'Laundry', icon: 'washing-machine' },
          { value: 'windows', label: 'Windows', icon: 'wind' },
          { value: 'beds', label: 'Bed linen', icon: 'bed-double' },
          { value: 'floors', label: 'Floors', icon: 'brush-cleaning' },
          { value: 'office', label: 'Desk & office', icon: 'building-2' },
          { value: 'pets', label: 'After the dog', icon: 'dog' },
        ]} />} />
    ),
    extras: (
      <Question title="Anything extra worth adding?" sub="Your first one is free — pick whichever helps most."
        body={<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[['fridge', 'Inside the fridge', 'Adds about 30 minutes'],
            ['oven', 'Inside the oven', 'Adds about 40 minutes'],
            ['ironing', 'An hour of ironing', 'Adds an hour'],
            ['cupboards', 'Inside cupboards', 'Adds about 30 minutes'],
            ['balcony', 'Balcony or patio', 'Adds about 20 minutes']].map(([v, l, d]) =>
            <ChoiceRow theme="light" key={v} multi label={l} description={d} selected={extras.includes(v)}
              onClick={() => { tap('selection'); setExtras(e => e.includes(v) ? e.filter(x => x !== v) : [...e, v]); }} />)}
        </div>} />
    ),
    frequency: (
      <Question title="How often feels right?" sub="Most people start once a week and adjust."
        body={<SegmentedList value={freq} onChange={v => { tap('selection'); setFreq(v); }} options={[
          { value: 'weekly', label: 'Once a week', detail: 'Save up to 15%' },
          { value: 'fortnightly', label: 'Twice a month', detail: null },
          { value: 'monthly', label: 'Once a month', detail: null },
          { value: 'once', label: 'Just this once', detail: 'See how it feels' },
        ]} />} />
    ),
    social: <Social index={ti} onIndex={setTi} />,
    plan: <Plan />,
  }[stage];

  const CTA = { welcome: 'Get started', goals: 'Continue', places: 'Continue', extras: 'Continue', frequency: 'Continue', social: 'Continue', plan: 'Sounds fair' }[stage];
  const NEXT = { welcome: 'goals', goals: 'places', places: 'extras', extras: 'frequency', frequency: 'social', social: 'plan', plan: 'address' }[stage];

  return (
    <Phone lockTheme="light" showTabBar={false}>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '4px 24px 24px' }}>
        {isQuestion && (
          <StepHeader theme="light" step={qIndex + 1} total={QUESTION_STEPS.length}
            onSkip={stage !== 'plan' ? () => next(NEXT) : undefined} style={{ marginBottom: 6 }} />
        )}
        <div key={stage} style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', animation: 'xoot-rise var(--xoot-dur-story) var(--xoot-ease-settle)' }}>
          {BODY}
        </div>
        <Button variant="primary" size="lg" block disabled={!ANSWERED} onClick={() => next(NEXT)}
          iconRight={stage === 'plan' ? 'arrow-right' : undefined} style={{ marginTop: 16 }}>{CTA}</Button>
        {isQuestion && !ANSWERED && stage !== 'plan' && (
          <span style={{ textAlign: 'center', marginTop: 10, fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)' }}>
            Pick something, or skip this step
          </span>
        )}
        {stage === 'welcome' && (
          <button onClick={() => { tap('light'); setStage('login'); }}
            style={{ marginTop: 14, border: 'none', background: 'none', color: 'var(--xoot-text-muted)', fontSize: 'var(--xoot-body-sm)', fontWeight: 600, cursor: 'pointer' }}>
            I already have an account
          </button>
        )}
      </div>
    </Phone>
  );
}

/* ── Splash ───────────────────────────────────────────────────────────────
   One continuous motion, driven entirely by CSS. The previous version stepped through
   React state at 2450 / 3300 / 3750ms, which made it three animations in a row rather than
   one event — and any re-render mid-sequence restarted a transition.

   Now: drops fall and the cursive wordmark writes itself out of them (LogoAssemble owns
   that), the heart rises while the word is still finishing, and the whole plate lifts away
   as the last of it settles. Every stage overlaps the one before it. The only JS is the
   single hand-off timer at the end. */
const SPLASH_MS = 3400;

function SplashScreen({ onDone }) {
  React.useEffect(() => {
    const t = window.setTimeout(onDone, SPLASH_MS);
    return () => window.clearTimeout(t);
  }, [onDone]);

  return (
    <div data-phone data-theme-lock="light" data-theme="light" style={{
      position: 'relative', width: 390, height: 844, flex: '0 0 auto',
      borderRadius: 46, overflow: 'hidden', background: '#FFFFFF',
      boxShadow: 'var(--xoot-shadow-4)',
    }}>
      <style>{`
        @keyframes splash-rise {
          from { transform: translateY(84%); opacity: 0; }
          to   { transform: translateY(0); opacity: 1; }
        }
        @keyframes splash-lift {
          0%, 82%  { transform: scale(1); opacity: 1; }
          100%     { transform: scale(1.045); opacity: 0; }
        }
        .splash-plate {
          animation: splash-lift ${SPLASH_MS}ms cubic-bezier(.16,1,.3,1) both;
        }
        .splash-heart {
          /* Starts while the word is still writing — the overlap is what makes it read
             as one movement instead of a queue. */
          animation: splash-rise 820ms cubic-bezier(.16,1,.3,1) 1750ms both;
        }
        @media (prefers-reduced-motion: reduce) {
          .splash-plate, .splash-heart { animation: none; opacity: 1; transform: none; }
        }
      `}</style>

      <div className="splash-plate" style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 4,
      }}>
        <LogoAssemble width={264} duration={2500} color="var(--xoot-violet-500)" />
        {/* The lift transform lives on the plate; the heart owns its own loop, so its
            entrance sits on a separate wrapper rather than fighting it. */}

      </div>
    </div>
  );
}

function AuthScreen({ onNext }) {
  return (
    <Phone lockTheme="light" showTabBar={false}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 22, padding: '0 24px 28px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Logo size={34} tone="ink" />
          <h1 style={{ fontSize: 'var(--xoot-display-2)', lineHeight: 'var(--xoot-display-2-lh)' }}>
            Your <span style={{ color: 'var(--xoot-violet-700)' }}>Home</span><br />Handled.
          </h1>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SsoButton brand="apple" label="Continue with Apple" onClick={() => { tap('medium'); onNext('apple'); }} />
          <SsoButton brand="google" label="Continue with Google" onClick={() => { tap('medium'); onNext('google'); }} />
          <button type="button" onClick={() => { tap('light'); onNext('phone'); }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
              height: 54, border: 'none', borderRadius: 'var(--xoot-radius-pill)',
              background: 'var(--xoot-surface-card)', color: 'var(--xoot-text-primary)', boxShadow: 'inset 0 0 0 1px var(--xoot-border-color)', cursor: 'pointer',
              fontFamily: 'var(--xoot-font-core)', fontSize: 'var(--xoot-body)', fontWeight: 700,
            }}>
            <Icon name="phone" size={17} strokeWidth={2.1} />Continue with your number
          </button>
        </div>
        <button type="button" onClick={() => { tap('light'); onNext('signin'); }}
          style={{ border: 'none', background: 'none', color: 'var(--xoot-violet-700)', fontSize: 'var(--xoot-body-sm)', fontWeight: 700, cursor: 'pointer' }}>
          I already have an account
        </button>
        <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)', textAlign: 'center', lineHeight: 1.5 }}>
          By continuing you agree to our terms and privacy notice. We'll never share your address or access codes.
        </span>
        {/* The Xooter entrance. Deliberately a quiet text link below the legal line, not a
            second CTA: the overwhelming majority of people opening this app want a clean,
            and giving the worker path equal weight would make them choose a side before
            they know what Xoot is. Findable, not competing. */}
        <button type="button" onClick={() => { tap('light'); onNext('xooter'); }}
          style={{
            marginTop: 2, border: 'none', background: 'none', cursor: 'pointer',
            color: 'var(--xoot-text-muted)', fontSize: 'var(--xoot-caption)', fontWeight: 700,
          }}>
          I want to work with Xoot →
        </button>
      </div>
    </Phone>
  );
}

function SsoButton({ brand, label, onClick }) {
  return (
    <button type="button" onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        height: 54, border: 'none', borderRadius: 'var(--xoot-radius-pill)',
        background: '#FFFFFF', color: '#151515', cursor: 'pointer',
        /* Intentionally fixed: Apple and Google both mandate a light button, so this one
           does not follow the theme. The label is pinned to match its own ground. */
        fontFamily: 'var(--xoot-font-core)', fontSize: 'var(--xoot-body)', fontWeight: 700,
      }}>
      {brand === 'apple' ? <AppleMark size={19} /> : <GoogleMark size={18} />}
      {label}
    </button>
  );
}

/* Google's mark, in its four brand colours. Both marks are drawn rather than set as text —
   a letter "G" in the app's own typeface is not the Google mark. */
/* The Apple wordmark glyph, drawn rather than imported — a single monochrome path so it
   inherits currentColor and stays crisp at any size. Sized a touch larger than Google's
   mark because the apple silhouette reads optically smaller at the same box. */
function AppleMark({ size = 19, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true" style={{ display: 'block', flex: '0 0 auto', marginTop: -2 }}>
      <path d="M17.05 12.54c-.02-2.3 1.88-3.4 1.96-3.46-1.07-1.56-2.73-1.78-3.32-1.8-1.41-.14-2.76.83-3.48.83-.72 0-1.83-.81-3.01-.79-1.55.02-2.98.9-3.77 2.29-1.61 2.79-.41 6.92 1.15 9.18.76 1.11 1.67 2.35 2.86 2.31 1.15-.05 1.58-.74 2.97-.74 1.38 0 1.78.74 3 .72 1.24-.02 2.02-1.13 2.78-2.24.88-1.29 1.24-2.54 1.26-2.6-.03-.01-2.41-.93-2.4-3.7zM14.79 5.6c.63-.77 1.06-1.83.94-2.9-.91.04-2.01.61-2.67 1.37-.59.68-1.1 1.76-.96 2.8 1.01.08 2.05-.51 2.69-1.27z"/>
    </svg>
  );
}

function GoogleMark({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" style={{ display: 'block', flex: '0 0 auto' }}>
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.9 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.2C12.4 13.7 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-2.8-.4-4.1H24v9.3h12.6c-.3 2.1-1.6 5.2-4.6 7.3l7.7 6c4.6-4.3 6.4-10.4 6.4-18.5z" />
      <path fill="#FBBC05" d="M10.5 28.6c-.5-1.5-.8-3-.8-4.6s.3-3.1.8-4.6l-7.9-6.2C1 16.5 0 20.1 0 24s1 7.5 2.6 10.8l7.9-6.2z" />
      <path fill="#34A853" d="M24 48c6.3 0 11.6-2.1 15.5-5.7l-7.7-6c-2.1 1.4-4.8 2.3-7.8 2.3-6.3 0-11.6-4.2-13.5-9.9l-7.9 6.2C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}

/* Phone number: enter → OTP → done. Six boxes, auto-advancing. */
function PhoneFlow({ onDone, onBack }) {
  const [step, setStep] = React.useState('number');
  const [number, setNumber] = React.useState('082 194 8820');
  const [code, setCode] = React.useState(['', '', '', '', '', '']);
  const [resend, setResend] = React.useState(28);

  React.useEffect(() => {
    if (step !== 'otp') return;
    const t = window.setInterval(() => setResend(r => (r > 0 ? r - 1 : 0)), 1000);
    return () => window.clearInterval(t);
  }, [step]);

  const type = n => {
    const i = code.findIndex(c => !c);
    if (i < 0) return;
    tap('selection');
    const next = code.slice();
    next[i] = String(n);
    setCode(next);
    if (i === 5) window.setTimeout(() => { tap('success'); onDone(); }, 420);
  };

  return (
    <Phone lockTheme="light" showTabBar={false}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '10px 24px 28px' }}>
        <button onClick={() => { tap('light'); step === 'otp' ? setStep('number') : onBack(); }}
          style={{ alignSelf: 'flex-start', display: 'grid', placeItems: 'center', width: 40, height: 40, border: 'none', borderRadius: '50%', background: 'var(--xoot-surface-card)', color: 'var(--xoot-text-primary)', boxShadow: 'inset 0 0 0 1px var(--xoot-border-color)', cursor: 'pointer' }}>
          <Icon name="arrow-left" size={19} strokeWidth={2.2} />
        </button>

        {step === 'number' ? (
          <>
            <h2 style={{ fontSize: 'var(--xoot-display-3)', lineHeight: 1.1, marginTop: 26 }}>What's your number?</h2>
            <p style={{ fontSize: 'var(--xoot-body)', color: 'var(--xoot-text-secondary)', margin: '8px 0 24px' }}>
              We'll text you a code. It's the only thing we use it for, unless a Xooter needs to reach you.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ display: 'grid', placeItems: 'center', width: 78, height: 56, borderRadius: 'var(--xoot-radius-sm)', background: 'var(--xoot-surface-card)', color: 'var(--xoot-text-primary)', boxShadow: 'inset 0 0 0 1px var(--xoot-border-color)', fontSize: 'var(--xoot-body)', fontWeight: 700 }}>+27</span>
              <input value={number} onChange={e => setNumber(e.target.value)} inputMode="tel"
                style={{ flex: 1, height: 56, padding: '0 16px', border: 'none', borderRadius: 'var(--xoot-radius-sm)', background: 'var(--xoot-surface-card)', color: 'var(--xoot-text-primary)', boxShadow: 'inset 0 0 0 1px var(--xoot-border-color)', outline: 'none', fontFamily: 'var(--xoot-font-core)', fontSize: 'var(--xoot-body-lg)', fontWeight: 600 }} />
            </div>
            <span style={{ flex: 1 }} />
            <Button variant="primary" size="lg" block onClick={() => { tap('medium'); setStep('otp'); }}>Send me a code</Button>
          </>
        ) : (
          <>
            <h2 style={{ fontSize: 'var(--xoot-display-3)', lineHeight: 1.1, marginTop: 26 }}>Enter your code</h2>
            <p style={{ fontSize: 'var(--xoot-body)', color: 'var(--xoot-text-secondary)', margin: '8px 0 24px' }}>
              Sent to +27 {number}.
            </p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
              {code.map((c, i) => (
                <span key={i} style={{
                  flex: 1, height: 62, display: 'grid', placeItems: 'center',
                  borderRadius: 'var(--xoot-radius-sm)',
                  background: c ? 'var(--xoot-violet-500)' : 'var(--xoot-surface-sunken)',
                  boxShadow: !c && code.findIndex(x => !x) === i ? 'inset 0 0 0 2px var(--xoot-violet-400)' : 'none', fontFamily: 'var(--xoot-font-mono)', fontSize: 24,
                  transition: 'all var(--xoot-dur-fast) var(--xoot-ease-out)',
                }}>{c}</span>
              ))}
            </div>
            <span style={{ fontSize: 'var(--xoot-body-sm)', color: 'var(--xoot-text-muted)' }}>
              {resend > 0 ? `Resend in ${resend}s` : 'Send it again'}
            </span>
            <span style={{ flex: 1 }} />
            {/* A real keypad, because typing a code is the whole screen. */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, 'del'].map((n, i) => (
                <button key={i} type="button" disabled={n === null}
                  onClick={() => n === 'del'
                    ? (tap('light'), setCode(c => { const j = c.findLastIndex(x => x); if (j < 0) return c; const nx = c.slice(); nx[j] = ''; return nx; }))
                    : type(n)}
                  style={{
                    height: 52, border: 'none', borderRadius: 'var(--xoot-radius-key)',
                    background: n === null ? 'transparent' : 'var(--xoot-surface-card)', fontFamily: 'var(--xoot-font-core)', fontSize: 21, fontWeight: 600,
                    cursor: n === null ? 'default' : 'pointer',
                    display: 'grid', placeItems: 'center',
                  }}>
                  {n === 'del' ? <Icon name="x" size={18} strokeWidth={2.4} /> : n}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </Phone>
  );
}

/* Apple / Google: the system sheet, then straight through. */
function SsoFlow({ onDone, onBack }) {
  const [state, setState] = React.useState('sheet');
  React.useEffect(() => {
    if (state !== 'signing') return;
    const t = window.setTimeout(onDone, 1100);
    return () => window.clearTimeout(t);
  }, [state]);

  return (
    <Phone lockTheme="light" showTabBar={false}>
      <div style={{ position: 'absolute', inset: 0, background: 'var(--xoot-surface-scrim)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        {state === 'signing' ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <span style={{ width: 34, height: 34, borderRadius: '50%', border: '3px solid var(--xoot-neutral-200)', borderTopColor: 'var(--xoot-violet-500)', animation: 'xoot-spin-slow 700ms linear infinite' }} />
            <span style={{ fontSize: 'var(--xoot-body)', color: 'var(--xoot-text-secondary)', fontWeight: 600 }}>Signing you in…</span>
          </div>
        ) : (
          <div style={{
            background: 'var(--xoot-neutral-0)', borderRadius: '20px 20px 0 0',
            padding: '22px 20px 26px', display: 'flex', flexDirection: 'column', gap: 16,
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Logo variant="icon" size={44} />
              <span style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 'var(--xoot-body)', fontWeight: 700 }}>Xoot</span>
                <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)' }}>wants to use your account to sign in</span>
              </span>
            </span>
            <span style={{ height: 1, background: 'var(--xoot-border-color)' }} />
            <span style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[['Name', 'Nadia Khan'], ['Email', 'nadia@example.co.za']].map(([k, v]) => (
                <span key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--xoot-body-sm)' }}>
                  <span style={{ color: 'var(--xoot-text-muted)' }}>{k}</span>
                  <span style={{ fontWeight: 600 }}>{v}</span>
                </span>
              ))}
            </span>
            <Button variant="primary" size="lg" block onClick={() => { tap('medium'); setState('signing'); }}>Continue</Button>
            <Button variant="ghost" block onClick={onBack}>Cancel</Button>
          </div>
        )}
      </div>
    </Phone>
  );
}

function LoginFlow({ onDone, onBack }) {
  return (
    <Phone lockTheme="light" showTabBar={false}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '10px 24px 28px' }}>
        <button onClick={() => { tap('light'); onBack(); }}
          style={{ alignSelf: 'flex-start', display: 'grid', placeItems: 'center', width: 40, height: 40, border: 'none', borderRadius: '50%', background: 'var(--xoot-surface-card)', color: 'var(--xoot-text-primary)', boxShadow: 'inset 0 0 0 1px var(--xoot-border-color)', cursor: 'pointer' }}>
          <Icon name="arrow-left" size={19} strokeWidth={2.2} />
        </button>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 26 }}>
          <h2 style={{ fontSize: 'var(--xoot-display-3)', lineHeight: 1.1 }}>Welcome back.</h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24 }}>
          <SsoButton brand="apple" label="Sign in with Apple" onClick={() => { tap('success'); onDone(); }} />
          <SsoButton brand="google" label="Sign in with Google" onClick={() => { tap('success'); onDone(); }} />
          <button type="button" onClick={() => { tap('light'); onDone(); }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
              height: 54, border: 'none', borderRadius: 'var(--xoot-radius-pill)',
              background: 'var(--xoot-surface-card)', color: 'var(--xoot-text-primary)', boxShadow: 'inset 0 0 0 1px var(--xoot-border-color)', cursor: 'pointer',
              fontFamily: 'var(--xoot-font-core)', fontSize: 'var(--xoot-body)', fontWeight: 700,
            }}>
            <Icon name="phone" size={17} strokeWidth={2.1} />Sign in with your number
          </button>
        </div>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)', textAlign: 'center' }}>
          Signed in before? Use the same method you used then.
        </span>
      </div>
    </Phone>
  );
}

/* ── Address, with location asked exactly here ─────────────────────────── */

function AddressStep({ value, onChange, onNext, onSkip }) {
  const [asked, setAsked] = React.useState(false);
  const [locating, setLocating] = React.useState(false);
  const [filled, setFilled] = React.useState(value);

  const useLocation = () => { tap('medium'); setAsked(true); };
  const grant = () => {
    tap('success'); setAsked(false); setLocating(true);
    window.setTimeout(() => { setLocating(false); setFilled('14 Fredman Dr, Sandton 2196'); onChange('14 Fredman Dr, Sandton 2196'); }, 1100);
  };

  return (
    <Phone lockTheme="light" showTabBar={false}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px 24px 28px' }}>
        <h2 style={{ fontSize: 'var(--xoot-display-3)', lineHeight: 1.1, marginTop: 16 }}>Where are we coming to?</h2>
        <p style={{ fontSize: 'var(--xoot-body)', color: 'var(--xoot-text-secondary)', margin: '8px 0 22px' }}>
          Add it now and booking later takes two taps. You can add more places any time.
        </p>

        <button type="button" onClick={useLocation} disabled={locating}
          style={{
            display: 'flex', alignItems: 'center', gap: 11, minHeight: 56, padding: '0 18px',
            border: 'none', borderRadius: 'var(--xoot-radius-pill)', cursor: 'pointer',
            background: 'var(--xoot-violet-700)', textAlign: 'left',
            fontFamily: 'var(--xoot-font-core)', fontSize: 'var(--xoot-body)', fontWeight: 700,
          }}>
          {locating
            ? <span style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid var(--xoot-neutral-200)', borderTopColor: 'var(--xoot-violet-500)', animation: 'xoot-spin-slow 700ms linear infinite' }} />
            : <Icon name="map-pin" size={18} strokeWidth={2.1} />}
          {locating ? 'Finding you…' : 'Use my current location'}
        </button>

        <span style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0' }}>
          <span style={{ flex: 1, height: 1, background: 'var(--xoot-border-color)' }} />
          <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)' }}>or type it</span>
          <span style={{ flex: 1, height: 1, background: 'var(--xoot-border-color)' }} />
        </span>

        <input value={filled} onChange={e => { setFilled(e.target.value); onChange(e.target.value); }}
          placeholder="Street address, suburb"
          style={{
            height: 56, padding: '0 18px', border: 'none', borderRadius: 'var(--xoot-radius-sm)',
            background: 'var(--xoot-surface-card)', color: 'var(--xoot-text-primary)', boxShadow: 'inset 0 0 0 1px var(--xoot-border-color)', outline: 'none',
            fontFamily: 'var(--xoot-font-core)', fontSize: 'var(--xoot-body)', fontWeight: 600,
          }} />

        {filled && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, fontSize: 'var(--xoot-body-sm)', color: 'var(--xoot-sage-mid)' }}>
            <Icon name="circle-check" size={16} strokeWidth={2.1} />We cover this area
          </span>
        )}

        <span style={{ flex: 1 }} />
        <Button variant="primary" size="lg" block disabled={!filled} onClick={onNext}>Save this place</Button>
        <button onClick={() => { tap('light'); onSkip(); }}
          style={{ marginTop: 12, border: 'none', background: 'none', color: 'var(--xoot-text-muted)', fontSize: 'var(--xoot-body-sm)', fontWeight: 600, cursor: 'pointer' }}>
          I'll add it when I book
        </button>
      </div>

      {/* The system location prompt — shown HERE, at the moment it's needed. */}
      {asked && <PermissionSheet
        icon="map-pin" title={'Allow Xoot to use\nyour location?'}
        body="Used once, to fill in your address and find Xooters near you. We don't track you between visits."
        allow="Allow Once" always="Allow While Using App" deny="Don't Allow"
        onAllow={grant} onDeny={() => { tap('light'); setAsked(false); }} />}
    </Phone>
  );
}

/* An iOS-shaped permission alert. Reused wherever a permission is genuinely needed. */
function PermissionSheet({ icon, title, body, allow, always, deny, onAllow, onDeny }) {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 60, display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,.45)', padding: 30 }}>
      <div style={{
        width: '100%', maxWidth: 280, borderRadius: 16, overflow: 'hidden',
        background: 'rgba(250,250,250,.96)', backdropFilter: 'blur(20px)',
        animation: 'xoot-pop var(--xoot-dur-base) var(--xoot-ease-spring)',
      }}>
        <div style={{ padding: '20px 18px 16px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <Icon name={icon} size={26} color="var(--xoot-ink-900)" strokeWidth={1.9} />
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--xoot-ink-900)', whiteSpace: 'pre-line', lineHeight: 1.3 }}>{title}</span>
          <span style={{ fontSize: 12.5, lineHeight: 1.4, color: 'var(--xoot-ink-700)' }}>{body}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {[[always, onAllow], [allow, onAllow], [deny, onDeny]].filter(([l]) => l).map(([l, fn], i) => (
            <button key={l} type="button" onClick={fn}
              style={{
                height: 44, border: 'none', background: 'transparent', cursor: 'pointer',
                boxShadow: 'inset 0 1px 0 var(--xoot-ios-hairline)',
                color: 'var(--xoot-ios-tint)', fontFamily: 'var(--xoot-font-core)', fontSize: 15,
                fontWeight: i === 0 ? 700 : 500,
              }}>{l}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Care+ payment ────────────────────────────────────────────────────── */

function CarePlusPayment({ onDone, onBack }) {
  const [state, setState] = React.useState('form');
  React.useEffect(() => {
    if (state !== 'processing') return;
    const t = window.setTimeout(() => setState('done'), 1400);
    return () => window.clearTimeout(t);
  }, [state]);
  React.useEffect(() => {
    if (state !== 'done') return;
    const t = window.setTimeout(onDone, 1200);
    return () => window.clearTimeout(t);
  }, [state]);

  if (state !== 'form') {
    return (
      <Phone lockTheme="light" showTabBar={false}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, padding: 30 }}>
          {state === 'processing' ? (
            <>
              <span style={{ width: 38, height: 38, borderRadius: '50%', border: '3px solid var(--xoot-careplus-100)', borderTopColor: 'var(--xoot-careplus-500)', animation: 'xoot-spin-slow 700ms linear infinite' }} />
              <span style={{ fontSize: 'var(--xoot-body)', fontWeight: 600, color: 'var(--xoot-text-secondary)' }}>Setting up your membership…</span>
            </>
          ) : (
            <>
              <CarePlusMark size={78} />
              <span style={{ fontFamily: 'var(--xoot-font-display)', fontSize: 'var(--xoot-display-3)', textAlign: 'center', lineHeight: 1.1 }}>
                You're in.
              </span>
              <span style={{ fontSize: 'var(--xoot-body)', color: 'var(--xoot-text-secondary)', textAlign: 'center' }}>
                Care+ is active. Your R30 add-on credit is ready.
              </span>
            </>
          )}
        </div>
      </Phone>
    );
  }

  return (
    <Phone lockTheme="light" showTabBar={false}>
      <TopBar onBack={onBack} title="Join Care+" subtitle="R99 a month · cancel any time" />
      <Scroll bottom={130}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>Pay with</span>
            {[['apple', 'Apple Pay', 'One tap, nothing to type', true],
              ['card', 'Card', 'Visa ·· 4821', false]].map(([k, t, d, primary]) => (
              <button key={k} type="button" onClick={() => { tap('heavy'); setState('processing'); }}
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
            {[['R99', 'a month, billed today'], ['R30', 'add-on credit, first month'], ['Any time', 'cancel, no notice needed']].map(([a, b]) => (
              <span key={b} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--xoot-body-sm)', color: 'var(--xoot-careplus-ink)' }}>
                <span style={{ fontWeight: 700 }}>{a}</span><span style={{ opacity: .85 }}>{b}</span>
              </span>
            ))}
          </div>
        </div>
      </Scroll>
    </Phone>
  );
}

/* ── Question screens ────────────────────────────────────────────────── */

function Welcome() {
  return (
    <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingBottom: 8 }}>
      {/* Blooms drift at the edges, dimmed and behind the copy. The brand's own motif rather
          than the stemmed flowers, which read as a placed illustration and competed with the
          headline. Kept off the centre column so nothing sits under the text. */}
      <div style={{ position: 'absolute', inset: '0 -24px -24px', overflow: 'hidden', pointerEvents: 'none' }}>
        {[
          { size: 92, palette: 'lilac',  left: '-6%',  top: '4%',  delay: 0,   op: .34 },
          { size: 58, palette: 'petal',  left: '14%',  top: '-3%', delay: 260, op: .3 },
          { size: 76, palette: 'honey',  left: '84%',  top: '9%',  delay: 140, op: .32 },
          { size: 48, palette: 'sage',   left: '96%',  top: '30%', delay: 420, op: .28 },
          { size: 104, palette: 'mist',  left: '-10%', top: '46%', delay: 320, op: .3 },
          { size: 66, palette: 'petal',  left: '90%',  top: '62%', delay: 540, op: .3 },
          { size: 84, palette: 'lilac',  left: '4%',   top: '82%', delay: 200, op: .32 },
          { size: 54, palette: 'honey',  left: '76%',  top: '88%', delay: 620, op: .28 },
        ].map((b, i) => (
          <Bloom key={i} size={b.size} palette={b.palette} motion="sway" delay={b.delay}
            opacity={b.op}
            style={{ position: 'absolute', left: b.left, top: b.top }} />
        ))}
      </div>
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 16 }}>
        <Logo size={34} tone="ink" />
        <h1 style={{ fontSize: 'var(--xoot-display-1)', lineHeight: 'var(--xoot-display-1-lh)' }}>
          Your <span style={{ color: 'var(--xoot-violet-700)' }}>home</span>,<br />handled.
        </h1>
        <p style={{ fontSize: 'var(--xoot-body-lg)', lineHeight: 1.5, color: 'var(--xoot-violet-200)', maxWidth: 310 }}>
          On-demand vetted, insured home help — booked in about a minute, and yours to keep.
        </p>
      </div>
    </div>
  );
}

function Question({ title, sub, body }) {
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <h2 style={{ fontSize: 'var(--xoot-display-3)', lineHeight: 'var(--xoot-display-3-lh)', marginTop: 22 }}>{title}</h2>
      <p style={{ fontSize: 'var(--xoot-body)', color: 'var(--xoot-violet-700)', margin: '8px 0 22px' }}>{sub}</p>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>{body}</div>
    </div>
  );
}

function SegmentedList({ value, onChange, options }) {
  return (
    <div style={{ borderRadius: 'var(--xoot-radius-md)', overflow: 'hidden', background: 'var(--xoot-surface-card)', boxShadow: 'inset 0 0 0 1px var(--xoot-border-color)' }}>
      {options.map((o, i) => {
        const on = value === o.value;
        return (
          <button key={o.value} type="button" onClick={() => onChange(o.value)}
            style={{
              display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: 58,
              padding: '12px 18px', border: 'none', textAlign: 'left', cursor: 'pointer',
              background: on ? 'var(--xoot-violet-700)' : 'transparent',
              borderBottom: i < options.length - 1 ? '1px solid var(--xoot-neutral-100)' : 'none',
              transition: 'background var(--xoot-dur-fast) var(--xoot-ease-out)',
              WebkitTapHighlightColor: 'transparent',
            }}>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 'var(--xoot-body-lg)', fontWeight: 600, color: on ? '#fff' : 'var(--xoot-text-primary)' }}>{o.label}</span>
              {o.detail && <span style={{ fontSize: 'var(--xoot-body-sm)', color: on ? 'rgba(255,255,255,.88)' : 'var(--xoot-text-muted)' }}>{o.detail}</span>}
            </span>
            {on && <Icon name="check" size={19} color="var(--xoot-icon-outline)" strokeWidth={3}
              style={{ animation: 'xoot-pop var(--xoot-dur-fast) var(--xoot-ease-spring)' }} />}
          </button>
        );
      })}
    </div>
  );
}

function Social({ index, onIndex }) {
  React.useEffect(() => {
    const t = window.setInterval(() => onIndex((index + 1) % window.XootData.reviews.length), 3200);
    return () => window.clearInterval(t);
  });
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 28 }}>
      <div>
        <h2 style={{ fontSize: 'var(--xoot-display-3)', lineHeight: 'var(--xoot-display-3-lh)' }}>
          31 000 homes,<br />looked after weekly.
        </h2>
        <p style={{ fontSize: 'var(--xoot-body)', color: 'var(--xoot-violet-700)', marginTop: 8 }}>
          And 4 800 Xooters earning a steady income.
        </p>
      </div>
      <TestimonialStack items={window.XootData.reviews} index={index} onIndexChange={onIndex} />
    </div>
  );
}

/* The honest money screen. Payment is taken when the booking is made. */
function Plan() {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 24 }}>
      <div>
        <h2 style={{ fontSize: 'var(--xoot-display-3)', lineHeight: 'var(--xoot-display-3-lh)' }}>
          Here's exactly<br />how the money works.
        </h2>
        <p style={{ fontSize: 'var(--xoot-body)', color: 'var(--xoot-violet-700)', marginTop: 8 }}>
          One payment, when you book. Nothing at the door, and no surprises after.
        </p>
      </div>
      <TrialTimeline theme="light" steps={[
        { icon: 'calendar-check', when: 'You book', detail: 'You see the full price first, then pay to confirm the visit.' },
        { icon: 'lock', when: 'We hold it', detail: "Your money sits with us — your Xooter hasn't been paid yet, and knows it." },
        { icon: 'sparkles', when: 'Your Xooter arrives', detail: 'Insured through Booking Cover, included at no extra charge.' },
        { icon: 'wallet', when: 'The job is done', detail: 'Only then do we pay your Xooter out. If it went wrong, we sort it first.' },
      ]} />
    </div>
  );
}

Object.assign(window, { OnboardingFlow, SplashScreen, AuthScreen, PhoneFlow, SsoFlow, LoginFlow, AddressStep, PermissionSheet, CarePlusPayment });
})();

/* ═══ app/Booking.jsx ═════════════════════════════════════════════════════════ */
(function(){
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
})();

/* ═══ app/Profile.jsx ═════════════════════════════════════════════════════════ */
(function(){
/* The You tab and everything it opens. Every row here navigates — nothing is decorative. */
const {
  Card, Badge, Button, Icon, Avatar, Switch, Tabs, MemberBadge, MemberRing, Toast,
  SiriShortcuts, ConciergePrompt, XOOT_PHRASES, NextBookingWidget, XootCredWidget,
  HomeReadinessWidget, FavouriteXooterWidget, AcceptedJobWidget, SectionLabel, Progress,
  Input, Select, IconButton, QuietUpdate, Rating, WidgetGallery, WidgetPicker, CarePlusMark,
  Pressable, CountUp, CalendarSync,
} = window.XootNS;
const XH = window.XootNS.Haptics;

/* Preferences lived in per-screen useState, so every toggle reset the moment you navigated away —
   which reads as "the toggle doesn't work". One module-level store, shared by every screen that
   reads a preference, fixes it for the prototype. */
/* `dark` is seeded from XootTheme, which has already resolved stored choice → device
   preference → light. Hardcoding false here meant simply opening the You tab forced a
   dark-set device back into light mode. */
const PREFS = { sameXooter: true, remind: true, haptics: true,
                dark: (window.XootTheme && window.XootTheme.isDark()) || false,
                push: true, email: true, whatsapp: true, marketing: false };
const prefListeners = new Set();
function usePref(key) {
  const [v, setV] = React.useState(PREFS[key]);
  React.useEffect(() => {
    const fn = () => setV(PREFS[key]);
    prefListeners.add(fn);
    return () => prefListeners.delete(fn);
  }, [key]);
  return [v, next => { PREFS[key] = next; prefListeners.forEach(f => f()); }];
}

/* A tappable settings row. The whole row is the target — 56px minimum. */
function Row({ icon, title, detail, value, onClick, danger, last }) {
  const [press, setPress] = React.useState(false);
  return (
    <button type="button" onClick={() => { XH.haptic('light'); onClick && onClick(); }}
      onMouseDown={() => setPress(true)} onMouseUp={() => setPress(false)} onMouseLeave={() => setPress(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: 56,
        padding: '10px 0', border: 'none', background: press ? 'var(--xoot-neutral-50)' : 'transparent',
        borderBottom: last ? 'none' : '1px solid var(--xoot-neutral-100)',
        textAlign: 'left', cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
        transition: 'background var(--xoot-dur-instant) var(--xoot-ease-out)',
      }}>
      <Icon name={icon} size={19} color={danger ? 'var(--xoot-coral-500)' : 'var(--xoot-icon-outline)'} strokeWidth={1.85} />
      <span style={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 'var(--xoot-body)', fontWeight: 600, color: danger ? 'var(--xoot-coral-700)' : 'var(--xoot-text-primary)' }}>{title}</span>
        {detail && <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)' }}>{detail}</span>}
      </span>
      {value && <span style={{ fontSize: 'var(--xoot-body-sm)', color: 'var(--xoot-text-muted)', flex: '0 0 auto' }}>{value}</span>}
      <Icon name="chevron-right" size={17} color="var(--xoot-neutral-400)" />
    </button>
  );
}

function ProfileScreen({ onOpen }) {
  const D = window.XootData;
  const [same, setSame] = usePref('sameXooter');
  const [remind, setRemind] = usePref('remind');
  const [haptics, setHaptics] = usePref('haptics');
  const [dark, setDark] = usePref('dark');
  const member = D.user.carePlus;
  const rootRef = React.useRef(null);

  /* Only push a theme the user actually chose. Firing on mount would overwrite the
     device/stored preference with this screen's initial state. */
  const themeTouched = React.useRef(false);
  React.useEffect(() => {
    if (!themeTouched.current) { themeTouched.current = true; return; }
    if (window.XootTheme) window.XootTheme.set(dark ? 'dark' : 'light');
  }, [dark]);

  return (
    <>
      <div ref={rootRef} style={{ padding: '2px 20px 14px' }}>
        <h1 style={{ fontSize: 'var(--xoot-display-2)', lineHeight: 1.04 }}>You</h1>
      </div>

      <Scroll bottom={100}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Card pad="md" interactive onClick={() => { XH.haptic('light'); onOpen('account'); }}
            style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}>
            <MemberRing active={member}><Avatar name={D.user.name} size="lg" /></MemberRing>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
              <span style={{ fontFamily: 'var(--xoot-font-display)', fontSize: 'var(--xoot-title-2)' }}>Nadia Khan</span>
              <span style={{ fontSize: 'var(--xoot-body-sm)', color: 'var(--xoot-text-muted)' }}>
                {member ? 'Care+ member since March' : 'nadia@example.co.za'}
              </span>
            </span>
            <Icon name="chevron-right" size={18} color="var(--xoot-neutral-400)" />
          </Card>

          {member && (
            <Card pad="md" interactive onClick={() => onOpen('careplus')}
              style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--xoot-careplus-wash)', boxShadow: 'none', cursor: 'pointer' }}>
              <CarePlusMark size={23} color="var(--xoot-careplus-ink)" />
              <span style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                <span style={{ fontFamily: 'var(--xoot-font-display)', fontSize: 'var(--xoot-title-3)', color: 'var(--xoot-careplus-ink)' }}>Care+ membership</span>
                <span style={{ fontSize: 'var(--xoot-body-sm)', color: 'var(--xoot-careplus-ink)', opacity: .85 }}>Active · renews 1 September</span>
              </span>
              <Icon name="chevron-right" size={18} color="var(--xoot-careplus-ink)" />
            </Card>
          )}

          {!member && (
            <Card pad="md" interactive onClick={() => onOpen('joincareplus')}
              style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--xoot-careplus-50)', boxShadow: 'inset 0 0 0 1px var(--xoot-careplus-100)', cursor: 'pointer' }}>
              <CarePlusMark size={23} color="var(--xoot-careplus-600)" />
              <span style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                <span style={{ fontFamily: 'var(--xoot-font-display)', fontSize: 'var(--xoot-title-3)', color: 'var(--xoot-careplus-700)' }}>Join Care+</span>
                <span style={{ fontSize: 'var(--xoot-body-sm)', color: 'var(--xoot-careplus-700)', opacity: .85 }}>R99 a month · R30 add-on credit, priority slots</span>
              </span>
              <Icon name="chevron-right" size={18} color="var(--xoot-careplus-600)" />
            </Card>
          )}

          {/* ── Gift a clean ────────────────────────────────────────────────
              Promoted out of the Money list. It was row four of five in a card headed "Money",
              which is where someone looks for their own balance — not for something to give
              away. Gifting is a genuine revenue path and it was invisible.

              Sitting it beside Care+ works because both are the same kind of thing: a decision
              to spend beyond a single booking. And a gift card that looks like a gift is most
              of what makes anyone tap it, so this gets the tinted treatment rather than a row
              with a chevron. */}
          <Card pad="md" interactive onClick={() => onOpen('gift')}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: 'var(--xoot-petal-wash)', boxShadow: 'none', cursor: 'pointer',
            }}>
            <span style={{
              display: 'grid', placeItems: 'center', width: 40, height: 40, flex: '0 0 auto',
              borderRadius: 'var(--xoot-radius-key)', background: 'rgba(255,255,255,.7)',
            }}>
              <Icon name="gift" size={20} color="var(--xoot-petal-ink)" strokeWidth={1.9} />
            </span>
            <span style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
              <span style={{ fontFamily: 'var(--xoot-font-display)', fontSize: 'var(--xoot-title-3)', color: 'var(--xoot-petal-ink)' }}>Gift a clean</span>
              <span style={{ fontSize: 'var(--xoot-body-sm)', color: 'var(--xoot-petal-ink)', opacity: .85 }}>Give someone a visit — they pick the time</span>
            </span>
            <Icon name="chevron-right" size={18} color="var(--xoot-petal-ink)" />
          </Card>

          <Card tone="flat" pad="md" style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)', marginBottom: 6 }}>Your places</span>
            <Row icon="house" title="14 Fredman Dr" detail="Sandton · 2 bed, 1 bath" onClick={() => onOpen('home')} />
            <Row icon="building-2" title="Studio" detail="Braamfontein · 1 bath" onClick={() => onOpen('home')} />
            <Row icon="plus" title="Add a place" detail="Homes, offices or short-lets" onClick={() => onOpen('home')} last />
          </Card>

          <Card tone="flat" pad="md" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>Preferences</span>
            <Switch checked={same} onChange={() => { XH.haptic('light'); setSame(!same); }} label="Same Xooter every time" description="We'll always try Nomsa first" />
            <Switch checked={remind} onChange={() => { XH.haptic('light'); setRemind(!remind); }} label="Remind me the evening before" />
            <Switch checked={haptics} onChange={() => { XH.haptic('light'); setHaptics(!haptics); XH.setEnabled && XH.setEnabled(!haptics); }} label="Haptic feedback" description="A small tap when something changes" />
            <Switch checked={dark} onChange={() => { XH.haptic('light'); setDark(!dark); }} label="Dark mode" description="Xoot is light by default" />
          </Card>

          <Card tone="flat" pad="md" style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)', marginBottom: 6 }}>Money</span>
            {/* Rolls rather than snaps — see CountUp's note. This is the one number in the
                You tab that changes without the user having navigated anywhere. */}
            <Row icon="wallet" title="XootCred" detail="Use it on any booking"
              value={<>R<CountUp value={D.user.credit} /></>} onClick={() => onOpen('cred')} />
            <Row icon="credit-card" title="Payment methods" detail="Visa ·· 4821" onClick={() => onOpen('payment')} />
            <Row icon="book-open" title="Receipts & invoices" detail="Download any visit" onClick={() => onOpen('invoices')} />
            <Row icon="handshake" title="Refer & earn" detail="R100 each, once they book" onClick={() => onOpen('refer')} last />
          </Card>

          <Card tone="flat" pad="md" style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)', marginBottom: 6 }}>Your app</span>
            <Row icon="bell" title="Notifications" detail="How and when we reach you" onClick={() => onOpen('notifications')} />
            <Row icon="calendar-check" title="Connected calendars" detail="Apple · Google" onClick={() => onOpen('calendars')} />
            <Row icon="sparkles" title="Siri & Concierge" detail="Book by voice" onClick={() => onOpen('siri')} />
            <Row icon="chart-column" title="Widgets" detail="Five for your home screen" onClick={() => onOpen('widgets')} />
            <Row icon="briefcase" title="Manage more" detail="Properties, dashboards, bulk visits" onClick={() => onOpen('manage')} last />
          </Card>

          <Card tone="flat" pad="md" style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)', marginBottom: 6 }}>Support</span>
            <Row icon="shield-check" title="XootCover" detail="Included on every visit" onClick={() => onOpen('cover')} />
            <Row icon="message-circle" title="Get help" detail="We usually reply within the hour" onClick={() => onOpen('help')} />
            <Row icon="lightbulb" title="How Xoot works" onClick={() => onOpen('how')} />
            <Row icon="lock" title="Privacy & your data" detail="Download or delete anything" onClick={() => onOpen('privacy')} last />
          </Card>

          <Button variant="ghost" block style={{ color: 'var(--xoot-text-muted)' }}>Sign out</Button>
          <span style={{ textAlign: 'center', fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)', paddingBottom: 8 }}>
            Xoot 1.0 · Johannesburg
          </span>
        </div>
      </Scroll>
    </>
  );
}

/* ── Sub-screens ─────────────────────────────────────────────────────────── */

function DetailShell({ title, subtitle, onBack, children, cta }) {
  return (
    <>
      <TopBar onBack={onBack} title={title} subtitle={subtitle} />
      <Scroll bottom={cta ? 130 : 100}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>{children}</div>
      </Scroll>
      {cta && <DockedCTA>{cta}</DockedCTA>}
    </>
  );
}

function CredScreen({ onBack }) {
  const D = window.XootData;
  return (
    <DetailShell title="XootCred" subtitle="Yours to spend on any booking" onBack={onBack}>
      <Card tone="dawn" pad="lg" radius="lg" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <span style={{ fontFamily: 'var(--xoot-font-display)', fontSize: 'var(--xoot-display-1)', lineHeight: 1 }}>R{D.user.credit}</span>
        <span style={{ fontSize: 'var(--xoot-body-sm)', color: 'var(--xoot-text-secondary)' }}>available now</span>
      </Card>
      <Card tone="flat" pad="md" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>Recent</span>
        {[['Care+ add-on credit', '+R30', '1 Jul'], ['Referral — Thandi joined', '+R150', '22 Jun'], ['Used on Airbnb turnaround', '−R150', '18 Jun']].map(([t, a, d]) => (
          <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <span style={{ fontSize: 'var(--xoot-body-sm)', fontWeight: 600 }}>{t}</span>
              <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)' }}>{d}</span>
            </span>
            <span style={{ fontFamily: 'var(--xoot-font-mono)', fontSize: 'var(--xoot-body-sm)', color: a.startsWith('+') ? 'var(--xoot-sage-ink)' : 'var(--xoot-text-secondary)' }}>{a}</span>
          </div>
        ))}
      </Card>
      <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)', lineHeight: 1.5 }}>
        XootCred comes off your total automatically at checkout. Care+ add-on credit expires at the end of each month; referral credit doesn't expire.
      </span>
    </DetailShell>
  );
}

function PaymentScreen({ onBack }) {
  return (
    <DetailShell title="Payment methods" onBack={onBack}
      cta={<Button variant="primary" size="lg" block icon="plus">Add a card</Button>}>
      <Card tone="flat" pad="md" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Icon name="credit-card" size={22} color="var(--xoot-icon-outline)" strokeWidth={1.8} />
        <span style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <span style={{ fontSize: 'var(--xoot-body)', fontWeight: 600 }}>Visa ·· 4821</span>
          <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)' }}>Expires 09/28</span>
        </span>
        <Badge tone="success" size="sm">Default</Badge>
      </Card>
      <QuietUpdate headline="You pay once, up front."
        detail="We hold your payment securely, take our fee, and pay your Xooter out only after the visit is finished and verified."
        channels={['inapp', 'email']} />
    </DetailShell>
  );
}

function CoverScreen({ onBack }) {
  return (
    <DetailShell title="XootCover" subtitle="Included on every visit" onBack={onBack}>
      <Card tone="sunken" pad="lg" radius="lg" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Icon name="shield-check" size={34} color="var(--xoot-sage-500)" strokeWidth={1.6} />
        <span style={{ fontFamily: 'var(--xoot-font-display)', fontSize: 'var(--xoot-title-1)' }}>Every booking is covered</span>
        <span style={{ fontSize: 'var(--xoot-body)', color: 'var(--xoot-text-secondary)', lineHeight: 1.5 }}>
          XootCover is built into the price of every Xoot visit. There's nothing to tick, nothing to add, and no separate charge.
        </span>
      </Card>
      <Card tone="flat" pad="md" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[['Accidental damage during a visit', 'circle-check'], ['Verified Xooters on every booking', 'badge-check'], ['A replacement if something goes wrong', 'repeat']].map(([t, ic]) => (
          <span key={t} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icon name={ic} size={17} color="var(--xoot-sage-500)" strokeWidth={2} />
            <span style={{ fontSize: 'var(--xoot-body-sm)' }}>{t}</span>
          </span>
        ))}
      </Card>
      <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)', lineHeight: 1.5 }}>
        XootCover is underwritten by Genric. Xoot is not the insurer, and cover is subject to the policy terms — we'll always help you lodge a claim, but approval sits with the insurer.
      </span>
    </DetailShell>
  );
}

/* Places live at module scope so an add survives navigating away and back. */
const PLACES = [
  { id: 'p1', icon: 'house', name: '14 Fredman Dr', suburb: 'Sandton', detail: '2 bed, 1 bath · Nomsa' },
  { id: 'p2', icon: 'building-2', name: 'Studio', suburb: 'Braamfontein', detail: '1 bath · Best available' },
  { id: 'p3', icon: 'bed-double', name: 'Guest flat', suburb: 'Rosebank', detail: 'short-let · turnaround mode', shortLet: true },
];

const PLACE_KINDS = [
  { value: 'house', label: 'Home', icon: 'house' },
  { value: 'building-2', label: 'Office', icon: 'building-2' },
  { value: 'bed-double', label: 'Short-let', icon: 'bed-double' },
];

function ManageMoreScreen({ onBack }) {
  const [tab, setTab] = React.useState('overview');
  const [places, setPlaces] = React.useState(PLACES);
  const [adding, setAdding] = React.useState(false);
  /* Which place has its calendar panel open. One at a time — two open sync panels is two sets
     of checkout dates on screen with nothing saying which property each belongs to. */
  const [syncing, setSyncing] = React.useState(null);
  const [draft, setDraft] = React.useState({ name: '', suburb: '', icon: 'house', beds: 1, baths: 1 });
  const [toast, setToast] = React.useState(null);

  const save = () => {
    if (!draft.name.trim() || !draft.suburb.trim()) return;
    XH.haptic('success');
    const place = {
      id: 'p' + Date.now(),
      icon: draft.icon,
      name: draft.name.trim(),
      suburb: draft.suburb.trim(),
      detail: `${draft.beds} bed, ${draft.baths} bath · Best available`,
    };
    setPlaces(ps => { const next = [...ps, place]; PLACES.length = 0; PLACES.push(...next); return next; });
    setDraft({ name: '', suburb: '', icon: 'house', beds: 1, baths: 1 });
    setAdding(false);
    setToast(`${place.name} added`);
    window.setTimeout(() => setToast(null), 2400);
  };

  return (
    <DetailShell title="Manage more" subtitle="Properties, spend and bulk visits" onBack={onBack}>
      <Tabs items={[{ value: 'overview', label: 'Overview' }, { value: 'places', label: 'Places' }, { value: 'team', label: 'Team' }]} value={tab} onChange={setTab} />

      {tab === 'overview' && (
        <>
          <div style={{ display: 'flex', gap: 10 }}>
            {[['R4 280', 'spent this quarter', 'lilac'], ['14', 'visits completed', 'mist'], ['62', 'hours bought', 'sage']].map(([v, l, t]) => (
              <Card key={l} pad="md" style={{ flex: 1, background: `var(--xoot-${t}-wash)`, boxShadow: 'none', display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontFamily: 'var(--xoot-font-display)', fontSize: 'var(--xoot-title-2)', lineHeight: 1, color: `var(--xoot-${t}-ink)` }}>{v}</span>
                <span style={{ fontSize: 'var(--xoot-micro)', color: `var(--xoot-${t}-ink)`, opacity: .8, lineHeight: 1.3 }}>{l}</span>
              </Card>
            ))}
          </div>
          <Card tone="flat" pad="md" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>Spend by month</span>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 96 }}>
              {[42, 58, 51, 74, 66, 88].map((h, i) => (
                <span key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: '100%', height: h, borderRadius: 'var(--xoot-radius-xs)', background: i === 5 ? 'var(--xoot-violet-500)' : 'var(--xoot-violet-200)' }} />
                  <span style={{ fontSize: 'var(--xoot-micro)', color: 'var(--xoot-text-muted)' }}>{['F', 'M', 'A', 'M', 'J', 'J'][i]}</span>
                </span>
              ))}
            </div>
          </Card>
          <Card tone="flat" pad="md" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>By place</span>
            {[['14 Fredman Dr', 'R2 940', 68], ['Studio, Braamfontein', 'R1 340', 32]].map(([n, v, pct]) => (
              <div key={n} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--xoot-body-sm)' }}>
                  <span style={{ fontWeight: 600 }}>{n}</span>
                  <span style={{ fontFamily: 'var(--xoot-font-mono)', color: 'var(--xoot-text-secondary)' }}>{v}</span>
                </div>
                <Progress value={pct} size="sm" />
              </div>
            ))}
          </Card>
          <Button variant="outline" block icon="book-open">Download a statement</Button>
        </>
      )}

      {tab === 'places' && (
        <>
          {toast && <Toast tone="success" title={toast} onDismiss={() => setToast(null)} />}

          {places.map(pl => (
            <React.Fragment key={pl.id}>
            <Card tone="flat" pad="md" interactive
              onClick={() => pl.shortLet && setSyncing(syncing === pl.id ? null : pl.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ display: 'grid', placeItems: 'center', width: 38, height: 38, flex: '0 0 auto', borderRadius: 'var(--xoot-radius-key)', background: 'var(--xoot-surface-sunken)' }}>
                <Icon name={pl.icon} size={19} color="var(--xoot-icon-outline)" strokeWidth={1.8} />
              </span>
              <span style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 'var(--xoot-body)', fontWeight: 600 }}>{pl.name}</span>
                <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {pl.suburb} · {pl.detail}
                </span>
              </span>
              {/* Only short-lets offer sync — a home has no checkout to sync against, and
                  offering it everywhere would make the feature look misunderstood. */}
              {pl.shortLet && (
                <span className="xoot-label" style={{
                  flex: '0 0 auto', padding: '6px 10px', borderRadius: 'var(--xoot-radius-pill)',
                  background: 'var(--xoot-blush-wash)', color: 'var(--xoot-blush-ink)',
                }}>
                  {syncing === pl.id ? 'Close' : 'Sync'}
                </span>
              )}
              <Icon name={pl.shortLet && syncing === pl.id ? 'chevron-up' : 'chevron-right'} size={17} color="var(--xoot-neutral-400)" />
            </Card>

            {/* The panel sits directly under its own property, so the checkout dates on screen
                are unambiguously that place's. A separate Calendars tab would make a host
                re-select the property they were already looking at. */}
            {pl.shortLet && syncing === pl.id && (
              <div style={{
                padding: 'var(--xoot-space-4)', borderRadius: 'var(--xoot-radius-md)',
                background: 'var(--xoot-surface-page-alt)',
                animation: 'xoot-appear var(--xoot-dur-base) var(--xoot-ease-ios-nav) both',
              }}>
                <CalendarSync place={pl.name} />
              </div>
            )}
            </React.Fragment>
          ))}

          {adding ? (
            <Card pad="md" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>New place</span>

              <div style={{ display: 'flex', gap: 8 }}>
                {PLACE_KINDS.map(k => {
                  const on = draft.icon === k.value;
                  return (
                    <button key={k.value} type="button"
                      onClick={() => { XH.haptic('selection'); setDraft(d => ({ ...d, icon: k.value })); }}
                      style={{
                        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                        padding: '12px 6px', border: 'none', borderRadius: 'var(--xoot-radius-sm)', cursor: 'pointer',
                        background: on ? 'var(--xoot-action-brand-soft)' : 'var(--xoot-surface-sunken)',
                        boxShadow: on ? 'inset 0 0 0 1.5px var(--xoot-violet-500)' : 'none',
                        transition: 'all var(--xoot-dur-fast) var(--xoot-ease-out)',
                      }}>
                      <Icon name={k.icon} size={19} color={on ? 'var(--xoot-violet-700)' : 'var(--xoot-icon-outline)'} strokeWidth={1.9} />
                      <span style={{ fontSize: 'var(--xoot-caption)', fontWeight: 700, color: on ? 'var(--xoot-violet-700)' : 'var(--xoot-text-secondary)' }}>{k.label}</span>
                    </button>
                  );
                })}
              </div>

              <Input label="What do you call it?" placeholder="Guest flat" value={draft.name}
                onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} />
              <Input label="Address" icon="map-pin" placeholder="21 Tyrwhitt Ave, Rosebank" value={draft.suburb}
                onChange={e => setDraft(d => ({ ...d, suburb: e.target.value }))}
                hint="We only share this with your Xooter, and only on the day." />

              <div style={{ display: 'flex', gap: 12 }}>
                {[['Bedrooms', 'beds'], ['Bathrooms', 'baths']].map(([label, key]) => (
                  <div key={key} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '10px 12px', borderRadius: 'var(--xoot-radius-sm)', background: 'var(--xoot-surface-sunken)' }}>
                    <span style={{ fontSize: 'var(--xoot-caption)', fontWeight: 700, color: 'var(--xoot-text-secondary)' }}>{label}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button type="button" aria-label={'Fewer ' + label} onClick={() => { XH.haptic('light'); setDraft(d => ({ ...d, [key]: Math.max(0, d[key] - 1) })); }}
                        style={{ display: 'grid', placeItems: 'center', width: 26, height: 26, border: 'none', borderRadius: '50%', background: 'var(--xoot-surface-card)', cursor: 'pointer', color: 'var(--xoot-text-primary)' }}>
                        <Icon name="minus" size={13} strokeWidth={2.6} />
                      </button>
                      <span style={{ minWidth: 14, textAlign: 'center', fontFamily: 'var(--xoot-font-display)', fontSize: 'var(--xoot-title-3)' }}>{draft[key]}</span>
                      <button type="button" aria-label={'More ' + label} onClick={() => { XH.haptic('light'); setDraft(d => ({ ...d, [key]: d[key] + 1 })); }}
                        style={{ display: 'grid', placeItems: 'center', width: 26, height: 26, border: 'none', borderRadius: '50%', background: 'var(--xoot-surface-card)', cursor: 'pointer', color: 'var(--xoot-text-primary)' }}>
                        <Icon name="plus" size={13} strokeWidth={2.6} />
                      </button>
                    </span>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="outline" block onClick={() => { XH.haptic('light'); setAdding(false); }}>Cancel</Button>
                <Button variant="primary" block disabled={!draft.name.trim() || !draft.suburb.trim()} onClick={save}>Save place</Button>
              </div>
            </Card>
          ) : (
            <Button variant="outline" block icon="plus" onClick={() => { XH.haptic('light'); setAdding(true); }}>Add another place</Button>
          )}

          <Button variant="ghost" block icon="repeat">Apply one schedule to all places</Button>
        </>
      )}

      {tab === 'team' && (
        <>
          <Card tone="flat" pad="md" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[['Nadia Khan', 'Owner · all places'], ['Ruan Venter', 'Can book · Studio only']].map(([n, r]) => (
              <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                <Avatar name={n} size="sm" />
                <span style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <span style={{ fontSize: 'var(--xoot-body-sm)', fontWeight: 600 }}>{n}</span>
                  <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)' }}>{r}</span>
                </span>
              </div>
            ))}
          </Card>
          <Button variant="outline" block icon="plus">Invite someone</Button>
          <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)', lineHeight: 1.5 }}>
            People you invite can book and track visits. They never see your payment details or access codes.
          </span>
        </>
      )}
    </DetailShell>
  );
}

function CalendarScreen({ onBack }) {
  const [srcs, setSrcs] = React.useState({ apple: true, google: true, outlook: false });
  const SOURCES = [
    { key: 'apple', name: 'Apple Calendar', detail: 'nadia@icloud.com', icon: 'calendar' },
    { key: 'google', name: 'Google Calendar', detail: 'nadia@gmail.com', icon: 'calendar' },
    { key: 'outlook', name: 'Outlook', detail: 'Not connected', icon: 'calendar' },
  ];
  return (
    <DetailShell title="Connected calendars" subtitle="Your visits, in the calendar you already use" onBack={onBack}>
      <Card tone="flat" pad="md" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {SOURCES.map(s => (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ display: 'grid', placeItems: 'center', width: 38, height: 38, borderRadius: 'var(--xoot-radius-key)', background: `var(--xoot-cal-${s.key === 'outlook' ? 'outlook' : s.key})`, opacity: srcs[s.key] ? 1 : .3 }}>
              <Icon name={s.icon} size={19} color="#fff" strokeWidth={2} />
            </span>
            <span style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 'var(--xoot-body)', fontWeight: 600 }}>{s.name}</span>
              <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)' }}>{s.detail}</span>
            </span>
            <Switch size="sm" checked={srcs[s.key]} onChange={() => { XH.haptic('light'); setSrcs(v => ({ ...v, [s.key]: !v[s.key] })); }} />
          </div>
        ))}
      </Card>
      <QuietUpdate headline="Your plans live outside Xoot too."
        detail="Every booking writes into your own calendar, so if you never open this app again, you still know when someone's coming."
        channels={['calendar', 'push']} />
    </DetailShell>
  );
}

function NotificationsScreen({ onBack }) {
  const [push, setPush] = usePref('push');
  const [email, setEmail] = usePref('email');
  const [whatsapp, setWhatsapp] = usePref('whatsapp');
  const [marketing, setMarketing] = usePref('marketing');

  /* The channel hierarchy is a policy, not a preference. In-app first, email second,
     WhatsApp only for time-critical operational events, SMS only for verification codes.
     Each row names the channel that actually fires, so nobody is surprised by where a
     message lands — or waits for one that was never going to come. */
  const EVENTS = [
    { title: 'Your Xooter is on the way',   channels: ['Push', 'WhatsApp'], urgent: true },
    { title: 'They\u2019ve arrived',            channels: ['Push', 'WhatsApp'], urgent: true },
    { title: 'Same-day change or no-show',  channels: ['Push', 'WhatsApp'], urgent: true },
    { title: 'Anything about your safety',  channels: ['Push', 'WhatsApp'], urgent: true },
    { title: 'Booking confirmed',           channels: ['In-app', 'Email'] },
    { title: 'Receipts and refunds',        channels: ['Email'] },
    { title: 'Care+ and XootCred updates',  channels: ['In-app'] },
    { title: 'Messages from your Xooter',   channels: ['In-app', 'Push'] },
    { title: 'Sign-in codes',               channels: ['SMS'] },
  ];

  return (
    <DetailShell title="Notifications" subtitle="Where each kind of message lands" onBack={onBack}>
      <Card tone="flat" pad="md" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>Channels</span>
        <Switch checked={push} onChange={() => { XH.haptic('light'); setPush(!push); }}
          label="Push notifications" description="On the way, arrived, finished" />
        <Switch checked={email} onChange={() => { XH.haptic('light'); setEmail(!email); }}
          label="Email" description="Confirmations, receipts, statements" />
        <Switch checked={whatsapp} onChange={() => { XH.haptic('light'); setWhatsapp(!whatsapp); }}
          label="WhatsApp" description="Time-critical updates only" />
      </Card>

      <Card tone="flat" pad="md" style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
        <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>What reaches you, and how</span>
        {EVENTS.map(e => (
          <div key={e.title} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ flex: 1, minWidth: 0, fontSize: 'var(--xoot-body-sm)', fontWeight: e.urgent ? 700 : 500 }}>{e.title}</span>
            <span style={{ display: 'flex', gap: 4, flex: '0 0 auto' }}>
              {e.channels.map(c => (
                <span key={c} style={{
                  display: 'inline-flex', alignItems: 'center', height: 22, padding: '0 8px',
                  borderRadius: 'var(--xoot-radius-pill)',
                  background: c === 'WhatsApp' ? 'var(--xoot-sage-wash)' : 'var(--xoot-surface-sunken)',
                  color: c === 'WhatsApp' ? 'var(--xoot-sage-ink)' : 'var(--xoot-text-secondary)',
                  fontSize: 'var(--xoot-micro)', fontWeight: 700, letterSpacing: '.02em',
                }}>{c}</span>
              ))}
            </span>
          </div>
        ))}
      </Card>

      <Card tone="flat" pad="md" style={{ display: 'flex', gap: 11 }}>
        <Icon name="info" size={18} color="var(--xoot-icon-outline)" strokeWidth={1.9} style={{ marginTop: 1 }} />
        <span style={{ fontSize: 'var(--xoot-body-sm)', lineHeight: 1.5, color: 'var(--xoot-text-secondary)' }}>
          We never use WhatsApp for offers, reminders, rewards or general support — only for the four
          urgent things above. Everything else stays in the app or your inbox.
        </span>
      </Card>

      <Card tone="flat" pad="md">
        <Switch checked={marketing} onChange={() => { XH.haptic('light'); setMarketing(!marketing); }}
          label="Offers and new services" description="Email only, about once a month. Off by default." />
      </Card>
    </DetailShell>
  );
}

function SiriScreen({ onBack }) {
  const [added, setAdded] = React.useState(['Book a cleaner']);
  return (
    <DetailShell title="Siri & Concierge" subtitle="Book by voice, finish in the app" onBack={onBack}>
      <ConciergePrompt suggestions={['Move my Thursday visit', 'Is my Xooter on the way?', 'Add laundry']} onAsk={() => {}} />
      <SiriShortcuts added={added} onAdd={p => setAdded(a => a.includes(p) ? a.filter(x => x !== p) : [...a, p])} />
    </DetailShell>
  );
}

function WidgetsScreen({ onBack }) {
  const CATALOGUE = {
    next:      { id: 'next',      name: 'Next visit',      detail: 'When, who, and how it’s going', icon: 'calendar-check', tint: 'lilac' },
    cred:      { id: 'cred',      name: 'XootCred',        detail: 'What you have to spend',        icon: 'wallet',         tint: 'sage' },
    favourite: { id: 'favourite', name: 'Your Xooter',     detail: 'Rebook in one tap',             icon: 'heart',          tint: 'blush' },
    readiness: { id: 'readiness', name: 'Home readiness',  detail: 'What’s still worth telling us', icon: 'house',          tint: 'lilac' },
  };
  const [mine, setMine] = React.useState(['next', 'cred']);
  const [preview, setPreview] = React.useState('next');
  const [size, setSize] = React.useState('medium');
  const [toast, setToast] = React.useState(null);

  const PREVIEW = {
    next:      <NextBookingWidget size={size} when="Wed 08:00" service="Regular cleaning" xooter="Nomsa" status="Booked" />,
    cred:      <XootCredWidget size={size === 'medium' ? 'medium' : 'small'} available={30} expires="31 Aug" />,
    favourite: <FavouriteXooterWidget size={size === 'medium' ? 'medium' : 'small'} name="Nomsa" visits={12} />,
    readiness: <HomeReadinessWidget size={size} score={72} memory={4} prompt="Add your alarm code" />,
  }[preview];

  const move = (from, to) => setMine(m => {
    const next = m.slice();
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    return next;
  });

  return (
    <DetailShell title="Widgets" subtitle="Put Xoot on your home screen" onBack={onBack}>
      <WidgetGallery
        title={CATALOGUE[preview].name}
        subtitle={CATALOGUE[preview].detail + ' — without opening the app.'}
        sizes={['small', 'medium']} size={size} onSizeChange={setSize}
        onAdd={() => { XH.haptic('success'); setMine(m => m.includes(preview) ? m : [...m, preview]); setToast('Added to your home screen'); window.setTimeout(() => setToast(null), 2400); }}
        style={{ borderRadius: 'var(--xoot-radius-lg)', boxShadow: 'var(--xoot-shadow-2)' }}>
        {PREVIEW}
      </WidgetGallery>

      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
        {Object.keys(CATALOGUE).map(k => (
          <button key={k} type="button" onClick={() => { XH.haptic('selection'); setPreview(k); }}
            style={{
              flex: '0 0 auto', height: 34, padding: '0 13px', border: 'none',
              borderRadius: 'var(--xoot-radius-pill)', cursor: 'pointer',
              background: preview === k ? 'var(--xoot-action-primary)' : 'var(--xoot-surface-card)',
              color: preview === k ? '#fff' : 'var(--xoot-text-secondary)',
              boxShadow: preview === k ? 'none' : 'inset 0 0 0 1px var(--xoot-border-color)',
              fontSize: 'var(--xoot-body-sm)', fontWeight: 700, fontFamily: 'var(--xoot-font-core)',
              whiteSpace: 'nowrap',
            }}>{CATALOGUE[k].name}</button>
        ))}
      </div>

      {toast && <Toast tone="success" title={toast} onDismiss={() => setToast(null)} />}

      <WidgetPicker
        added={mine.map(id => CATALOGUE[id])}
        available={Object.keys(CATALOGUE).filter(k => !mine.includes(k)).map(id => CATALOGUE[id])}
        onAdd={id => { XH.haptic('success'); setMine(m => [...m, id]); }}
        onRemove={id => { XH.haptic('light'); setMine(m => m.filter(x => x !== id)); }}
        onReorder={move} />

      <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)', lineHeight: 1.5 }}>
        Long-press your home screen, tap +, and search for Xoot. Widgets only ever show a summary —
        never your address, and never your access codes.
      </span>
    </DetailShell>
  );
}

function ReferScreen({ onBack }) {
  /* Live against XootRefer. This screen used to be four hardcoded friends and a typed-in total:
     the code came from a string in data.js, the list was a literal, and nothing could be referred.
     Every number below is now computed from what the user actually did. */
  const RF = window.XootRefer.useRefer();
  const s = RF.summary();
  const [copied, setCopied] = React.useState(null);
  const [adding, setAdding] = React.useState(false);
  const [who, setWho] = React.useState('');

  const STATES = {
    booked:  { label: `+R${s.reward}`, tone: 'success', detail: 'Booked — credit paid' },
    joined:  { label: 'Pending',        tone: 'warning', detail: 'Joined, no booking yet' },
    invited: { label: 'Sent',           tone: 'neutral', detail: 'Invite sent' },
  };

  const flash = (k) => { XH.haptic('success'); setCopied(k); window.setTimeout(() => setCopied(null), 2200); };

  async function doShare() {
    const r = await RF.share();
    if (r.ok) flash(r.via === 'sheet' ? 'shared' : 'link');
  }

  function addInvite() {
    const name = who.trim();
    if (!name) return;
    RF.invite({ to: name, name, via: 'manual' });
    setWho(''); setAdding(false); XH.haptic('success');
  }

  return (
    <DetailShell title="Refer & earn" onBack={onBack}
      cta={<Button variant="primary" size="lg" block icon="handshake" onClick={doShare}>
        {copied === 'link' ? 'Link copied' : copied === 'shared' ? 'Shared' : 'Share your link'}</Button>}>
      <Card pad="lg" radius="lg" style={{ background: 'var(--xoot-careplus-wash)', boxShadow: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center' }}>
        <span style={{ display: 'grid', placeItems: 'center', width: 62, height: 62, borderRadius: 'var(--xoot-radius-lg)', background: 'rgba(255,255,255,.7)' }}>
          <Icon name="handshake" size={30} color="var(--xoot-careplus-ink)" strokeWidth={1.7} />
        </span>
        <span style={{ fontFamily: 'var(--xoot-font-display)', fontSize: 'var(--xoot-display-3)', color: 'var(--xoot-careplus-ink)', lineHeight: 1.08 }}>R{s.reward} each</span>
        <span style={{ fontSize: 'var(--xoot-body)', color: 'var(--xoot-careplus-ink)', opacity: .9, maxWidth: 260 }}>
          They get R{s.reward} off their first visit. You get R{s.reward} once that visit is booked and paid.
        </span>
      </Card>

      {/* The code is theirs and stays put — no regenerating, no expiry games. */}
      <Card tone="flat" pad="md" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>Your code</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            flex: 1, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 'var(--xoot-radius-sm)', background: 'var(--xoot-surface-sunken)',
            fontFamily: 'var(--xoot-font-mono)', fontSize: 19, letterSpacing: '.08em',
            color: 'var(--xoot-text-primary)',
          }}>{s.code || 'Sign in for a code'}</span>
          <IconButton icon={copied === 'code' ? 'check' : 'copy'} label="Copy code" variant="surface" size="lg"
            onClick={() => { if (s.code) { navigator.clipboard && navigator.clipboard.writeText(s.code); flash('code'); } }} />
        </div>
        <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)' }}>
          Yours for good — built from your name so you can say it out loud. No 0 or 1, so nobody mishears it.
        </span>
      </Card>

      <Card tone="flat" pad="md" style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>Your invites</span>
          <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)' }}>
            {s.sent} sent · {s.booked} booked
          </span>
        </div>

        {!s.invites.length && (
          <span style={{ fontSize: 'var(--xoot-body-sm)', color: 'var(--xoot-text-muted)', lineHeight: 1.55 }}>
            Nobody yet. Share your link and whoever uses it shows up here — sent, joined, then booked.
          </span>
        )}

        {s.invites.slice().reverse().map(i => (
          <div key={i.to + i.at} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <Avatar name={i.name} size="sm" />
            <span style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 'var(--xoot-body-sm)', fontWeight: 600 }}>{i.name}</span>
              <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)' }}>{STATES[i.state].detail}</span>
            </span>
            <Badge tone={STATES[i.state].tone} size="sm">{STATES[i.state].label}</Badge>
          </div>
        ))}

        {adding ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <Input label="Who are you inviting?" value={who} placeholder="Name or number"
              onChange={e => setWho(e.target.value)} style={{ flex: 1 }} />
            <Button variant="primary" onClick={addInvite}>Add</Button>
          </div>
        ) : (
          <Button variant="ghost" size="sm" icon="plus" onClick={() => setAdding(true)}>Track someone you invited</Button>
        )}

        <span style={{ height: 1, background: 'var(--xoot-neutral-200)' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 'var(--xoot-body-sm)', fontWeight: 700 }}>Earned so far</span>
          <span style={{ fontFamily: 'var(--xoot-font-mono)', fontSize: 'var(--xoot-body-sm)', color: 'var(--xoot-sage-ink)' }}>
            R{s.earned}
          </span>
        </div>
        {s.pending > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 'var(--xoot-body-sm)', color: 'var(--xoot-text-muted)' }}>Waiting on their first booking</span>
            <span style={{ fontFamily: 'var(--xoot-font-mono)', fontSize: 'var(--xoot-body-sm)', color: 'var(--xoot-text-muted)' }}>
              R{s.pending}
            </span>
          </div>
        )}
      </Card>

      <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)', lineHeight: 1.5 }}>
        Credit lands in your XootCred once their first visit is booked and paid — not when they sign
        up, because a sign-up isn't a clean. It doesn't expire. Up to {s.cap} friends a year
        {s.capLeft < s.cap ? ` — ${s.capLeft} left this year` : ''}.
      </span>
    </DetailShell>
  );
}

function PrivacyScreen({ onBack }) {
  const [revoked, setRevoked] = React.useState(false);
  return (
    <DetailShell title="Privacy & your data" onBack={onBack}>
      {/* Revocation is a control, not a support request. One tap, effective immediately. */}
      <Card pad="md" style={{ display: 'flex', flexDirection: 'column', gap: 12, background: revoked ? 'var(--xoot-coral-50)' : 'var(--xoot-surface-card)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon name={revoked ? 'lock' : 'key'} size={20} color={revoked ? 'var(--xoot-coral-700)' : 'var(--xoot-icon-outline)'} strokeWidth={1.9} />
          <span style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <span style={{ fontSize: 'var(--xoot-body)', fontWeight: 700, color: revoked ? 'var(--xoot-coral-700)' : 'var(--xoot-text-primary)' }}>
              {revoked ? 'Access revoked' : 'Xooter access to your codes'}
            </span>
            <span style={{ fontSize: 'var(--xoot-caption)', color: revoked ? 'var(--xoot-coral-700)' : 'var(--xoot-text-muted)', opacity: revoked ? .85 : 1 }}>
              {revoked ? 'No Xooter can see your codes right now' : 'Open 45 min before a visit, closed 30 min after'}
            </span>
          </span>
        </span>
        <Button variant={revoked ? 'outline' : 'primary'} block
          onClick={() => { XH.haptic(revoked ? 'success' : 'warning'); setRevoked(!revoked); }}
          style={revoked ? null : { background: 'var(--xoot-coral-500)', boxShadow: 'none' }}>
          {revoked ? 'Restore access' : 'Revoke access now'}
        </Button>
        <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)', lineHeight: 1.45 }}>
          {revoked
            ? "Your Xooter will need you to let them in until you restore this."
            : 'Takes effect immediately, even mid-visit. You can restore it any time.'}
        </span>
      </Card>

      <Card tone="flat" pad="md" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {[['Your access codes are time-locked', 'Xooters can only see gate and alarm codes from 45 minutes before a visit until 30 minutes after it ends.', 'lock'],
          ['Screenshots are blocked', "On the Xooter's side, screens showing your access details can't be captured.", 'camera'],
          ['Cancelled means gone', 'Cancel a booking and your details are withdrawn from the Xooter immediately.', 'x']].map(([t, d, ic]) => (
          <div key={t} style={{ display: 'flex', gap: 11 }}>
            <Icon name={ic} size={19} color="var(--xoot-icon-outline)" strokeWidth={1.8} style={{ marginTop: 2 }} />
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 'var(--xoot-body)', fontWeight: 600 }}>{t}</span>
              <span style={{ fontSize: 'var(--xoot-body-sm)', color: 'var(--xoot-text-secondary)', lineHeight: 1.5 }}>{d}</span>
            </span>
          </div>
        ))}
      </Card>
      <Button variant="outline" block icon="book-open">Download my data</Button>
      <Button variant="ghost" block style={{ color: 'var(--xoot-coral-700)' }}>Delete my account</Button>
      <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)', lineHeight: 1.5 }}>
        Leaving is easy on purpose. Your bookings stay in your own calendar, and you can take your data with you.
      </span>
    </DetailShell>
  );
}

function HelpScreen({ onBack }) {
  return (
    <DetailShell title="Get help" subtitle="We usually reply within the hour" onBack={onBack}
      cta={<Button variant="primary" size="lg" block icon="message-circle">Start a conversation</Button>}>
      {[['Something went wrong with a visit', 'circle-alert'], ['I need to change a booking', 'calendar'],
        ['A question about a charge', 'credit-card'], ['Something about my Xooter', 'user']].map(([t, ic]) => (
        <Card key={t} tone="flat" pad="md" interactive style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Icon name={ic} size={19} color="var(--xoot-icon-outline)" strokeWidth={1.8} />
          <span style={{ flex: 1, fontSize: 'var(--xoot-body)', fontWeight: 600 }}>{t}</span>
          <Icon name="chevron-right" size={17} color="var(--xoot-neutral-400)" />
        </Card>
      ))}
    </DetailShell>
  );
}

function HowScreen({ onBack }) {
  return (
    <DetailShell title="How Xoot works" onBack={onBack}>
      {[['You book', 'Pick what you need, where, and when. Takes about a minute.', 'calendar-check'],
        ['You pay up front', 'Your payment is held securely — nothing reaches your Xooter yet.', 'lock'],
        ['We match a Xooter', "Vetted, insured, and rated by people in your area.", 'users'],
        ['They arrive and work', "You'll know when they're on the way, when they arrive, and when they're done.", 'sparkles'],
        ['Your Xooter is paid', 'Once the visit is complete and verified, we release their payout.', 'wallet']].map(([t, d, ic], i) => (
        <div key={t} style={{ display: 'flex', gap: 14 }}>
          <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: '0 0 auto' }}>
            <span style={{ display: 'grid', placeItems: 'center', width: 38, height: 38, borderRadius: '50%', background: 'var(--xoot-violet-100)' }}>
              <Icon name={ic} size={18} color="var(--xoot-violet-700)" strokeWidth={2} />
            </span>
            {i < 4 && <span style={{ flex: 1, width: 2, minHeight: 22, background: 'var(--xoot-violet-100)' }} />}
          </span>
          <span style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingBottom: i < 4 ? 16 : 0 }}>
            <span style={{ fontFamily: 'var(--xoot-font-display)', fontSize: 'var(--xoot-title-3)' }}>{t}</span>
            <span style={{ fontSize: 'var(--xoot-body-sm)', color: 'var(--xoot-text-secondary)', lineHeight: 1.5 }}>{d}</span>
          </span>
        </div>
      ))}
    </DetailShell>
  );
}

function AccountScreen({ onBack }) {
  return (
    <DetailShell title="Your account" onBack={onBack}
      cta={<Button variant="primary" size="lg" block>Save changes</Button>}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, paddingTop: 4 }}>
        <MemberRing active><Avatar name="Nadia Khan" size="xl" /></MemberRing>
        <Button variant="ghost" size="sm">Change photo</Button>
      </div>
      <Input label="Your name" defaultValue="Nadia Khan" />
      <Input label="Email" defaultValue="nadia@example.co.za" icon="book-open" />
      <Input label="Mobile" defaultValue="+27 82 194 8820" icon="phone" hint="We use this for arrival updates only." />
      <Select label="Preferred language" options={['English', 'isiZulu', 'Afrikaans', 'Sesotho']} />
    </DetailShell>
  );
}

function InvoicesScreen({ onBack }) {
  return (
    <DetailShell title="Receipts & invoices" onBack={onBack}>
      <Card tone="flat" pad="md" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {[['Airbnb turnaround', '29 Jul', 'R355'], ['Regular cleaning', '22 Jul', 'R310'], ['Laundry & ironing', '20 Jul', 'R180']].map(([t, d, a]) => (
          <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <Icon name="book-open" size={18} color="var(--xoot-icon-outline)" strokeWidth={1.8} />
            <span style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <span style={{ fontSize: 'var(--xoot-body-sm)', fontWeight: 600 }}>{t}</span>
              <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)' }}>{d}</span>
            </span>
            <span style={{ fontFamily: 'var(--xoot-font-mono)', fontSize: 'var(--xoot-body-sm)' }}>{a}</span>
            <Icon name="chevron-right" size={16} color="var(--xoot-neutral-400)" />
          </div>
        ))}
      </Card>
      <Button variant="outline" block icon="briefcase">Add company billing details</Button>
    </DetailShell>
  );
}

function HomeEditScreen({ onBack }) {
  return (
    <DetailShell title="14 Fredman Dr" subtitle="Sandton" onBack={onBack}
      cta={<Button variant="primary" size="lg" block>Save this place</Button>}>
      <Input label="Address" defaultValue="14 Fredman Dr, Sandton 2196" icon="map-pin" />
      <Select label="What is it?" options={['Home', 'Office', 'Short-let / Airbnb', 'Other']} />
      <Card tone="flat" pad="md" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>Getting in</span>
        <Select label="How does your Xooter get in?" options={["I'll be home", 'Key with the concierge', 'Gate code', 'Key in the lockbox']} />
        <Input label="Gate code" defaultValue="1408#" icon="lock" hint="Only visible to your Xooter from 45 minutes before a visit." />
      </Card>
      <Input label="Anything else worth knowing?" icon="pencil" defaultValue="Biscuit is friendly, please don't let him out the front." />
    </DetailShell>
  );
}

Object.assign(window, {
  ProfileScreen, CredScreen, PaymentScreen, CoverScreen, ManageMoreScreen, CalendarScreen,
  NotificationsScreen, SiriScreen, WidgetsScreen, ReferScreen, PrivacyScreen, HelpScreen,
  HowScreen, AccountScreen, InvoicesScreen, HomeEditScreen,
});
})();

/* ═══ app/Visits.jsx ═════════════════════════════════════════════════════════ */
(function(){
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
})();

/* ═══ app/Tracking.jsx ═════════════════════════════════════════════════════════ */
(function(){
/* Live tracking — the map plus the staggered Xooter card stack.
   The map appears ONLY here, after a Xooter is assigned. During address entry it would
   cost a screen and a gesture without adding information. */
const {
  XooterStack, MapCanvas, IconButton, Button, Icon, Avatar, Badge, Toast, SOSButton,
} = window.XootNS;
const haptic = window.XootNS.Haptics.haptic;

/* The authoritative booking lifecycle. These names mirror the backend state machine —
   don't invent friendlier ones here, or the UI and the server drift apart.
   The happy path runs top to bottom; replacement_offered → reassigned is the recovery
   branch when an assigned Xooter falls through. */
const SEQUENCE = [
  'awaiting_assignment', 'assigned', 'contractor_accepted', 'en_route',
  'arrived', 'in_progress', 'completed',
];
const RECOVERY = ['replacement_required', 'replacement_offered', 'reassigned'];

const COPY = {
  pending_payment:      { title: 'Confirming your payment',   sub: 'One moment — we hold it securely, nothing has moved yet.' },
  payment_confirmed:    { title: 'Payment held',              sub: "It stays with us until the visit is done." },
  awaiting_assignment:  { title: 'Finding your Xooter',       sub: 'Someone close to you, usually within a minute.' },
  assigned:             { title: 'Nomsa is your Xooter',      sub: 'She has done 412 visits around Sandton.' },
  contractor_accepted:  { title: 'Nomsa confirmed',           sub: "She's accepted and will be there at 08:00." },
  en_route:             { title: 'Nomsa is on the way',       sub: "You don't need to be home — your gate code is saved." },
  arrived:              { title: 'Nomsa has arrived',         sub: 'She will start with the kitchen.' },
  in_progress:          { title: 'Visit in progress',         sub: 'Four hours from 08:00. You can close the app.' },
  completed:            { title: 'All done',                  sub: 'Nomsa finished at 12:04.' },
  rated:                { title: 'Thanks for rating',         sub: 'Your Xooter has been paid out.' },
  cancelled:            { title: 'Visit cancelled',           sub: 'Nothing was charged. Your access codes were withdrawn.' },
  replacement_required: { title: "Nomsa can't make it",       sub: "Not your problem to solve — we're already on it." },
  replacement_offered:  { title: 'We found someone else',     sub: 'Grace is free at the same time, same price.' },
  reassigned:           { title: 'Grace is your Xooter',      sub: 'Same slot, same price. Nothing for you to redo.' },
};

function TrackingScreen({ onBack, onChat, onRate }) {
  const D = window.XootData;
  const [i, setI] = React.useState(3);
  const [override, setOverride] = React.useState(null);
  const state = override || SEQUENCE[i];
  const setState = s => setOverride(s);
  const [expanded, setExpanded] = React.useState(false);
  const [shared, setShared] = React.useState(false);
  const [menu, setMenu] = React.useState(false);
  const [share, setShare] = React.useState(false);

  const pct = {
    awaiting_assignment: 0, assigned: 8, contractor_accepted: 14, en_route: 58,
    arrived: 100, in_progress: 100, completed: 100,
    replacement_required: 8, replacement_offered: 8, reassigned: 14,
  }[state] ?? 0;
  const eta = {
    awaiting_assignment: null, assigned: 'Arrives 08:00', contractor_accepted: 'Arrives 08:00',
    en_route: '12 min away', arrived: 'Here now', in_progress: 'Until 12:00', completed: 'Finished 12:04',
    replacement_required: null, replacement_offered: null, reassigned: 'Arrives 08:00',
  }[state];
  const c = COPY[state];

  const checklist = [
    { label: 'Kitchen & dishes', done: ['in_progress', 'completed'].includes(state) },
    { label: 'Bathrooms', done: state === 'completed' },
    { label: 'Bed linen changed', done: state === 'completed' },
  ];

  /* No Xooter to show while we're still matching, or while a replacement is being found. */
  const noXooter = ['awaiting_assignment', 'replacement_required', 'replacement_offered'].includes(state);
  const advance = () => { haptic('medium'); setI(n => Math.min(SEQUENCE.length - 1, n + 1)); };

  return (
    <>
      <div style={{ position: 'relative', flex: '0 0 auto', padding: '0 16px 4px' }}>
        <div style={{ borderRadius: 'var(--xoot-radius-lg)', overflow: 'hidden', boxShadow: 'var(--xoot-shadow-3)' }}>
          <MapCanvas progressPct={pct} height={300} showRoute={!noXooter} badge={false} />
        </div>
        <div style={{ position: 'absolute', left: 28, top: 12, display: 'flex', gap: 8 }}>
          <IconButton icon="arrow-left" label="Back" variant="surface" onClick={onBack} />
        </div>
        <div style={{ position: 'absolute', right: 28, top: 12 }}>
          <IconButton icon="ellipsis" label="More" variant="surface" onClick={() => { haptic('light'); setMenu(true); }} />
        </div>
        {/* Recentre, the way a ride-hailing map does it. Tracking happens IN the app — there's
            no hand-off to a maps app, because the route isn't the user's to drive. */}
        <button type="button" aria-label="Recentre" onClick={() => haptic('light')}
          style={{
            position: 'absolute', right: 28, bottom: 16, display: 'grid', placeItems: 'center',
            width: 38, height: 38, border: 'none', borderRadius: '50%',
            background: 'var(--xoot-surface-card)', boxShadow: 'var(--xoot-shadow-3)',
            color: 'var(--xoot-text-primary)', cursor: 'pointer',
          }}>
          <Icon name="map-pin" size={17} strokeWidth={2.2} />
        </button>
      </div>

      <Scroll bottom={116} style={{ position: 'relative', zIndex: 1, paddingTop: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--xoot-space-4)' }}>
          <div>
            <h1 style={{ fontSize: 'var(--xoot-title-1)', lineHeight: 'var(--xoot-title-1-lh)' }}>{c.title}</h1>
            <p style={{ fontSize: 'var(--xoot-body)', color: 'var(--xoot-text-secondary)', marginTop: 6 }}>{c.sub}</p>
          </div>

          <XooterStack
            state={state}
            eta={eta}
            expanded={expanded}
            onToggle={setExpanded}
            xooter={noXooter ? undefined : (state === 'reassigned' ? D.pros[2] : D.pros[0])}
            progress={['in_progress', 'completed'].includes(state) ? { items: checklist } : undefined}
            onChat={noXooter ? undefined : onChat}
            onCall={noXooter ? undefined : () => haptic('light')}
            onShare={noXooter ? undefined : () => { haptic('light'); setShare(true); }}
          />

          {shared && <Toast tone="success" title="ETA shared" description="Anyone with the link can see when Nomsa arrives." onDismiss={() => setShared(false)} />}

          {state === 'replacement_offered' && (
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="primary" block onClick={() => { haptic('success'); setState('reassigned'); }}>Grace works for me</Button>
              <Button variant="outline" block onClick={() => haptic('light')}>See other times</Button>
            </div>
          )}

          <button type="button" onClick={advance} disabled={i >= SEQUENCE.length - 1}
            style={{
              alignSelf: 'flex-start', border: 'none', background: 'none', padding: 0,
              color: 'var(--xoot-text-muted)', fontSize: 'var(--xoot-caption)',
              fontFamily: 'var(--xoot-font-mono)', cursor: i >= SEQUENCE.length - 1 ? 'default' : 'pointer',
            }}>
            {i >= SEQUENCE.length - 1 ? 'demo · final state' : `demo · advance to "${SEQUENCE[i + 1]}" →`}
          </button>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {RECOVERY.concat(['cancelled']).map(s => (
              <button key={s} type="button" onClick={() => { haptic('light'); setState(s); }}
                style={{
                  padding: '6px 10px', border: 'none', borderRadius: 'var(--xoot-radius-pill)',
                  background: state === s ? 'var(--xoot-honey-500)' : 'var(--xoot-surface-card)',
                  color: state === s ? '#fff' : 'var(--xoot-text-muted)',
                  boxShadow: state === s ? 'none' : 'inset 0 0 0 1px var(--xoot-border-color)',
                  fontFamily: 'var(--xoot-font-mono)', fontSize: 10, cursor: 'pointer',
                }}>{s}</button>
            ))}
            {override && (
              <button type="button" onClick={() => { haptic('light'); setOverride(null); }}
                style={{ padding: '6px 10px', border: 'none', borderRadius: 'var(--xoot-radius-pill)', background: 'transparent', color: 'var(--xoot-text-muted)', fontFamily: 'var(--xoot-font-mono)', fontSize: 10, cursor: 'pointer' }}>reset</button>
            )}
          </div>
        </div>
      </Scroll>

      {/* Only while someone is in the home. Before arrival it would alarm for no reason; after
          completion it is no longer a live situation. */}
      {['arrived', 'in_progress'].includes(state) && (
        <div style={{ padding: '0 20px 16px' }}>
          <SOSButton label="Hold for help" />
        </div>
      )}

      {menu && <ActionMenu onClose={() => setMenu(false)}
        items={[
          { icon: 'repeat', label: 'Reschedule this visit' },
          { icon: 'pencil', label: 'Edit access notes' },
          { icon: 'shield-check', label: 'About Booking Cover' },
          { icon: 'message-circle', label: 'Get help with this visit' },
          { icon: 'x', label: 'Cancel visit', danger: true },
        ]} />}

      {share && <ShareSheet onClose={() => setShare(false)}
        onShared={() => { setShared(true); window.setTimeout(() => setShared(false), 2600); }}
        eta={eta} name={state === 'reassigned' ? 'Grace' : 'Nomsa'} />}

      <DockedCTA note={['completed', 'cancelled'].includes(state) ? undefined : 'Free to cancel up to 24 hours before.'}>
        {state === 'completed'
          ? <Button variant="primary" size="lg" block onClick={onRate} iconRight="star">Rate this visit</Button>
          : state === 'cancelled'
            ? <Button variant="primary" size="lg" block onClick={onBack} icon="repeat">Book another time</Button>
            : <Button variant="outline" size="lg" block onClick={onChat} icon="message-circle" disabled={noXooter}>
                {noXooter ? 'Matching you now' : 'Message Nomsa'}
              </Button>}
      </DockedCTA>
    </>
  );
}

function ChatScreen({ onBack, closed = false }) {
  const [calling, setCalling] = React.useState(false);
  const [camera, setCamera] = React.useState(false);
  const [msgs, setMsgs] = React.useState([
    { from: 'them', text: 'Morning! On my way, about 12 minutes out.' },
    { from: 'me', text: 'Perfect. Gate code is 1408.' },
    { from: 'them', text: 'Got it, thank you. Biscuit is friendly?' },
  ]);
  const [draft, setDraft] = React.useState('');
  const quick = ['See you soon', 'Gate code is 1408', 'Please start upstairs', "I'll be home"];

  const send = t => {
    if (!t.trim()) return;
    haptic('light');
    setMsgs(m => [...m, { from: 'me', text: t }]);
    setDraft('');
  };

  return (
    <>
      <TopBar onBack={onBack} title="Nomsa Mahlangu" subtitle="Usually replies in a minute"
        trailing={<IconButton icon="phone" label="Call Nomsa" variant="surface"
          onClick={() => { haptic('medium'); setCalling(true); }} />} />
      <Scroll bottom={150}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--xoot-space-2)', paddingTop: 4 }}>
          {msgs.map((m, i) => m.photo ? (
            /* Photo bubble. The tinted frame stands in for the capture — a prototype has no
               camera — but the bubble shape, caption and delivery tick are the real thing, so
               dropping a live frame in later is a src swap rather than a rebuild. */
            <span key={i} style={{
              alignSelf: m.from === 'me' ? 'flex-end' : 'flex-start',
              maxWidth: '68%', display: 'flex', flexDirection: 'column', gap: 6,
              padding: 5, borderRadius: m.from === 'me' ? '18px 18px 6px 18px' : '18px 18px 18px 6px',
              background: m.from === 'me' ? 'var(--xoot-action-brand)' : 'var(--xoot-surface-card)',
              boxShadow: m.from === 'me' ? 'none' : 'var(--xoot-shadow-1)',
              animation: 'xoot-rise var(--xoot-dur-base) var(--xoot-ease-out)',
            }}>
              <span style={{
                position: 'relative', display: 'block', height: 132, borderRadius: 14,
                background: 'linear-gradient(152deg, #8E7F74 0%, #5C5049 48%, #3A322D 100%)',
                overflow: 'hidden',
              }}>
                <Icon name="camera" size={26} color="rgba(255,255,255,.72)" strokeWidth={1.7}
                  style={{ position: 'absolute', left: '50%', top: '50%', marginLeft: -13, marginTop: -13 }} />
              </span>
              <span style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '0 6px 3px',
                fontSize: 'var(--xoot-caption)',
                color: m.from === 'me' ? 'var(--xoot-text-on-brand)' : 'var(--xoot-text-muted)',
                opacity: m.from === 'me' ? .92 : 1,
              }}>
                {m.caption || 'Photo'}
                {m.from === 'me' && <Icon name="check" size={12} strokeWidth={3} style={{ marginLeft: 'auto' }} />}
              </span>
            </span>
          ) : (
            <span key={i} style={{
              alignSelf: m.from === 'me' ? 'flex-end' : 'flex-start',
              maxWidth: '78%', padding: '10px 14px',
              borderRadius: m.from === 'me' ? '18px 18px 6px 18px' : '18px 18px 18px 6px',
              background: m.from === 'me' ? 'var(--xoot-action-brand)' : 'var(--xoot-surface-card)',
              color: m.from === 'me' ? 'var(--xoot-text-on-brand)' : 'var(--xoot-text-primary)',
              boxShadow: m.from === 'me' ? 'none' : 'var(--xoot-shadow-1)',
              fontSize: 'var(--xoot-body)', lineHeight: 1.45,
              animation: 'xoot-rise var(--xoot-dur-base) var(--xoot-ease-out)',
            }}>{m.text}</span>
          ))}
        </div>
      </Scroll>
      {/* Once a visit is complete the thread closes — an open channel to someone's home after
          the job is done serves nobody, and support is the right route for anything after. */}
      {closed ? (
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 20,
          padding: '16px 16px 22px', background: 'var(--xoot-surface-page)',
          boxShadow: '0 -1px 0 var(--xoot-border-color)',
          display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', textAlign: 'center',
        }}>
          <Icon name="lock" size={19} color="var(--xoot-text-muted)" strokeWidth={1.9} />
          <span style={{ fontSize: 'var(--xoot-body-sm)', fontWeight: 700 }}>This chat is closed</span>
          <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)', lineHeight: 1.5, maxWidth: 260 }}>
            The visit is finished, so messaging has ended. Anything else, and our team will help.
          </span>
          <Button variant="outline" size="sm" icon="message-circle" style={{ marginTop: 4 }}>Message the team</Button>
        </div>
      ) : (
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 20,
        padding: '10px 16px 16px', background: 'var(--xoot-surface-page)',
        boxShadow: '0 -1px 0 var(--xoot-border-color)',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>
          {quick.map(q => (
            <button key={q} type="button" onClick={() => send(q)}
              style={{
                flex: '0 0 auto', height: 34, padding: '0 13px', border: 'none',
                borderRadius: 'var(--xoot-radius-pill)', background: 'var(--xoot-surface-card)',
                boxShadow: 'inset 0 0 0 1px var(--xoot-border-color)',
                fontSize: 'var(--xoot-body-sm)', fontWeight: 600, cursor: 'pointer',
                color: 'var(--xoot-text-secondary)', whiteSpace: 'nowrap',
              }}>{q}</button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <IconButton icon="camera" label="Send a photo" variant="surface"
            onClick={() => { haptic('light'); setCamera(true); }} />
          <input value={draft} onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') send(draft); }}
            placeholder="Message Nomsa"
            style={{
              flex: 1, height: 46, padding: '0 16px', border: 'none',
              borderRadius: 'var(--xoot-radius-pill)', background: 'var(--xoot-surface-card)',
              boxShadow: 'inset 0 0 0 1px var(--xoot-border-color)', outline: 'none',
              fontSize: 'var(--xoot-body)', fontFamily: 'var(--xoot-font-core)',
            }} />
          <IconButton icon="arrow-right" label="Send" variant="brand" onClick={() => send(draft)} />
        </div>
      </div>
      )}

      {calling && <CallScreen name="Nomsa Mahlangu" onEnd={() => { haptic('light'); setCalling(false); }} />}
      {camera && <CameraScreen
        onClose={() => setCamera(false)}
        onCapture={() => {
          haptic('success');
          setMsgs(m => [...m, { from: 'me', photo: true, caption: 'Sent just now' }]);
          setCamera(false);
        }} />}
    </>
  );
}

Object.assign(window, { TrackingScreen, ChatScreen });
})();

/* ═══ app/Rewards.jsx ═════════════════════════════════════════════════════════ */
(function(){
/* Rewards — encouragement, never pressure. Streak, points, and one honest unlock. */
const { Card, Progress, Badge, Button, Icon, Bloom, SectionLabel, Orb, Rating } = window.XootNS;
const XH = window.XootNS.Haptics;

/* The flower IS the progress meter. Cool at the start, warming as the levels climb, so the
   change reads as heat building rather than a random new colour each time.
   Levels beyond the list hold at the last palette — a ramp that loops would erase the sense
   of having got somewhere. */
const LEVEL_BLOOM = ['mist', 'sage', 'moss', 'honey', 'petal', 'red'];
const bloomFor = level => LEVEL_BLOOM[Math.min(LEVEL_BLOOM.length - 1, Math.max(0, level - 1))];

function RewardsScreen({ onOpen }) {
  const D = window.XootData;
  const [rated, setRated] = React.useState(false);
  const [comment, setComment] = React.useState('');
  const [sentComment, setSentComment] = React.useState(false);
  return (
    <>
      <div style={{ padding: '2px 20px 10px' }}>
        <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>Level {D.user.level} · Looked after</span>
        <h1 style={{ fontSize: 'var(--xoot-display-2)', lineHeight: 1.04, marginTop: 6 }}>Rewards</h1>
      </div>
      <Scroll bottom={100}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Card tone="dawn" pad="lg" radius="lg" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' }}>
            <Bloom size={72} palette={bloomFor(D.user.level)} />
            <span style={{ fontFamily: 'var(--xoot-font-display)', fontSize: 'var(--xoot-display-3)', lineHeight: 1.05, color: 'var(--xoot-ink-900)' }}>
              {D.user.streak} weeks looked after
            </span>
            <span style={{ fontSize: 'var(--xoot-body)', color: 'var(--xoot-ink-700)', maxWidth: 250 }}>
              Two more and your next deep clean is on us.
            </span>
            <Progress tone="streak" value={D.user.streak} max={14} style={{ width: '100%', marginTop: 4 }} />
          </Card>

          <div style={{ display: 'flex', gap: 12 }}>
            {[['flame', D.user.streak, 'week streak', 'blush'],
              ['sparkles', D.user.points + (rated ? 50 : 0), 'Xoot Points', 'lilac'],
              ['wallet', 'R' + D.user.credit, 'XootCred', 'moss']].map(([ic, v, l, t]) => (
              <Card key={l} pad="md" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, background: `var(--xoot-${t}-wash)`, boxShadow: 'none' }}>
                {/* On a pastel wash the glyph and text must be INK in both themes — the wash
                    itself darkens in dark mode, so a light-on-light pairing never happens. */}
                <Icon name={ic} size={22} color="var(--xoot-ink-900)" strokeWidth={1.7} />
                <span style={{ fontFamily: 'var(--xoot-font-display)', fontSize: 'var(--xoot-title-1)', lineHeight: 1, color: 'var(--xoot-ink-900)' }}>{v}</span>
                <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-ink-700)' }}>{l}</span>
              </Card>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            <SectionLabel slot="plain" label="Ways to earn" count={3} />
            {[['calendar-check', 'Keep your weekly visit', '+50 points each week', true],
              ['star', 'Rate a visit', '+20 points', true],
              ['handshake', 'Refer a neighbour', 'R100 each, once they book', false]].map(([ic, t, d, done]) => (
              <Card key={t} tone="flat" pad="md" interactive={!done}
                onClick={!done && onOpen ? () => onOpen('refer') : undefined}
                style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ display: 'grid', placeItems: 'center', width: 38, height: 38, borderRadius: 'var(--xoot-radius-key)', background: 'var(--xoot-neutral-50)' }}>
                  <Icon name={ic} size={19} color="var(--xoot-icon-outline)" strokeWidth={1.8} />
                </span>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1 }}>
                  <span style={{ fontSize: 'var(--xoot-body)', fontWeight: 700 }}>{t}</span>
                  <span style={{ fontSize: 'var(--xoot-body-sm)', color: 'var(--xoot-text-muted)' }}>{d}</span>
                </span>
                {done ? <Badge tone="success" size="sm" icon="check">Done</Badge> : <Icon name="chevron-right" size={17} color="var(--xoot-neutral-400)" />}
              </Card>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            <SectionLabel slot="plain" label="Unlocked" count={2} />
            <div style={{ display: 'flex', gap: 12 }}>
              {[['Free deep clean', 'sparkles', 'lilac', 'At 14 weeks'],
                ['Priority slots', 'zap', 'mist', 'Yours now']].map(([t, ic, tint, d]) => (
                <Card key={t} pad="md" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, background: `var(--xoot-${tint}-wash)`, boxShadow: 'none' }}>
                  <Icon name={ic} size={24} color="var(--xoot-ink-900)" strokeWidth={1.6} />
                  <span style={{ fontSize: 'var(--xoot-body)', fontWeight: 700, lineHeight: 1.25, color: 'var(--xoot-ink-900)' }}>{t}</span>
                  <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-ink-700)' }}>{d}</span>
                </Card>
              ))}
            </div>
          </div>

          {/* One tap is the whole ask. The comment box only appears after they've rated, and
              it is plainly optional — asking for prose up front is what kills response rates. */}
          <Card tone="flat" pad="md" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ display: 'grid', placeItems: 'center', width: 38, height: 38, flex: '0 0 auto', borderRadius: 'var(--xoot-radius-key)', background: 'var(--xoot-honey-wash)' }}>
                <Icon name="star" size={19} color="var(--xoot-ink-900)" strokeWidth={1.9} />
              </span>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 'var(--xoot-body)', fontWeight: 700 }}>Rate our app</span>
                <span style={{ fontSize: 'var(--xoot-body-sm)', color: 'var(--xoot-text-muted)' }}>
                  {rated ? 'Thank you — 50 points added.' : 'One tap. +50 Xoot Points.'}
                </span>
              </span>
              {rated
                ? <Badge tone="success" size="sm" icon="check">+50</Badge>
                : <Rating value={0} editable size={19} showNumber={false}
                    onChange={() => { XH.haptic('success'); setRated(true); }} />}
            </div>

            {rated && !sentComment && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9, animation: 'xoot-rise var(--xoot-dur-base) var(--xoot-ease-out)' }}>
                <span style={{ height: 1, background: 'var(--xoot-border-color)' }} />
                <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)' }}>
                  Anything you'd change? Entirely optional.
                </span>
                <textarea value={comment} onChange={e => setComment(e.target.value)} rows={2}
                  placeholder="A sentence is plenty"
                  style={{
                    border: 'none', outline: 'none', resize: 'none', padding: '11px 13px',
                    borderRadius: 'var(--xoot-radius-sm)', background: 'var(--xoot-surface-sunken)',
                    fontFamily: 'var(--xoot-font-core)', fontSize: 'var(--xoot-body-sm)',
                    color: 'var(--xoot-text-primary)', lineHeight: 1.45,
                  }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button variant="primary" size="sm" disabled={!comment.trim()}
                    onClick={() => { XH.haptic('success'); setSentComment(true); }}>Send</Button>
                  <Button variant="ghost" size="sm" onClick={() => { XH.haptic('light'); setSentComment(true); }}
                    style={{ color: 'var(--xoot-text-muted)' }}>No thanks</Button>
                </div>
              </div>
            )}
          </Card>

          <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)', lineHeight: 1.5, textAlign: 'center', padding: '0 12px' }}>
            Points are a thank-you, not a leash. Skip a week whenever you like — your streak pauses, it doesn't reset.
          </span>
        </div>
      </Scroll>
    </>
  );
}

Object.assign(window, { RewardsScreen });
})();

/* ═══ app/Gift.jsx ═════════════════════════════════════════════════════════ */
(function(){
/* Gift a Clean — buy someone a visit.

   The shape follows the gifting flows people already know: choose what you're giving, make
   it personal, pay. Two things are deliberately different from a discount code. First, the
   card is visible the whole way through and updates live, so the sender is decorating a
   present rather than filling in a form. Second, the recipient never sees a price — they see
   "3 cleans", because "R840 of cleaning" is a receipt, not a gift.

   On a phone the reference layout's side-by-side preview doesn't fit, so the card sits above
   the form and shrinks once you're deep in the fields. */
const {
  GiftCard, GiftTintPicker, Button, Icon, Card, Badge, Input, ServiceIcon, Bloom, CountUp,
  XOOT_SERVICES, Toast, RadioGroup,
} = window.XootNS;
const XH = window.XootNS.Haptics;

/* Gifts are whole visits, not amounts. Pricing follows the standard rate for the service. */
/* Grouped by the reason someone gives a clean. The occasion is what people are actually
   choosing between — "thank you" and "new baby" want different words. */
const PRESET_NOTES = [
  { group: 'Just because',  text: "Thought you could use a break." },
  { group: 'Just because',  text: "No occasion. You just deserve a quiet weekend." },
  { group: 'Thank you',     text: "For everything you did last month. Take the day off." },
  { group: 'Thank you',     text: "A small thank you, from all of us." },
  { group: 'New home',      text: "Welcome to the new place. Let someone else do the first clean." },
  { group: 'New baby',      text: "Congratulations. One less thing to think about." },
  { group: 'Hard week',     text: "Heard it's been a rough one. This is on me." },
  { group: 'Birthday',      text: "Happy birthday. Spend the day not cleaning." },
];

const BUNDLES = [
  { key: 1, label: 'One clean', note: 'A weekend back' },
  { key: 3, label: 'Three cleans', note: 'A month of breathing room' },
  { key: 6, label: 'Six cleans', note: 'Half a year, handled' },
  { key: 12, label: 'Twelve cleans', note: 'A whole year' },
];

function GiftFlow({ onDone, onCancel }) {
  const D = window.XootData;
  const [stage, setStage] = React.useState(0);
  const [service, setService] = React.useState('regular');
  const [count, setCount] = React.useState(3);
  const [tint, setTint] = React.useState('blush');
  const [via, setVia] = React.useState('email');
  const [to, setTo] = React.useState({ name: '', email: '' });
  const [from, setFrom] = React.useState('Nadia');
  const [note, setNote] = React.useState('');
  const [copied, setCopied] = React.useState(false);

  const svc = D.services.find(s => s.key === service) || D.services[0];
  /* PRICED BY THE ENGINE, NOT HERE. This used to be `svc.from * count`, which was wrong twice
     over: `from` is a marketing teaser (R280 for a regular clean) while the real ladder charges
     R250 for the same visit, and it silently omitted the booking fee the recipient would still
     have been asked for — so a "gift" left them with a bill. XootQuote prices a gift off the
     same ladder a booking uses and includes the fee, so a gifted clean genuinely costs the
     recipient nothing. */
  const { quote, pending } = window.XootQuote.useGiftQuote(
    React.useMemo(() => ({ service, count }), [service, count])
  );
  const total = quote.total;
  const title = `${count} ${count === 1 ? 'clean' : 'cleans'}`;

  const canSend = via === 'link' || (to.name.trim() && to.email.trim());
  const STAGES = ['Choose', 'Personalise', 'Pay'];

  const back = () => (stage === 0 ? onCancel() : setStage(stage - 1));
  const next = () => { XH.haptic(stage === 2 ? 'heavy' : 'medium'); setStage(s => s + 1); };

  if (stage === 3) {
    return (
      <>
        <Scroll bottom={130}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, paddingTop: 28, textAlign: 'center' }}>
            <Bloom size={86} palette="petal" />
            <h1 style={{ fontSize: 'var(--xoot-display-3)', lineHeight: 1.08 }}>
              {via === 'email' ? `On its way to ${to.name || 'them'}` : 'Your gift link is ready'}
            </h1>
            <p style={{ fontSize: 'var(--xoot-body)', color: 'var(--xoot-text-secondary)', maxWidth: 280, lineHeight: 1.55 }}>
              {via === 'email'
                ? `We've emailed ${to.email}. They can book whenever suits them — the cleans don't expire.`
                : 'Send it however you like. Whoever opens it can book whenever suits them.'}
            </p>
            <GiftCard tint={tint} title={title} note={note || undefined} from={from || undefined} width={230} height={190} />

            {/* What happens at the other end. The sender is the one who'll be asked, so they
                should not have to guess. The link opens a page, not the App Store — making
                someone install an app before they can see their own gift wastes it. */}
            <Card tone="flat" pad="md" style={{ width: '100%', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>What they'll see</span>
              {[
                ['book-open', 'The card opens in their browser', 'No app, no account, no card needed to look.'],
                ['phone', 'Then Xoot, to pick a time', "We'll take them to the App Store or Play Store."],
                ['calendar-check', 'They book whenever suits', "The cleans don't expire, and they work at any address."],
              ].map(([ic, t, d]) => (
                <div key={t} style={{ display: 'flex', gap: 11 }}>
                  <span style={{ display: 'grid', placeItems: 'center', width: 30, height: 30, flex: '0 0 auto', borderRadius: 'var(--xoot-radius-key)', background: 'var(--xoot-surface-sunken)' }}>
                    <Icon name={ic} size={15} color="var(--xoot-icon-outline)" strokeWidth={1.9} />
                  </span>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 'var(--xoot-body-sm)', fontWeight: 700 }}>{t}</span>
                    <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)', lineHeight: 1.45 }}>{d}</span>
                  </span>
                </div>
              ))}
            </Card>
            {via === 'link' && (
              <button type="button"
                onClick={() => { XH.haptic('success'); setCopied(true); window.setTimeout(() => setCopied(false), 2000); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, height: 46, padding: '0 18px',
                  border: 'none', borderRadius: 'var(--xoot-radius-pill)',
                  background: 'var(--xoot-surface-card)', boxShadow: 'inset 0 0 0 1px var(--xoot-border-color)',
                  fontFamily: 'var(--xoot-font-mono)', fontSize: 'var(--xoot-body-sm)', cursor: 'pointer',
                  color: 'var(--xoot-text-primary)',
                }}>
                <Icon name={copied ? 'check' : 'ticket-percent'} size={15} strokeWidth={2.3} />
                {copied ? 'Copied' : 'xoot.co.za/g/8FK2QM'}
              </button>
            )}
          </div>
        </Scroll>
        <DockedCTA>
          <Button variant="primary" size="lg" block onClick={onDone}>Done</Button>
        </DockedCTA>
      </>
    );
  }

  return (
    <>
      <TopBar onBack={back} title="Gift a clean" subtitle={`${STAGES[stage]} · step ${stage + 1} of 3`} />

      <Scroll bottom={140}>
        {/* The card leads. It shrinks once the form gets long, but never disappears —
            watching it change is the reason this doesn't feel like buying a voucher. */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--xoot-space-5)' }}>
          <GiftCard
            tint={tint} title={title}
            note={stage >= 1 && note ? note : undefined}
            from={stage >= 1 && from ? from : undefined}
            width={stage === 0 ? 240 : 190}
            height={stage === 0 ? 200 : 160}
          />
        </div>

        {stage === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--xoot-space-5)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--xoot-space-3)' }}>
              <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>Which service?</span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {D.services.filter(s => !s.comingSoon).slice(0, 6).map((s, i) => {
                  const on = service === s.key;
                  return (
                    <button key={s.key} type="button"
                      onClick={() => { XH.haptic('selection'); setService(s.key); }}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
                        padding: '12px 6px', border: 'none', borderRadius: 'var(--xoot-radius-md)',
                        cursor: 'pointer', background: on ? 'var(--xoot-surface-card)' : 'transparent',
                        boxShadow: on ? 'var(--xoot-shadow-2), inset 0 0 0 2px var(--xoot-violet-500)' : 'inset 0 0 0 1px var(--xoot-border-color)',
                        transition: 'all var(--xoot-dur-fast) var(--xoot-ease-out)',
                      }}>
                      <ServiceIcon service={s.key} size={38} delay={i * 60} motion={on ? 'breathe' : 'still'} />
                      <span style={{ fontSize: 10.5, fontWeight: 700, textAlign: 'center', lineHeight: 1.25 }}>{s.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--xoot-space-3)' }}>
              <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>How many?</span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {BUNDLES.map(b => {
                  const on = count === b.key;
                  return (
                    <button key={b.key} type="button"
                      onClick={() => { XH.haptic('selection'); setCount(b.key); }}
                      style={{
                        display: 'flex', flexDirection: 'column', gap: 2, padding: '13px 14px',
                        border: 'none', borderRadius: 'var(--xoot-radius-sm)', textAlign: 'left',
                        cursor: 'pointer', background: on ? 'var(--xoot-action-brand-soft)' : 'var(--xoot-surface-card)',
                        boxShadow: on ? 'inset 0 0 0 2px var(--xoot-violet-500)' : 'inset 0 0 0 1px var(--xoot-border-color)',
                        transition: 'all var(--xoot-dur-fast) var(--xoot-ease-out)',
                      }}>
                      <span style={{ fontSize: 'var(--xoot-body)', fontWeight: 700, color: on ? 'var(--xoot-violet-700)' : 'var(--xoot-text-primary)' }}>{b.label}</span>
                      <span style={{ fontSize: 'var(--xoot-caption)', color: on ? 'var(--xoot-violet-700)' : 'var(--xoot-text-muted)', opacity: on ? .85 : 1 }}>{b.note}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', paddingTop: 4 }}>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 'var(--xoot-body)', fontWeight: 700 }}>Total</span>
                <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)' }}>
                  {D.rand(quote.perVisit)} a clean · fees included
                </span>
              </span>
              {/* Rolls as the bundle changes — stepping one clean to six should read as the
                  number climbing, not as a different number appearing. */}
              <span style={{ fontFamily: 'var(--xoot-font-display)', fontSize: 'var(--xoot-display-3)', lineHeight: 1, opacity: pending ? .45 : 1, transition: 'opacity var(--xoot-dur-fast) var(--xoot-ease-out)' }}>
                R<CountUp value={total} />
              </span>
            </div>
          </div>
        )}

        {stage === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--xoot-space-5)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--xoot-space-3)' }}>
              <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>Pick a colour</span>
              <GiftTintPicker value={tint} onChange={t => { XH.haptic('selection'); setTint(t); }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--xoot-space-3)' }}>
              <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>How should we send it?</span>
              <RadioGroup value={via} onChange={v => { XH.haptic('selection'); setVia(v); }} options={[
                { value: 'email', label: 'Send an email', description: 'Arrives straight away' },
                { value: 'link', label: 'Get a link to share', description: 'Send it yourself, whenever' },
              ]} />
            </div>

            {via === 'email' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--xoot-space-4)' }}>
                <Input label="Their name" placeholder="Thandi" value={to.name}
                  onChange={e => setTo(t => ({ ...t, name: e.target.value }))} />
                <Input label="Their email" placeholder="thandi@example.co.za" value={to.email}
                  onChange={e => setTo(t => ({ ...t, email: e.target.value }))} />
              </div>
            )}

            <Input label="Your name" value={from} onChange={e => setFrom(e.target.value)} />

            <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--xoot-space-2)' }}>
              <span style={{ fontSize: 'var(--xoot-body-sm)', fontWeight: 700 }}>Add a note</span>

              {/* Tap one to fill the box, then edit it. An empty box asks people to be
                  eloquent on the spot; most write nothing rather than risk it. */}
              <div style={{
                display: 'flex', gap: 7, margin: '0 -20px', padding: '2px 20px 4px',
                overflowX: 'auto', scrollbarWidth: 'none',
              }}>
                {PRESET_NOTES.map(p => {
                  const on = note === p.text;
                  return (
                    <button key={p.text} type="button"
                      onClick={() => { XH.haptic('selection'); setNote(on ? '' : p.text); }}
                      style={{
                        flex: '0 0 auto', height: 32, padding: '0 13px', border: 'none',
                        borderRadius: 'var(--xoot-radius-pill)', cursor: 'pointer',
                        background: on ? 'var(--xoot-action-brand-soft)' : 'var(--xoot-surface-card)',
                        boxShadow: on ? 'inset 0 0 0 1.5px var(--xoot-violet-500)' : 'inset 0 0 0 1px var(--xoot-border-color)',
                        color: on ? 'var(--xoot-violet-700)' : 'var(--xoot-text-secondary)',
                        fontFamily: 'var(--xoot-font-core)', fontSize: 'var(--xoot-caption)',
                        fontWeight: 700, whiteSpace: 'nowrap',
                        transition: 'all var(--xoot-dur-fast) var(--xoot-ease-out)',
                      }}>
                      {p.group}
                    </button>
                  );
                })}
              </div>

              <textarea value={note} onChange={e => setNote(e.target.value.slice(0, 90))} rows={3}
                placeholder="Thought you could use a break."
                style={{
                  padding: '12px 16px', border: 'none', borderRadius: 'var(--xoot-radius-sm)',
                  background: 'var(--xoot-surface-card)', boxShadow: 'inset 0 0 0 1px var(--xoot-border-color)',
                  outline: 'none', resize: 'none', fontFamily: 'var(--xoot-font-core)',
                  fontSize: 'var(--xoot-body)', lineHeight: 1.5, color: 'var(--xoot-text-primary)',
                }} />
              <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)' }}>
                {note.length}/90 · it goes on the card
              </span>
            </label>
          </div>
        )}

        {stage === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--xoot-space-4)' }}>
            <Card tone="flat" pad="md" style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>What you're giving</span>
              {/* Straight from the pricing service. */}
              {quote.lines.map(l => (
                <div key={l.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 'var(--xoot-body-sm)' }}>
                  <span style={{ color: 'var(--xoot-text-secondary)' }}>{l.label}</span>
                  <span style={{ fontFamily: 'var(--xoot-font-mono)', fontWeight: 600, flex: '0 0 auto' }}>{D.rand(l.amount)}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 'var(--xoot-body-sm)' }}>
                <span style={{ color: 'var(--xoot-text-secondary)' }}>To</span>
                <span style={{ fontWeight: 600, flex: '0 0 auto' }}>{via === 'email' ? (to.name || '—') : 'A shareable link'}</span>
              </div>
              <span style={{ height: 1, background: 'var(--xoot-neutral-200)' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontWeight: 700 }}>Total</span>
                <span style={{ fontFamily: 'var(--xoot-font-display)', fontSize: 'var(--xoot-title-1)' }}>{D.rand(total)}</span>
              </div>
              <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)', lineHeight: 1.45 }}>{quote.note}</span>
            </Card>

            <Card tone="flat" pad="md" style={{ display: 'flex', gap: 11 }}>
              <Icon name="info" size={18} color="var(--xoot-icon-outline)" strokeWidth={1.9} style={{ marginTop: 1 }} />
              <span style={{ fontSize: 'var(--xoot-body-sm)', lineHeight: 1.5, color: 'var(--xoot-text-secondary)' }}>
                They'll never see what you paid — just the cleans. Nothing expires, and if they
                move house it still works.
              </span>
            </Card>
          </div>
        )}
      </Scroll>

      <DockedCTA note={stage === 2 ? 'Paid once, now. Nothing recurring.' : undefined}>
        <Button variant="primary" size="lg" block
          disabled={(stage === 1 && !canSend) || (stage === 2 && pending)}
          loading={stage === 2 && pending}
          onClick={next}
          iconRight={stage === 2 ? 'lock' : 'arrow-right'}>
          {stage === 2 ? (pending ? 'Checking price' : `Pay ${D.rand(total)}`) : stage === 1 ? 'Review' : 'Continue'}
        </Button>
      </DockedCTA>
    </>
  );
}

Object.assign(window, { GiftFlow });
})();

/* ═══ app/Search.jsx ═════════════════════════════════════════════════════════ */
(function(){
/* Search and Notifications — the two header destinations.

   Search indexes EVERYTHING, not just services: your own details, your settings, Care+, and the
   policies people only look for when something has gone wrong. A search that finds only bookable
   items is a filter; this is a way through the whole app. */
const { Icon, IconButton, Card, Badge, Button, ServiceIcon, XOOT_SERVICES, Avatar, Tag,
        SectionLabel, ConciergeEntry } = window.XootNS;
const XH = window.XootNS.Haptics;
const { CarePlusMark } = window.XootNS;

/* Care+ rows carry the real mark rather than Lucide's generic heart-plus. A sentinel icon
   name keeps the data table flat instead of leaking a component into it. */
function RowGlyph({ name, size = 20, color, strokeWidth = 1.9 }) {
  if (name === 'careplus') return <CarePlusMark size={size} color={color || 'var(--xoot-careplus-500)'} />;
  return <Icon name={name} size={size} color={color} strokeWidth={strokeWidth} />;
}

const GROUPS = ['Your details', 'Settings', 'Care+', 'Help & policies'];

/* `keys` carries the words people actually type — "t&c", "gate code", "money back" — because
   almost nobody searches using our own labels. */
function buildIndex(D) {
  return [
    { group: 'Your details', icon: 'circle-user', title: 'Nadia Khan', detail: 'Name, email, mobile, language', to: 'account',
      keys: 'name email mobile phone number language profile account me my details personal information' },
    { group: 'Your details', icon: 'map-pin', title: D.user.address, detail: 'Your home · access notes', to: 'home',
      keys: 'address home place gate code alarm access entry lockbox key suburb' },
    { group: 'Your details', icon: 'credit-card', title: 'Visa ·· 4821', detail: 'Payment method', to: 'payment',
      keys: 'card payment visa bank pay method billing' },
    { group: 'Your details', icon: 'wallet', title: 'R' + D.user.credit + ' XootCred', detail: 'Credit and points', to: 'cred',
      keys: 'credit xootcred balance money points reward convert' },
    { group: 'Your details', icon: 'book-open', title: 'Receipts & invoices', detail: 'Every visit you have paid for', to: 'invoices',
      keys: 'receipt invoice vat tax statement history spend download' },

    { group: 'Settings', icon: 'bell', title: 'Notifications', detail: 'Push, email and WhatsApp', to: 'notifications',
      keys: 'notification push email whatsapp alert reminder message sound' },
    { group: 'Settings', icon: 'calendar-check', title: 'Connected calendars', detail: 'Apple · Google', to: 'calendars',
      keys: 'calendar sync apple google outlook ical' },
    { group: 'Settings', icon: 'sparkles', title: 'Siri & Concierge', detail: 'Ask by voice', to: 'siri',
      keys: 'siri voice shortcut concierge assistant ask ai' },
    { group: 'Settings', icon: 'chart-column', title: 'Widgets', detail: 'For your home screen', to: 'widgets',
      keys: 'widget home screen lock screen island' },
    { group: 'Settings', icon: 'briefcase', title: 'Manage more', detail: 'Properties, dashboards, invoices', to: 'manage',
      keys: 'properties dashboard team bulk office airbnb business spend units' },

    { group: 'Care+', icon: 'heart-plus', title: 'Care+ membership', detail: 'R99 a month · first month free', to: 'careplus',
      keys: 'care careplus membership subscription trial cancel upgrade plan premium billing' },
    { group: 'Care+', icon: 'handshake', title: 'Refer & earn', detail: 'R' + D.referral.reward + ' each, once they book', to: 'refer',
      keys: 'refer invite friend code earn credit share neighbour' },

    { group: 'Help & policies', icon: 'shield-check', title: 'XootCover', detail: 'Included on every visit', to: 'cover',
      keys: 'xootcover insurance cover damage broken claim insured protection genric' },
    { group: 'Help & policies', icon: 'book-open', title: 'Terms & conditions', detail: 'The full agreement', to: 'terms',
      keys: 'terms conditions tc agreement legal contract policy rules fine print' },
    { group: 'Help & policies', icon: 'lock', title: 'Privacy & your data', detail: 'What we store, and for how long', to: 'privacy',
      keys: 'privacy data popia delete download personal information access codes revoke security' },
    { group: 'Help & policies', icon: 'circle-alert', title: 'Cancellations & refunds', detail: 'Free up to 24 hours before', to: 'terms',
      keys: 'cancel refund money back charge dispute late fee' },
    { group: 'Help & policies', icon: 'message-circle', title: 'Get help', detail: 'We usually reply within the hour', to: 'help',
      keys: 'help support contact problem issue complain wrong' },
    { group: 'Help & policies', icon: 'lightbulb', title: 'How Xoot works', detail: 'Booking, paying, payouts', to: 'how',
      keys: 'how works payment payout commission xooter paid explain' },
  ];
}

function SearchScreen({ onBack, onBook, onOpenVisit, onOpenEntry, onConcierge }) {
  const D = window.XootData;
  const INDEX = React.useMemo(() => buildIndex(D), []);
  const [q, setQ] = React.useState('');
  const inputRef = React.useRef(null);
  React.useEffect(() => { if (inputRef.current) inputRef.current.focus(); }, []);

  const term = q.trim().toLowerCase();
  const words = term.split(/\s+/).filter(w => w.length > 2);
  const services = !term ? [] : D.services.filter(s =>
    s.title.toLowerCase().includes(term) || s.blurb.toLowerCase().includes(term));
  const people = !term ? [] : D.pros.filter(p =>
    p.name.toLowerCase().includes(term) || p.suburb.toLowerCase().includes(term));
  const entries = !term ? [] : INDEX.filter(e =>
    e.title.toLowerCase().includes(term) ||
    (e.detail || '').toLowerCase().includes(term) ||
    e.keys.includes(term) ||
    words.some(w => e.keys.includes(w)));
  const nothing = services.length + people.length + entries.length === 0;

  const open = to => { XH.haptic('light'); onOpenEntry && onOpenEntry(to); };

  return (
    <>
      {/* The field IS the header — a search screen shouldn't make you find the search box. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 16px 12px' }}>
        <IconButton icon="arrow-left" label="Back" onClick={onBack} />
        <span style={{
          display: 'flex', alignItems: 'center', gap: 9, flex: 1, height: 46, padding: '0 14px',
          borderRadius: 'var(--xoot-radius-pill)', background: 'var(--xoot-surface-card)',
          boxShadow: 'inset 0 0 0 1px var(--xoot-border-color)',
        }}>
          <Icon name="search" size={17} color="var(--xoot-text-muted)" strokeWidth={2.1} />
          <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)}
            placeholder="Search anything in Xoot"
            style={{
              flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent',
              fontFamily: 'var(--xoot-font-core)', fontSize: 'var(--xoot-body)', fontWeight: 500,
              color: 'var(--xoot-text-primary)',
            }} />
          {q && (
            <button type="button" aria-label="Clear" onClick={() => { XH.haptic('light'); setQ(''); }}
              style={{ display: 'grid', placeItems: 'center', width: 22, height: 22, border: 'none', borderRadius: '50%', background: 'var(--xoot-surface-sunken)', color: 'var(--xoot-text-muted)', cursor: 'pointer' }}>
              <Icon name="x" size={12} strokeWidth={2.6} />
            </button>
          )}
        </span>
      </div>

      <Scroll bottom={100}>
        {!term && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Concierge sits at the top of search — it's the answer to anything the index can't match. */}
            <ConciergeEntry onOpen={() => onConcierge && onConcierge()} hint="When is my Xooter arriving?" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>Try</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {['Gate code', 'Receipts', 'Care+', 'Terms', 'Nomsa', 'Cancel'].map(t => (
                  <Tag key={t} onClick={() => { XH.haptic('selection'); setQ(t); }}>{t}</Tag>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>Book again</span>
              {D.services.slice(0, 3).map(sv => (
                <Card key={sv.key} tone="flat" pad="md" interactive onClick={onBook}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                  <ServiceIcon service={sv.key} size={40} shape="circle" motion="still" />
                  <span style={{ flex: 1, fontSize: 'var(--xoot-body)', fontWeight: 700 }}>{sv.title}</span>
                  <Icon name="chevron-right" size={17} color="var(--xoot-neutral-400)" />
                </Card>
              ))}
            </div>
          </div>
        )}

        {term && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {services.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <SectionLabel slot="plain" label="Services" count={services.length} />
                {services.map(sv => (
                  <Card key={sv.key} tone="flat" pad="md" interactive onClick={onBook}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                    <ServiceIcon service={sv.key} size={40} shape="circle" motion="still" />
                    <span style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 'var(--xoot-body)', fontWeight: 700 }}>{sv.title}</span>
                      <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)' }}>{sv.blurb} · {sv.est}</span>
                    </span>
                    <Icon name="chevron-right" size={17} color="var(--xoot-neutral-400)" />
                  </Card>
                ))}
              </div>
            )}

            {people.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <SectionLabel slot="plain" label="Xooters you've had" count={people.length} />
                {people.map(p => (
                  <Card key={p.name} tone="flat" pad="md" interactive onClick={onBook}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                    <Avatar name={p.name} size="md" badge="verified" />
                    <span style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 'var(--xoot-body)', fontWeight: 700 }}>{p.name}</span>
                      <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)' }}>{p.suburb} · {p.jobs} visits · {p.rating}</span>
                    </span>
                    <Badge tone="neutral" size="sm" icon="repeat">Rebook</Badge>
                  </Card>
                ))}
              </div>
            )}

            {GROUPS.map(g => {
              const rows = entries.filter(e => e.group === g);
              if (!rows.length) return null;
              return (
                <div key={g} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <SectionLabel slot="plain" label={g} count={rows.length} />
                  {rows.map(e => (
                    <Card key={e.title} tone="flat" pad="md" interactive onClick={() => open(e.to)}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                      <span style={{ display: 'grid', placeItems: 'center', width: 38, height: 38, flex: '0 0 auto', borderRadius: 'var(--xoot-radius-key)', background: 'var(--xoot-surface-sunken)' }}>
                        <RowGlyph name={e.icon} size={18} color="var(--xoot-icon-outline)" />
                      </span>
                      <span style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 'var(--xoot-body)', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</span>
                        <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.detail}</span>
                      </span>
                      <Icon name="chevron-right" size={17} color="var(--xoot-neutral-400)" />
                    </Card>
                  ))}
                </div>
              );
            })}

            {/* No match hands the question to Concierge rather than dead-ending. */}
            {nothing && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '30px 20px 10px', textAlign: 'center' }}>
                <Icon name="search" size={28} color="var(--xoot-neutral-400)" strokeWidth={1.7} />
                <span style={{ fontFamily: 'var(--xoot-font-display)', fontSize: 'var(--xoot-title-2)' }}>Nothing matching “{q}”</span>
                <span style={{ fontSize: 'var(--xoot-body-sm)', color: 'var(--xoot-text-muted)', maxWidth: 250, lineHeight: 1.5 }}>
                  Concierge might know — it can answer things the index can't.
                </span>
                <Button variant="primary" icon="sparkles" onClick={() => onConcierge && onConcierge(q)} style={{ marginTop: 4 }}>
                  Ask Xoot Concierge
                </Button>
              </div>
            )}
          </div>
        )}
      </Scroll>
    </>
  );
}

function NotificationsFeedScreen({ onBack, onOpenVisit, onRate }) {
  const [items, setItems] = React.useState([
    { id: 1, icon: 'truck', tint: 'blush', title: 'Nomsa is on the way', body: 'About 12 minutes out. Gate code is saved.', when: 'Just now', unread: true, go: 'visit' },
    { id: 2, icon: 'calendar-check', tint: 'lilac', title: 'Wednesday confirmed', body: 'Nomsa accepted your 08:00 visit.', when: '2 h ago', unread: true, go: 'visit' },
    { id: 3, icon: 'star', tint: 'honey', title: 'How did Monday go?', body: 'Rate Grace so we know who to send next.', when: 'Yesterday', unread: false, go: 'rate' },
    { id: 4, icon: 'wallet', tint: 'sage', title: 'R30 add-on credit added', body: 'Your Care+ credit for August is ready.', when: '2 days ago', unread: false },
    { id: 5, icon: 'handshake', tint: 'mist', title: 'Thandi joined Xoot', body: 'R100 is on its way once she books.', when: '4 days ago' },
  ]);
  const unread = items.filter(i => i.unread).length;

  return (
    <>
      <TopBar onBack={onBack} title="Notifications" subtitle={unread ? unread + ' new' : 'All caught up'}
        trailing={unread ? (
          <button type="button" onClick={() => { XH.haptic('light'); setItems(is => is.map(i => ({ ...i, unread: false }))); }}
            style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontFamily: 'var(--xoot-font-core)', fontSize: 'var(--xoot-caption)', fontWeight: 700, color: 'var(--xoot-text-link)' }}>
            Mark all read
          </button>
        ) : null} />
      <Scroll bottom={100}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map(n => (
            <button key={n.id} type="button"
              onClick={() => {
                XH.haptic('light');
                setItems(is => is.map(i => i.id === n.id ? { ...i, unread: false } : i));
                if (n.go === 'visit' && onOpenVisit) onOpenVisit();
                if (n.go === 'rate' && onRate) onRate();
              }}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 12, width: '100%',
                padding: 'var(--xoot-space-4)', border: 'none', textAlign: 'left', cursor: 'pointer',
                borderRadius: 'var(--xoot-radius-md)',
                background: n.unread ? 'var(--xoot-surface-card)' : 'transparent',
                boxShadow: n.unread ? 'var(--xoot-shadow-2)' : 'inset 0 0 0 1px var(--xoot-border-color)',
              }}>
              <span style={{
                display: 'grid', placeItems: 'center', width: 40, height: 40, flex: '0 0 auto',
                borderRadius: 'var(--xoot-radius-key)', background: 'var(--xoot-' + n.tint + '-wash)',
              }}>
                <Icon name={n.icon} size={19} color="var(--xoot-ink-900)" strokeWidth={1.9} />
              </span>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
                <span style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 'var(--xoot-body)', fontWeight: 700, flex: 1 }}>{n.title}</span>
                  <span style={{ fontSize: 'var(--xoot-micro)', color: 'var(--xoot-text-muted)', flex: '0 0 auto' }}>{n.when}</span>
                </span>
                <span style={{ fontSize: 'var(--xoot-body-sm)', color: 'var(--xoot-text-secondary)', lineHeight: 1.45 }}>{n.body}</span>
              </span>
              {n.unread && <span style={{ width: 8, height: 8, marginTop: 6, borderRadius: '50%', background: 'var(--xoot-action-brand)', flex: '0 0 auto' }} />}
            </button>
          ))}
        </div>
      </Scroll>
    </>
  );
}

/* The Concierge screen — the assistant, full height. */
function ConciergeScreen({ onBack, onNavigate, seed }) {
  const D = window.XootData;
  const { Concierge } = window.XootNS;
  return (
    <>
      <TopBar onBack={onBack} title="Xoot Concierge" subtitle="Ask about your home, your visits, your billing" />
      <div style={{ flex: 1, minHeight: 0, padding: '0 20px 16px', display: 'flex' }}>
        <Concierge
          onNavigate={onNavigate}
          context={{
            booking: {
              state: 'en_route', xooter: 'Nomsa', when: 'Wednesday 08:00',
              etaMinutes: 12, etaClock: '08:00', endClock: '12:00',
              service: 'Regular cleaning', hours: 4, total: 'R491',
              xooterRating: 4.9, xooterVisits: 412, together: 12,
            },
            credit: D.user.credit, points: D.user.points,
          }} />
      </div>
    </>
  );
}

Object.assign(window, { SearchScreen, NotificationsFeedScreen, ConciergeScreen });
})();

/* ═══ app/CarePlus.jsx ═════════════════════════════════════════════════════════ */
(function(){
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
})();

/* ═══ app/Xooter.jsx ═════════════════════════════════════════════════════════ */
(function(){
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
})();

/* ═══ app/XooterJob.jsx ═════════════════════════════════════════════════════════ */
(function(){
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
})();

/* ═══ app/XooterDashboard.jsx ═════════════════════════════════════════════════════════ */
(function(){
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
})();

/* ═══ app/XooterOnboarding.jsx ═════════════════════════════════════════════════════════ */
(function(){
/* Xooter onboarding — becoming a Xooter, and the training that follows.

   Two things make this different from the customer onboarding, and both come from the repo's
   own rules rather than my invention:

     · Rank points are RECOGNITION, never pay. Nothing here may suggest a badge raises a rate,
       so every points figure sits beside the word "recognition" and never beside a rand amount.
     · Training is genuinely OPTIONAL beyond the required module. Making it feel compulsory
       would misrepresent the arrangement — these are independent contractors, not employees.

   The MCQs are real content, not lorem. A quiz whose answers are obvious teaches nothing and
   insults the person taking it, so each question has one correct answer and distractors that a
   careless worker might actually pick. Order is shuffled per attempt: a fixed order means the
   answer position becomes the answer. */
const D = window.XootData;
const {
  Card, Badge, Button, Icon, Avatar, Progress, Input, Select,
  ServiceIcon, XOOT_SERVICES, Toast, StepHeader, ChoiceRow, ChipGrid,
} = window.XootNS;
const XH = window.XootNS.Haptics;

/* ── Training modules ──────────────────────────────────────────────────────
   Straight from the repo's gamification migration: rank_points and badge_label are the real
   values, and badge_color is 'primary' or 'sage'. */
const MODULES = [
  {
    key: 'standard', title: 'The Xoot Standard', badge: 'Xoot Certified', points: 40,
    tone: 'primary', required: true,
    blurb: 'What every visit includes, how to arrive, and what to do when something is not as described.',
    questions: [
      {
        q: 'You arrive and the home is significantly dirtier than the booking described. What do you do first?',
        options: [
          { t: 'Message the customer through the app before starting, and tell Xoot', ok: true },
          { t: 'Start anyway and hope the time is enough' },
          { t: 'Leave and mark the job as cancelled' },
          { t: 'Ask the customer for extra cash on the day' },
        ],
        why: 'Raising it in the app first protects both of you — it creates a record, and Xoot can adjust the booking rather than you absorbing the time.',
      },
      {
        q: 'A customer offers to pay you directly next time to skip the app. What is the right answer?',
        options: [
          { t: 'Politely decline — off-platform work has no cover and no payout protection', ok: true },
          { t: 'Accept if the price is better' },
          { t: 'Accept but keep booking through Xoot sometimes' },
          { t: 'Give them your number and decide later' },
        ],
        why: 'Off-platform work carries no Booking Cover and no guaranteed payout. If something goes wrong, neither of you has any recourse.',
      },
      {
        q: 'When do the household access details become visible to you?',
        options: [
          { t: '45 minutes before the visit starts, until 30 minutes after it is verified complete', ok: true },
          { t: 'As soon as you accept the job' },
          { t: 'Any time, for any past customer' },
          { t: 'Only if the customer sends them in chat' },
        ],
        why: 'The window is deliberately narrow. Codes are never in chat or email, and access closes after completion.',
      },
    ],
  },
  {
    key: 'turnover', title: 'Airbnb turnover readiness', badge: 'Turnover Pro', points: 35,
    tone: 'primary',
    blurb: 'Guest-ready standards, linen handling, and working to a checkout–checkin window.',
    questions: [
      {
        q: 'Checkout is 10:00 and the next check-in is 15:00. How should you plan the visit?',
        options: [
          { t: 'Start as close to 10:00 as possible and finish with photos before 15:00', ok: true },
          { t: 'Arrive at 14:00 and work quickly' },
          { t: 'Start the day before' },
          { t: 'Ask the host to move the check-in' },
        ],
        why: 'The window is the job. Finishing early leaves room for a problem; finishing late means a guest walks into an unclean place.',
      },
      {
        q: 'You find a guest has left belongings behind. What do you do?',
        options: [
          { t: 'Photograph them, leave them somewhere safe, and log it in the app', ok: true },
          { t: 'Throw them away' },
          { t: 'Take them home for safekeeping' },
          { t: 'Leave them where they are without saying anything' },
        ],
        why: 'A photograph plus a log protects you from any later dispute, and gives the host what they need to contact the guest.',
      },
    ],
  },
  {
    key: 'wellness', title: 'Eco and fragrance-free care', badge: 'Wellness Ready', points: 25,
    tone: 'sage',
    blurb: 'Working in homes with allergies, asthma, small children or chemical sensitivities.',
    questions: [
      {
        q: 'A booking is marked fragrance-free. Which is acceptable?',
        options: [
          { t: 'Unscented products only, and no air freshener at the end', ok: true },
          { t: 'A light scent, since it smells clean' },
          { t: 'Scented products in the bathroom only' },
          { t: 'Whatever you normally use, then open a window' },
        ],
        why: 'Fragrance-free means no added scent anywhere. For someone with asthma this is a health matter, not a preference.',
      },
    ],
  },
  {
    key: 'surface', title: 'Premium surface protection', badge: 'Surface Safe', points: 35,
    tone: 'sage',
    blurb: 'Marble, brass, treated wood and natural stone — what damages them and what is safe.',
    questions: [
      {
        q: 'Which is safe on a marble countertop?',
        options: [
          { t: 'pH-neutral cleaner and a soft cloth', ok: true },
          { t: 'Vinegar solution' },
          { t: 'Lemon-based degreaser' },
          { t: 'Bathroom limescale remover' },
        ],
        why: 'Marble is calcium carbonate: anything acidic etches it permanently. The damage is not visible immediately, which is what makes it easy to cause.',
      },
    ],
  },
  {
    key: 'client', title: 'Quiet luxury communication', badge: 'Client Care', points: 25,
    tone: 'primary',
    blurb: 'How to communicate so a customer never has to check the app.',
    questions: [
      {
        q: 'You are running fifteen minutes late. When do you say so?',
        options: [
          { t: 'As soon as you know, through the app', ok: true },
          { t: 'When you arrive' },
          { t: 'Only if the customer messages first' },
          { t: 'Not at all, if you can make up the time' },
        ],
        why: 'Telling someone early turns a problem into information. Telling them late turns it into a complaint.',
      },
    ],
  },
  {
    key: 'office', title: 'Office quick-clean standard', badge: 'Office Ready', points: 30,
    tone: 'primary',
    blurb: 'After-hours access, desk-safe practice, and shared kitchens.',
    questions: [
      {
        q: 'A desk is covered in papers and a laptop. What is the correct approach?',
        options: [
          { t: 'Clean around them without moving or stacking anything', ok: true },
          { t: 'Stack the papers neatly to one side' },
          { t: 'Move everything, clean, then put it back' },
          { t: 'Skip the desk entirely' },
        ],
        why: 'Moved paperwork is the most common office complaint, and a moved laptop is a liability question. Clean around, never rearrange.',
      },
    ],
  },
];

/* Deterministic per attempt, not per render — reshuffling on every keystroke would move the
   options under the user's finger. */
function shuffle(arr, seed) {
  const out = arr.slice();
  let s = seed;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/* ── Signup ────────────────────────────────────────────────────────────────
   Deliberately short. A long application form before anyone has seen a single job is how
   marketplaces lose supply — the vetting that matters (ID, background check, banking) happens
   after they have decided they want this, not before. */
const XOOTER_STEPS = ['You', 'Where', 'What', 'Checks'];

function XooterSignup({ onDone, onBack }) {
  const [step, setStep] = React.useState(0);
  const [name, setName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [suburb, setSuburb] = React.useState('Sandton');
  const [radius, setRadius] = React.useState('10');
  const [skills, setSkills] = React.useState(['regular']);
  const [days, setDays] = React.useState(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);

  const canNext = [
    name.trim().length > 1 && phone.trim().length > 8,
    !!suburb,
    skills.length > 0 && days.length > 0,
    true,
  ][step];

  const next = () => {
    XH.haptic(step === XOOTER_STEPS.length - 1 ? 'success' : 'medium');
    if (step === XOOTER_STEPS.length - 1) onDone();
    else setStep(s => s + 1);
  };

  return (
    <>
      <TopBar onBack={step === 0 ? onBack : () => setStep(s => s - 1)}
        title="Work with Xoot" subtitle={`${XOOTER_STEPS[step]} · step ${step + 1} of ${XOOTER_STEPS.length}`} />
      <div style={{ padding: '0 20px 12px', flex: '0 0 auto' }}>
        <Progress segments={XOOTER_STEPS.length} value={step + 1} size="sm" />
      </div>

      <Scroll bottom={130}>
        {step === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <h2 style={{ fontSize: 'var(--xoot-title-1)', lineHeight: 1.2 }}>Let's start with you.</h2>
              <p style={{ marginTop: 8, fontSize: 'var(--xoot-body)', color: 'var(--xoot-text-secondary)', lineHeight: 1.55 }}>
                Four short steps. You will see real jobs before we ask for any documents.
              </p>
            </div>
            <Input label="Your full name" placeholder="Nomsa Mahlangu" value={name} onChange={e => setName(e.target.value)} />
            <Input label="Mobile number" placeholder="082 123 4567" value={phone} onChange={e => setPhone(e.target.value)}
              hint="We use this for job offers and the OTP when you sign in." />
          </div>
        )}

        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <h2 style={{ fontSize: 'var(--xoot-title-1)', lineHeight: 1.2 }}>Where can you work?</h2>
              <p style={{ marginTop: 8, fontSize: 'var(--xoot-body)', color: 'var(--xoot-text-secondary)', lineHeight: 1.55 }}>
                We only send you jobs inside this area. You can change it whenever you like.
              </p>
            </div>
            <Select label="Where do you start your day?" value={suburb} onChange={e => setSuburb(e.target.value)}
              options={['Sandton', 'Bryanston', 'Midrand', 'Fourways', 'Rosebank', 'Bedfordview', 'Hyde Park', 'Parkhurst', 'Melville', 'Waterfall', 'Dainfern', 'Braamfontein', 'Elsewhere in Johannesburg']} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>How far will you travel?</span>
              <div style={{ display: 'flex', gap: 8 }}>
                {[['5', 'Close by'], ['10', 'Up to 10 km'], ['20', 'Up to 20 km'], ['40', 'Anywhere in Joburg']].map(([v, l]) => {
                  const on = radius === v;
                  return (
                    <button key={v} type="button" onClick={() => { XH.haptic('selection'); setRadius(v); }}
                      style={{
                        flex: 1, minHeight: 62, border: 'none', borderRadius: 'var(--xoot-radius-sm)', cursor: 'pointer',
                        background: on ? 'var(--xoot-action-brand)' : 'var(--xoot-surface-card)',
                        color: on ? 'var(--xoot-text-on-brand)' : 'var(--xoot-text-primary)',
                        boxShadow: on ? 'var(--xoot-shadow-brand)' : 'inset 0 0 0 1px var(--xoot-border-color)',
                        fontFamily: 'var(--xoot-font-core)', fontSize: 'var(--xoot-caption)', fontWeight: 700,
                        padding: '0 6px', lineHeight: 1.3,
                      }}>
                      {l}
                    </button>
                  );
                })}
              </div>
              <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)', lineHeight: 1.5 }}>
                A wider area means more offers, but more travelling. Most Xooters start at 10 km.
              </span>
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <h2 style={{ fontSize: 'var(--xoot-title-1)', lineHeight: 1.2 }}>What do you want to take on?</h2>
              <p style={{ marginTop: 8, fontSize: 'var(--xoot-body)', color: 'var(--xoot-text-secondary)', lineHeight: 1.55 }}>
                Pick what you are comfortable with. Training unlocks the rest later.
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {['regular', 'airbnb', 'office', 'express', 'moving', 'laundry'].map((k, i) => {
                const on = skills.includes(k);
                const svc = XOOT_SERVICES[k];
                return (
                  <button key={k} type="button"
                    onClick={() => { XH.haptic('selection'); setSkills(s => on ? s.filter(x => x !== k) : [...s, k]); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, minHeight: 62, padding: '10px 12px',
                      border: 'none', borderRadius: 'var(--xoot-radius-md)', cursor: 'pointer', textAlign: 'left',
                      background: on ? 'var(--xoot-action-brand-soft)' : 'var(--xoot-surface-card)',
                      boxShadow: on ? 'inset 0 0 0 1.5px var(--xoot-violet-500)' : 'inset 0 0 0 1px var(--xoot-border-color)',
                    }}>
                    <ServiceIcon service={k} size={34} motion="still" delay={i * 60} />
                    <span style={{ fontSize: 'var(--xoot-caption)', fontWeight: 700, lineHeight: 1.25, color: on ? 'var(--xoot-violet-700)' : 'var(--xoot-text-primary)' }}>
                      {svc ? svc.label : k}
                    </span>
                  </button>
                );
              })}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>Which days suit you?</span>
              <ChipGrid theme="light" value={days} onChange={setDays}
                options={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']} />
              <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)', lineHeight: 1.5 }}>
                Weekends are the busiest, and entirely your choice — plenty of Xooters work them, plenty don't.
              </span>
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <h2 style={{ fontSize: 'var(--xoot-title-1)', lineHeight: 1.2 }}>What happens next.</h2>
              <p style={{ marginTop: 8, fontSize: 'var(--xoot-body)', color: 'var(--xoot-text-secondary)', lineHeight: 1.55 }}>
                Nothing here costs you anything, and you can stop at any point.
              </p>
            </div>
            {[
              ['badge-check', 'Background check', 'We run an ID and criminal record check. Xoot pays for it — you never do.'],
              ['graduation-cap', 'The Xoot Standard', 'One short module, about 15 minutes. Required before your first job.'],
              ['wallet', 'Banking details', 'Where your payouts go. Asked for only once you have passed the check.'],
              ['calendar-check', 'Your first offer', 'Usually within a few days, depending on demand in your area.'],
            ].map(([ic, t, d], i, arr) => (
              <div key={t} style={{ display: 'flex', gap: 14 }}>
                <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: '0 0 auto' }}>
                  <span style={{ display: 'grid', placeItems: 'center', width: 38, height: 38, borderRadius: '50%', background: 'var(--xoot-violet-100)' }}>
                    <Icon name={ic} size={18} color="var(--xoot-violet-700)" strokeWidth={2} />
                  </span>
                  {i < arr.length - 1 && <span style={{ flex: 1, width: 2, minHeight: 20, background: 'var(--xoot-violet-100)' }} />}
                </span>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingBottom: i < arr.length - 1 ? 18 : 0 }}>
                  <span style={{ fontSize: 'var(--xoot-body)', fontWeight: 700 }}>{t}</span>
                  <span style={{ fontSize: 'var(--xoot-body-sm)', color: 'var(--xoot-text-secondary)', lineHeight: 1.5 }}>{d}</span>
                </span>
              </div>
            ))}
            <Card tone="flat" pad="md" style={{ display: 'flex', gap: 11, marginTop: 4 }}>
              <Icon name="info" size={18} color="var(--xoot-icon-outline)" strokeWidth={1.9} style={{ marginTop: 1, flex: '0 0 auto' }} />
              <span style={{ fontSize: 'var(--xoot-body-sm)', lineHeight: 1.5, color: 'var(--xoot-text-secondary)' }}>
                You are an independent contractor. You choose which jobs to take, and there is no
                minimum — passing on offers never counts against you.
              </span>
            </Card>
          </div>
        )}
      </Scroll>

      <DockedCTA note={step === 3 ? 'No documents needed yet.' : undefined}>
        <Button variant="primary" size="lg" block disabled={!canNext} onClick={next}
          iconRight={step === 3 ? 'check' : 'arrow-right'}>
          {step === 3 ? 'Start the background check' : 'Continue'}
        </Button>
      </DockedCTA>
    </>
  );
}

function TrainingList({ onPick, onBack }) {
  /* Completion is local to the session here. A real build reads it from the Xooter's profile —
     the shape is the same, so swapping the source is a one-line change. */
  const [done, setDone] = React.useState(['standard']);
  const earned = MODULES.filter(m => done.includes(m.key));
  const points = earned.reduce((s, m) => s + m.points, 0);

  const Row = ({ mod }) => {
    const complete = done.includes(mod.key);
    return (
      <button type="button" onClick={() => { XH.haptic('light'); onPick(mod); }}
        style={{
          display: 'flex', alignItems: 'flex-start', gap: 13, width: '100%',
          padding: 'var(--xoot-space-4)', border: 'none', textAlign: 'left', cursor: 'pointer',
          borderRadius: 'var(--xoot-radius-md)', background: 'var(--xoot-surface-card)',
          boxShadow: 'var(--xoot-shadow-2)',
        }}>
        <span style={{
          display: 'grid', placeItems: 'center', width: 42, height: 42, flex: '0 0 auto',
          borderRadius: 'var(--xoot-radius-key)',
          background: complete
            ? (mod.tone === 'sage' ? 'var(--xoot-sage-wash)' : 'var(--xoot-violet-100)')
            : 'var(--xoot-surface-sunken)',
        }}>
          <Icon name={complete ? 'badge-check' : 'graduation-cap'} size={20}
            color={complete ? (mod.tone === 'sage' ? 'var(--xoot-sage-500)' : 'var(--xoot-violet-700)') : 'var(--xoot-icon-outline)'}
            strokeWidth={1.9} />
        </span>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 'var(--xoot-body)', fontWeight: 700 }}>{mod.title}</span>
            {mod.required && !complete && <Badge tone="warning" size="sm">Required</Badge>}
            {complete && <Badge tone={mod.tone === 'sage' ? 'success' : 'brand'} size="sm">{mod.badge}</Badge>}
          </span>
          <span style={{ fontSize: 'var(--xoot-body-sm)', color: 'var(--xoot-text-secondary)', lineHeight: 1.5 }}>{mod.blurb}</span>
          <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)' }}>
            {mod.questions.length} question{mod.questions.length > 1 ? 's' : ''} · +{mod.points} rank
          </span>
        </span>
        <Icon name="chevron-right" size={17} color="var(--xoot-neutral-400)" style={{ marginTop: 12, flex: '0 0 auto' }} />
      </button>
    );
  };

  const required = MODULES.filter(m => m.required);
  const optional = MODULES.filter(m => !m.required);

  return (
    <>
      <TopBar onBack={onBack} title="Training" subtitle="The Xoot Standard, and what you choose to add" />
      <Scroll bottom={40}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Rank stated as recognition, with the pay disclaimer attached to the number itself
              rather than buried in a footnote — the whole point is that it cannot be misread. */}
          <Card pad="lg" radius="lg" style={{ background: 'var(--xoot-violet-100)', boxShadow: 'none' }}>
            <span className="xoot-label" style={{ display: 'block', marginBottom: 8, color: 'var(--xoot-violet-700)', opacity: .85 }}>
              Your rank
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--xoot-font-display)', fontSize: 'var(--xoot-display-3)', lineHeight: 1, color: 'var(--xoot-violet-700)' }}>
                {points}
              </span>
              <span style={{ fontSize: 'var(--xoot-body-sm)', fontWeight: 600, color: 'var(--xoot-violet-700)' }}>
                points · {earned.length} of {MODULES.length} modules
              </span>
            </div>
            <p style={{ marginTop: 10, fontSize: 'var(--xoot-body-sm)', lineHeight: 1.55, color: 'var(--xoot-violet-700)', opacity: .88 }}>
              Rank and badges show on your profile so customers can see what you have done. They
              do not change what a job pays.
            </p>
          </Card>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>Required</span>
            {required.map(m => <Row key={m.key} mod={m} />)}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>Optional</span>
            <span style={{ fontSize: 'var(--xoot-body-sm)', color: 'var(--xoot-text-secondary)', lineHeight: 1.5, marginTop: -2 }}>
              Take these if you want the work they unlock. Skipping them costs you nothing.
            </span>
            {optional.map(m => <Row key={m.key} mod={m} />)}
          </div>
        </div>
      </Scroll>
    </>
  );
}

function TrainingModule({ module: mod, onDone, onBack }) {
  /* One seed per attempt. Retaking reshuffles; re-rendering does not. */
  const [seed] = React.useState(() => Math.floor(Math.random() * 100000));
  const [qi, setQi] = React.useState(0);
  const [picked, setPicked] = React.useState(null);
  const [score, setScore] = React.useState(0);

  const total = mod.questions.length;
  const q = mod.questions[qi];
  /* Shuffle per question, seeded off the attempt — so the correct answer is not in the same
     position each time, which is how a fixed order turns into a memorised position. */
  const options = React.useMemo(() => shuffle(q.options, seed + qi * 17), [q, seed, qi]);
  const answered = picked !== null;
  const done = qi >= total;

  const choose = i => {
    if (answered) return;
    XH.haptic(options[i].ok ? 'success' : 'light');
    setPicked(i);
    if (options[i].ok) setScore(s => s + 1);
  };

  const advance = () => {
    XH.haptic('medium');
    setPicked(null);
    setQi(i => i + 1);
  };

  if (done) {
    const passed = score === total;
    return (
      <>
        <TopBar onBack={onBack} title={mod.title} />
        <Scroll bottom={130}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, paddingTop: 20, textAlign: 'center' }}>
            <span style={{
              display: 'grid', placeItems: 'center', width: 84, height: 84, borderRadius: '50%',
              background: passed ? 'var(--xoot-sage-wash)' : 'var(--xoot-honey-wash)',
              animation: 'xoot-pop var(--xoot-dur-base) var(--xoot-ease-ios-snap)',
            }}>
              <Icon name={passed ? 'badge-check' : 'repeat'} size={38}
                color={passed ? 'var(--xoot-sage-500)' : 'var(--xoot-honey-ink)'} strokeWidth={2} />
            </span>
            <h2 style={{ fontSize: 'var(--xoot-display-3)', lineHeight: 1.1 }}>
              {passed ? 'Module complete.' : `${score} of ${total}.`}
            </h2>
            <p style={{ fontSize: 'var(--xoot-body)', color: 'var(--xoot-text-secondary)', maxWidth: 300, lineHeight: 1.6 }}>
              {passed
                ? `You've earned the ${mod.badge} badge. It shows on your profile so customers can see it.`
                : 'Have another go — the questions reshuffle, and there is no limit on attempts.'}
            </p>
            {passed && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <Badge tone={mod.tone === 'sage' ? 'success' : 'brand'} icon="badge-check">{mod.badge}</Badge>
                {/* Recognition, never pay. The wording here is deliberate: rank points are
                    explicitly non-payment gamification, so nothing may imply a rate change. */}
                <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)', lineHeight: 1.5, maxWidth: 280 }}>
                  +{mod.points} rank points. Rank is recognition on your profile — it does not
                  change what a job pays.
                </span>
              </div>
            )}
          </div>
        </Scroll>
        <DockedCTA>
          {passed
            ? <Button variant="primary" size="lg" block onClick={onDone}>Done</Button>
            : <Button variant="primary" size="lg" block icon="repeat"
                onClick={() => { setQi(0); setScore(0); setPicked(null); }}>Try again</Button>}
        </DockedCTA>
      </>
    );
  }

  return (
    <>
      <TopBar onBack={onBack} title={mod.title} subtitle={`Question ${qi + 1} of ${total}`} />
      <div style={{ padding: '0 20px 12px', flex: '0 0 auto' }}>
        <Progress segments={total} value={qi + (answered ? 1 : 0)} size="sm" />
      </div>

      <Scroll bottom={answered ? 150 : 40}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <h2 style={{ fontSize: 'var(--xoot-title-1)', lineHeight: 1.3 }}>{q.q}</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {options.map((o, i) => {
              const isPicked = picked === i;
              const reveal = answered && o.ok;
              const wrong = isPicked && !o.ok;
              return (
                <button key={o.t} type="button" onClick={() => choose(i)} disabled={answered}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12, width: '100%',
                    padding: 'var(--xoot-space-4)', border: 'none', textAlign: 'left',
                    borderRadius: 'var(--xoot-radius-md)',
                    cursor: answered ? 'default' : 'pointer',
                    background: reveal ? 'var(--xoot-sage-wash)' : wrong ? 'var(--xoot-careplus-wash)' : 'var(--xoot-surface-card)',
                    boxShadow: reveal
                      ? 'inset 0 0 0 1.5px var(--xoot-sage-500)'
                      : wrong ? 'inset 0 0 0 1.5px var(--xoot-careplus-400)' : 'var(--xoot-shadow-2)',
                    transition: 'all var(--xoot-dur-fast) var(--xoot-ease-out)',
                  }}>
                  <span style={{
                    display: 'grid', placeItems: 'center', width: 24, height: 24, flex: '0 0 auto',
                    borderRadius: '50%', marginTop: 1,
                    background: reveal ? 'var(--xoot-sage-500)' : wrong ? 'var(--xoot-careplus-500)' : 'transparent',
                    boxShadow: (reveal || wrong) ? 'none' : 'inset 0 0 0 2px var(--xoot-neutral-300)',
                  }}>
                    {reveal && <Icon name="check" size={13} color="#fff" strokeWidth={3.2} />}
                    {wrong && <Icon name="x" size={13} color="#fff" strokeWidth={3.2} />}
                  </span>
                  <span style={{
                    fontSize: 'var(--xoot-body)', lineHeight: 1.45, fontWeight: 500,
                    color: reveal ? 'var(--xoot-sage-ink)' : wrong ? 'var(--xoot-careplus-ink)' : 'var(--xoot-text-primary)',
                  }}>{o.t}</span>
                </button>
              );
            })}
          </div>

          {/* Shown whether they got it right or wrong. Explaining only failures teaches the
              lucky guesser nothing, and these are safety rules. */}
          {answered && (
            <Card tone="flat" pad="md" style={{
              display: 'flex', gap: 11,
              animation: 'xoot-appear var(--xoot-dur-base) var(--xoot-ease-ios-nav) both',
              ['--xoot-appear-y']: '8px',
            }}>
              <Icon name="lightbulb" size={18} color="var(--xoot-icon-outline)" strokeWidth={1.9} style={{ marginTop: 1, flex: '0 0 auto' }} />
              <span style={{ fontSize: 'var(--xoot-body-sm)', lineHeight: 1.55, color: 'var(--xoot-text-secondary)' }}>{q.why}</span>
            </Card>
          )}
        </div>
      </Scroll>

      {answered && (
        <DockedCTA>
          <Button variant="primary" size="lg" block onClick={advance} iconRight="arrow-right">
            {qi + 1 === total ? 'See result' : 'Next question'}
          </Button>
        </DockedCTA>
      )}
    </>
  );
}

Object.assign(window, { XooterSignup, TrainingList, TrainingModule, XOOT_MODULES: MODULES, shuffleOptions: shuffle });
})();
