/* ── Xooter onboarding + training catalogue ────────────────────────────────────
 *
 * One flow, gated in the order the business actually requires:
 *   sign in → documents → training → accept work
 *
 * "See training" used to open the catalogue to anyone. That is the wrong order: training is a
 * condition of accepting work, and showing the modules to someone with no account tells them the
 * requirement is decorative. The gate is enforced here AND stated up front, because a gate you
 * discover at step four feels like a bait and switch.
 *
 * ON DOCUMENT INSTRUCTIONS. Every rejected document costs the applicant days and costs us an
 * onboarding. The overwhelming majority are rejected for four reasons — glare, a cropped corner,
 * a certification stamp older than three months, and a photo of a screen. So each of those is
 * named specifically, with the fix, before they upload rather than after we reject it.
 *
 * A note on legal accuracy: the requirement is a South African ID OR a passport with proof of the
 * right to work here. Saying "ID required" excludes people who are legally entitled to the work,
 * and getting that wrong in the copy is both unlawful and a supply problem.
 */
const { Card, Button, Icon, Badge, Input, ProgressRing } = window.XootNS;

const DOCUMENTS = [
  {
    key: 'id',
    title: 'ID or passport',
    required: true,
    what: 'A South African ID card, green ID book, or a passport together with a valid work permit or asylum document.',
    why: 'We have to establish that you are who you say you are and that you are legally allowed to work in South Africa. There is no way around this one.',
    rules: [
      'Both sides of an ID card, or the photo page of a passport',
      'A passport needs its permit page too — the permit must still be valid',
      'The document itself, photographed. Not a photo of a screen showing it',
    ],
  },
  {
    key: 'residence',
    title: 'Proof of residence',
    required: true,
    what: 'A municipal bill, bank statement, lease, or a retail account statement showing your name and address.',
    why: 'It confirms you are contactable and settled. If the bill is not in your name, a signed affidavit from the person it belongs to works — that is common and it is not a problem.',
    rules: [
      'Dated within the last three months. Older is rejected automatically',
      'Your full name and the physical address must both be readable',
      'A bank statement can have the amounts blacked out — we do not need them',
    ],
  },
  {
    key: 'photo',
    title: 'Your profile photo',
    required: true,
    what: 'A clear photo of your face, taken today, against a plain wall.',
    why: 'Customers see this before they let you into their home. A good photo measurably gets you more work — it is the single highest-return five minutes in this whole process.',
    rules: [
      'Face the window. Natural light on your face, not behind you',
      'No hat, no sunglasses, no filter',
      'Plain wall behind you, and just you in the frame',
    ],
  },
  {
    key: 'police',
    title: 'Background check consent',
    required: true,
    what: 'Signed consent for us to run a criminal record check with an accredited bureau, or a SAPS clearance certificate you already hold.',
    why: 'Customers let Xooters into their homes, often when nobody is there. This is the check that makes that defensible, and it is the one thing we will not make optional. Most applicants let us run it — it is faster than queuing at a police station and we pay for it.',
    rules: [
      'Consent is signed in the app. It authorises one check, not ongoing monitoring',
      'We use an accredited bureau checking against the SAPS database',
      'If you already have a certificate it must be issued within the last six months',
      'A conviction is not automatically disqualifying \u2014 it is reviewed, and we tell you either way',
    ],
  },
  {
    key: 'bank',
    title: 'Bank details',
    required: true,
    what: 'A bank confirmation letter or a statement header showing the account name and number.',
    why: 'The account must be in your own name. We do not pay into anyone else\'s account — that is the most common way people in this work lose control of their own earnings.',
    rules: [
      'Account holder name must match your ID exactly',
      'A stamped bank confirmation letter is fastest',
      'No third-party accounts. No exceptions, and this is for your protection',
    ],
  },
];

/* The four things that get documents rejected, and how to avoid each. Shown before upload. */
const PHOTO_GUIDE = [
  ['sun', 'Light on it, not behind it', 'Stand next to a window with the document flat on a table. A shadow across a name is the most common rejection.'],
  ['camera', 'All four corners in frame', 'A cut-off corner means we cannot confirm the document is complete. Step back rather than zoom in.'],
  ['x', 'Never a photo of a screen', 'Moiré patterns and glare make it unreadable, and a screen photo cannot be verified as genuine.'],
  ['circle-check', 'Flat, not held', 'Put it on a table. A held document curves, and the curve puts half the text out of focus.'],
];

/* ── Training catalogue ──────────────────────────────────────────────────────
 * Six tracks. Three are required before a Xooter can accept work; the rest raise what they can
 * charge for and which jobs they can take. Ordered by what unlocks work fastest.
 */
const TRACKS = [
  {
    key: 'foundation', title: 'Foundation', required: true, tint: 'lilac', hours: 4,
    blurb: 'The non-negotiables. Nobody accepts a job without this.',
    modules: [
      ['Arriving well', 22, 'Punctuality, what to say at the door, what to do if nobody answers'],
      ['Your kit and what each thing is for', 26, 'Why the blue cloth never touches a kitchen surface'],
      ['Working in an occupied home', 31, 'Someone is working from home. Someone is asleep. Both are normal'],
      ['Pets, children and the things that break', 28, 'Dogs that bolt, cats that hide, and what to do about fragile items'],
      ['Finishing and handover', 19, 'The last ten minutes decide the rating'],
      ['Safety, and when to leave', 24, 'You can end a visit and go, at any time, without penalty. How and when'],
    ],
  },
  {
    key: 'surfaces', title: 'Surfaces & chemistry', required: true, tint: 'mist', hours: 5,
    blurb: 'The knowledge that stops you ruining a R40 000 counter.',
    modules: [
      ['pH, and why it decides everything', 34, 'Acid, alkaline, neutral — and what each one dissolves'],
      ['Natural stone: marble, granite, travertine', 41, 'Why anything acidic on marble is permanent damage'],
      ['Engineered stone, laminate and solid surface', 27, 'They look identical and behave completely differently'],
      ['Wood: sealed, oiled, waxed, laminate', 38, 'Four surfaces, four methods, one very expensive mistake'],
      ['Glass, mirrors and streaks', 22, 'The technique that removes streaking entirely'],
      ['Stainless steel and the grain', 18, 'Always with it. Never across it'],
      ['Fabric and upholstery basics', 29, 'Test patches, water rings, and when to say no'],
    ],
  },
  {
    key: 'safety', title: 'Safety & chemical handling', required: true, tint: 'blush', hours: 3,
    blurb: 'Including the combinations that produce toxic gas in a closed bathroom.',
    modules: [
      ['Never mix these', 24, 'Bleach and ammonia. Bleach and acid. Why, and what happens'],
      ['Ventilation and enclosed spaces', 19, 'A small bathroom is the highest-risk room in the house'],
      ['Gloves, masks and when they matter', 16, 'Not theatre — specific products, specific protection'],
      ['Lifting, ladders and reaching high', 21, 'The injuries that end cleaning careers are back injuries'],
      ['Electrical safety around water', 17, 'Plugs, appliances, and wet floors'],
      ['If something goes wrong', 23, 'Spills, burns, breakages: the first ninety seconds'],
    ],
  },
  {
    key: 'record', title: 'The Complete Knowledge of Cleaning', required: false, tint: 'honey',
    hours: 62, record: true,
    blurb: 'Our attempt at the longest single professionally-produced cleaning course ever recorded. Sixty-two hours, ninety-four modules, built with working Xooters.',
    modules: [
      ['Part I · Water, soap and the science of soil', 210, 'Where dirt comes from and what actually removes it — surfactants, emulsification, mechanical action'],
      ['Part II · The complete surface encyclopaedia', 480, 'Sixty-one surface types, each with its method, its chemistry and its failure mode'],
      ['Part III · Stains, in full', 390, 'Red wine on wool. Turmeric on marble. Ink on leather. Ninety-one stains, each traced to its removal'],
      ['Part IV · Kitchens, room by room', 300, 'Extraction, grease, ovens, the inside of a dishwasher, and the six places nobody thinks to look'],
      ['Part V · Bathrooms and water damage', 270, 'Limescale, mould, grout, silicone, and how to tell damage from dirt'],
      ['Part VI · Textiles, upholstery and floors', 340, 'Wool, silk, viscose, jute, engineered wood, sealed concrete'],
      ['Part VII · Luxury homes and delicate contents', 250, 'Art, antiques, instruments, wine, and what to refuse to touch'],
      ['Part VIII · Commercial, hospitality and turnover', 280, 'Working to a deadline, to a checklist, and to somebody else\'s standard'],
      ['Part IX · The professional', 200, 'Time estimation, pricing your own work, difficult conversations, building repeat clients'],
    ],
  },
  {
    key: 'specialist', title: 'Specialist tracks', required: false, tint: 'sage', hours: 8,
    blurb: 'Each one unlocks a service you can accept work for, at a higher rate.',
    modules: [
      ['Airbnb turnover certification', 95, 'Linen, restocking, the photo handover, and working to a check-in clock'],
      ['Move-in and move-out', 88, 'Inside cupboards, appliances, walls, skirtings — and the inspection standard'],
      ['Office and commercial', 76, 'After hours, alarm procedures, and a completely different definition of done'],
      ['Laundry and ironing', 82, 'Fabric codes, temperatures, and how to iron a shirt in under four minutes'],
      ['Xoot Lux standard', 110, 'The elite tier: what changes, and what is expected'],
    ],
  },
  {
    key: 'business', title: 'Running your side of it', required: false, tint: 'careplus', hours: 4,
    blurb: 'Earnings, tax, ratings, and getting rebooked.',
    modules: [
      ['How you get paid, exactly', 26, 'Commission, timing, and reading your statement'],
      ['Tax for independent workers', 44, 'Provisional tax, what to keep, and when SARS applies to you'],
      ['Your rating, and how it moves', 31, 'What customers actually rate, and the two things that lose stars'],
      ['Getting rebooked', 28, 'The repeat client is worth ten first bookings'],
      ['Saying no well', 22, 'Jobs to decline, and how to decline them without a penalty'],
    ],
  },
];

const totalModules = TRACKS.reduce((n, t) => n + t.modules.length, 0);
const totalHours = TRACKS.reduce((n, t) => n + t.hours, 0);

function XooterOnboarding({ open, onClose, onSignIn }) {
  const S = window.XootSession;
  const [tab, setTab] = React.useState('start');
  const [openTrack, setOpenTrack] = React.useState('foundation');
  const [guide, setGuide] = React.useState(null);

  const user = S && S.user;
  const docs = (S && S.documents) || {};
  const doneDocs = DOCUMENTS.filter(d => d.required && docs[d.key] && docs[d.key].status !== 'rejected').length;
  const reqDocs = DOCUMENTS.filter(d => d.required).length;
  const docsComplete = doneDocs === reqDocs;

  React.useEffect(() => {
    if (!open) return;
    /* Land people where they actually are, rather than making them click through stages they have
       already finished. */
    setTab(!user ? 'start' : !docsComplete ? 'documents' : 'training');
  }, [open, !!user, docsComplete]);

  if (!open) return null;

  const STAGES = [
    ['start', 'Sign in', !!user],
    ['documents', 'Documents', docsComplete],
    ['training', 'Training', false],
  ];

  return (
    <div role="dialog" aria-modal="true" aria-label="Become a Xooter"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 250, display: 'grid', placeItems: 'start center',
        padding: 'clamp(8px, 3vw, 36px)', background: 'rgba(20,18,16,.55)', overflowY: 'auto',
        animation: 'xoot-fade-in var(--xoot-dur-base) var(--xoot-ease-out)',
      }}>
      <div style={{
        width: '100%', maxWidth: 860, borderRadius: 'var(--xoot-radius-xl)',
        background: 'var(--xoot-surface-page)', boxShadow: 'var(--xoot-shadow-5)', overflow: 'hidden',
        animation: 'xoot-sheet-up var(--xoot-dur-slow) var(--xoot-ease-ios-spring) both',
      }}>
        {/* Header: the whole path, visible from the first screen. A gate discovered at step four
            feels like a bait and switch; a gate stated at step one is just a requirement. */}
        <div style={{ padding: 'clamp(20px, 3vw, 30px)', background: 'var(--xoot-grad-dawn)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, marginBottom: 18 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span className="xoot-label" style={{ color: 'var(--xoot-violet-700)' }}>Become a Xooter</span>
              <span style={{ fontFamily: 'var(--xoot-font-display)', fontSize: 'clamp(21px, 2.8vw, 29px)', lineHeight: 1.14 }}>
                Three steps before your first job
              </span>
            </div>
            <button type="button" aria-label="Close" onClick={onClose} style={{
              display: 'grid', placeItems: 'center', width: 40, height: 40, flex: '0 0 auto',
              border: 'none', borderRadius: '50%', background: 'rgba(255,255,255,.65)',
              cursor: 'pointer', fontSize: 16,
            }}>✕</button>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {STAGES.map(([key, label, done], i) => {
              const on = tab === key;
              return (
                <button key={key} type="button" onClick={() => setTab(key)} style={{
                  display: 'flex', alignItems: 'center', gap: 8, minHeight: 44,
                  padding: '9px 15px', border: 'none', cursor: 'pointer',
                  borderRadius: 'var(--xoot-radius-pill)',
                  background: on ? 'var(--xoot-ink-900)' : 'rgba(255,255,255,.6)',
                  color: on ? '#fff' : 'var(--xoot-text-secondary)',
                  fontFamily: 'var(--xoot-font-core)', fontSize: 'var(--xoot-body-sm)', fontWeight: 700,
                  transition: 'all var(--xoot-dur-base) var(--xoot-ease-ios-snap)',
                }}>
                  <span style={{
                    display: 'grid', placeItems: 'center', width: 20, height: 20, borderRadius: '50%',
                    background: done ? 'var(--xoot-sage-500)' : on ? 'rgba(255,255,255,.22)' : 'var(--xoot-neutral-200)',
                    fontSize: 11, fontWeight: 800,
                    color: done ? '#fff' : on ? '#fff' : 'var(--xoot-text-muted)',
                  }}>{done ? '✓' : i + 1}</span>
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ padding: 'clamp(20px, 3vw, 32px)', display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* ── 1 · Sign in ── */}
          {tab === 'start' && (
            <>
              <p style={{ fontSize: 'var(--xoot-body-lg)', lineHeight: 1.6, color: 'var(--xoot-text-secondary)', textWrap: 'pretty', maxWidth: '62ch' }}>
                Xooters set their own hours, pick their own jobs, and keep 70 to 80% of what the
                customer pays. There is no joining fee and no monthly cost — we only earn when you
                do.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 210px), 1fr))', gap: 12 }}>
                {[
                  ['wallet', 'R2 400 – R6 800 a month', 'Typical for part-time hours in a priority suburb'],
                  ['calendar', 'You choose the work', 'Accept and decline freely. No penalty for saying no'],
                  ['graduation-cap', 'Training is free', `${totalModules} modules, ${totalHours} hours, all of it included`],
                ].map(([ic, t, d]) => (
                  <Card key={t} pad="md" tone="flat" style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    <Icon name={ic} size={19} strokeWidth={1.9} color="var(--xoot-violet-600)" />
                    <span style={{ fontSize: 'var(--xoot-body-sm)', fontWeight: 700, lineHeight: 1.3 }}>{t}</span>
                    <span style={{ fontSize: 'var(--xoot-caption)', lineHeight: 1.45, color: 'var(--xoot-text-muted)' }}>{d}</span>
                  </Card>
                ))}
              </div>

              <Card pad="md" style={{ background: 'var(--xoot-surface-sunken)', display: 'flex', flexDirection: 'column', gap: 9 }}>
                <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>What you will need</span>
                <ul style={{ display: 'flex', flexDirection: 'column', gap: 7, margin: 0, padding: 0, listStyle: 'none' }}>
                  {['A South African ID, or a passport with a valid work permit',
                    'Proof of where you live, dated within three months',
                    'A bank account in your own name',
                    'A smartphone that can take a clear photo'].map(x => (
                    <li key={x} style={{ display: 'flex', gap: 9, fontSize: 'var(--xoot-body-sm)', lineHeight: 1.5, color: 'var(--xoot-text-secondary)' }}>
                      <Icon name="check" size={14} strokeWidth={2.6} color="var(--xoot-sage-500)" style={{ flex: '0 0 auto', marginTop: 3 }} />
                      {x}
                    </li>
                  ))}
                </ul>
              </Card>

              {user ? (
                <Button variant="primary" size="lg" block iconRight="arrow-right" onClick={() => setTab('documents')}>
                  Continue to documents
                </Button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <Button variant="primary" size="lg" block onClick={onSignIn}>
                    Sign in to start
                  </Button>
                  <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)', textAlign: 'center' }}>
                    Takes about twenty minutes. You can stop and come back — nothing is lost.
                  </span>
                </div>
              )}
            </>
          )}

          {/* ── 2 · Documents ── */}
          {tab === 'documents' && (
            <>
              {!user && (
                <Card pad="md" style={{ background: 'var(--xoot-honey-wash)', display: 'flex', gap: 11, alignItems: 'flex-start' }}>
                  <Icon name="lock" size={16} strokeWidth={2} color="var(--xoot-honey-ink)" style={{ flex: '0 0 auto', marginTop: 2 }} />
                  <span style={{ fontSize: 'var(--xoot-body-sm)', lineHeight: 1.5, color: 'var(--xoot-text-secondary)' }}>
                    Sign in first so your documents are saved against your account.{' '}
                    <button type="button" onClick={onSignIn} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', font: 'inherit', fontWeight: 700, color: 'var(--xoot-violet-700)', textDecoration: 'underline' }}>Sign in</button>
                  </span>
                </Card>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
                <ProgressRing value={reqDocs ? doneDocs / reqDocs : 0} size={48} />
                <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 'var(--xoot-body-sm)', fontWeight: 700 }}>{doneDocs} of {reqDocs} required documents</span>
                  <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)' }}>Verified within two working days, usually faster</span>
                </span>
              </div>

              {/* The photo guide, before upload rather than after rejection. Four rules, because
                  four rejection reasons account for almost all of them. */}
              <Card pad="md" tone="flat" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>Take the photo like this and it will pass first time</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))', gap: 11 }}>
                  {PHOTO_GUIDE.map(([ic, t, d]) => (
                    <div key={t} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <span style={{
                        display: 'grid', placeItems: 'center', flex: '0 0 auto', width: 30, height: 30,
                        borderRadius: 'var(--xoot-radius-xs)', background: 'var(--xoot-surface-card)',
                      }}>
                        <Icon name={ic} size={14} strokeWidth={2} color="var(--xoot-violet-600)" />
                      </span>
                      <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                        <span style={{ fontSize: 'var(--xoot-body-sm)', fontWeight: 700, lineHeight: 1.25 }}>{t}</span>
                        <span style={{ fontSize: 11.5, lineHeight: 1.45, color: 'var(--xoot-text-muted)' }}>{d}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </Card>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {DOCUMENTS.map(doc => {
                  const st = docs[doc.key];
                  const isOpen = guide === doc.key;
                  const state = !st ? 'none' : st.status;
                  const TONE = { approved: ['sage', 'Approved'], pending: ['honey', 'Checking'], rejected: ['blush', 'Try again'] };
                  const tone = TONE[state];
                  return (
                    <Card key={doc.key} pad="md" style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                        <span style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 'var(--xoot-body)', fontWeight: 700 }}>{doc.title}</span>
                            {!doc.required && <Badge tone="neutral">Optional</Badge>}
                          </span>
                          <span style={{ fontSize: 'var(--xoot-caption)', lineHeight: 1.5, color: 'var(--xoot-text-secondary)' }}>{doc.what}</span>
                        </span>
                        {tone && <Badge tone={state === 'approved' ? 'success' : state === 'rejected' ? 'danger' : 'warning'}>{tone[1]}</Badge>}
                      </div>

                      <button type="button" onClick={() => setGuide(isOpen ? null : doc.key)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 7, alignSelf: 'flex-start',
                          minHeight: 36, padding: 0, border: 'none', background: 'none', cursor: 'pointer',
                          fontFamily: 'var(--xoot-font-core)', fontSize: 'var(--xoot-caption)',
                          fontWeight: 700, color: 'var(--xoot-violet-700)',
                        }}>
                        <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} size={14} strokeWidth={2.4} />
                        {isOpen ? 'Hide the detail' : 'What exactly is needed'}
                      </button>

                      {isOpen && (
                        <div style={{
                          display: 'flex', flexDirection: 'column', gap: 10,
                          padding: '13px 15px', borderRadius: 'var(--xoot-radius-sm)',
                          background: 'var(--xoot-surface-sunken)',
                        }}>
                          <span style={{ fontSize: 'var(--xoot-caption)', lineHeight: 1.55, color: 'var(--xoot-text-secondary)' }}>{doc.why}</span>
                          <ul style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: 0, padding: 0, listStyle: 'none' }}>
                            {doc.rules.map(r => (
                              <li key={r} style={{ display: 'flex', gap: 8, fontSize: 11.5, lineHeight: 1.5, color: 'var(--xoot-text-secondary)' }}>
                                <span style={{ flex: '0 0 auto', width: 4, height: 4, marginTop: 6, borderRadius: '50%', background: 'var(--xoot-violet-400)' }} />
                                {r}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <Button size="sm" variant={state === 'approved' ? 'ghost' : 'outline'} icon="camera"
                        disabled={!user}
                        onClick={() => S.saveDocument(doc.key, 'pending')}>
                        {state === 'none' ? 'Upload' : state === 'rejected' ? 'Upload again' : 'Replace'}
                      </Button>
                    </Card>
                  );
                })}
              </div>

              <Button variant="primary" size="lg" block iconRight="arrow-right"
                disabled={!docsComplete} onClick={() => setTab('training')}>
                {docsComplete ? 'Continue to training' : `${reqDocs - doneDocs} still to upload`}
              </Button>
            </>
          )}

          {/* ── 3 · Training ── */}
          {tab === 'training' && (
            <>
              {(!user || !docsComplete) && (
                <Card pad="md" style={{ background: 'var(--xoot-honey-wash)', display: 'flex', gap: 11, alignItems: 'flex-start' }}>
                  <Icon name="lock" size={16} strokeWidth={2} color="var(--xoot-honey-ink)" style={{ flex: '0 0 auto', marginTop: 2 }} />
                  <span style={{ fontSize: 'var(--xoot-body-sm)', lineHeight: 1.5, color: 'var(--xoot-text-secondary)' }}>
                    You can read the catalogue now. Modules open once your documents are approved —
                    training is what lets you accept work, so it comes after verification.
                  </span>
                </Card>
              )}

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'baseline' }}>
                <span style={{ fontFamily: 'var(--xoot-font-display)', fontSize: 'clamp(20px, 2.4vw, 26px)', lineHeight: 1.15 }}>
                  {totalModules} modules · {totalHours} hours
                </span>
                <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)' }}>
                  Free, at your own pace, on your phone
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                {TRACKS.map(track => {
                  const isOpen = openTrack === track.key;
                  return (
                    <Card key={track.key} pad="none" radius="lg" style={{
                      overflow: 'hidden',
                      boxShadow: track.record ? 'inset 0 0 0 2px var(--xoot-honey-mid)' : undefined,
                    }}>
                      <button type="button" onClick={() => setOpenTrack(isOpen ? null : track.key)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 13, width: '100%',
                          padding: 'clamp(15px, 2vw, 19px)', border: 'none', cursor: 'pointer',
                          textAlign: 'left', background: isOpen ? `var(--xoot-${track.tint}-wash)` : 'transparent',
                          fontFamily: 'var(--xoot-font-core)',
                          transition: 'background var(--xoot-dur-base) var(--xoot-ease-out)',
                        }}>
                        <span style={{
                          display: 'grid', placeItems: 'center', flex: '0 0 auto', width: 42, height: 42,
                          borderRadius: 'var(--xoot-radius-sm)', background: `var(--xoot-${track.tint}-wash)`,
                        }}>
                          <Icon name={track.record ? 'trophy' : track.required ? 'shield-check' : 'graduation-cap'}
                            size={19} strokeWidth={1.9} color={`var(--xoot-${track.tint}-ink)`} />
                        </span>

                        <span style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 'var(--xoot-body)', fontWeight: 700 }}>{track.title}</span>
                            {track.required && <Badge tone="brand">Required</Badge>}
                            {track.record && <Badge tone="warning" icon="trophy">Record attempt</Badge>}
                          </span>
                          <span style={{ fontSize: 'var(--xoot-caption)', lineHeight: 1.45, color: 'var(--xoot-text-secondary)', textWrap: 'pretty' }}>
                            {track.blurb}
                          </span>
                          <span style={{ fontFamily: 'var(--xoot-font-mono)', fontSize: 11, color: 'var(--xoot-text-muted)' }}>
                            {track.modules.length} modules · {track.hours} hrs
                          </span>
                        </span>

                        <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} strokeWidth={2}
                          color="var(--xoot-text-muted)" style={{ flex: '0 0 auto' }} />
                      </button>

                      {isOpen && (
                        <div style={{ display: 'flex', flexDirection: 'column', padding: '0 clamp(15px, 2vw, 19px) clamp(15px, 2vw, 19px)' }}>
                          {track.record && (
                            <div style={{
                              display: 'flex', gap: 11, alignItems: 'flex-start', marginBottom: 13,
                              padding: '14px 16px', borderRadius: 'var(--xoot-radius-sm)',
                              background: 'var(--xoot-honey-wash)',
                            }}>
                              <Icon name="trophy" size={16} strokeWidth={2} color="var(--xoot-honey-ink)" style={{ flex: '0 0 auto', marginTop: 2 }} />
                              <span style={{ fontSize: 'var(--xoot-caption)', lineHeight: 1.55, color: 'var(--xoot-text-secondary)' }}>
                                Submitted to Guinness World Records for consideration as the longest
                                single professionally-produced instructional course on cleaning.
                                Sixty-two hours, filmed with working Xooters in real homes.{' '}
                                <strong>The record is the by-product, not the point</strong> — a
                                Xooter who finishes this knows more about surfaces and chemistry than
                                most professional cleaning managers.
                              </span>
                            </div>
                          )}

                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {track.modules.map(([title, mins, detail], i) => (
                              <div key={title} style={{
                                display: 'flex', gap: 13, alignItems: 'flex-start',
                                padding: '12px 0',
                                borderTop: i ? '1px solid var(--xoot-border-color)' : 'none',
                              }}>
                                <span style={{
                                  flex: '0 0 auto', minWidth: 26, paddingTop: 1,
                                  fontFamily: 'var(--xoot-font-mono)', fontSize: 11,
                                  color: 'var(--xoot-text-muted)',
                                }}>{String(i + 1).padStart(2, '0')}</span>
                                <span style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 0 }}>
                                  <span style={{ fontSize: 'var(--xoot-body-sm)', fontWeight: 700, lineHeight: 1.3, textWrap: 'pretty' }}>{title}</span>
                                  <span style={{ fontSize: 'var(--xoot-caption)', lineHeight: 1.45, color: 'var(--xoot-text-muted)', textWrap: 'pretty' }}>{detail}</span>
                                </span>
                                <span style={{
                                  flex: '0 0 auto', fontFamily: 'var(--xoot-font-mono)', fontSize: 11,
                                  color: 'var(--xoot-text-muted)', paddingTop: 2,
                                }}>{mins >= 60 ? `${Math.round(mins / 60)}h` : `${mins}m`}</span>
                              </div>
                            ))}
                          </div>

                          <Button size="sm" variant="outline" block disabled={!user || !docsComplete}
                            style={{ marginTop: 13 }}
                            onClick={() => S.track('training_start', { track: track.key })}>
                            {!user ? 'Sign in to start' : !docsComplete ? 'Upload documents first' : `Start ${track.title.toLowerCase()}`}
                          </Button>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>

              <Card pad="md" tone="flat" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ flex: '1 1 240px', fontSize: 'var(--xoot-body-sm)', lineHeight: 1.55, color: 'var(--xoot-text-secondary)' }}>
                  Training runs in the app, so you can do it on a taxi or between jobs. Progress
                  syncs with your Xooter dashboard.
                </span>
                <a href="./Xoot%20App.dc.html" style={{ textDecoration: 'none' }}>
                  <Button variant="primary" size="md" icon="phone">Get the app</Button>
                </a>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { XooterOnboarding, XOOT_TRACKS: TRACKS, XOOT_DOCUMENTS: DOCUMENTS });
