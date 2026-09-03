/* ── Journal — the #articles section the nav has been pointing at ──────────────
 *
 * Both the navbar and the footer link to `#articles`. Nothing with that id existed, so the link
 * scrolled to wherever the browser gave up — which is why it "doesn't work on a consistent basis".
 * It was not intermittent; it never worked, and looked intermittent because the failure mode is
 * "stay roughly here".
 *
 * The posts are real and readable in place. A card that opens a reader is worth building; a card
 * that links to a page that does not exist yet is the same bug in a new place.
 *
 * On the writing: these are the questions people actually ask before booking a stranger into their
 * home, answered by someone who knows the answer. No SEO padding, no "in today's fast-paced world".
 */
const { Card, Button, Icon, Badge, WashiTape } = window.XootNS;

const POSTS = [
  {
    id: 'what-4-hours-buys',
    kicker: 'Pricing',
    title: 'What four hours actually buys you',
    dek: 'A realistic account of what one Xooter finishes in a standard visit — and what they do not.',
    read: 6, tint: 'petal', date: '18 Aug 2026',
    body: [
      ['p', 'The most common disappointment in home cleaning is not bad work. It is a four-hour booking with eight hours of expectation attached to it. So here is the arithmetic, honestly.'],
      ['h', 'A two-bedroom flat, four hours, one Xooter'],
      ['p', 'Kitchen takes about seventy minutes if the dishes are done and roughly two hours if they are not. Bathrooms are thirty to forty minutes each, doubled if there is limescale that has been building since the last tenant. Two bedrooms, made and dusted and floors done, is about fifty minutes. That leaves roughly forty minutes for the living areas and the floors throughout.'],
      ['p', 'It adds up almost exactly. Which is why a Xooter who is asked to "quickly do the windows as well" finishes late, or finishes something else badly.'],
      ['h', 'What pushes a visit over'],
      ['list', [
        'Dishes in the sink at the start — a full sink is forty minutes before any cleaning begins',
        'Clutter on surfaces. We tidy, but tidying a surface is not the same as wiping it, and both take time',
        'Pets, honestly. Hair on upholstery is its own job',
        'An oven that has not been done in a year. This is a two-hour job on its own and it is an add-on for that reason',
      ]],
      ['h', 'What to do about it'],
      ['p', 'Two things help more than anything else. Clear the surfaces before your Xooter arrives — twenty minutes of your time buys back an hour of theirs. And be specific in the notes about the one thing that matters most to you, because a Xooter who knows the bathroom is the priority will start there.'],
      ['p', 'If the place genuinely needs more than four hours, book more than four hours, or send two Xooters. It costs close to the same, because the price is on total work rather than per person, and it finishes in half the time.'],
    ],
  },
  {
    id: 'vetting-really-means',
    kicker: 'Trust & safety',
    title: 'What "vetted" should mean, and usually does not',
    dek: 'Most platforms use the word. Very few will tell you what they actually checked.',
    read: 8, tint: 'mist', date: '02 Aug 2026',
    body: [
      ['p', 'Every home-services platform in South Africa says its people are vetted. The word does a great deal of work and almost none of it is defined. Here is what we check, in order, and what each one does and does not prove.'],
      ['h', 'Identity'],
      ['p', 'A South African ID, or a passport with a valid work permit. This is the floor, not the ceiling — it establishes that the person is who they say and is legally allowed to work here. It proves nothing about their conduct.'],
      ['h', 'Address'],
      ['p', 'A utility bill or bank statement under three months old, in their name or with an affidavit if it is not. The point is not the address itself. It is that someone with a verifiable, current address is reachable if something goes wrong, and that matters more than most people realise.'],
      ['h', 'Criminal record'],
      ['p', 'A check against the SAPS database through an accredited bureau. Worth being precise about what this means: it surfaces convictions. It does not surface behaviour that was never reported or never prosecuted, which is most behaviour. Anyone who implies otherwise is overselling.'],
      ['h', 'Bank account in their own name'],
      ['p', 'This one is not about fraud against you — it is about the Xooter. Paying into a third party\'s account is the single most common way domestic workers in this country lose control of their own earnings.'],
      ['h', 'What we are still building'],
      ['p', 'Reference checks with previous employers are inconsistent in this industry, because most domestic work is informal and there is nobody to phone. We are working on a way to make a Xooter\'s history on Xoot itself do that job over time. Until it does, we will not claim it.'],
    ],
  },
  {
    id: 'fair-pay-arithmetic',
    kicker: 'How we work',
    title: 'The arithmetic behind what a Xooter takes home',
    dek: 'Commission, the booking fee, and why the rate per hour goes down on longer jobs — with a floor under it.',
    read: 7, tint: 'sage', date: '21 Jul 2026',
    body: [
      ['p', 'We publish this because a platform that will not show you the split is usually hiding the size of it.'],
      ['h', 'The commission'],
      ['p', 'It starts at 30% and falls to 20% as a Xooter completes more jobs. The floor is reached at 200 completed jobs, which at a realistic pace is roughly two years. That is longer than we would like and we are looking at it.'],
      ['h', 'The booking fee'],
      ['p', 'R39, once, on a customer\'s first booking. It is not taken from the Xooter. Care+ members do not pay it at all.'],
      ['h', 'The bit worth understanding'],
      ['p', 'The price ladder is sub-linear in hours: an eight-hour job does not cost twice a four-hour one, because the travel, the setup and the admin happen once either way. That is defensible from the customer\'s side and it has an uncomfortable consequence — the effective hourly rate on a long job drops.'],
      ['p', 'So there is a floor. From five and a half hours, a minimum hourly rate applies regardless of what the ladder says, and the quote is raised to meet it. A long job cannot pay below it. The customer sees a slightly higher number on very long bookings, and that is the correct trade.'],
      ['h', 'What we will not do'],
      ['p', 'We will not run surge pricing that the Xooter does not share in, and we will not discount a job by cutting their side of it. A promotion comes out of our margin or it does not happen.'],
    ],
  },
  {
    id: 'gate-codes',
    kicker: 'Trust & safety',
    title: 'Giving a stranger your gate code',
    dek: 'How access windows work, what screenshot blocking really does, and the honest limits of both.',
    read: 5, tint: 'lilac', date: '09 Jul 2026',
    body: [
      ['p', 'The single most common hesitation before a first booking is not price. It is the gate code.'],
      ['h', 'It is a timed release, not stored data'],
      ['p', 'Your codes are encrypted the moment they leave your phone. They unlock forty-five minutes before the visit, for the assigned Xooter only, and they lock again when the visit completes — not at the end of that day. Seven days later they are deleted outright rather than archived.'],
      ['h', 'Screenshots'],
      ['p', 'On Android, capture on that screen is prevented by the operating system. On iOS the platform allows detection but not prevention, so a capture is logged and you are told. The screen blanks when the app is backgrounded on both.'],
      ['p', 'Now the honest part: no software stops a second phone photographing a screen. Anyone claiming otherwise is selling you something. Screenshot blocking is one layer, and it is not the important one.'],
      ['h', 'The layer that matters'],
      ['p', 'Revoke. One switch, effective at the next read, usable mid-visit. It does not cancel the booking and it does not charge you. Combined with deletion after seven days, that is what actually limits exposure — a code that exists for one visit and can be withdrawn during it.'],
    ],
  },
  {
    id: 'hiring-vs-booking',
    kicker: 'Guides',
    title: 'Employing someone full time, or booking visits?',
    dek: 'A straight comparison, including the parts that are legally your responsibility either way.',
    read: 9, tint: 'honey', date: '24 Jun 2026',
    body: [
      ['p', 'People ask us this expecting us to argue for booking. It depends, and the honest answer costs us some bookings.'],
      ['h', 'Book visits if'],
      ['list', [
        'You need somewhere between one and three visits a week',
        'Your schedule moves around',
        'You do not want to run payroll, UIF registration and leave',
        'You want cover for damage and a replacement if someone is ill',
      ]],
      ['h', 'Employ someone if'],
      ['list', [
        'You need four or more days a week — at that point full-time is usually cheaper per hour',
        'You want one consistent person who knows the house without being told',
        'The work includes childcare, cooking or anything beyond cleaning',
      ]],
      ['h', 'What people forget about employing'],
      ['p', 'A domestic worker in South Africa is an employee with all that implies: a written contract, UIF registration, the sectoral minimum wage, paid leave, and a legally specified process before any dismissal. None of it is optional and most of it is not difficult, but it does need doing.'],
      ['p', 'We run a full-time placement service for exactly this reason, and it is genuinely a different product from booking a visit — not an upsell of one.'],
    ],
  },
  {
    id: 'gauteng-only',
    kicker: 'How we work',
    title: 'Why we are only in Gauteng',
    dek: 'Density beats coverage. A thin map is a bad experience wearing a big number.',
    read: 4, tint: 'blush', date: '11 Jun 2026',
    body: [
      ['p', 'It would be easy to say we serve South Africa. Most of our competitors do. It would also, in practice, be a lie in about eight of the nine provinces.'],
      ['h', 'The problem with a wide map'],
      ['p', 'A marketplace needs supply density before it needs geography. One Xooter in Nelspruit means a customer in Nelspruit sees availability, books, and gets a cancellation — or a Xooter travelling ninety minutes each way for four hours of work, which pays badly and does not last.'],
      ['h', 'What we do instead'],
      ['p', 'Gauteng, properly. Priority suburbs where supply is deepest and same-week availability is reliable, and the rest of the province bookable with an honest note that it may take longer to match. Nobody in Gauteng is turned away because they are outside a drawn circle.'],
      ['p', 'Cape Town is next, when we can staff it properly rather than announce it.'],
    ],
  },
];

function Journal({ onBook }) {
  const { Section, SectionHead } = window;
  const [open, setOpen] = React.useState(null);
  const post = POSTS.find(p => p.id === open);

  /* Deep links from elsewhere on the site, and the browser back button behaving as expected. */
  React.useEffect(() => {
    const read = () => {
      const m = (window.location.hash || '').match(/^#article-(.+)$/);
      setOpen(m ? m[1] : null);
    };
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, []);

  const openPost = (id) => {
    window.history.pushState(null, '', '#article-' + id);
    setOpen(id);
    window.XootSession && window.XootSession.track('article_open', { id });
  };
  const closePost = () => { window.history.pushState(null, '', '#articles'); setOpen(null); };

  return (
    <Section id="articles" tone="page">
      <SectionHead
        eyebrow="The Xoot journal"
        title="Written by people who do this work."
        sub="No filler. The questions customers actually ask, answered by someone who knows the answer."
        maxWidth={620}
      />

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
        gap: 18, marginTop: 40,
      }}>
        {POSTS.map((p, i) => (
          <button key={p.id} type="button" onClick={() => openPost(p.id)}
            style={{
              display: 'flex', flexDirection: 'column', gap: 13, textAlign: 'left',
              padding: 'clamp(20px, 2.6vw, 26px)', border: 'none', cursor: 'pointer',
              borderRadius: 'var(--xoot-radius-lg)',
              background: 'var(--xoot-surface-card)', boxShadow: 'var(--xoot-shadow-1)',
              fontFamily: 'var(--xoot-font-core)',
              transition: 'transform var(--xoot-dur-base) var(--xoot-ease-ios-snap), box-shadow var(--xoot-dur-base) var(--xoot-ease-out)',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--xoot-shadow-3)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--xoot-shadow-1)'; }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
              <span style={{
                padding: '4px 10px', borderRadius: 'var(--xoot-radius-pill)',
                background: `var(--xoot-${p.tint}-wash)`, color: `var(--xoot-${p.tint}-ink)`,
                fontSize: 11, fontWeight: 800, letterSpacing: '.04em', textTransform: 'uppercase',
              }}>{p.kicker}</span>
              <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)' }}>{p.read} min read</span>
            </div>

            <h3 style={{
              fontFamily: 'var(--xoot-font-display)', fontSize: 'clamp(20px, 2.3vw, 25px)',
              lineHeight: 1.16, letterSpacing: '-.016em', textWrap: 'pretty',
            }}>{p.title}</h3>

            <p style={{ fontSize: 'var(--xoot-body-sm)', lineHeight: 1.55, color: 'var(--xoot-text-secondary)', textWrap: 'pretty' }}>
              {p.dek}
            </p>

            <span style={{
              display: 'flex', alignItems: 'center', gap: 7, marginTop: 'auto', paddingTop: 4,
              fontSize: 'var(--xoot-body-sm)', fontWeight: 700, color: 'var(--xoot-violet-700)',
            }}>
              Read it
              <Icon name="arrow-right" size={15} strokeWidth={2.2} />
            </span>
          </button>
        ))}
      </div>

      {/* The reader. In place, because a "blog" that navigates away from a page someone was about
          to book on is a conversion leak dressed as content marketing. */}
      {post && (
        <div role="dialog" aria-modal="true" aria-label={post.title}
          onClick={e => { if (e.target === e.currentTarget) closePost(); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 260, display: 'grid', placeItems: 'start center',
            padding: 'clamp(10px, 3vw, 40px)', background: 'rgba(20,18,16,.55)', overflowY: 'auto',
            animation: 'xoot-fade-in var(--xoot-dur-base) var(--xoot-ease-out)',
          }}>
          <article style={{
            width: '100%', maxWidth: 720, borderRadius: 'var(--xoot-radius-xl)',
            background: 'var(--xoot-surface-page)', boxShadow: 'var(--xoot-shadow-5)',
            overflow: 'hidden',
            animation: 'xoot-sheet-up var(--xoot-dur-slow) var(--xoot-ease-ios-spring) both',
          }}>
            <header style={{
              position: 'relative', padding: 'clamp(24px, 4vw, 44px) clamp(20px, 4vw, 48px) clamp(18px, 2.6vw, 28px)',
              background: `var(--xoot-${post.tint}-wash)`,
            }}>
              <button type="button" aria-label="Close" onClick={closePost} style={{
                position: 'absolute', top: 16, right: 16, display: 'grid', placeItems: 'center',
                width: 40, height: 40, border: 'none', borderRadius: '50%',
                background: 'rgba(255,255,255,.7)', cursor: 'pointer', fontSize: 16,
              }}>✕</button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
                <span style={{
                  fontSize: 11, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase',
                  color: `var(--xoot-${post.tint}-ink)`,
                }}>{post.kicker}</span>
                <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)' }}>
                  {post.date} · {post.read} min read
                </span>
              </div>

              <h1 style={{
                fontFamily: 'var(--xoot-font-display)', fontSize: 'clamp(26px, 4.2vw, 42px)',
                lineHeight: 1.1, letterSpacing: '-.022em', textWrap: 'pretty', maxWidth: '20ch',
              }}>{post.title}</h1>
            </header>

            <div style={{
              display: 'flex', flexDirection: 'column', gap: 18,
              padding: 'clamp(22px, 3.4vw, 40px) clamp(20px, 4vw, 48px) clamp(28px, 4vw, 48px)',
            }}>
              {post.body.map(([kind, content], i) => {
                if (kind === 'h') return (
                  <h2 key={i} style={{
                    marginTop: 10, fontFamily: 'var(--xoot-font-display)',
                    fontSize: 'clamp(19px, 2.2vw, 24px)', lineHeight: 1.2, letterSpacing: '-.014em',
                  }}>{content}</h2>
                );
                if (kind === 'list') return (
                  <ul key={i} style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: 0, padding: 0, listStyle: 'none' }}>
                    {content.map(item => (
                      <li key={item} style={{ display: 'flex', gap: 11, fontSize: 'var(--xoot-body)', lineHeight: 1.6, color: 'var(--xoot-text-secondary)' }}>
                        <span style={{ flex: '0 0 auto', width: 5, height: 5, marginTop: 10, borderRadius: '50%', background: `var(--xoot-${post.tint}-500)` }} />
                        <span style={{ textWrap: 'pretty' }}>{item}</span>
                      </li>
                    ))}
                  </ul>
                );
                return (
                  <p key={i} style={{
                    fontSize: 'var(--xoot-body-lg)', lineHeight: 1.68,
                    color: 'var(--xoot-text-secondary)', textWrap: 'pretty', maxWidth: '68ch',
                  }}>{content}</p>
                );
              })}

              <div style={{
                display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14, marginTop: 12,
                padding: 'clamp(18px, 2.4vw, 24px)', borderRadius: 'var(--xoot-radius-lg)',
                background: 'var(--xoot-surface-page-alt)',
              }}>
                <span style={{ flex: '1 1 240px', fontSize: 'var(--xoot-body-sm)', lineHeight: 1.55, color: 'var(--xoot-text-secondary)' }}>
                  Everything above is how the service actually runs. You can see it for yourself in
                  about four minutes.
                </span>
                <Button variant="primary" size="md" onClick={() => { closePost(); onBook && onBook(); }}>
                  Book a visit
                </Button>
              </div>

              {/* Next post, so the reader has somewhere to go that is not "back". */}
              {(() => {
                const idx = POSTS.findIndex(p => p.id === post.id);
                const next = POSTS[(idx + 1) % POSTS.length];
                return (
                  <button type="button" onClick={() => openPost(next.id)} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14,
                    padding: '16px 18px', border: 'none', cursor: 'pointer', textAlign: 'left',
                    borderRadius: 'var(--xoot-radius-md)', background: 'transparent',
                    boxShadow: 'inset 0 0 0 1px var(--xoot-border-color)',
                    fontFamily: 'var(--xoot-font-core)',
                  }}>
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                      <span className="xoot-label" style={{ color: 'var(--xoot-text-muted)' }}>Read next</span>
                      <span style={{ fontSize: 'var(--xoot-body-sm)', fontWeight: 700, textWrap: 'pretty' }}>{next.title}</span>
                    </span>
                    <Icon name="arrow-right" size={17} strokeWidth={2} color="var(--xoot-violet-700)" />
                  </button>
                );
              })()}
            </div>
          </article>
        </div>
      )}
    </Section>
  );
}

Object.assign(window, { Journal, JOURNAL_POSTS: POSTS });

/* ── Site Concierge ────────────────────────────────────────────────────────────
 * The website's two "Ask Concierge" buttons rendered and did nothing. This mounts the same
 * assistant the app uses, over the same scoped reasoning layer, so an answer given on the site
 * cannot contradict one given in the app — they are literally the same function. */
function SiteConcierge({ open, onClose, onBook }) {
  const { Concierge } = window.XootNS;
  const S = window.XootSession;
  if (!open) return null;
  const u = S && S.user;
  return (
    <div role="dialog" aria-modal="true" aria-label="Xoot Concierge"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 270, display: 'grid', placeItems: 'end center',
        padding: 'clamp(8px, 3vw, 32px)', background: 'rgba(20,18,16,.5)',
        animation: 'xoot-fade-in var(--xoot-dur-base) var(--xoot-ease-out)',
      }}>
      <div style={{
        display: 'flex', flexDirection: 'column',
        width: '100%', maxWidth: 520, height: 'min(680px, 88vh)',
        borderRadius: 'var(--xoot-radius-xl)', overflow: 'hidden',
        background: 'var(--xoot-surface-page)', boxShadow: 'var(--xoot-shadow-5)',
        animation: 'xoot-sheet-up var(--xoot-dur-slow) var(--xoot-ease-ios-spring) both',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          padding: '18px 20px', background: 'var(--xoot-grad-dawn)', flex: '0 0 auto',
        }}>
          <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
            <span style={{ fontFamily: 'var(--xoot-font-display)', fontSize: 'var(--xoot-title-2)', lineHeight: 1.2 }}>Xoot Concierge</span>
            <span style={{ fontSize: 'var(--xoot-caption)', color: 'var(--xoot-text-muted)' }}>
              Prices, cover, how it works. Ask several things at once.
            </span>
          </span>
          <button type="button" aria-label="Close" onClick={onClose} style={{
            display: 'grid', placeItems: 'center', width: 40, height: 40, flex: '0 0 auto',
            border: 'none', borderRadius: '50%', background: 'rgba(255,255,255,.65)', cursor: 'pointer', fontSize: 16,
          }}>✕</button>
        </div>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', padding: '0 16px 16px' }}>
          <Concierge
            context={{
              name: u ? u.name : null,
              credit: (S && S.credit) || 0,
              points: (S && S.points) || 0,
              carePlus: !!(u && u.carePlus),
              booking: null,
            }}
            onNavigate={to => {
              onClose();
              if (to === 'book') return onBook && onBook();
              const el = document.getElementById(to);
              if (el) window.scrollTo({ top: el.offsetTop - 70, behavior: 'smooth' });
            }}
          />
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { SiteConcierge });
