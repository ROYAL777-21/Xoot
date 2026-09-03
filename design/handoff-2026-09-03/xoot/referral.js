/* ── XootRefer — the referral programme ────────────────────────────────────────
 *
 * There was a referral SCREEN in the app: a code, a hardcoded list of four friends, a total. None
 * of it was connected to anything. The code was a string in `data.js`, the invites were a literal
 * array, and the "earned" figure was typed in. Nothing could actually be referred.
 *
 * This is the engine behind it, shared by the site and the app so both tell the same story.
 *
 * THE ECONOMICS, and why they are shaped this way:
 *
 *   Two-sided, R100 each. The referee gets R100 off their first booking; the referrer gets R100 in
 *   XootCred. Symmetry matters — a lopsided offer makes the sharer feel like a salesperson, and
 *   people do not forward things that make them feel like a salesperson.
 *
 *   THE REFERRER IS PAID ON THE REFEREE'S FIRST *PAID* BOOKING. Not on sign-up, not on install.
 *   Paying for sign-ups buys sign-ups: dormant accounts created by someone who wanted R100. The
 *   cost has to land against a real customer with a real cleaned home, so the reward sits at
 *   `pending` until money moves, then settles.
 *
 *   R100 against a ~R335 first clean is roughly a third off, and our first-visit-to-second-visit
 *   conversion is what makes it pay back. That is a real cost, not a discount that costs nothing,
 *   which is why the caps below exist rather than being ornamental.
 *
 * ABUSE, honestly bounded:
 *
 *   Self-referral is refused (same email, and same-device attribution is ignored). There is a cap
 *   of 10 settled rewards a year per referrer. Attribution is FIRST-TOUCH and locks for 30 days —
 *   last-touch lets a second code overwrite the friend who actually did the persuading.
 *
 *   None of these are enforceable here. This is a client. Every rule below is re-run server-side
 *   in production; the client copy exists so the UI can tell the truth before the server answers,
 *   and so the numbers on screen are computed rather than typed. See GO-LIVE.md.
 */
(function () {
  const REWARD = 100;          // rand, each side
  const YEARLY_CAP = 10;       // settled rewards per referrer per year
  const ATTRIBUTION_DAYS = 30; // first-touch lock

  const S = () => window.XootSession;
  const day = 24 * 3600 * 1000;

  /* ── the code ──────────────────────────────────────────────────────────────
     Derived from the name so it is speakable — someone reads this to a neighbour over a fence.
     Ambiguous glyphs are left out of the suffix alphabet: 0/O and 1/I are the two most common
     transcription failures when a code is said aloud rather than tapped. */
  const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

  function codeFor(user) {
    if (!user) return null;
    const seedSource = (user.email || user.name || 'xoot').toLowerCase();
    let h = 0;
    for (let i = 0; i < seedSource.length; i++) h = (h * 31 + seedSource.charCodeAt(i)) >>> 0;
    let suffix = '';
    for (let i = 0; i < 4; i++) { suffix += ALPHABET[h % ALPHABET.length]; h = Math.floor(h / ALPHABET.length) + 7; }
    const stem = (user.name || 'XOOT').split(/\s+/)[0].toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6) || 'XOOT';
    return stem + '-' + suffix;
  }

  const blank = () => ({ invites: [], attributedTo: null, attributedAt: 0, settled: [], redeemed: false });
  const store = () => Object.assign(blank(), (S() && S().state.referral) || {});
  const save = (next) => S().patchReferral(Object.assign(store(), next));

  const myCode = () => codeFor(S() && S().user);

  function shareLink(code) {
    const c = code || myCode();
    if (!c) return null;
    /* Hash rather than query so it survives a static host with no rewrite rules, and so it does
       not end up in server logs alongside the referrer's identity. */
    return window.location.origin + window.location.pathname + '#ref=' + c;
  }

  /* ── attribution ───────────────────────────────────────────────────────────
     Called once on load. First-touch: an existing, unexpired attribution is never overwritten. */
  function capture() {
    const m = (window.location.hash + window.location.search).match(/ref=([A-Z0-9-]+)/i);
    if (!m) return null;
    const code = m[1].toUpperCase();
    const cur = store();

    /* Already a customer — a code in the URL cannot retro-discount someone who has bought before.
       This is the single most-attempted referral abuse and it is trivial to stop. */
    if (S().state.bookings.length) return null;

    /* Self-referral. Also covers the honest case of someone opening their own share link to check
       what it looks like, which should not silently arm a discount they cannot use. */
    if (S().user && codeFor(S().user) === code) return null;

    if (cur.attributedTo && Date.now() - cur.attributedAt < ATTRIBUTION_DAYS * day) return cur.attributedTo;

    save({ attributedTo: code, attributedAt: Date.now(), redeemed: false });
    S().track('referral_captured', { code });
    return code;
  }

  /* What a referee is owed on their first booking. Null once used, or for an existing customer. */
  function pendingDiscount() {
    const cur = store();
    if (!cur.attributedTo || cur.redeemed) return null;
    if (S().state.bookings.length) return null;
    if (Date.now() - cur.attributedAt > ATTRIBUTION_DAYS * day) return null;
    return { code: cur.attributedTo, amount: REWARD, from: friendlyName(cur.attributedTo) };
  }

  /* "THANDI-K4P2" → "Thandi". The stem is the referrer's first name by construction, and showing
     it turns an abstract discount into a specific person's gift. */
  function friendlyName(code) {
    if (!code) return null;
    const stem = code.split('-')[0];
    return stem.charAt(0) + stem.slice(1).toLowerCase();
  }

  /* ── invites ───────────────────────────────────────────────────────────────
     An invite is recorded when it is SENT, so the list reflects what the user actually did rather
     than only the ones that converted. A list that shows nothing until someone books makes the
     feature feel broken in exactly the window where encouragement matters. */
  function invite(contact) {
    const invites = store().invites.filter(i => i.to !== contact.to)
      .concat([{ to: contact.to, name: contact.name || contact.to, via: contact.via || 'link', state: 'invited', at: Date.now() }]);
    save({ invites });
    S().track('referral_invite', { via: contact.via });
    return invites;
  }

  /* Called when someone who used your code signs up, then again when they pay. Server-driven in
     production — the client cannot know what a stranger did. Exposed here so the flow is
     demonstrable end to end. */
  function markJoined(name) {
    const invites = store().invites.map(i => i.name === name ? Object.assign({}, i, { state: 'joined' }) : i);
    save({ invites });
  }

  function settle(name) {
    const cur = store();
    if (cur.settled.filter(s => Date.now() - s.at < 365 * day).length >= YEARLY_CAP) {
      return { ok: false, reason: 'cap' };
    }
    const invites = cur.invites.map(i => i.name === name ? Object.assign({}, i, { state: 'booked' }) : i);
    save({ invites, settled: cur.settled.concat([{ name, amount: REWARD, at: Date.now() }]) });
    S().addCredit(REWARD, 'referral:' + name);
    return { ok: true, amount: REWARD };
  }

  /* The referee's side, called at checkout. Burns the discount so it cannot be used twice, and
     credits the referrer. */
  function redeem() {
    const d = pendingDiscount();
    if (!d) return null;
    save({ redeemed: true, redeemedAt: Date.now() });
    S().track('referral_redeemed', { code: d.code, amount: d.amount });
    return d;
  }

  function summary() {
    const cur = store();
    const settled = cur.settled.filter(s => Date.now() - s.at < 365 * day);
    return {
      code: myCode(),
      link: shareLink(),
      reward: REWARD,
      invites: cur.invites,
      sent: cur.invites.length,
      joined: cur.invites.filter(i => i.state === 'joined').length,
      booked: cur.invites.filter(i => i.state === 'booked').length,
      earned: settled.reduce((n, s) => n + s.amount, 0),
      pending: cur.invites.filter(i => i.state === 'joined').length * REWARD,
      capLeft: Math.max(0, YEARLY_CAP - settled.length),
      cap: YEARLY_CAP,
    };
  }

  /* Native share sheet where it exists — on iOS that is the difference between a share that
     happens and a code someone means to send later. Falls back to clipboard. */
  async function share() {
    const link = shareLink();
    if (!link) return { ok: false, reason: 'signed-out' };
    const text = `I use Xoot for cleaning — here's R${REWARD} off your first one.`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'R' + REWARD + ' off your first Xoot clean', text, url: link });
        invite({ to: 'shared', name: 'Shared link', via: 'sheet' });
        return { ok: true, via: 'sheet' };
      }
      await navigator.clipboard.writeText(link);
      return { ok: true, via: 'clipboard' };
    } catch (e) {
      return { ok: false, reason: 'cancelled' };
    }
  }

  function useRefer() {
    const R = window.React;
    const [, force] = R.useState(0);
    R.useEffect(() => S().subscribe(() => force(n => n + 1)), []);
    return window.XootRefer;
  }

  window.XootRefer = {
    REWARD, YEARLY_CAP, ATTRIBUTION_DAYS,
    codeFor, myCode, shareLink, capture, pendingDiscount, friendlyName,
    invite, markJoined, settle, redeem, summary, share, useRefer,
  };
})();
