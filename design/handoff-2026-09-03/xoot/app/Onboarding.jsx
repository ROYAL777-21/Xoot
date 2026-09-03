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
