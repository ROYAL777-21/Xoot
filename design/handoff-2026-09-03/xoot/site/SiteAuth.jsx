/* Website sign-in.

   The repo is explicit that this must not be transactional: never "Sign up" / "Sign in", but
   "Let's get your home sorted" and "Pick up where you left off" (§5.3). That is not decoration —
   a marketplace asking someone to let a stranger into their house has to sound like a person
   from the first screen.

   Four ways in, ordered by what actually works today. §5.2a of the master brief flags that
   "Continue with phone" has NO BACKEND — email OTP is all that exists, and phone auth is blocked
   on the same Twilio Verify activation as masked calling. The brief's own recommendation is to
   DEMOTE rather than hide it, so the layout stays honest and the button returns to the top when
   Verify is live. That is what this does: email leads, phone sits below with a quiet "coming
   soon", and the two SSO buttons flank them.

   Shipping phone as the primary CTA while it dead-ends is the one option the brief calls the
   worst, and it would be the easiest mistake to make since it looks the most modern. */
const D = window.XootData;
const {
  Button, Icon, Card, Logo, ScrollReveal, Bloom, CarePlusMark,
} = window.XootNS;

/* Both marks drawn locally rather than imported — they are brand assets of other companies and
   belong to the sign-in surface, not the design system's own vocabulary. */
function AppleMark({ size = 19 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ display: 'block', marginTop: -2 }}>
      <path d="M17.05 12.54c-.02-2.3 1.88-3.4 1.96-3.46-1.07-1.56-2.73-1.78-3.32-1.8-1.41-.14-2.76.83-3.48.83-.72 0-1.83-.81-3.01-.79-1.55.02-2.98.9-3.77 2.29-1.61 2.79-.41 6.92 1.15 9.18.76 1.11 1.67 2.35 2.86 2.31 1.15-.05 1.58-.74 2.97-.74 1.38 0 1.78.74 3 .72 1.24-.02 2.02-1.13 2.78-2.24.88-1.29 1.24-2.54 1.26-2.6-.03-.01-2.41-.93-2.4-3.7zM14.79 5.6c.63-.77 1.06-1.83.94-2.9-.91.04-2.01.61-2.67 1.37-.59.68-1.1 1.76-.96 2.8 1.01.08 2.05-.51 2.69-1.27z"/>
    </svg>
  );
}

function GoogleMark({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ display: 'block' }}>
      <path fill="#4285F4" d="M23 12.2c0-.8-.07-1.54-.2-2.27H12v4.3h6.15a5.3 5.3 0 0 1-2.28 3.47v2.9h3.68C21.68 18.66 23 15.72 23 12.2z"/>
      <path fill="#34A853" d="M12 23.5c2.97 0 5.46-.98 7.28-2.66l-3.68-2.85c-1.02.68-2.32 1.09-3.6 1.09-2.77 0-5.12-1.87-5.96-4.39H2.28v2.95A11.02 11.02 0 0 0 12 23.5z"/>
      <path fill="#FBBC05" d="M6.04 14.69a6.6 6.6 0 0 1 0-4.23V7.51H2.28a11.03 11.03 0 0 0 0 9.9l3.76-2.72z"/>
      <path fill="#EA4335" d="M12 5.7c1.57 0 2.97.54 4.08 1.6l3.25-3.25C17.45 2.2 14.96 1.15 12 1.15A11.02 11.02 0 0 0 2.28 7.51l3.76 2.95C6.88 7.94 9.23 5.7 12 5.7z"/>
    </svg>
  );
}

/* Social proof INSIDE the flow rather than as its own screen (§5.5). Three numbers, no chart —
   someone deciding whether to hand over their address wants scale and rating, not a dashboard. */
const PROOF = [
  { n: '4.9', label: 'Average rating', detail: 'across 2 100+ visits' },
  { n: '12', label: 'Joburg suburbs', detail: 'with same-week availability' },
  { n: '100%', label: 'Background-checked', detail: 'every Xooter, before their first job' },
];

function SignIn({ open, onClose, onSignedIn, initialMode = 'in' }) {
  /* 'in' = returning, 'up' = new. Same screen, different framing — a separate signup page
     doubles the surface for one boolean, and the fields are identical either way. */
  const [mode, setMode] = React.useState(initialMode);
  const [stage, setStage] = React.useState('choose');
  const [email, setEmail] = React.useState('');
  const [code, setCode] = React.useState('');
  const [sso, setSso] = React.useState(null);

  React.useEffect(() => { if (open) { setStage('choose'); setMode(initialMode); } }, [open, initialMode]);

  if (!open) return null;

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const codeValid = code.replace(/\D/g, '').length === 6;

  const finish = () => {
    /* A real build sets a session here. The kit just tells the page it's signed in, which is
       enough for the header, the bug-bounty tab and the booking prefill to react. */
    onSignedIn && onSignedIn({ email: email || `${sso}@example.co.za`, via: sso || 'email' });
  };

  const closeBtn = (
    <button type="button" aria-label="Close" onClick={onClose}
      style={{
        position: 'absolute', top: 18, right: 18, zIndex: 3,
        display: 'grid', placeItems: 'center', width: 38, height: 38, border: 'none',
        borderRadius: '50%', background: 'var(--xoot-surface-sunken)', cursor: 'pointer',
        color: 'var(--xoot-text-primary)',
      }}>
      <Icon name="x" size={18} strokeWidth={2.2} />
    </button>
  );

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose && onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 240, display: 'grid', placeItems: 'center',
        padding: 'clamp(12px, 4vw, 40px)', background: 'rgba(20,18,16,.5)',
        overflowY: 'auto',
      }}
    >
      <div style={{
        position: 'relative', width: '100%', maxWidth: 940,
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
        background: 'var(--xoot-surface-card)', borderRadius: 'var(--xoot-radius-xl)',
        boxShadow: 'var(--xoot-shadow-5)', overflow: 'hidden',
        /* Opacity only — a transform here would promote the panel to its own layer and
           rasterise every field label blurrily. Same trap as the booking modal. */
        animation: 'xoot-fade-in 280ms var(--xoot-ease-ios-nav) both',
      }}>
        {closeBtn}

        {/* ── Left: the pitch. §5.2's split layout — card one side, creative the other. ── */}
        <div style={{
          position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center',
          gap: 26, padding: 'clamp(28px, 4vw, 48px)', background: 'var(--xoot-grad-dawn)',
          overflow: 'hidden',
        }}>
          <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            {[
              { size: 96, palette: 'lilac', left: '-8%', top: '6%', op: .32, d: 0 },
              { size: 64, palette: 'petal', left: '82%', top: '-2%', op: .3, d: 220 },
              { size: 80, palette: 'honey', left: '86%', top: '68%', op: .28, d: 400 },
              { size: 58, palette: 'sage', left: '4%', top: '82%', op: .3, d: 140 },
            ].map((b, i) => (
              <span key={i} style={{ position: 'absolute', left: b.left, top: b.top }}>
                <Bloom size={b.size} palette={b.palette} motion="sway" delay={b.d} opacity={b.op} />
              </span>
            ))}
          </div>

          <div style={{ position: 'relative' }}>
            <Logo size={30} tone="violet" />
            <h2 style={{
              marginTop: 22, fontSize: 'clamp(28px, 3vw, 40px)', lineHeight: 1.1,
              letterSpacing: '-.018em',
            }}>
              {mode === 'in' ? 'Pick up where you left off.' : "Let's get your home sorted."}
            </h2>
            <p style={{ marginTop: 14, fontSize: 'var(--xoot-body-lg)', lineHeight: 1.55, color: 'var(--xoot-text-secondary)', maxWidth: 380 }}>
              {mode === 'in'
                ? 'Your places, your Xooters and your usual times are all still here.'
                : 'Tell us about the place once. After that, booking is about a minute — and you can walk away and let us handle it.'}
            </p>
          </div>

          {/* Proof in the flow, not on its own screen. */}
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {PROOF.map(p => (
              <div key={p.label} style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                <span style={{
                  fontFamily: 'var(--xoot-font-display)', fontSize: 'var(--xoot-title-1)',
                  lineHeight: 1, color: 'var(--xoot-violet-700)', minWidth: 62,
                }}>{p.n}</span>
                <span style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 'var(--xoot-body-sm)', fontWeight: 700 }}>{p.label}</span>
                  <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-secondary)' }}>{p.detail}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: the ways in ── */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 16, padding: 'clamp(28px, 4vw, 48px)' }}>

          {stage === 'choose' && (
            <>
              <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>
                {mode === 'in' ? 'Welcome back' : 'Three taps and you are in'}
              </span>

              {/* Email leads because it is the only path with a backend. */}
              <label style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                <span style={{ fontSize: 'var(--xoot-body-sm)', fontWeight: 700 }}>Your email</span>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.co.za"
                  style={{
                    height: 54, padding: '0 18px', border: 'none', borderRadius: 'var(--xoot-radius-sm)',
                    background: 'var(--xoot-surface-page-alt)',
                    boxShadow: 'inset 0 0 0 1px var(--xoot-border-color)', outline: 'none',
                    fontFamily: 'var(--xoot-font-core)', fontSize: 'var(--xoot-body)',
                    color: 'var(--xoot-text-primary)',
                  }} />
              </label>

              <Button variant="primary" size="lg" block disabled={!emailValid}
                onClick={() => setStage('code')} iconRight="arrow-right">
                Continue with email
              </Button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0' }}>
                <span style={{ flex: 1, height: 1, background: 'var(--xoot-border-color)' }} />
                <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)' }}>or</span>
                <span style={{ flex: 1, height: 1, background: 'var(--xoot-border-color)' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[['apple', 'Apple', <AppleMark key="a" />], ['google', 'Google', <GoogleMark key="g" />]].map(([key, label, mark]) => (
                  <button key={key} type="button"
                    onClick={() => { setSso(key); setStage('sso'); }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                      height: 54, border: 'none', borderRadius: 'var(--xoot-radius-sm)',
                      background: 'var(--xoot-surface-card)',
                      boxShadow: 'inset 0 0 0 1.5px var(--xoot-border-color-strong)',
                      cursor: 'pointer', color: 'var(--xoot-text-primary)',
                      fontFamily: 'var(--xoot-font-core)', fontSize: 'var(--xoot-body-sm)', fontWeight: 700,
                    }}>
                    {mark}{label}
                  </button>
                ))}
              </div>

              {/* Phone, demoted. §5.2a: it has no backend — email OTP is all that exists, and
                  phone auth is blocked on the same Twilio Verify activation as masked calling.
                  The brief's own call is to demote rather than hide, so the layout stays honest
                  and the button returns to the top once Verify is live. */}
              <button type="button" disabled
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                  height: 50, marginTop: 2, border: 'none', borderRadius: 'var(--xoot-radius-sm)',
                  background: 'var(--xoot-surface-sunken)', cursor: 'not-allowed',
                  color: 'var(--xoot-text-muted)', fontFamily: 'var(--xoot-font-core)',
                  fontSize: 'var(--xoot-body-sm)', fontWeight: 700,
                }}>
                <Icon name="phone" size={16} strokeWidth={2} />
                Continue with phone
                <span className="xoot-label" style={{
                  padding: '4px 8px', borderRadius: 'var(--xoot-radius-pill)',
                  background: 'var(--xoot-honey-wash)', color: 'var(--xoot-honey-ink)',
                }}>Soon</span>
              </button>

              <button type="button" onClick={() => setMode(m => (m === 'in' ? 'up' : 'in'))}
                style={{
                  marginTop: 6, border: 'none', background: 'none', padding: 0, cursor: 'pointer',
                  fontFamily: 'var(--xoot-font-core)', fontSize: 'var(--xoot-body-sm)',
                  fontWeight: 700, color: 'var(--xoot-violet-700)', textAlign: 'left',
                }}>
                {mode === 'in' ? "First time here? Start fresh" : 'Been here before? Pick up where you left off'}
              </button>

              <p style={{ marginTop: 4, fontSize: 'var(--xoot-caption)', lineHeight: 1.55, color: 'var(--xoot-text-muted)' }}>
                By continuing you agree to our terms and privacy notice. We never share your
                address or access codes — a Xooter sees them only on the day.
              </p>
            </>
          )}

          {stage === 'code' && (
            <>
              <button type="button" onClick={() => setStage('choose')}
                style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6, border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontSize: 'var(--xoot-body-sm)', fontWeight: 700, color: 'var(--xoot-text-muted)' }}>
                <Icon name="arrow-left" size={15} strokeWidth={2.2} />Back
              </button>
              <h3 style={{ fontSize: 'var(--xoot-title-1)', lineHeight: 1.2 }}>Check your email</h3>
              <p style={{ fontSize: 'var(--xoot-body)', lineHeight: 1.55, color: 'var(--xoot-text-secondary)' }}>
                We sent a six-digit code to <strong style={{ color: 'var(--xoot-text-primary)' }}>{email}</strong>.
                No password to remember.
              </p>
              <input
                value={code} inputMode="numeric" autoFocus
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                style={{
                  height: 62, padding: '0 20px', border: 'none', borderRadius: 'var(--xoot-radius-sm)',
                  background: 'var(--xoot-surface-page-alt)',
                  boxShadow: 'inset 0 0 0 1px var(--xoot-border-color)', outline: 'none',
                  fontFamily: 'var(--xoot-font-mono)', fontSize: 26, letterSpacing: '.28em',
                  textAlign: 'center', color: 'var(--xoot-text-primary)',
                }} />
              <Button variant="primary" size="lg" block disabled={!codeValid} onClick={finish}>
                {mode === 'in' ? 'Sign me in' : "Let's go"}
              </Button>
              <button type="button" onClick={() => setStage('choose')}
                style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontSize: 'var(--xoot-caption)', fontWeight: 700, color: 'var(--xoot-text-muted)' }}>
                Wrong email? Change it
              </button>
            </>
          )}

          {stage === 'sso' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center', padding: '20px 0' }}>
              <span style={{
                display: 'grid', placeItems: 'center', width: 62, height: 62,
                borderRadius: '50%', background: 'var(--xoot-surface-sunken)',
                color: 'var(--xoot-ink-900)',
              }}>
                {sso === 'apple' ? <AppleMark size={28} /> : <GoogleMark size={26} />}
              </span>
              <h3 style={{ fontSize: 'var(--xoot-title-1)', lineHeight: 1.2 }}>
                Continue with {sso === 'apple' ? 'Apple' : 'Google'}
              </h3>
              <p style={{ fontSize: 'var(--xoot-body-sm)', lineHeight: 1.55, color: 'var(--xoot-text-secondary)', maxWidth: 300 }}>
                {sso === 'apple'
                  ? 'You can hide your email address — we only ever use it to send booking updates.'
                  : "We'll only see your name and email. Nothing is posted anywhere."}
              </p>
              <Button variant="ink" size="lg" block onClick={finish}>
                Continue as Nadia
              </Button>
              <button type="button" onClick={() => setStage('choose')}
                style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontSize: 'var(--xoot-caption)', fontWeight: 700, color: 'var(--xoot-text-muted)' }}>
                Use a different way in
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { SignIn });
