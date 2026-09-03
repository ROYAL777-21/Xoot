/* ── Trust, safety and security — the mechanisms ───────────────────────────────
 *
 * The existing SafetyTrust section publishes four claims in the present tense that production has
 * never exercised — one user, zero bookings. `blocker.md` flags it, and `BRAND.md` permits "real
 * process evidence, verified reviews, and approved client proof only". So this section describes
 * MECHANISMS and carries an honest status on each, rather than adding a fifth unverifiable
 * guarantee. `safety.ts` sets the rule this follows: no safety promise may be shown before the
 * thing it promises works.
 *
 * Three statuses, and the wording is deliberate:
 *   live      — running today, and a customer can rely on it now.
 *   built     — the code exists and is deployed, but has not been exercised end to end.
 *   at launch — designed and specified; switched off until a named condition is met.
 *
 * Being specific about what is off is what makes the "live" rows worth believing. A page where
 * everything is green teaches people to discount all of it.
 *
 * The access-window demo is the load-bearing piece: it is the one mechanism customers ask about
 * unprompted, and a diagram of a timed release answers it faster than three paragraphs.
 */
const { Card, Button, Icon, Badge, Switch } = window.XootNS;

const STATUS = {
  live: { label: 'Live', tone: 'success' },
  built: { label: 'Built, not yet proven end to end', tone: 'info' },
  launch: { label: 'On at launch', tone: 'warning' },
};

/* The access-window schedule, as data, because the visual and the copy must not be able to
   disagree about it. Minutes are relative to the visit start. */
const WINDOW_STAGES = [
  { at: '−7 days', title: 'You save the details', body: 'Gate code, alarm code, where the key is. Encrypted the moment they leave your phone.', state: 'locked' },
  { at: '−45 min', title: 'The window opens', body: 'Only the assigned Xooter, only for this visit. Not saved to their device.', state: 'open' },
  { at: 'During', title: 'Every view is logged', body: 'You can see who looked, and when. Screenshots are blocked on that screen.', state: 'open' },
  { at: 'Complete', title: 'The window closes', body: 'Access ends with the visit, not at the end of the day.', state: 'locked' },
  { at: '+7 days', title: 'The codes are deleted', body: 'Not archived. The shortest retention of anything on the platform.', state: 'gone' },
];

const MECHANISMS = [
  {
    icon: 'lock', tint: 'lilac', status: 'built',
    title: 'Access windows',
    body: 'Your gate and alarm codes are a timed release, not saved data a Xooter can browse. They unlock 45 minutes before the visit and lock again when it completes.',
    points: [
      'Encrypted at rest under a key that is different on every environment',
      'Released to one Xooter, for one visit',
      'Deleted seven days after the visit',
    ],
    note: 'Deployed and encrypted. Not yet proven by a code stored and read back through the app, which is the only test that counts.',
  },
  {
    icon: 'camera', tint: 'mist', status: 'built',
    title: 'Screenshots blocked',
    body: 'The screen showing your access details cannot be captured, and it blanks when the app goes to the background or into the app switcher.',
    points: [
      'Android: capture is prevented outright',
      'iOS: capture is detected and logged, and you are told',
      'The screen blanks on backgrounding on both',
    ],
    note: 'Honest limit: on iOS the platform allows detection, not prevention, and no software stops a second phone photographing a screen. This is one layer — the seven-day deletion and the revoke switch are the ones that matter.',
  },
  {
    icon: 'x', tint: 'blush', status: 'built',
    title: 'Revoke access, instantly',
    body: 'One switch in the app cuts a Xooter\'s access to your details immediately — mid-visit if you need it. No support call, no waiting.',
    points: [
      'Takes effect at the next read, not at the next sync',
      'The Xooter is told access was withdrawn, not why',
      'Revoking does not cancel the visit, and does not charge you',
    ],
  },
  {
    icon: 'phone', tint: 'careplus', status: 'launch',
    title: 'SOS — for both sides',
    body: 'Hold the button and your live location goes to the Xoot safety team, with a direct line to emergency services. It is on the Xooter\'s screen as well as yours.',
    points: [
      'A lone worker in a stranger\'s home is the person most exposed here',
      'A cancel PIN is required once an alert has dispatched',
      'The Xooter can end a visit and leave, without penalty, at any time',
    ],
    note: 'Deliberately switched off. It turns on when 112 has been dialled from a real handset and an ops person has confirmed they received the alert — not before. Every step has a failure mode where the button looks like it works, and a person in trouble pressing something that does nothing is worse than no button.',
  },
  {
    icon: 'message-circle', tint: 'sage', status: 'live',
    title: 'Nobody swaps phone numbers',
    body: 'Messages and calls run through Xoot. Your number is never shown to a Xooter, and theirs is never shown to you.',
    points: [
      'Chat is tied to the booking and ends with it',
      'No recording and no transcription, by default and by design',
      'Reportable in one tap, read by a person',
    ],
  },
  {
    icon: 'badge-check', tint: 'honey', status: 'launch',
    title: 'Vetted before the first door',
    body: 'A South African ID or a passport with a valid work permit, proof of residence under three months old, bank details in their own name, a criminal record check, and required training completed.',
    points: [
      'Documents are certified and re-checked, not collected once',
      'Bank details must match the person — we do not pay third parties',
      'Training is a gate on accepting work, not a suggestion',
    ],
    note: 'The screening pipeline is built and the queues exist. No Xooter has been through it yet, so this reads as what will be required rather than as a record we can point to.',
  },
];

function TrustMechanisms({ onBook }) {
  const stacked = useNarrow(880);
  const [stage, setStage] = React.useState(1);
  const [revoked, setRevoked] = React.useState(false);

  const current = WINDOW_STAGES[stage];
  const shown = revoked ? 'gone' : current.state;

  return (
    <Section id="trust" tone="alt">
      <SectionHead
        eyebrow="Trust, safety and security"
        title="Letting someone into your home is the whole ask."
        sub="So the mechanisms are worth describing precisely — including the ones that are not switched on yet, and why."
        maxWidth={640}
      />

      {/* The access-window demo. Scrubbing a timeline explains a timed release in about four
          seconds; a paragraph does not. */}
      <Card pad="lg" radius="xl" style={{ marginTop: 40, boxShadow: 'var(--xoot-shadow-3)' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
          gap: 'clamp(24px, 3.4vw, 44px)', alignItems: 'start',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>Access window</span>
              <h3 style={{ fontFamily: 'var(--xoot-font-display)', fontSize: 'clamp(22px, 2.6vw, 30px)', lineHeight: 1.14, letterSpacing: '-.018em' }}>
                Your codes exist for one visit, then stop existing.
              </h3>
            </div>

            {/* Tap a stage rather than drag a slider: five discrete states, and a slider implies
                values in between that do not exist. */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {WINDOW_STAGES.map((s, i) => {
                const on = i === stage;
                return (
                  <button key={s.at} type="button" onClick={() => { setStage(i); setRevoked(false); }}
                    style={{
                      display: 'flex', gap: 13, alignItems: 'flex-start', minHeight: 48,
                      padding: '11px 13px', border: 'none', cursor: 'pointer', textAlign: 'left',
                      borderRadius: 'var(--xoot-radius-sm)',
                      background: on ? 'var(--xoot-action-brand-soft)' : 'transparent',
                      transition: 'background var(--xoot-dur-fast) var(--xoot-ease-out)',
                      fontFamily: 'var(--xoot-font-core)',
                    }}>
                    <span style={{
                      flex: '0 0 auto', minWidth: 58, paddingTop: 1,
                      fontFamily: 'var(--xoot-font-mono)', fontSize: 11,
                      color: on ? 'var(--xoot-violet-700)' : 'var(--xoot-text-muted)',
                    }}>{s.at}</span>
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                      <span style={{
                        fontSize: 'var(--xoot-body-sm)', fontWeight: 700,
                        color: on ? 'var(--xoot-violet-800)' : 'var(--xoot-text-primary)',
                      }}>{s.title}</span>
                      <span style={{ fontSize: 'var(--xoot-caption)', lineHeight: 1.45, color: 'var(--xoot-text-secondary)' }}>{s.body}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* What the Xooter's screen actually shows at the selected moment. */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{
              position: 'relative', overflow: 'hidden',
              padding: 'clamp(18px, 2.4vw, 24px)', borderRadius: 'var(--xoot-radius-lg)',
              background: shown === 'open' ? 'var(--xoot-surface-card)' : 'var(--xoot-ink-900)',
              boxShadow: shown === 'open' ? 'inset 0 0 0 1.5px var(--xoot-sage-mid)' : 'none',
              minHeight: 232,
              transition: 'background var(--xoot-dur-base) var(--xoot-ease-out)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 18 }}>
                <span style={{
                  fontFamily: 'var(--xoot-font-mono)', fontSize: 10, letterSpacing: '.12em',
                  textTransform: 'uppercase',
                  color: shown === 'open' ? 'var(--xoot-text-muted)' : 'rgba(255,255,255,.45)',
                }}>Xooter's screen</span>
                <Badge tone={shown === 'open' ? 'success' : 'neutral'}
                  icon={shown === 'open' ? 'key' : shown === 'gone' ? 'trash-2' : 'lock'}>
                  {shown === 'open' ? 'Unlocked' : shown === 'gone' ? (revoked ? 'Revoked' : 'Deleted') : 'Locked'}
                </Badge>
              </div>

              {shown === 'open' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                  {[['Gate code', '1408#'], ['Alarm', '2277'], ['Entry', 'Side gate — key under the pot']].map(([l, v]) => (
                    <div key={l} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--xoot-text-muted)' }}>{l}</span>
                      <span style={{ fontFamily: 'var(--xoot-font-mono)', fontSize: 17, fontWeight: 500 }}>{v}</span>
                    </div>
                  ))}
                  <span style={{
                    display: 'flex', alignItems: 'center', gap: 7, marginTop: 4,
                    fontSize: 'var(--xoot-caption)', color: 'var(--xoot-sage-ink)',
                  }}>
                    <Icon name="camera" size={14} strokeWidth={2} />
                    Screenshots blocked · this view is logged
                  </span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 11, paddingTop: 8 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <span style={{ height: 7, width: ['38%', '30%', '44%'][i], borderRadius: 3, background: 'rgba(255,255,255,.16)' }} />
                      <span style={{ height: 13, width: ['52%', '40%', '72%'][i], borderRadius: 4, background: 'rgba(255,255,255,.09)' }} />
                    </div>
                  ))}
                  <span style={{
                    display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 6,
                    fontSize: 'var(--xoot-caption)', lineHeight: 1.45, color: 'rgba(255,255,255,.62)',
                  }}>
                    <Icon name="lock" size={14} strokeWidth={2} style={{ flex: '0 0 auto', marginTop: 2 }} />
                    {shown === 'gone'
                      ? (revoked ? 'You withdrew access. It stopped at the next read.' : 'Deleted seven days after the visit. Nothing to release.')
                      : 'Nothing to show. The window is closed.'}
                  </span>
                </div>
              )}
            </div>

            {/* Revoke, as a switch you can actually throw. It overrides whatever stage is
                selected, because that is exactly what it does in the app. */}
            <Card pad="md" tone="flat" style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              <Switch
                label="Revoke this Xooter's access"
                description={revoked ? 'Withdrawn. The visit is unaffected and you are not charged.' : 'Available at any time, including mid-visit.'}
                checked={revoked}
                onChange={setRevoked}
              />
            </Card>
          </div>
        </div>
      </Card>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
        gap: 16, marginTop: 20,
      }}>
        {MECHANISMS.map(m => {
          const st = STATUS[m.status];
          return (
            <Card key={m.title} pad="lg" radius="lg" style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <span style={{
                  display: 'grid', placeItems: 'center', flex: '0 0 auto',
                  width: 44, height: 44, borderRadius: 'var(--xoot-radius-sm)',
                  background: `var(--xoot-${m.tint}-wash)`,
                }}>
                  <Icon name={m.icon} size={20} strokeWidth={1.9} color={`var(--xoot-${m.tint}-ink)`} />
                </span>
                <Badge tone={st.tone}>{st.label}</Badge>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                <h3 style={{ fontSize: 'var(--xoot-title-3)', fontWeight: 700, letterSpacing: '-.01em' }}>{m.title}</h3>
                <p style={{ fontSize: 'var(--xoot-body-sm)', lineHeight: 1.55, color: 'var(--xoot-text-secondary)', textWrap: 'pretty' }}>{m.body}</p>
              </div>

              <ul style={{ display: 'flex', flexDirection: 'column', gap: 7, margin: 0, padding: 0, listStyle: 'none' }}>
                {m.points.map(pt => (
                  <li key={pt} style={{ display: 'flex', gap: 9, fontSize: 'var(--xoot-caption)', lineHeight: 1.5, color: 'var(--xoot-text-secondary)' }}>
                    <span style={{ flex: '0 0 auto', width: 4, height: 4, marginTop: 7, borderRadius: '50%', background: `var(--xoot-${m.tint}-500)` }} />
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>

              {m.note && (
                <div style={{
                  display: 'flex', gap: 9, marginTop: 'auto', padding: '11px 13px',
                  borderRadius: 'var(--xoot-radius-xs)', background: 'var(--xoot-surface-sunken)',
                }}>
                  <Icon name="info" size={14} strokeWidth={2} color="var(--xoot-text-muted)" style={{ flex: '0 0 auto', marginTop: 2 }} />
                  <span style={{ fontSize: 11.5, lineHeight: 1.5, color: 'var(--xoot-text-muted)' }}>{m.note}</span>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <Card pad="lg" radius="lg" tone="flat" style={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between',
        gap: 16, marginTop: 20,
      }}>
        <p style={{ flex: '1 1 300px', fontSize: 'var(--xoot-body-sm)', lineHeight: 1.55, color: 'var(--xoot-text-secondary)', textWrap: 'pretty' }}>
          The full policy — what we hold, who sees it, how long it stays and how to get it deleted —
          is written out rather than summarised.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <a href="./Xoot%20Legal.dc.html#trust-safety" style={{ textDecoration: 'none' }}>
            <Button variant="outline" size="md">Trust &amp; safety policy</Button>
          </a>
          <a href="./Xoot%20Legal.dc.html#popia" style={{ textDecoration: 'none' }}>
            <Button variant="ghost" size="md">POPIA notice</Button>
          </a>
        </div>
      </Card>
    </Section>
  );
}

Object.assign(window, { TrustMechanisms });
