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
