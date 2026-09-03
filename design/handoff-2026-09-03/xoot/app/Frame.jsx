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
