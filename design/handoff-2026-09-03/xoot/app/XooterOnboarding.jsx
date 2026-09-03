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
