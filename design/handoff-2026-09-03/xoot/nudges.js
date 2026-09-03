/* ── XootNudges — behaviour-driven, specific, and rate-limited ─────────────────
 *
 * Every nudge here is derived from something the person actually did, and says the specific thing
 * that happened. "You have items waiting!" is the failure mode this file exists to avoid — it is
 * the same sentence for every user and every state, which is why nobody reads it.
 *
 * THREE RULES, all of them the reason abandoned-cart nudges usually feel hostile:
 *
 *  1. Say the specific thing. Not "complete your booking" — "Wednesday 08:00 with Nomsa is still
 *     held, R362, four hours." A person recognises their own booking; they do not recognise a
 *     category.
 *  2. Never invent urgency. A countdown on something that is not expiring is a lie, and the one
 *     nudge here that mentions time (`slot_holding`) mentions it because slots genuinely release.
 *  3. Ask once, then stop. Each nudge carries a cooldown and can be dismissed permanently. A nudge
 *     that reappears after dismissal is not a reminder, it is nagging, and it costs the account.
 *
 * Money in a nudge comes from XootQuote, not from a stored number — a draft that has been sitting
 * for two days must not quote a price the ladder has since changed.
 */
(function () {
  const S = () => window.XootSession;
  const D = () => window.XootData;
  const Q = () => window.XootQuote;

  const MIN = 60 * 1000;
  const HOUR = 60 * MIN;
  const DAY = 24 * HOUR;

  const ago = ts => Date.now() - (ts || 0);

  /* Human elapsed time. "2 days ago" beats a timestamp, and "just now" beats "0 minutes ago". */
  function since(ts) {
    const ms = ago(ts);
    if (ms < 2 * MIN) return 'just now';
    if (ms < HOUR) return Math.round(ms / MIN) + ' minutes ago';
    if (ms < DAY) { const h = Math.round(ms / HOUR); return h === 1 ? 'an hour ago' : h + ' hours ago'; }
    const d = Math.round(ms / DAY);
    return d === 1 ? 'yesterday' : d + ' days ago';
  }

  /* Each rule returns a nudge or null. Order is priority order: the first match wins, because two
     nudges at once is how a page starts arguing with itself. */
  const RULES = [
    /* ── The abandoned booking. The single most valuable nudge on the platform, and the one most
       often written badly. It quotes the real draft back, priced now. ──────────────────────── */
    {
      id: 'draft_unpaid',
      cooldown: 6 * HOUR,
      test(s) {
        const d = s.draft;
        /* Only once they got far enough for it to be a real intention. A draft with no service
           chosen is a page view, not an abandoned booking. */
        if (!d || !d.service) return null;
        if (d.paid) return null;
        /* Not while they are still in it — a nudge about the thing on screen is noise. */
        if (ago(d.touchedAt) < 4 * MIN) return null;

        const reachedPayment = !!(d.day && d.slot);
        let quote = null;
        try {
          quote = Q().resolve({
            service: d.service, sizeKey: d.size || 'medium', addOns: d.addons || [],
            crew: d.crew || 1, freq: d.freq || 'once', dayCount: d.freq === 'once' ? 0 : 1,
            carePlus: S().isMember(), useCredit: false, creditAvailable: 0,
          });
        } catch (e) { /* an unpriceable draft still deserves a nudge, just without the figure */ }

        const svc = (D().services.find(x => x.key === d.service) || {}).title || 'a visit';
        const when = d.day && d.slot
          ? new Date(d.day + 'T00:00:00').toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'short' }) + ' at ' + d.slot
          : null;

        return {
          tone: reachedPayment ? 'brand' : 'quiet',
          icon: reachedPayment ? 'clock' : 'pencil',
          title: reachedPayment
            ? `${when} is still yours to take`
            : `You were booking ${svc.toLowerCase()}`,
          body: reachedPayment
            ? `${svc}${quote ? `, ${quote.hours % 1 === 0 ? quote.hours : quote.hours.toFixed(1)} hours, ${D().rand(quote.total)}` : ''}. Nothing has been charged — the slot is held until someone else takes it.`
            : `You picked ${svc.toLowerCase()} ${since(d.touchedAt)} and stopped before choosing a day. Everything you entered is still there.`,
          cta: reachedPayment ? 'Pay and confirm' : 'Pick up where you left off',
          action: 'resume_draft',
          secondary: reachedPayment ? 'Change the time' : null,
        };
      },
    },

    /* ── Paid, but no address saved. The next visit takes thirty seconds instead of three
       minutes, and this is the moment they can see why. ───────────────────────────────────── */
    {
      id: 'no_saved_place',
      cooldown: 3 * DAY,
      test(s) {
        if (!s.user) return null;
        if (s.state.places.length) return null;
        if (!s.state.bookings.length) return null;
        return {
          tone: 'quiet', icon: 'map-pin',
          title: 'Save this address and the next booking is two taps',
          body: 'We will remember the size, the access notes and the parking. You will not be asked again.',
          cta: 'Save my place',
          action: 'save_place',
        };
      },
    },

    /* ── Credit sitting unused. Said as an amount, because "you have credit" is not a reason to
       do anything and "R30 is already yours" is. ──────────────────────────────────────────── */
    {
      id: 'unused_credit',
      cooldown: 5 * DAY,
      test(s) {
        if (!s.user || s.credit < 20) return null;
        if (s.state.bookings.length) return null;
        return {
          tone: 'brand', icon: 'wallet',
          title: `${D().rand(s.credit)} is already on your account`,
          body: 'It comes off your first visit automatically. Nothing to enter, nothing to claim.',
          cta: 'Use it on a booking',
          action: 'book',
        };
      },
    },

    /* ── The trial's last week. Warned early, more than once, and with the exact date — a trial
       that converts quietly is a trial designed to catch you out. ─────────────────────────── */
    {
      id: 'trial_ending',
      cooldown: 2 * DAY,
      test(s) {
        if (!s.inTrial()) return null;
        const left = s.trialDaysLeft();
        if (left > 7) return null;
        const on = new Date(s.state.carePlus.renewsAt)
          .toLocaleDateString('en-ZA', { day: 'numeric', month: 'long' });
        return {
          tone: 'careplus', icon: 'heart-plus',
          title: left <= 1
            ? `Your free month ends tomorrow`
            : `${left} days left of your free month`,
          body: `R99 a month starts on ${on}. Cancel before then and you are not charged — two taps, no phone call.`,
          cta: 'Manage membership',
          action: 'manage_careplus',
          secondary: 'Keep it',
        };
      },
    },

    /* ── A member who is not using the thing they pay for. Honest about the arithmetic in both
       directions, including when cancelling is the right answer. ──────────────────────────── */
    {
      id: 'member_idle',
      cooldown: 10 * DAY,
      test(s) {
        if (!s.isMember() || s.inTrial()) return null;
        const last = s.state.bookings[s.state.bookings.length - 1];
        if (last && ago(last.at) < 45 * DAY) return null;
        return {
          tone: 'quiet', icon: 'circle-alert',
          title: 'You have not booked in a while',
          body: `Care+ pays for itself at two visits a month. If that is not you at the moment, pausing costs nothing and you keep your ${D().rand(s.credit)} credit.`,
          cta: 'Book a visit',
          action: 'book',
          secondary: 'Pause Care+',
        };
      },
    },

    /* ── Xooter onboarding, stopped partway. Names the document that is missing, because "your
       application is incomplete" makes them go and look. ─────────────────────────────────── */
    {
      id: 'documents_incomplete',
      cooldown: 2 * DAY,
      test(s) {
        const docs = s.documents || {};
        const keys = Object.keys(docs);
        if (!keys.length) return null;
        const REQUIRED = [
          ['id', 'your ID or passport'],
          ['residence', 'your proof of residence'],
          ['photo', 'your profile photo'],
          ['bank', 'your bank details'],
        ];
        const missing = REQUIRED.filter(([k]) => !docs[k] || docs[k].status === 'rejected');
        if (!missing.length) return null;
        const rejected = REQUIRED.filter(([k]) => docs[k] && docs[k].status === 'rejected');
        return {
          tone: 'brand', icon: 'camera',
          title: rejected.length
            ? `${rejected[0][1].replace('your ', 'Your ')} needs another go`
            : `${missing.length} document${missing.length > 1 ? 's' : ''} left`,
          body: rejected.length
            ? 'It was not clear enough to verify. The guide shows exactly what a usable photo looks like — it takes a minute.'
            : `We still need ${missing.map(m => m[1]).join(', ').replace(/, ([^,]*)$/, ' and $1')}. You can accept work as soon as they are approved.`,
          cta: rejected.length ? 'Retake it' : 'Upload the rest',
          action: 'open_documents',
        };
      },
    },

    /* ── Gift credit received and not spent. Mentions who it came from: that is the reason they
       will act on it. ────────────────────────────────────────────────────────────────────── */
    {
      id: 'gift_unspent',
      cooldown: 7 * DAY,
      test(s) {
        const gift = (s.state.gifts || []).find(g => g.remaining > 0);
        if (!gift) return null;
        return {
          tone: 'petal', icon: 'gift',
          title: `${gift.from} gave you ${D().rand(gift.remaining)}`,
          body: 'It never expires, so there is no rush — but it is a whole visit sitting there.',
          cta: 'Book with it',
          action: 'book',
        };
      },
    },

    /* ── Browsing without ever reaching a booking. Fires only after real evidence of interest,
       and asks the smallest possible question. ──────────────────────────────────────────── */
    {
      id: 'window_shopping',
      cooldown: 2 * DAY,
      test(s) {
        if (s.draft || s.state.bookings.length) return null;
        if (s.countEvents('price_viewed') < 3) return null;
        return {
          tone: 'quiet', icon: 'message-circle',
          title: 'Not sure which service you need?',
          body: 'Tell us what the place is like and we will say which one fits and what it costs. No account needed.',
          cta: 'Ask the Concierge',
          action: 'concierge',
        };
      },
    },
  ];

  /* The one nudge to show now, or null. Highest-priority rule that matches, is not dismissed, and
     is outside its cooldown. */
  function current() {
    const s = S();
    if (!s) return null;
    for (const rule of RULES) {
      if (s.isDismissed(rule.id)) continue;
      if (ago(s.seenAt(rule.id)) < rule.cooldown) continue;
      let hit = null;
      try { hit = rule.test(s); } catch (e) { console.warn('[nudge]', rule.id, e); }
      if (hit) return Object.assign({ id: rule.id }, hit);
    }
    return null;
  }

  /* All matches, for a notifications list rather than a single banner. Cooldowns do not apply
     here: a list is somewhere the user chose to look, so suppressing entries would just make the
     list wrong. Dismissals still apply. */
  function all() {
    const s = S();
    if (!s) return [];
    const out = [];
    for (const rule of RULES) {
      if (s.isDismissed(rule.id)) continue;
      let hit = null;
      try { hit = rule.test(s); } catch (e) { /* skip */ }
      if (hit) out.push(Object.assign({ id: rule.id }, hit));
    }
    return out;
  }

  function useNudge() {
    const R = window.React;
    const [, force] = R.useState(0);
    R.useEffect(() => S().subscribe(() => force(n => n + 1)), []);
    /* Re-evaluate on a slow tick as well as on change: `draft_unpaid` becomes eligible with the
       passage of time alone, not in response to any event. */
    R.useEffect(() => {
      const id = window.setInterval(() => force(n => n + 1), 30 * 1000);
      return () => window.clearInterval(id);
    }, []);
    return current();
  }

  window.XootNudges = { current, all, useNudge, since, RULES };
})();
