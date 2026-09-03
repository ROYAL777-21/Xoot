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
