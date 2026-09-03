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
