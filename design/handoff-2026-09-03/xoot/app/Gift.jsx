/* Gift a Clean — buy someone a visit.

   The shape follows the gifting flows people already know: choose what you're giving, make
   it personal, pay. Two things are deliberately different from a discount code. First, the
   card is visible the whole way through and updates live, so the sender is decorating a
   present rather than filling in a form. Second, the recipient never sees a price — they see
   "3 cleans", because "R840 of cleaning" is a receipt, not a gift.

   On a phone the reference layout's side-by-side preview doesn't fit, so the card sits above
   the form and shrinks once you're deep in the fields. */
const {
  GiftCard, GiftTintPicker, Button, Icon, Card, Badge, Input, ServiceIcon, Bloom, CountUp,
  XOOT_SERVICES, Toast, RadioGroup,
} = window.XootNS;
const XH = window.XootNS.Haptics;

/* Gifts are whole visits, not amounts. Pricing follows the standard rate for the service. */
/* Grouped by the reason someone gives a clean. The occasion is what people are actually
   choosing between — "thank you" and "new baby" want different words. */
const PRESET_NOTES = [
  { group: 'Just because',  text: "Thought you could use a break." },
  { group: 'Just because',  text: "No occasion. You just deserve a quiet weekend." },
  { group: 'Thank you',     text: "For everything you did last month. Take the day off." },
  { group: 'Thank you',     text: "A small thank you, from all of us." },
  { group: 'New home',      text: "Welcome to the new place. Let someone else do the first clean." },
  { group: 'New baby',      text: "Congratulations. One less thing to think about." },
  { group: 'Hard week',     text: "Heard it's been a rough one. This is on me." },
  { group: 'Birthday',      text: "Happy birthday. Spend the day not cleaning." },
];

const BUNDLES = [
  { key: 1, label: 'One clean', note: 'A weekend back' },
  { key: 3, label: 'Three cleans', note: 'A month of breathing room' },
  { key: 6, label: 'Six cleans', note: 'Half a year, handled' },
  { key: 12, label: 'Twelve cleans', note: 'A whole year' },
];

function GiftFlow({ onDone, onCancel }) {
  const D = window.XootData;
  const [stage, setStage] = React.useState(0);
  const [service, setService] = React.useState('regular');
  const [count, setCount] = React.useState(3);
  const [tint, setTint] = React.useState('blush');
  const [via, setVia] = React.useState('email');
  const [to, setTo] = React.useState({ name: '', email: '' });
  const [from, setFrom] = React.useState('Nadia');
  const [note, setNote] = React.useState('');
  const [copied, setCopied] = React.useState(false);

  const svc = D.services.find(s => s.key === service) || D.services[0];
  /* PRICED BY THE ENGINE, NOT HERE. This used to be `svc.from * count`, which was wrong twice
     over: `from` is a marketing teaser (R280 for a regular clean) while the real ladder charges
     R250 for the same visit, and it silently omitted the booking fee the recipient would still
     have been asked for — so a "gift" left them with a bill. XootQuote prices a gift off the
     same ladder a booking uses and includes the fee, so a gifted clean genuinely costs the
     recipient nothing. */
  const { quote, pending } = window.XootQuote.useGiftQuote(
    React.useMemo(() => ({ service, count }), [service, count])
  );
  const total = quote.total;
  const title = `${count} ${count === 1 ? 'clean' : 'cleans'}`;

  const canSend = via === 'link' || (to.name.trim() && to.email.trim());
  const STAGES = ['Choose', 'Personalise', 'Pay'];

  const back = () => (stage === 0 ? onCancel() : setStage(stage - 1));
  const next = () => { XH.haptic(stage === 2 ? 'heavy' : 'medium'); setStage(s => s + 1); };

  if (stage === 3) {
    return (
      <>
        <Scroll bottom={130}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, paddingTop: 28, textAlign: 'center' }}>
            <Bloom size={86} palette="petal" />
            <h1 style={{ fontSize: 'var(--xoot-display-3)', lineHeight: 1.08 }}>
              {via === 'email' ? `On its way to ${to.name || 'them'}` : 'Your gift link is ready'}
            </h1>
            <p style={{ fontSize: 'var(--xoot-body)', color: 'var(--xoot-text-secondary)', maxWidth: 280, lineHeight: 1.55 }}>
              {via === 'email'
                ? `We've emailed ${to.email}. They can book whenever suits them — the cleans don't expire.`
                : 'Send it however you like. Whoever opens it can book whenever suits them.'}
            </p>
            <GiftCard tint={tint} title={title} note={note || undefined} from={from || undefined} width={230} height={190} />

            {/* What happens at the other end. The sender is the one who'll be asked, so they
                should not have to guess. The link opens a page, not the App Store — making
                someone install an app before they can see their own gift wastes it. */}
            <Card tone="flat" pad="md" style={{ width: '100%', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>What they'll see</span>
              {[
                ['book-open', 'The card opens in their browser', 'No app, no account, no card needed to look.'],
                ['phone', 'Then Xoot, to pick a time', "We'll take them to the App Store or Play Store."],
                ['calendar-check', 'They book whenever suits', "The cleans don't expire, and they work at any address."],
              ].map(([ic, t, d]) => (
                <div key={t} style={{ display: 'flex', gap: 11 }}>
                  <span style={{ display: 'grid', placeItems: 'center', width: 30, height: 30, flex: '0 0 auto', borderRadius: 'var(--xoot-radius-key)', background: 'var(--xoot-surface-sunken)' }}>
                    <Icon name={ic} size={15} color="var(--xoot-icon-outline)" strokeWidth={1.9} />
                  </span>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 'var(--xoot-body-sm)', fontWeight: 700 }}>{t}</span>
                    <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)', lineHeight: 1.45 }}>{d}</span>
                  </span>
                </div>
              ))}
            </Card>
            {via === 'link' && (
              <button type="button"
                onClick={() => { XH.haptic('success'); setCopied(true); window.setTimeout(() => setCopied(false), 2000); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, height: 46, padding: '0 18px',
                  border: 'none', borderRadius: 'var(--xoot-radius-pill)',
                  background: 'var(--xoot-surface-card)', boxShadow: 'inset 0 0 0 1px var(--xoot-border-color)',
                  fontFamily: 'var(--xoot-font-mono)', fontSize: 'var(--xoot-body-sm)', cursor: 'pointer',
                  color: 'var(--xoot-text-primary)',
                }}>
                <Icon name={copied ? 'check' : 'ticket-percent'} size={15} strokeWidth={2.3} />
                {copied ? 'Copied' : 'xoot.co.za/g/8FK2QM'}
              </button>
            )}
          </div>
        </Scroll>
        <DockedCTA>
          <Button variant="primary" size="lg" block onClick={onDone}>Done</Button>
        </DockedCTA>
      </>
    );
  }

  return (
    <>
      <TopBar onBack={back} title="Gift a clean" subtitle={`${STAGES[stage]} · step ${stage + 1} of 3`} />

      <Scroll bottom={140}>
        {/* The card leads. It shrinks once the form gets long, but never disappears —
            watching it change is the reason this doesn't feel like buying a voucher. */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--xoot-space-5)' }}>
          <GiftCard
            tint={tint} title={title}
            note={stage >= 1 && note ? note : undefined}
            from={stage >= 1 && from ? from : undefined}
            width={stage === 0 ? 240 : 190}
            height={stage === 0 ? 200 : 160}
          />
        </div>

        {stage === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--xoot-space-5)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--xoot-space-3)' }}>
              <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>Which service?</span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {D.services.filter(s => !s.comingSoon).slice(0, 6).map((s, i) => {
                  const on = service === s.key;
                  return (
                    <button key={s.key} type="button"
                      onClick={() => { XH.haptic('selection'); setService(s.key); }}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
                        padding: '12px 6px', border: 'none', borderRadius: 'var(--xoot-radius-md)',
                        cursor: 'pointer', background: on ? 'var(--xoot-surface-card)' : 'transparent',
                        boxShadow: on ? 'var(--xoot-shadow-2), inset 0 0 0 2px var(--xoot-violet-500)' : 'inset 0 0 0 1px var(--xoot-border-color)',
                        transition: 'all var(--xoot-dur-fast) var(--xoot-ease-out)',
                      }}>
                      <ServiceIcon service={s.key} size={38} delay={i * 60} motion={on ? 'breathe' : 'still'} />
                      <span style={{ fontSize: 10.5, fontWeight: 700, textAlign: 'center', lineHeight: 1.25 }}>{s.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--xoot-space-3)' }}>
              <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>How many?</span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {BUNDLES.map(b => {
                  const on = count === b.key;
                  return (
                    <button key={b.key} type="button"
                      onClick={() => { XH.haptic('selection'); setCount(b.key); }}
                      style={{
                        display: 'flex', flexDirection: 'column', gap: 2, padding: '13px 14px',
                        border: 'none', borderRadius: 'var(--xoot-radius-sm)', textAlign: 'left',
                        cursor: 'pointer', background: on ? 'var(--xoot-action-brand-soft)' : 'var(--xoot-surface-card)',
                        boxShadow: on ? 'inset 0 0 0 2px var(--xoot-violet-500)' : 'inset 0 0 0 1px var(--xoot-border-color)',
                        transition: 'all var(--xoot-dur-fast) var(--xoot-ease-out)',
                      }}>
                      <span style={{ fontSize: 'var(--xoot-body)', fontWeight: 700, color: on ? 'var(--xoot-violet-700)' : 'var(--xoot-text-primary)' }}>{b.label}</span>
                      <span style={{ fontSize: 'var(--xoot-caption)', color: on ? 'var(--xoot-violet-700)' : 'var(--xoot-text-muted)', opacity: on ? .85 : 1 }}>{b.note}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', paddingTop: 4 }}>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 'var(--xoot-body)', fontWeight: 700 }}>Total</span>
                <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)' }}>
                  {D.rand(quote.perVisit)} a clean · fees included
                </span>
              </span>
              {/* Rolls as the bundle changes — stepping one clean to six should read as the
                  number climbing, not as a different number appearing. */}
              <span style={{ fontFamily: 'var(--xoot-font-display)', fontSize: 'var(--xoot-display-3)', lineHeight: 1, opacity: pending ? .45 : 1, transition: 'opacity var(--xoot-dur-fast) var(--xoot-ease-out)' }}>
                R<CountUp value={total} />
              </span>
            </div>
          </div>
        )}

        {stage === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--xoot-space-5)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--xoot-space-3)' }}>
              <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>Pick a colour</span>
              <GiftTintPicker value={tint} onChange={t => { XH.haptic('selection'); setTint(t); }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--xoot-space-3)' }}>
              <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>How should we send it?</span>
              <RadioGroup value={via} onChange={v => { XH.haptic('selection'); setVia(v); }} options={[
                { value: 'email', label: 'Send an email', description: 'Arrives straight away' },
                { value: 'link', label: 'Get a link to share', description: 'Send it yourself, whenever' },
              ]} />
            </div>

            {via === 'email' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--xoot-space-4)' }}>
                <Input label="Their name" placeholder="Thandi" value={to.name}
                  onChange={e => setTo(t => ({ ...t, name: e.target.value }))} />
                <Input label="Their email" placeholder="thandi@example.co.za" value={to.email}
                  onChange={e => setTo(t => ({ ...t, email: e.target.value }))} />
              </div>
            )}

            <Input label="Your name" value={from} onChange={e => setFrom(e.target.value)} />

            <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--xoot-space-2)' }}>
              <span style={{ fontSize: 'var(--xoot-body-sm)', fontWeight: 700 }}>Add a note</span>

              {/* Tap one to fill the box, then edit it. An empty box asks people to be
                  eloquent on the spot; most write nothing rather than risk it. */}
              <div style={{
                display: 'flex', gap: 7, margin: '0 -20px', padding: '2px 20px 4px',
                overflowX: 'auto', scrollbarWidth: 'none',
              }}>
                {PRESET_NOTES.map(p => {
                  const on = note === p.text;
                  return (
                    <button key={p.text} type="button"
                      onClick={() => { XH.haptic('selection'); setNote(on ? '' : p.text); }}
                      style={{
                        flex: '0 0 auto', height: 32, padding: '0 13px', border: 'none',
                        borderRadius: 'var(--xoot-radius-pill)', cursor: 'pointer',
                        background: on ? 'var(--xoot-action-brand-soft)' : 'var(--xoot-surface-card)',
                        boxShadow: on ? 'inset 0 0 0 1.5px var(--xoot-violet-500)' : 'inset 0 0 0 1px var(--xoot-border-color)',
                        color: on ? 'var(--xoot-violet-700)' : 'var(--xoot-text-secondary)',
                        fontFamily: 'var(--xoot-font-core)', fontSize: 'var(--xoot-caption)',
                        fontWeight: 700, whiteSpace: 'nowrap',
                        transition: 'all var(--xoot-dur-fast) var(--xoot-ease-out)',
                      }}>
                      {p.group}
                    </button>
                  );
                })}
              </div>

              <textarea value={note} onChange={e => setNote(e.target.value.slice(0, 90))} rows={3}
                placeholder="Thought you could use a break."
                style={{
                  padding: '12px 16px', border: 'none', borderRadius: 'var(--xoot-radius-sm)',
                  background: 'var(--xoot-surface-card)', boxShadow: 'inset 0 0 0 1px var(--xoot-border-color)',
                  outline: 'none', resize: 'none', fontFamily: 'var(--xoot-font-core)',
                  fontSize: 'var(--xoot-body)', lineHeight: 1.5, color: 'var(--xoot-text-primary)',
                }} />
              <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)' }}>
                {note.length}/90 · it goes on the card
              </span>
            </label>
          </div>
        )}

        {stage === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--xoot-space-4)' }}>
            <Card tone="flat" pad="md" style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>What you're giving</span>
              {/* Straight from the pricing service. */}
              {quote.lines.map(l => (
                <div key={l.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 'var(--xoot-body-sm)' }}>
                  <span style={{ color: 'var(--xoot-text-secondary)' }}>{l.label}</span>
                  <span style={{ fontFamily: 'var(--xoot-font-mono)', fontWeight: 600, flex: '0 0 auto' }}>{D.rand(l.amount)}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 'var(--xoot-body-sm)' }}>
                <span style={{ color: 'var(--xoot-text-secondary)' }}>To</span>
                <span style={{ fontWeight: 600, flex: '0 0 auto' }}>{via === 'email' ? (to.name || '—') : 'A shareable link'}</span>
              </div>
              <span style={{ height: 1, background: 'var(--xoot-neutral-200)' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontWeight: 700 }}>Total</span>
                <span style={{ fontFamily: 'var(--xoot-font-display)', fontSize: 'var(--xoot-title-1)' }}>{D.rand(total)}</span>
              </div>
              <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)', lineHeight: 1.45 }}>{quote.note}</span>
            </Card>

            <Card tone="flat" pad="md" style={{ display: 'flex', gap: 11 }}>
              <Icon name="info" size={18} color="var(--xoot-icon-outline)" strokeWidth={1.9} style={{ marginTop: 1 }} />
              <span style={{ fontSize: 'var(--xoot-body-sm)', lineHeight: 1.5, color: 'var(--xoot-text-secondary)' }}>
                They'll never see what you paid — just the cleans. Nothing expires, and if they
                move house it still works.
              </span>
            </Card>
          </div>
        )}
      </Scroll>

      <DockedCTA note={stage === 2 ? 'Paid once, now. Nothing recurring.' : undefined}>
        <Button variant="primary" size="lg" block
          disabled={(stage === 1 && !canSend) || (stage === 2 && pending)}
          loading={stage === 2 && pending}
          onClick={next}
          iconRight={stage === 2 ? 'lock' : 'arrow-right'}>
          {stage === 2 ? (pending ? 'Checking price' : `Pay ${D.rand(total)}`) : stage === 1 ? 'Review' : 'Continue'}
        </Button>
      </DockedCTA>
    </>
  );
}

Object.assign(window, { GiftFlow });
