/* Search and Notifications — the two header destinations.

   Search indexes EVERYTHING, not just services: your own details, your settings, Care+, and the
   policies people only look for when something has gone wrong. A search that finds only bookable
   items is a filter; this is a way through the whole app. */
const { Icon, IconButton, Card, Badge, Button, ServiceIcon, XOOT_SERVICES, Avatar, Tag,
        SectionLabel, ConciergeEntry } = window.XootNS;
const XH = window.XootNS.Haptics;
const { CarePlusMark } = window.XootNS;

/* Care+ rows carry the real mark rather than Lucide's generic heart-plus. A sentinel icon
   name keeps the data table flat instead of leaking a component into it. */
function RowGlyph({ name, size = 20, color, strokeWidth = 1.9 }) {
  if (name === 'careplus') return <CarePlusMark size={size} color={color || 'var(--xoot-careplus-500)'} />;
  return <Icon name={name} size={size} color={color} strokeWidth={strokeWidth} />;
}

const GROUPS = ['Your details', 'Settings', 'Care+', 'Help & policies'];

/* `keys` carries the words people actually type — "t&c", "gate code", "money back" — because
   almost nobody searches using our own labels. */
function buildIndex(D) {
  return [
    { group: 'Your details', icon: 'circle-user', title: 'Nadia Khan', detail: 'Name, email, mobile, language', to: 'account',
      keys: 'name email mobile phone number language profile account me my details personal information' },
    { group: 'Your details', icon: 'map-pin', title: D.user.address, detail: 'Your home · access notes', to: 'home',
      keys: 'address home place gate code alarm access entry lockbox key suburb' },
    { group: 'Your details', icon: 'credit-card', title: 'Visa ·· 4821', detail: 'Payment method', to: 'payment',
      keys: 'card payment visa bank pay method billing' },
    { group: 'Your details', icon: 'wallet', title: 'R' + D.user.credit + ' XootCred', detail: 'Credit and points', to: 'cred',
      keys: 'credit xootcred balance money points reward convert' },
    { group: 'Your details', icon: 'book-open', title: 'Receipts & invoices', detail: 'Every visit you have paid for', to: 'invoices',
      keys: 'receipt invoice vat tax statement history spend download' },

    { group: 'Settings', icon: 'bell', title: 'Notifications', detail: 'Push, email and WhatsApp', to: 'notifications',
      keys: 'notification push email whatsapp alert reminder message sound' },
    { group: 'Settings', icon: 'calendar-check', title: 'Connected calendars', detail: 'Apple · Google', to: 'calendars',
      keys: 'calendar sync apple google outlook ical' },
    { group: 'Settings', icon: 'sparkles', title: 'Siri & Concierge', detail: 'Ask by voice', to: 'siri',
      keys: 'siri voice shortcut concierge assistant ask ai' },
    { group: 'Settings', icon: 'chart-column', title: 'Widgets', detail: 'For your home screen', to: 'widgets',
      keys: 'widget home screen lock screen island' },
    { group: 'Settings', icon: 'briefcase', title: 'Manage more', detail: 'Properties, dashboards, invoices', to: 'manage',
      keys: 'properties dashboard team bulk office airbnb business spend units' },

    { group: 'Care+', icon: 'heart-plus', title: 'Care+ membership', detail: 'R99 a month · first month free', to: 'careplus',
      keys: 'care careplus membership subscription trial cancel upgrade plan premium billing' },
    { group: 'Care+', icon: 'handshake', title: 'Refer & earn', detail: 'R' + D.referral.reward + ' each, once they book', to: 'refer',
      keys: 'refer invite friend code earn credit share neighbour' },

    { group: 'Help & policies', icon: 'shield-check', title: 'XootCover', detail: 'Included on every visit', to: 'cover',
      keys: 'xootcover insurance cover damage broken claim insured protection genric' },
    { group: 'Help & policies', icon: 'book-open', title: 'Terms & conditions', detail: 'The full agreement', to: 'terms',
      keys: 'terms conditions tc agreement legal contract policy rules fine print' },
    { group: 'Help & policies', icon: 'lock', title: 'Privacy & your data', detail: 'What we store, and for how long', to: 'privacy',
      keys: 'privacy data popia delete download personal information access codes revoke security' },
    { group: 'Help & policies', icon: 'circle-alert', title: 'Cancellations & refunds', detail: 'Free up to 24 hours before', to: 'terms',
      keys: 'cancel refund money back charge dispute late fee' },
    { group: 'Help & policies', icon: 'message-circle', title: 'Get help', detail: 'We usually reply within the hour', to: 'help',
      keys: 'help support contact problem issue complain wrong' },
    { group: 'Help & policies', icon: 'lightbulb', title: 'How Xoot works', detail: 'Booking, paying, payouts', to: 'how',
      keys: 'how works payment payout commission xooter paid explain' },
  ];
}

function SearchScreen({ onBack, onBook, onOpenVisit, onOpenEntry, onConcierge }) {
  const D = window.XootData;
  const INDEX = React.useMemo(() => buildIndex(D), []);
  const [q, setQ] = React.useState('');
  const inputRef = React.useRef(null);
  React.useEffect(() => { if (inputRef.current) inputRef.current.focus(); }, []);

  const term = q.trim().toLowerCase();
  const words = term.split(/\s+/).filter(w => w.length > 2);
  const services = !term ? [] : D.services.filter(s =>
    s.title.toLowerCase().includes(term) || s.blurb.toLowerCase().includes(term));
  const people = !term ? [] : D.pros.filter(p =>
    p.name.toLowerCase().includes(term) || p.suburb.toLowerCase().includes(term));
  const entries = !term ? [] : INDEX.filter(e =>
    e.title.toLowerCase().includes(term) ||
    (e.detail || '').toLowerCase().includes(term) ||
    e.keys.includes(term) ||
    words.some(w => e.keys.includes(w)));
  const nothing = services.length + people.length + entries.length === 0;

  const open = to => { XH.haptic('light'); onOpenEntry && onOpenEntry(to); };

  return (
    <>
      {/* The field IS the header — a search screen shouldn't make you find the search box. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 16px 12px' }}>
        <IconButton icon="arrow-left" label="Back" onClick={onBack} />
        <span style={{
          display: 'flex', alignItems: 'center', gap: 9, flex: 1, height: 46, padding: '0 14px',
          borderRadius: 'var(--xoot-radius-pill)', background: 'var(--xoot-surface-card)',
          boxShadow: 'inset 0 0 0 1px var(--xoot-border-color)',
        }}>
          <Icon name="search" size={17} color="var(--xoot-text-muted)" strokeWidth={2.1} />
          <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)}
            placeholder="Search anything in Xoot"
            style={{
              flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent',
              fontFamily: 'var(--xoot-font-core)', fontSize: 'var(--xoot-body)', fontWeight: 500,
              color: 'var(--xoot-text-primary)',
            }} />
          {q && (
            <button type="button" aria-label="Clear" onClick={() => { XH.haptic('light'); setQ(''); }}
              style={{ display: 'grid', placeItems: 'center', width: 22, height: 22, border: 'none', borderRadius: '50%', background: 'var(--xoot-surface-sunken)', color: 'var(--xoot-text-muted)', cursor: 'pointer' }}>
              <Icon name="x" size={12} strokeWidth={2.6} />
            </button>
          )}
        </span>
      </div>

      <Scroll bottom={100}>
        {!term && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Concierge sits at the top of search — it's the answer to anything the index can't match. */}
            <ConciergeEntry onOpen={() => onConcierge && onConcierge()} hint="When is my Xooter arriving?" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>Try</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {['Gate code', 'Receipts', 'Care+', 'Terms', 'Nomsa', 'Cancel'].map(t => (
                  <Tag key={t} onClick={() => { XH.haptic('selection'); setQ(t); }}>{t}</Tag>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>Book again</span>
              {D.services.slice(0, 3).map(sv => (
                <Card key={sv.key} tone="flat" pad="md" interactive onClick={onBook}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                  <ServiceIcon service={sv.key} size={40} shape="circle" motion="still" />
                  <span style={{ flex: 1, fontSize: 'var(--xoot-body)', fontWeight: 700 }}>{sv.title}</span>
                  <Icon name="chevron-right" size={17} color="var(--xoot-neutral-400)" />
                </Card>
              ))}
            </div>
          </div>
        )}

        {term && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {services.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <SectionLabel slot="plain" label="Services" count={services.length} />
                {services.map(sv => (
                  <Card key={sv.key} tone="flat" pad="md" interactive onClick={onBook}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                    <ServiceIcon service={sv.key} size={40} shape="circle" motion="still" />
                    <span style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 'var(--xoot-body)', fontWeight: 700 }}>{sv.title}</span>
                      <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)' }}>{sv.blurb} · {sv.est}</span>
                    </span>
                    <Icon name="chevron-right" size={17} color="var(--xoot-neutral-400)" />
                  </Card>
                ))}
              </div>
            )}

            {people.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <SectionLabel slot="plain" label="Xooters you've had" count={people.length} />
                {people.map(p => (
                  <Card key={p.name} tone="flat" pad="md" interactive onClick={onBook}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                    <Avatar name={p.name} size="md" badge="verified" />
                    <span style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 'var(--xoot-body)', fontWeight: 700 }}>{p.name}</span>
                      <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)' }}>{p.suburb} · {p.jobs} visits · {p.rating}</span>
                    </span>
                    <Badge tone="neutral" size="sm" icon="repeat">Rebook</Badge>
                  </Card>
                ))}
              </div>
            )}

            {GROUPS.map(g => {
              const rows = entries.filter(e => e.group === g);
              if (!rows.length) return null;
              return (
                <div key={g} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <SectionLabel slot="plain" label={g} count={rows.length} />
                  {rows.map(e => (
                    <Card key={e.title} tone="flat" pad="md" interactive onClick={() => open(e.to)}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                      <span style={{ display: 'grid', placeItems: 'center', width: 38, height: 38, flex: '0 0 auto', borderRadius: 'var(--xoot-radius-key)', background: 'var(--xoot-surface-sunken)' }}>
                        <RowGlyph name={e.icon} size={18} color="var(--xoot-icon-outline)" />
                      </span>
                      <span style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 'var(--xoot-body)', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</span>
                        <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.detail}</span>
                      </span>
                      <Icon name="chevron-right" size={17} color="var(--xoot-neutral-400)" />
                    </Card>
                  ))}
                </div>
              );
            })}

            {/* No match hands the question to Concierge rather than dead-ending. */}
            {nothing && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '30px 20px 10px', textAlign: 'center' }}>
                <Icon name="search" size={28} color="var(--xoot-neutral-400)" strokeWidth={1.7} />
                <span style={{ fontFamily: 'var(--xoot-font-display)', fontSize: 'var(--xoot-title-2)' }}>Nothing matching “{q}”</span>
                <span style={{ fontSize: 'var(--xoot-body-sm)', color: 'var(--xoot-text-muted)', maxWidth: 250, lineHeight: 1.5 }}>
                  Concierge might know — it can answer things the index can't.
                </span>
                <Button variant="primary" icon="sparkles" onClick={() => onConcierge && onConcierge(q)} style={{ marginTop: 4 }}>
                  Ask Xoot Concierge
                </Button>
              </div>
            )}
          </div>
        )}
      </Scroll>
    </>
  );
}

function NotificationsFeedScreen({ onBack, onOpenVisit, onRate }) {
  const [items, setItems] = React.useState([
    { id: 1, icon: 'truck', tint: 'blush', title: 'Nomsa is on the way', body: 'About 12 minutes out. Gate code is saved.', when: 'Just now', unread: true, go: 'visit' },
    { id: 2, icon: 'calendar-check', tint: 'lilac', title: 'Wednesday confirmed', body: 'Nomsa accepted your 08:00 visit.', when: '2 h ago', unread: true, go: 'visit' },
    { id: 3, icon: 'star', tint: 'honey', title: 'How did Monday go?', body: 'Rate Grace so we know who to send next.', when: 'Yesterday', unread: false, go: 'rate' },
    { id: 4, icon: 'wallet', tint: 'sage', title: 'R30 add-on credit added', body: 'Your Care+ credit for August is ready.', when: '2 days ago', unread: false },
    { id: 5, icon: 'handshake', tint: 'mist', title: 'Thandi joined Xoot', body: 'R100 is on its way once she books.', when: '4 days ago' },
  ]);
  const unread = items.filter(i => i.unread).length;

  return (
    <>
      <TopBar onBack={onBack} title="Notifications" subtitle={unread ? unread + ' new' : 'All caught up'}
        trailing={unread ? (
          <button type="button" onClick={() => { XH.haptic('light'); setItems(is => is.map(i => ({ ...i, unread: false }))); }}
            style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontFamily: 'var(--xoot-font-core)', fontSize: 'var(--xoot-caption)', fontWeight: 700, color: 'var(--xoot-text-link)' }}>
            Mark all read
          </button>
        ) : null} />
      <Scroll bottom={100}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map(n => (
            <button key={n.id} type="button"
              onClick={() => {
                XH.haptic('light');
                setItems(is => is.map(i => i.id === n.id ? { ...i, unread: false } : i));
                if (n.go === 'visit' && onOpenVisit) onOpenVisit();
                if (n.go === 'rate' && onRate) onRate();
              }}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 12, width: '100%',
                padding: 'var(--xoot-space-4)', border: 'none', textAlign: 'left', cursor: 'pointer',
                borderRadius: 'var(--xoot-radius-md)',
                background: n.unread ? 'var(--xoot-surface-card)' : 'transparent',
                boxShadow: n.unread ? 'var(--xoot-shadow-2)' : 'inset 0 0 0 1px var(--xoot-border-color)',
              }}>
              <span style={{
                display: 'grid', placeItems: 'center', width: 40, height: 40, flex: '0 0 auto',
                borderRadius: 'var(--xoot-radius-key)', background: 'var(--xoot-' + n.tint + '-wash)',
              }}>
                <Icon name={n.icon} size={19} color="var(--xoot-ink-900)" strokeWidth={1.9} />
              </span>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
                <span style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 'var(--xoot-body)', fontWeight: 700, flex: 1 }}>{n.title}</span>
                  <span style={{ fontSize: 'var(--xoot-micro)', color: 'var(--xoot-text-muted)', flex: '0 0 auto' }}>{n.when}</span>
                </span>
                <span style={{ fontSize: 'var(--xoot-body-sm)', color: 'var(--xoot-text-secondary)', lineHeight: 1.45 }}>{n.body}</span>
              </span>
              {n.unread && <span style={{ width: 8, height: 8, marginTop: 6, borderRadius: '50%', background: 'var(--xoot-action-brand)', flex: '0 0 auto' }} />}
            </button>
          ))}
        </div>
      </Scroll>
    </>
  );
}

/* The Concierge screen — the assistant, full height. */
function ConciergeScreen({ onBack, onNavigate, seed }) {
  const D = window.XootData;
  const { Concierge } = window.XootNS;
  return (
    <>
      <TopBar onBack={onBack} title="Xoot Concierge" subtitle="Ask about your home, your visits, your billing" />
      <div style={{ flex: 1, minHeight: 0, padding: '0 20px 16px', display: 'flex' }}>
        <Concierge
          onNavigate={onNavigate}
          context={{
            booking: {
              state: 'en_route', xooter: 'Nomsa', when: 'Wednesday 08:00',
              etaMinutes: 12, etaClock: '08:00', endClock: '12:00',
              service: 'Regular cleaning', hours: 4, total: 'R491',
              xooterRating: 4.9, xooterVisits: 412, together: 12,
            },
            credit: D.user.credit, points: D.user.points,
          }} />
      </div>
    </>
  );
}

Object.assign(window, { SearchScreen, NotificationsFeedScreen, ConciergeScreen });
