/* ── XootSession — the signed-in user, and what they have actually done ────────
 *
 * One store, on window, read by the site and the app. It exists for two jobs that turned out to be
 * the same job:
 *
 *  1. PERSISTENCE. Signing in used to set a name in React state and nothing else, so a refresh
 *     signed you out, and membership, credit and documents were props invented per surface. A
 *     member who reloaded the page became a non-member and was quoted the booking fee again.
 *
 *  2. BEHAVIOUR. Personalised nudges need a record of what someone started and did not finish.
 *     That record has to survive the page, or the only nudge you can write is a generic one.
 *
 * Storage is localStorage under one key. Every write is namespaced and merged — never a blind
 * overwrite of the whole object — because two surfaces (site and app preview) share the origin and
 * a full-object write from one would erase the other's state.
 *
 * A NOTE ON WHAT THIS IS NOT. There is no auth here and no server. `signIn` accepts what it is
 * given. In production every field below comes from Supabase with row-level security, and the
 * client is told membership rather than deciding it — a client that can grant itself Care+ can
 * grant itself a waived booking fee. See GO-LIVE.md.
 */
(function () {
  const KEY = 'xoot.session.v1';
  const listeners = new Set();

  const BLANK = {
    user: null,              // { name, email, since }
    carePlus: null,          // { since, trialEndsAt, renewsAt }
    credit: 0,               // XootCred, in rand
    gifts: [],               // gift credit received
    documents: {},           // Xooter onboarding: key → { status, uploadedAt }
    places: [],              // saved addresses
    bookings: [],            // completed bookings
    cards: [],               // saved payment methods (last four only, ever)
    draft: null,             // an in-progress booking — the behaviour nudges read this
    referral: null,          // { invites, attributedTo, settled } — owned by XootRefer
    seen: {},                // nudge id → timestamp, so nothing repeats endlessly
    events: [],              // a short behaviour trail
  };

  function read() {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (!raw) return Object.assign({}, BLANK);
      return Object.assign({}, BLANK, JSON.parse(raw));
    } catch (e) {
      /* A corrupt or blocked store must not take the page down — Safari private mode throws on
         localStorage access entirely. Degrade to in-memory. */
      return Object.assign({}, BLANK);
    }
  }

  let state = read();

  function persist() {
    try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* in-memory only */ }
    listeners.forEach(fn => { try { fn(state); } catch (e) { console.error(e); } });
  }

  /* Merge, never replace. */
  function patch(next) {
    state = Object.assign({}, state, next);
    persist();
    return state;
  }

  /* ── behaviour trail ──────────────────────────────────────────────────────
     Capped at 40 entries. An unbounded event log in localStorage grows until a write throws, and
     the throw surfaces somewhere unrelated. */
  function track(name, detail) {
    const events = state.events.concat([{ name, detail: detail || null, at: Date.now() }]).slice(-40);
    patch({ events });
  }

  function lastEvent(name) {
    for (let i = state.events.length - 1; i >= 0; i--) if (state.events[i].name === name) return state.events[i];
    return null;
  }

  function countEvents(name) {
    return state.events.filter(e => e.name === name).length;
  }

  /* ── session ──────────────────────────────────────────────────────────── */
  function signIn(user) {
    const existing = state.user && state.user.email === user.email;
    patch({
      user: Object.assign({ since: Date.now() }, state.user, user),
      /* A brand-new account gets the welcome credit. Returning users keep what they had — handing
         out R30 on every sign-in is a funded promotion, not a login side effect. */
      credit: existing ? state.credit : Math.max(state.credit, 30),
    });
    track('sign_in');
    return state;
  }

  function signOut() {
    /* Sign-out clears identity and anything money-shaped, and deliberately KEEPS the draft. A
       half-finished booking is the user's work, not ours to throw away because they signed out on
       a shared laptop. It is scoped by nothing sensitive — service, size, day — so keeping it
       discloses nothing. */
    patch({ user: null, carePlus: null, credit: 0, gifts: [], cards: [], referral: null });
    track('sign_out');
  }

  function joinCarePlus(opts) {
    const now = Date.now();
    const month = 30 * 24 * 3600 * 1000;
    patch({
      carePlus: {
        since: now,
        /* One free month, and one per customer ever — so a second join does not restart it. */
        trialEndsAt: state.carePlus && state.carePlus.trialUsed ? now : now + month,
        trialUsed: true,
        renewsAt: now + month,
        card: (opts && opts.card) || null,
      },
    });
    track('care_plus_join');
  }

  function leaveCarePlus() {
    /* trialUsed survives, because the trial genuinely was used. */
    patch({ carePlus: { trialUsed: true, cancelledAt: Date.now() } });
    track('care_plus_cancel');
  }

  const isMember = () => !!(state.carePlus && !state.carePlus.cancelledAt);
  const inTrial = () => isMember() && state.carePlus.trialEndsAt > Date.now();
  const trialDaysLeft = () => inTrial()
    ? Math.ceil((state.carePlus.trialEndsAt - Date.now()) / (24 * 3600 * 1000))
    : 0;

  /* ── the booking draft — what the nudges are made of ─────────────────────── */
  function saveDraft(draft) {
    patch({ draft: Object.assign({}, state.draft, draft, { touchedAt: Date.now() }) });
  }
  function clearDraft() { patch({ draft: null }); }

  function completeBooking(booking) {
    patch({
      bookings: state.bookings.concat([Object.assign({ at: Date.now() }, booking)]),
      draft: null,
      credit: Math.max(0, state.credit - (booking.creditUsed || 0)),
    });
    track('booking_complete', { total: booking.total });
  }

  function saveCard(card) {
    const cards = state.cards.filter(c => c.lastFour !== card.lastFour).concat([card]);
    patch({ cards });
    track('card_saved');
  }

  function addCredit(amount, reason) {
    patch({ credit: state.credit + amount });
    track('credit_added', { amount, reason });
  }

  function saveDocument(key, status) {
    patch({ documents: Object.assign({}, state.documents, { [key]: { status, uploadedAt: Date.now() } }) });
    track('document_upload', { key, status });
  }

  function savePlace(place) {
    const places = state.places.filter(p => p.label !== place.label).concat([place]);
    patch({ places });
    track('place_saved');
  }

  /* Referral state is owned by XootRefer, which needs somewhere durable to keep it. Kept here
     rather than in its own key so one sign-out clears everything identity-shaped at once. */
  function patchReferral(next) { patch({ referral: next }); }

  /* ── nudge bookkeeping ──────────────────────────────────────────────────── */
  function markSeen(id) {
    patch({ seen: Object.assign({}, state.seen, { [id]: Date.now() }) });
  }
  function seenAt(id) { return state.seen[id] || 0; }
  function dismiss(id) {
    /* A dismissal is a stronger signal than a view, and is recorded separately so a nudge can be
       retired permanently rather than merely cooled down. */
    patch({ seen: Object.assign({}, state.seen, { [id]: Date.now(), [id + ':dismissed']: Date.now() }) });
    track('nudge_dismiss', { id });
  }
  function isDismissed(id) { return !!state.seen[id + ':dismissed']; }

  function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  /* React binding. Re-renders on any change, from any surface. */
  function useSession() {
    const R = window.React;
    const [, force] = R.useState(0);
    R.useEffect(() => subscribe(() => force(n => n + 1)), []);
    return window.XootSession;
  }

  window.XootSession = {
    get state() { return state; },
    get user() { return state.user; },
    get credit() { return state.credit; },
    get draft() { return state.draft; },
    get documents() { return state.documents; },
    get cards() { return state.cards; },
    isMember, inTrial, trialDaysLeft,
    signIn, signOut, joinCarePlus, leaveCarePlus,
    saveDraft, clearDraft, completeBooking, saveCard, addCredit, saveDocument, savePlace,
    patchReferral,
    track, lastEvent, countEvents,
    markSeen, seenAt, dismiss, isDismissed,
    subscribe, useSession,
    /* Test seam. Never called by UI. */
    __reset() { state = Object.assign({}, BLANK); persist(); },
  };
})();
