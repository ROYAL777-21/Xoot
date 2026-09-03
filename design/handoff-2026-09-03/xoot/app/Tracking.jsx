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
