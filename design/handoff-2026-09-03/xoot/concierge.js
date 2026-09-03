/* ── Xoot Concierge — the answering layer ─────────────────────────────────────
 *
 * The design system's Concierge matches ONE intent per message and returns the first branch that
 * hits. That is fine for "where is my Xooter" and it fails on everything real, because people do
 * not ask one thing at a time:
 *
 *   "Can I move Thursday to Saturday, add laundry, and will my credit cover it?"
 *
 * Under single-intent matching that hits `cancel`/`book` first, answers a third of the question,
 * and drops the rest. Worse, an unmatched compound question falls through to the approved fallback,
 * so the user is told there is no answer to a question made entirely of things it knows.
 *
 * So this layer does three things the matcher cannot:
 *
 *   1 · DECOMPOSES. Splits on connectives and question boundaries, resolves each clause
 *       independently, then answers them in order as one reply. Three questions, three answers.
 *   2 · RESOLVES REAL VALUES. Price, availability and credit answers are computed from XootQuote
 *       and the session, never phrased from memory. A concierge that invents a price is worse than
 *       one that declines.
 *   3 * HOLDS SCOPE HARD. Anything outside home services, this account, and Xoot's own policies
 *       gets a short decline and a route to a human — including the cases people try on assistants:
 *       prompt extraction, other accounts, medical/legal/financial advice, and requests to act
 *       outside what the app can actually do.
 *
 * The scope rule that matters most: it will not INVENT policy. If there is no approved answer, it
 * says so and hands over. A confident wrong answer about a refund is a legal problem, not a UX one.
 */
(() => {
  const T = s => (s || '').toLowerCase().trim();

  /* ── scope ────────────────────────────────────────────────────────────────
     Explicit, ordered, and checked BEFORE any intent — an injection attempt that also mentions
     "booking" must not be answered as a booking question. */
  const REFUSE = [
    { keys: ['system prompt', 'ignore previous', 'ignore your', 'your instructions', 'prompt',
             'developer mode', 'jailbreak', 'api key', 'database', 'admin', 'sql', 'env var',
             'source code', 'training data'],
      text: "I can't help with that one. If something in your own account isn't working, I'm glad to look at it." },
    { keys: ['another user', "someone else's", 'other customer', 'my neighbour', 'my ex',
             'their address', 'their number', 'xooter\'s address', 'home address of'],
      text: "I can only see your own account, and I can't look anyone else up — including your Xooter's personal details. That's deliberate." },
    { keys: ['medical', 'diagnos', 'prescri', 'symptom', 'legal advice', 'sue', 'lawyer',
             'invest', 'tax return', 'loan', 'crypto'],
      text: "That's outside what I can advise on — I'd be guessing, and this is the kind of thing where guessing is harmful. For anything Xoot-related though, ask away." },
    { keys: ['pay the xooter directly', 'off the app', 'cash instead', 'outside the app',
             'avoid the fee', 'skip the fee'],
      text: "I can't help arrange work off the platform. It leaves the visit with no cover, no payout protection for the Xooter, and nothing for either of you to fall back on if something goes wrong." },
    { keys: ['fire ', 'get rid of my xooter', 'blacklist', 'ban this xooter'],
      text: "I can stop matching you with a particular Xooter, which is different from anything happening to their account. Complaints about conduct go to the team, who investigate properly.",
      to: 'help', handoff: true },
  ];

  /* ── clause splitting ─────────────────────────────────────────────────────
     Deliberately conservative. Over-splitting turns one question into three half-answers, so it
     only breaks on connectives that genuinely separate asks. */
  function clauses(text) {
    const raw = T(text)
      .replace(/\?/g, '?|')
      .split(/\|| and also | also,? | as well as |,? and then |;|,\s+(?=(?:add|remove|change|cancel|book|move|swap|include|drop)\s)|(?:\.|,)?\s+(?:and|but|plus)\s+(?=(?:can|could|will|would|do|does|is|are|how|what|when|why|who|i |my |the ))/g)
      .map(s => s.trim()).filter(s => s.length > 2);
    /* One clause is the normal case. Cap at four — beyond that it is a conversation, not a
       question, and answering six things at once is unreadable. */
    return (raw.length ? raw : [T(text)]).slice(0, 4);
  }

  const hasAny = (s, ...k) => k.some(x => s.includes(x));

  /* ── the intents ──────────────────────────────────────────────────────────
     Each returns { text, detail?, action? } or null. Ordered by specificity: the more precise
     question must win, or "how much to cancel" answers as "how much". */
  const INTENTS = [
    /* Care+. */
    { name: 'careplus', test: s => hasAny(s, 'care+', 'careplus', 'care plus', 'membership', 'subscri', 'trial'),
      run: (s, ctx) => ({
        text: 'Care+ is R149 a month. It drops the booking fee, holds your preferred Xooter, and adds priority slots and higher cover. The trial runs a full month, and you can cancel inside it without being charged.',
        followUp: ctx && ctx.carePlus ? 'You are already a member, so the booking fee is already off your quotes.' : null,
        action: { label: 'See what is included', to: 'careplus' },
      }) },

    /* Price. Computed, never recalled. */
    { name: 'price', test: s => hasAny(s, 'how much', 'cost', 'price', 'quote', 'expensive', 'charge', 'rate'),
      run: (s, ctx) => {
        const Q = window.XootQuote, D = window.XootData;
        if (!Q) return null;
        const svc = hasAny(s, 'laundry', 'wash', 'iron') ? 'laundry'
          : hasAny(s, 'office', 'commercial') ? 'office'
          : hasAny(s, 'airbnb', 'turnover', 'guest') ? 'airbnb'
          : hasAny(s, 'move', 'moving', 'move-out', 'move out') ? 'moving'
          : hasAny(s, 'deep') ? 'deep' : 'regular';
        const size = hasAny(s, 'one bed', '1 bed', 'studio', 'bachelor') ? 'small'
          : hasAny(s, 'four bed', '4 bed', 'five bed', 'big house', 'large') ? 'large' : 'medium';
        const q = svc === 'laundry'
          ? Q.resolve({ service: 'laundry', washLoads: 4, ironLoads: 2 })
          : Q.resolve({ service: svc, sizeKey: size });
        if (!q || !q.total) return null;
        const title = (D.services.find(x => x.key === svc) || {}).title || svc;
        const base = svc === 'laundry'
          ? `Six loads — four washed, two ironed — comes to ${D.rand(q.total)}.`
          : `A ${size === 'medium' ? 'two to three bedroom' : size === 'small' ? 'one bedroom' : 'four bedroom'} place, ${title.toLowerCase()}, comes to ${D.rand(q.total)}.`;
        return {
          text: base + ' That is the full price including VAT — the quote you see when you book is the price you pay.',
          detail: q.lines ? q.lines.slice(0, 3).map(l => [l.label, D.rand(l.amount)]) : null,
          followUp: 'Booking weekly or fortnightly brings the per-visit price down. Tell me the actual size and I can be exact.',
          action: { label: 'Get an exact quote', to: 'book' },
        };
      } },

    /* Frequency / discount. */
    { name: 'frequency', test: s => hasAny(s, 'weekly', 'fortnight', 'every week', 'how often', 'recurring', 'discount', 'cheaper'),
      run: () => ({
        text: 'Weekly works out cheapest per visit, fortnightly sits between that and a one-off. The discount is applied to the quote automatically — you never have to ask for it or enter a code.',
        followUp: 'You can change or pause a recurring booking at any time, and pausing does not lose your Xooter.',
        action: { label: 'See the prices', to: 'book' },
      }) },

    /* Which service. The guardrail question, answered rather than enforced. */
    { name: 'which', test: s => hasAny(s, 'which service', 'what should i book', 'regular or', 'difference between', 'move out', 'move-out', 'moving out', 'airbnb', 'office clean'),
      run: (s) => {
        const kind = hasAny(s, 'move', 'moving', 'empty', 'vacat') ? ['Moving cleaning', 'an empty place means inside cupboards, appliances, walls and skirtings — roughly twice the hours of a lived-in home']
          : hasAny(s, 'airbnb', 'guest', 'turnover') ? ['Airbnb turnover', 'it works to a check-in deadline and includes linen, restocking and a photo handover']
          : hasAny(s, 'office', 'commercial') ? ['Office cleaning', 'it is after-hours, carries its own insurance cover, and is charged on floor area rather than bedrooms']
          : null;
        if (!kind) return {
          text: 'Regular cleaning covers a lived-in home. Deep cleaning is the once-a-season version. Anything unusual — an empty place, a rental turnover, an office — has its own service, because the hours and the checklist genuinely differ.',
          action: { label: 'See all services', to: 'book' },
        };
        return {
          text: `${kind[0]} is the one for that — ${kind[1]}. If you book a regular visit for it instead, your Xooter arrives with the wrong time set aside, so the work does not get finished and they are not paid for what they actually did.`,
          action: { label: `Book ${kind[0].toLowerCase()}`, to: 'book' },
        };
      } },

    /* Moving an existing visit. */
    { name: 'reschedule', test: s => hasAny(s, 'move my', 'reschedule', 'change the day', 'change my', 'push my', 'shift my', 'different day'),
      run: (s, ctx) => ctx && ctx.booking ? {
        text: `Yes — your visit on ${ctx.booking.when} can be moved. It is free up to 24 hours before; inside that window half is retained, because your Xooter has already turned down other work for that slot.`,
        action: { label: 'Move this visit', to: 'tracking' },
      } : {
        text: 'There is nothing booked at the moment, so nothing to move. Once a visit is booked you can change the day yourself up to 24 hours before, free.',
        action: { label: 'Book a visit', to: 'book' },
      } },

    /* Availability. */
    { name: 'when', test: s => hasAny(s, 'available', 'availability', 'tomorrow', 'this week', 'soonest', 'today', 'saturday', 'sunday', 'weekend'),
      run: (s, ctx) => ({
        text: hasAny(s, 'today', 'tomorrow')
          ? 'Same-day and next-day depend on your suburb. In the priority suburbs there is usually something; further out it can take a day or two to match you.'
          : 'Weekends fill first, so book those a few days ahead. Weekday mornings are almost always open.',
        followUp: 'Pick a date in the booking flow and you will see the real slots rather than an estimate.',
        action: { label: 'See open slots', to: 'book' },
      }) },

    /* Cancelling. Policy only — never a refund figure. */
    { name: 'cancel', test: s => hasAny(s, 'cancel', 'refund', 'money back'),
      run: (s, ctx) => ({
        text: ctx && ctx.booking
          ? `Cancelling ${ctx.booking.when} is free up to 24 hours before, and half is retained inside that window. The exact amount is worked out on the booking itself, so you will see the figure before you confirm anything.`
          : 'Cancelling is free up to 24 hours before a visit; inside that window half is retained. Refunds go back to the card you paid with, usually in three to five working days.',
        followUp: 'If the reason is something that went wrong on our side, say so — that is handled differently and I can put you through.',
        action: ctx && ctx.booking ? { label: 'Open the booking', to: 'tracking' } : { label: 'Message the team', to: 'help' },
      }) },

    /* Credit. Read from the session, not assumed. */
    { name: 'credit', test: s => hasAny(s, 'credit', 'xootcred', 'points', 'balance', 'voucher', 'cover it', 'cover the'),
      run: (s, ctx) => {
        const c = (ctx && ctx.credit) || 0, p = (ctx && ctx.points) || 0;
        return {
          text: `You have R${c} in XootCred and ${p} Xoot Points. Credit comes off your total automatically at checkout — you do not have to apply it.`,
          detail: [['XootCred', 'R' + c], ['Xoot Points', p], ['Points are worth', 'about R' + Math.floor(p / 10)]],
          followUp: c > 0 ? 'If your credit does not cover the whole visit, the rest goes on your card and you will see both lines before you pay.' : null,
          action: { label: 'Open XootCred', to: 'cred' },
        };
      } },

    /* Trust, access, screenshots, revocation. */
    { name: 'access', test: s => hasAny(s, 'gate code', 'access', 'alarm', 'key', 'screenshot', 'revoke', 'safe', 'trust', 'vetted', 'background check', 'police'),
      run: (s) => hasAny(s, 'screenshot', 'revoke') ? {
        text: 'Your access details unlock 45 minutes before the visit and lock again when it completes, then delete after seven days. Screenshots are blocked on that screen on Android and detected on iOS, and you can revoke access at any time — including mid-visit, which does not cancel the booking or charge you.',
        followUp: 'Being straight about the limit: no software stops someone photographing a screen with a second phone. Revocation and the seven-day deletion are the layers that actually limit exposure.',
        action: { label: 'Privacy & access', to: 'privacy' },
      } : {
        text: 'Every Xooter has a verified ID or passport with the right to work here, proof of address under three months old, a criminal record check through an accredited bureau, and a bank account in their own name. Your access details are released 45 minutes before a visit and revocable at any time.',
        followUp: 'The record check surfaces convictions, which is worth being precise about — it does not surface behaviour that was never reported. Anyone claiming otherwise is overselling.',
        action: { label: 'How Xoot verifies', to: 'safety' },
      } },

    /* Laundry specifics. */
    { name: 'laundry', test: s => hasAny(s, 'laundry', 'ironing', 'washing', 'loads', 'iron my'),
      run: () => {
        const Q = window.XootQuote, D = window.XootData;
        const q = Q && Q.resolve({ service: 'laundry', washLoads: 4, ironLoads: 2 });
        return {
          text: `Laundry is priced by the load, not by the hour. A load is about one full machine — roughly a black bag.${q && q.total ? ` Four washed and two ironed comes to ${D.rand(q.total)}.` : ''} Washing and ironing are counted separately, because ironing four loads takes far longer than washing them.`,
          action: { label: 'Book laundry', to: 'book' },
        };
      } },

    /* Becoming a Xooter. */
    { name: 'join', test: s => hasAny(s, 'become a xooter', 'work for', 'job', 'apply', 'earn', 'hiring', 'training'),
      run: () => ({
        text: 'Xooters set their own hours and keep 70 to 80% of what the customer pays, with no joining fee. You need an ID or a passport with the right to work here, proof of address under three months old, and a bank account in your own name. Training is free — 62 hours of it if you want all of it.',
        action: { label: 'Start the application', to: 'pro' },
      }) },

    /* Coverage. */
    { name: 'area', test: s => hasAny(s, 'do you cover', 'area', 'suburb', 'pretoria', 'sandton', 'soweto', 'midrand', 'cape town', 'durban', 'gauteng'),
      run: (s) => hasAny(s, 'cape town', 'durban', 'port elizabeth', 'bloemfontein') ? {
        text: 'Not yet — we are Gauteng only. Cape Town is next, when we can staff it properly rather than just announce it.',
      } : {
        text: 'Anywhere in Gauteng. Supply is deepest in the priority suburbs, where same-week availability is reliable; further out it is still bookable and may take a little longer to match you. Nobody in Gauteng is turned away for being outside a drawn circle.',
        action: { label: 'Check your suburb', to: 'book' },
      } },

    /* Where is my Xooter. */
    { name: 'eta', test: s => hasAny(s, 'where is', 'on the way', 'arriv', 'eta', 'late', 'running'),
      run: (s, ctx) => ctx && ctx.booking ? {
        text: `Your visit is ${ctx.booking.when}. You will get a notification when your Xooter is on the way, with live tracking from that point.`,
        action: { label: 'Track the visit', to: 'tracking' },
      } : { text: 'Nothing is scheduled right now, so there is no one on the way.' } },

    /* Complaints — routed, never adjudicated. */
    { name: 'complaint', test: s => hasAny(s, 'complain', 'damage', 'broke', 'stolen', 'missing', 'rude', 'terrible', 'awful', 'unhappy', 'bad job'),
      run: () => ({
        text: 'I am sorry — that needs a person, not me. The team investigates these properly, and anything involving damage or something missing goes through XootCover rather than being settled in a chat.',
        action: { label: 'Message the team', to: 'help' },
        handoff: true,
      }) },
  ];

  function answerClause(clause, ctx) {
    for (const it of INTENTS) {
      if (!it.test(clause)) continue;
      const r = it.run(clause, ctx || {});
      if (r) return Object.assign({ intent: it.name }, r);
    }
    return null;
  }

  /* ── the entry point ──────────────────────────────────────────────────────
     Returns one reply object. Multi-clause questions produce one reply whose text answers each
     clause in order, because three separate bubbles for one sentence reads as three interruptions. */
  function answer(text, ctx) {
    const s = T(text);
    if (!s) return null;

    /* Scope first, always. An injection attempt that also says "booking" is still an injection
       attempt, and checking intents first would answer it. */
    for (const r of REFUSE) {
      if (r.keys.some(k => s.includes(k))) {
        return { text: r.text, action: { label: 'Message the team', to: r.to || 'help' }, handoff: !!r.handoff, scope: 'declined' };
      }
    }

    const parts = clauses(s);
    const answers = [];
    const seen = new Set();
    for (const c of parts) {
      const a = answerClause(c, ctx);
      /* Two clauses resolving to the same intent is one answer, not two. */
      if (a && !seen.has(a.intent)) { seen.add(a.intent); answers.push(a); }
    }

    if (!answers.length) {
      return {
        text: "I don't have an approved answer for that one, and I would rather not guess at it. The team can look into it properly.",
        action: { label: 'Message the team', to: 'help' },
        handoff: true,
      };
    }

    if (answers.length === 1) return answers[0];

    /* Compound reply. Numbered, because an unnumbered three-part answer reads as one rambling
       paragraph and people lose which bit answered what. */
    return {
      text: answers.map((a, i) => `${i + 1}. ${a.text}`).join('\n\n'),
      detail: answers.find(a => a.detail) ? answers.find(a => a.detail).detail : null,
      followUp: answers.map(a => a.followUp).filter(Boolean)[0] || null,
      /* The first action wins: it is the answer to what they asked first, which is usually the
         thing they actually came for. */
      action: answers.find(a => a.action) ? answers.find(a => a.action).action : null,
      compound: answers.length,
    };
  }

  window.XootConcierge = { answer, clauses, INTENTS: INTENTS.map(i => i.name) };
})();
