/* ── Xoot engine bundle — GENERATED, do not edit ───────────────────────────────
 *
 * Concatenation of the engine layer, each file wrapped in an IIFE. Source order:
 *   app/ns.js, app/data.js, quote.js, concierge.js, rwd.js
 *
 * WHY: the DC runtime resolves a module list serially — five files is five round trips at ~310ms
 * each before anything can paint, for 3–40KB apiece. The cost is the request, not the bytes.
 *
 * NOT INCLUDED: referral.js and session.js load in the helmet, because referral attribution and
 * the signed-in user must exist before the first render rather than after it.
 *
 * The IIFEs also fix a latent collision: data.js and quote.js each declare a top-level
 * `xootIso`, which is what broke an earlier attempt to load them both in the helmet.
 *
 * TO REGENERATE: edit the source files, then rebuild this bundle from them.
 */


/* ═══ app/ns.js ══════════════════════════════════════════════════════════════ */
(function(){
/* Resilient design-system namespace for the UI kit.
 *
 * The kit is authored against a bundle that recompiles at the end of a turn, so a component
 * written today may not exist in `_ds_bundle.js` until tomorrow. A bare destructure of a
 * missing export yields `undefined`, and rendering `<undefined />` throws — which takes the
 * ENTIRE React tree down and leaves a blank page. One unbuilt component should not do that.
 *
 * This proxy resolves anything missing to a visible placeholder, so the rest of the kit
 * keeps working and the gap is obvious on screen rather than fatal in the console.
 *
 * Kit files should read from `window.XootNS`, never from the raw namespace.
 */
(function () {
  /* READ THE NAMESPACE LIVE, NEVER SNAPSHOT IT.
   *
   * This used to be `var REAL = window.CareDesignSystem_ed2067 || {}` — captured once, at the
   * moment this file was evaluated. That is a race, and it lost: the bundle is 34 000 lines, so
   * whenever it had not finished evaluating by the time ns.js ran, REAL froze as `{}` for the
   * lifetime of the page and EVERY component in the kit became a "not compiled" chip — on a
   * bundle where all 131 components were present and fine. It presented as an intermittently
   * broken page with an empty console, which is the worst possible failure mode.
   *
   * A getter costs nothing and cannot go stale. */
  function real() { return window.CareDesignSystem_ed2067 || {}; }

  /* A LAZY FORWARDER, NOT A DEAD END.
   *
   * The second half of the same race: kit modules destructure at their top level
   * (`const { Button } = window.XootNS`), so whatever they get is captured for good. If that
   * resolved to a static placeholder, the component stayed a chip even after the bundle landed.
   *
   * So the placeholder re-checks on every render and forwards to the real component the moment
   * it exists. A module that destructured too early now heals itself on the next render instead
   * of being permanently wrong, and the chip is shown only for something genuinely absent. */
  function placeholder(name) {
    function Missing(props) {
      var found = real()[name];
      if (typeof found === 'function' || (found && typeof found === 'object')) {
        return window.React.createElement(found, props);
      }
      return window.React.createElement('span', {
        style: {
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '3px 8px', borderRadius: 6,
          background: 'var(--xoot-honey-wash, #FCEEDA)',
          color: 'var(--xoot-honey-ink, #94600E)',
          fontFamily: 'var(--xoot-font-mono, monospace)', fontSize: 10,
          lineHeight: 1.4, whiteSpace: 'nowrap',
        },
        title: name + ' is not in the compiled bundle yet',
      }, name + ' — not compiled');
    }
    Missing.displayName = 'Lazy(' + name + ')';
    return Missing;
  }

  /* Non-component exports need sensible empty shapes, not a placeholder component. */
  var FALLBACKS = {
    Haptics: { haptic: function () { return false; }, withHaptic: function (i, h) { return h; },
               setEnabled: function () {}, isEnabled: function () { return false; }, intents: [] },
    XOOT_SERVICES: {},
    XOOT_ICONS: {},
    XOOT_PHRASES: [],
    iconNames: [],
  };

  window.XootNS = new Proxy({}, {
    get: function (_t, key) {
      if (typeof key !== 'string') return undefined;
      var REAL = real();
      if (key in REAL) return REAL[key];
      if (key in FALLBACKS) return FALLBACKS[key];
      /* Capitalised names are components — hand back the lazy forwarder, which becomes the real
         component as soon as the bundle has it. */
      if (/^[A-Z]/.test(key)) return placeholder(key);
      return undefined;
    },
    has: function (_t, key) { return typeof key === 'string' && (key in real() || key in FALLBACKS || /^[A-Z]/.test(key)); },
    ownKeys: function () { return Object.keys(real()); },
    getOwnPropertyDescriptor: function (_t, key) {
      return { enumerable: true, configurable: true, value: window.XootNS[key] };
    },
  });

  /* Report what's missing once, so the gap is traceable without hunting. */
  window.XootNS.__missing = function (names) {
    var REAL = real();
    var gaps = names.filter(function (n) { return !(n in REAL); });
    if (gaps.length) console.warn('[Xoot kit] not yet in the bundle:', gaps.join(', '));
    return gaps;
  };
})();

/* ── Theme ────────────────────────────────────────────────────────────────
   Dark mode is a document-level concern, not a screen's. Setting the attribute inside one
   screen meant the theme unmounted with it — flip the switch, navigate away, and you were
   back in light. This owns the attribute on every phone frame in the page, applies to
   frames mounted later, and persists the choice. */
(function () {
  var KEY = 'xoot.theme';

  /* ── Theme: light on every launch, dark as a session choice ───────────────
     Xoot opens light. Always. Not "unless something is stored", not "unless the device says
     otherwise" — light, every single time the app loads.

     That needs saying plainly because three previous attempts at this failed, each for the
     same underlying reason: they treated dark as a PERSISTED preference and then tried to
     find the right conditions under which to ignore it.

       1. Default from the device. A dark-set phone opened the app dark, which nobody asked
          this app for.
       2. Default from localStorage. Any toggle, ever, made the app dark forever after.
       3. A one-shot reset stamp. It cleared the stored value once, then was spent — so the
          very next toggle re-created the problem it was meant to solve, permanently.

     Each fix was more machinery guarding the same wrong premise. The premise is the bug: for
     a light-first product, a persisted dark value can never be distinguished from stale junk,
     so it should not survive a reload at all.

     So dark lives in sessionStorage. The toggle in You works exactly as before and flips the
     whole app instantly; it survives navigation within the session, and it is gone on reload.
     No stamps, no migrations, no fourth attempt.

     The stale localStorage key is actively removed rather than ignored, so an old 'dark' can
     never be read by some other code path later. */
  var SESSION_KEY = 'xoot.theme.session';

  var current = 'light';
  try {
    /* Purge the old persisted key wherever it still exists. Leaving it would mean any future
       reader re-introduces the bug. */
    window.localStorage.removeItem(KEY);
    window.localStorage.removeItem('xoot.theme.v2');
    if (window.sessionStorage.getItem(SESSION_KEY) === 'dark') current = 'dark';
  } catch (e) {}

  /* Scoped to the phone frames only. The kit page around them is scaffolding, not product —
     it stays light, and it is not written to survive a token inversion.

     Frames carrying data-theme-lock own their theme and are left alone: onboarding runs before
     a user has any preference, so it must never inherit one set later. */
  function paint() {
    var frames = document.querySelectorAll('[data-phone]');
    for (var i = 0; i < frames.length; i++) {
      var lock = frames[i].getAttribute('data-theme-lock');
      frames[i].setAttribute('data-theme', lock || current);
    }
  }

  window.XootTheme = {
    get: function () { return current; },
    isDark: function () { return current === 'dark'; },
    set: function (theme) {
      current = theme === 'dark' ? 'dark' : 'light';
      /* Session, not local — see the note above. */
      try { window.sessionStorage.setItem(SESSION_KEY, current); } catch (e) {}
      paint();
    },
    toggle: function () { window.XootTheme.set(current === 'dark' ? 'light' : 'dark'); },
  };

  /* Frames mount and unmount as you move around, so repaint when the tree changes. */
  if (typeof MutationObserver !== 'undefined') {
    new MutationObserver(paint).observe(document.documentElement, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', paint);
  else paint();
})();
})();

/* ═══ app/data.js ══════════════════════════════════════════════════════════════ */
(function(){
/* Shared fake data for the Xoot app kit. Prices in ZAR, SweepSouth-comparable ranges. */

/* Dates are built from date PARTS, never toISOString() — that converts to UTC and hands back
   yesterday for a SAST user before 02:00. `xootOffset(n)` is days from today, so demo content
   follows the user instead of being pinned to whenever this file was written.

   Hoisted deliberately: the same logic was inlined three times, which is exactly how the
   second schedule key got left behind on a July date. One helper means one place to change. */
const xootIso = n =>
  n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0') + '-' + String(n.getDate()).padStart(2, '0');
const xootOffset = n => {
  const t = new Date();
  return xootIso(new Date(t.getFullYear(), t.getMonth(), t.getDate() + n));
};

window.XootData = {
  user: {
    name: 'Nadia', firstName: 'Nadia', credit: 30, points: 340, level: 4, streak: 12,
    isNew: false, carePlus: true, suburb: 'Sandton', address: '14 Fredman Dr, Sandton 2196',
    referralCode: 'NADIA-XT94', referrals: { sent: 4, booked: 2, earned: 200 },
  },

  /* Referral: R100 each way, and the referrer is only paid once the referee actually books.
     100 points = R10, so 340 points is R34 of convertible credit. */
  referral: { reward: 100, pointsPerRand: 10 },
  /* The five services Xoot offers today. `est` is the duration shown in the booking grid —
     prices never appear before the summary, so duration is what the user compares on. */
  /* The seven services Xoot offers. Prices are the locked commercial values: a clean is
     sized (small R280/4h, medium R325/5.5h, large R400/8h); add-ons are R30 each; a one-off
     booking carries a R39 service fee, waived on anything recurring.
     `est` is what the booking grid shows — prices never appear before the summary. */
  services: [
    { key: 'regular', title: 'Regular cleaning',   blurb: 'Your usual reset, every time',   from: 280, est: '4 hrs',   unit: 'per visit' },
    { key: 'airbnb',  title: 'Airbnb cleaning',    blurb: 'Guest-ready turnaround',         from: 325, est: '5,5 hrs', unit: 'per turn' },
    { key: 'express', title: 'Express cleaning',   blurb: 'Our fastest, our lowest price',  from: 280, est: '2 hrs',   unit: 'per visit' },
    { key: 'office',  title: 'Office cleaning',    blurb: 'After hours or weekends',        from: 400, est: '8 hrs',   unit: 'per visit' },
    { key: 'moving',  title: 'Moving cleaning',    blurb: 'Move-in or move-out, top to bottom', from: 400, est: '8 hrs', unit: 'once-off' },
    { key: 'laundry', title: 'Laundry & ironing',  blurb: 'Washed, dried, folded',          from: 280, est: '3 hrs',   unit: 'per load' },
    { key: 'lux',     title: 'Xoot Lux',           blurb: 'Elite Xooters, our own supplies', from: 400, est: 'Soon',   unit: 'per visit', comingSoon: true },
  ],

  /* Flat-rate size tiers. A clean is priced by the SIZE of the place, not by counting rooms —
     bedrooms and bathrooms only decide which tier you land in. This is the real pricing logic;
     per-room increments were an earlier invention and are gone. */
  sizes: [
    { key: 'small',  label: 'Small',  detail: 'Studio or 1 bedroom',  price: 280, hours: 4,   maxBed: 1, maxBath: 1 },
    { key: 'medium', label: 'Medium', detail: '2–3 bedrooms',         price: 325, hours: 5.5, maxBed: 3, maxBath: 2 },
    { key: 'large',  label: 'Large',  detail: '4+ bedrooms',          price: 400, hours: 8,   maxBed: 99, maxBath: 99 },
  ],

  /* Which tier a place falls into. Bathrooms can push a small place up a tier. */
  sizeFor(bed, bath) {
    if (bed >= 4 || bath >= 3) return this.sizes[2];
    if (bed >= 2 || bath >= 2) return this.sizes[1];
    return this.sizes[0];
  },

  /* Coordination overhead per crew size — the multiplier on TOTAL labour hours. Index 0 is a
     lone Xooter, so it's 1. */
  crewOverhead: [1, 1.15, 1.25, 1.4],

  /* ── Service fit ───────────────────────────────────────────────────────────
     Stopping a Regular clean being booked for an office, a move-out or a turnover.

     This is not a fraud problem, and treating it as one gets the design wrong. Almost everyone who
     does it does it honestly: they have a move-out, they see "Regular cleaning" at R280, and they
     do not know a Moving clean exists. The cost lands on the Xooter, who arrives to eight hours of
     work priced as four and either absorbs it or abandons the job — the single fastest way to lose
     good Xooters.

     So there are four layers, and only the last one is a refusal:

       1 · ASK THE PROPERTY TYPE. Not just "how big" — "what is it". One question at the place
           step, before any price is shown. It catches the honest mistake, which is most of them.
       2 · OFFER THE RIGHT SERVICE, don't scold. A mismatch swaps the service and re-quotes in one
           tap. Never an error dialog: an error makes people go back and lie about the property.
       3 · LET THE XOOTER FLAG IT AT THE DOOR. Before work starts, not after. Re-quote in place,
           customer approves, nobody has an argument on a doorstep.
       4 · PRICE IT SERVER-SIDE. Property type is part of the quote request. A client that can
           claim "flat" for an office can claim its own price, and this repo has shipped a screen
           showing one price and charging another three times.

     `requires` is the service a property type must use. Absent means anything domestic is fine. */
  propertyTypes: [
    { key: 'flat', label: 'Flat or apartment', icon: 'building-2' },
    { key: 'house', label: 'House', icon: 'house' },
    { key: 'townhouse', label: 'Townhouse or complex', icon: 'users' },
    { key: 'airbnb', label: 'Short-stay rental', icon: 'bed-double', requires: 'airbnb',
      why: 'Guest turnovers are on a check-in deadline and include linen, restocking and a photo handover. A regular visit does not.' },
    { key: 'office', label: 'Office or commercial', icon: 'briefcase', requires: 'office',
      why: 'Commercial work is after-hours, needs its own insurance cover, and is charged on floor area rather than bedrooms.' },
    { key: 'empty', label: 'Empty — moving in or out', icon: 'truck', requires: 'moving',
      why: 'An empty place means inside cupboards, appliances, walls and skirtings — around twice the hours of a visit to a lived-in home.' },
  ],

  /* Returns null when the pairing is fine, or the swap to offer. */
  serviceFit(service, propertyKey) {
    const pt = this.propertyTypes.find(p => p.key === propertyKey);
    if (!pt || !pt.requires) return null;
    if (pt.requires === service) return null;
    /* Two services are exempt, for opposite reasons.

       Lux is a premium tier priced above every specialist service and scoped to cover any
       property, so redirecting away from it would always be a downgrade.

       Laundry is exempt because washing is washing wherever it happens — a small business booking
       Laundry & ironing and truthfully answering "office" wants their washing done, not an office
       cleaned. Without this, the resolver re-priced that booking as office cleaning: R491 instead
       of R280, for a job nobody asked for.

       This lives HERE rather than in either booking screen. The app had the exemption in its UI
       and the resolver did not honour it, so the app suppressed the warning and charged the higher
       price anyway — the exact class of client/server disagreement the pricing rules exist to
       prevent. One place decides. */
    if (service === 'lux' || service === 'laundry') return null;
    const target = this.services.find(s => s.key === pt.requires);
    return { from: service, to: pt.requires, service: target, property: pt, why: pt.why };
  },

  crewCap: { small: 2, medium: 3, large: 4 },

  /* Size is the wrong sole constraint for the deadline-driven services, and capping on it alone
     was losing real bookings. A 40m² Airbnb studio is "small", so it capped at 2 — but a turnover
     has a hard check-in time, and the entire reason to send three people is to finish before it.
     An office is booked by floor area the size tiers do not describe at all. A moving clean has a
     handover.

     So the cap is the HIGHER of what the floor supports and what the service needs. Absent from
     this table means size decides — a regular home clean has no deadline, and offering four
     Xooters for it sells crowding.

     Laundry stays at 1 everywhere: it is machine-bound, and a second person cannot make a wash
     cycle finish sooner. */
  crewCapByService: { airbnb: 3, office: 4, moving: 4, express: 3, lux: 4, laundry: 1 },

  crewCapFor(service, sizeKey) {
    const bySize = this.crewCap[sizeKey] || 2;
    const bySvc = this.crewCapByService[service];
    if (bySvc == null) return bySize;
    /* Laundry's 1 is a ceiling, not a floor — it must win over any size allowance. */
    if (service === 'laundry') return 1;
    return Math.max(bySize, bySvc);
  },

  /* Elapsed hours for a crew of `n` on a job that takes `soloHours` alone. Rounded to the
     nearest half hour, because quoting 3.17 hours implies a precision nobody can deliver. */
  crewHours(soloHours, n) {
    const overhead = this.crewOverhead[n - 1] || 1;
    return Math.max(1.5, Math.round((soloHours * overhead / n) * 2) / 2);
  },

  /* What the crew costs. Priced on total labour, so it scales with the overhead rather than
     with headcount — two Xooters is ~1.15× the solo price, not 2×. */
  crewPrice(soloPrice, n) {
    const overhead = this.crewOverhead[n - 1] || 1;
    return Math.round(soloPrice * overhead);
  },

  /* Xooters work 07:00–17:00. A visit must FIT inside that window, and same-day bookings
     need lead time for someone to actually travel to you. Next day or later is the ideal. */
  workday: { open: 7, close: 17, sameDayLeadHours: 3 },

  /* Slots a place of this size can still start at today, given the hour it is now. */
  slotsFor(hours, nowHour) {
    const first = Math.max(this.workday.open, Math.ceil(nowHour + this.workday.sameDayLeadHours));
    const last = this.workday.close - Math.ceil(hours);
    const out = [];
    for (let h = first; h <= last; h++) out.push(String(h).padStart(2, '0') + ':00');
    return out;
  },

  /* Every slot in the day, for tomorrow onwards. */
  allSlotsFor(hours) {
    const out = [];
    for (let h = this.workday.open; h <= this.workday.close - Math.ceil(hours); h++) out.push(String(h).padStart(2, '0') + ':00');
    return out;
  },

/* ── Authoritative pricing — docs/xoot-master-brief.md §4 ────────────────
     Ladders are DATA, not formulas, because none of them are smooth: office is flat across
     2–3h then climbs, express is flat throughout, and regular has a legal floor grafted onto
     its tail. A fitted curve would be wrong somewhere, and wrong silently.

     ⚠️ THE LONG-JOB FLOOR IS A COMPLIANCE CONTROL, NOT A PRICING CHOICE. From 5.5h, price is
     at least R47 per booked hour. The original ladder was sub-linear, so at 35% commission a
     10-hour clean returned the Xooter R27.95/h against South Africa's R30.23/h minimum wage
     (from 2026-03-01, which domestic workers sit at parity with). R47/h nets them R30.55/h.
     That is 1% over the minimum and the minimum rises ~5% each March — so this EXPIRES in
     March 2027 and must be reviewed before it becomes unlawful again. */
  pricing: {
    addOn: 30,              // every standard add-on
    linenOnSite: 20,        // Airbnb linen option 3 — the ONE add-on that is not R30
    bookingFee: 39,         // EVERY booking (ZD-026). Care+ is the only waiver.
    bookingCover: 22,       // XootCover, underwritten by Genric (ZD-020, was R21)
    carePlusMonthly: 99,
    welcomeCredit: 30,      // ONE-TIME, first month, and only if not via the free trial
    longJobFloorPerHour: 47,
    floorReviewBy: '2027-03-01',
    recurringDiscount: { 1: 0, 2: 0, 3: 0.15, 4: 0.15, 5: 0.28, 6: 0.28, 7: 0.28 },
  },

  /* Per-half-hour ladders, keyed by service. Hours → rand. */
  ladders: {
    regular: { 3.5: 236, 4: 250, 4.5: 266, 5: 280, 5.5: 296, 6: 310, 6.5: 326, 7: 340,
               7.5: 356, 8: 376, 8.5: 400, 9: 423, 9.5: 447, 10: 470 },
    office:  { 2: 324, 2.5: 324, 3: 324, 3.5: 374, 4: 424, 4.5: 442, 5: 452, 5.5: 476,
               6: 504, 6.5: 518, 7: 540, 7.5: 558, 8: 592, 8.5: 618, 9: 638, 9.5: 646, 10: 660 },
    moving:  { 4.5: 320, 5: 330, 5.5: 344, 6: 364, 6.5: 376, 7: 390, 7.5: 404, 8: 430,
               8.5: 448, 9: 462, 9.5: 468, 10: 478 },
    airbnb:  { 3: 304, 3.5: 304, 4: 304, 4.5: 318, 5: 324, 5.5: 342, 6: 362, 6.5: 362,
               7: 372, 7.5: 400, 8: 426 },
    express: { 1: 220, 1.5: 220, 2: 220, 2.5: 220, 3: 220 },
  },

  /* Laundry is banded by TOTAL LOADS (wash + ironing), not by half-hours — "10 loads wash +
     2 ironing" is the 12-load rung. Brief §4.8.

     This lives here, with the other ladders, because it is PRICING DATA. The design system's
     LaundryPicker carries a private copy for its own inline estimate; the price actually
     charged comes from XootQuote reading this table, and the picker is mounted with its
     estimate switched off so the two can never disagree on screen. */
  laundryLadder: [
    { upTo: 4,        hours: 3.5, price: 268 },
    { upTo: 6,        hours: 4.5, price: 314 },
    { upTo: 8,        hours: 5.5, price: 338 },
    { upTo: 10,       hours: 6.5, price: 368 },
    { upTo: 12,       hours: 7.5, price: 396 },
    { upTo: 13,       hours: 8.5, price: 440 },
    { upTo: 14,       hours: 9.5, price: 460 },
    { upTo: 15,       hours: 10,  price: 468 },
    /* Capped. Beyond 15 loads the price holds — a Xooter's day has a ceiling, and charging for
       hours nobody can work would be selling something undeliverable. */
    { upTo: Infinity, hours: 10,  price: 468, capped: true },
  ],

  /* Hour bounds per service. Home size sets the DEFAULT only — price comes from hours. */
  hourRanges: {
    regular: { min: 3.5, max: 10, bySize: { small: 4, medium: 5.5, large: 8 } },
    office:  { min: 2,   max: 10, default: 5 },   // no size selector at all (§4.4)
    moving:  { min: 4.5, max: 10, bySize: { tiny: 4.5, small: 6, medium: 8, large: 10, xlarge: 10 } },
    airbnb:  { min: 3,   max: 8,  default: 4, window: { open: 7, close: 14 } },
    express: { min: 1,   max: 3,  default: 1 },
    laundry: { min: 3.5, max: 10, default: 3.5 },
  },

  /* Priority launch suburbs. Anyone in Johannesburg can book — these just get first supply. */
  prioritySuburbs: ['Sandton','Bryanston','Midrand','Fourways','Rosebank','Bedfordview','Hyde Park','Parkhurst','Melville','Waterfall','Dainfern','Braamfontein'],

  /* ── The signed-in Xooter ────────────────────────────────────────────────
     Figures are consistent with the locked commercial values: a small clean is R280 and the
     Xooter's share is ~75%, so a 4-hour job pays R210. Nothing here is a round invented number
     — a dashboard that doesn't reconcile with the job cards is worse than no dashboard.

     `rank` points are RECOGNITION, never pay. The dashboard must never place them next to an
     earnings figure in a way that implies a badge raises a rate. */
  xooter: {
    name: 'Nomsa Mahlangu', suburb: 'Sandton', rating: 4.9, reviews: 218,
    jobsAllTime: 412, memberSince: 'March 2025',
    rank: 145, badges: ['Turnover Pro', 'Surface Safe', 'Client Care'],

    /* Paid out only after a visit is verified complete. `pending` is work already done and
       awaiting verification; `nextPayout` is when the pending amount lands. */
    earnedThisWeek: 1180,
    pending: 244,
    paidThisMonth: 4620,
    nextPayout: 'Tuesday',

    /* Mon–Sun. Sunday is not a day off — Xooters choose their own days. */
    week: [
      { day: 'Mon', earned: 210, hours: 4 },
      { day: 'Tue', earned: 244, hours: 5.5 },
      { day: 'Wed', earned: 0,   hours: 0 },
      { day: 'Thu', earned: 300, hours: 8 },
      { day: 'Fri', earned: 180, hours: 3 },
      { day: 'Sat', earned: 246, hours: 5.5 },
      { day: 'Sun', earned: 0,   hours: 0 },
    ],

    /* Xooters work 07:00–17:00, so 10 hours a day is the ceiling — 70 a week. The cap exists
       for safety, and the dashboard shows proximity to it rather than hiding it. */
    hoursBooked: 26,
    hoursCap: 45,

    /* Reliability. Each one is shown WITH what it affects, because a percentage with no
       consequence attached is a scold rather than information. */
    reliability: {
      accepted: 92,
      onTime: 97,
      completed: 100,
    },

    /* Where the money actually comes from — the one genuinely strategic view a Xooter has. */
    byService: [
      { key: 'airbnb',  jobs: 14, earned: 2180 },
      { key: 'regular', jobs: 11, earned: 1540 },
      { key: 'office',  jobs: 5,  earned: 720 },
      { key: 'laundry', jobs: 4,  earned: 380 },
    ],
  },

  pros: [
    { name: 'Nomsa Mahlangu', rating: 4.9, reviews: 218, jobs: 412, tagline: 'Ten years of homes around Sandton.', badges: ['Turnover Pro','Surface Safe'], suburb: 'Sandton' },
    { name: 'Sipho Dlamini',  rating: 4.8, reviews: 96,  jobs: 140, tagline: 'Offices and after-hours resets.',      badges: ['Office Ready'], suburb: 'Bryanston' },
    { name: 'Grace Ndlovu',   rating: 5.0, reviews: 61,  jobs: 88,  tagline: 'Careful, quiet, and very thorough.',   badges: ['Client Care','Wellness Ready'], suburb: 'Rosebank' },
  ],
  reviews: [
    { quote: 'I stopped dreading Sunday nights.', name: 'Thandi M.' },
    { quote: 'Same pro every week. She knows the house now.', name: 'Sipho D.' },
    { quote: 'Booking took ninety seconds flat.', name: 'Ruan V.' },
    { quote: 'My mom gets help and I get peace of mind.', name: 'Nadia K.' },
  ],
  /* Sunday-first week around today (SA convention, matching DayStrip). */
  week: (() => {
    const now = new Date();
    const sunday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    return Array.from({ length: 7 }, (_, i) =>
      xootIso(new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + i)));
  })(),
  /* EVERY key is an offset from today, so the demo schedule follows the user and the week strip
     shows dots on more than one day. A literal date here becomes dead content the moment the
     file ages — which is what happened to the old '2026-07-31' entry: `week` is derived, so it
     could never contain a July date again and that day's content was unreachable. */
  schedule: {
    [xootOffset(0)]: [
      { slot: 'morning',   service: 'airbnb',  title: 'Airbnb turnaround',  meta: '08:00 · 5,5 hrs · Nomsa M.', progress: { done: 1, total: 3 } },
      { slot: 'afternoon', service: 'laundry', title: 'Laundry & ironing', meta: '13:00 · 1 hr' },
      { slot: 'afternoon', service: 'express', title: 'Express tidy',      meta: '16:30 · 1,5 hrs' },
    ],
    [xootOffset(3)]: [
      { slot: 'morning', service: 'office', title: 'Office clean', meta: '09:00 · 8 hrs · Sipho D.' },
    ],
  },
  /* Money, formatted once, here. The minus goes BEFORE the currency symbol — `'R' + (-57)` gives
     "R-57", which reads as a corrupted amount rather than a deduction, and it appeared on the
     "Plan saving" row, the single most-scrutinised line on the checkout. U+2212 rather than a
     hyphen: at the weight these figures are set in, a hyphen is too short to register as a minus. */
  rand(n) {
    const v = Number(n) || 0;
    const body = Math.abs(v).toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    return (v < 0 ? '−R' : 'R') + body;
  },
};
})();

/* ═══ quote.js ══════════════════════════════════════════════════════════════ */
(function(){
/* ── XootQuote — the authoritative pricing service ───────────────────────────
 *
 * WHY THIS FILE EXISTS
 * Every price the customer sees now comes from here, and only from here. Before this, three
 * surfaces each did their own arithmetic: the booking flow multiplied a size tier by a hard-coded
 * 0.15 "plan saving", the gift flow multiplied `services[].from` by a bundle count, and the site
 * band recomputed perk values inline. They disagreed. Worse, the booking flow's discount was a
 * front-end guess that the frequency tabs could desynchronise from — tap Weekly → Just once
 * quickly enough and a recurring discount stayed applied to a one-off booking.
 *
 * THE RULES THIS FILE ENFORCES
 *  1. The FRONT END NEVER COMPUTES A PRICE. It renders `quote.lines` and `quote.total` verbatim.
 *     There is no arithmetic left in the UI to drift, and nothing the UI can do — including
 *     tapping frequency forty times a second — changes a number except by asking for a new quote.
 *  2. Quotes are SEQUENCED AND SIGNED. Every request carries a monotonic seq; a response whose
 *     seq is older than the newest one in flight is dropped, so a fast tapper cannot land a stale
 *     cheap quote on a newer expensive selection. Each quote carries a `token` that the pay step
 *     submits INSTEAD of an amount — the amount is never client-supplied.
 *  3. LADDERS ARE THE ONLY SOURCE OF TRUTH for base price. `sizes[].price` and `services[].from`
 *     are stale marketing display values (`sizes.small` says R280 for 4h; the ladder says R250)
 *     and are no longer priced against — `teaserFrom()` derives them from the ladder instead.
 *  4. The long-job floor and the crew overhead are compliance/commercial controls, applied here
 *     where they cannot be forgotten. See XootData.pricing for why the floor exists.
 */
(function () {
  const D = () => window.XootData;

  /* Round to whole rand once, at the end of a line — never mid-calculation, which is how a
     total ends up a rand off the sum of its own lines. */
  const r0 = n => Math.round(n);
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

  /* Nearest rung at or above `hours`. Ladders are sparse data, not curves, so a lookup that
     misses must round UP — quoting the cheaper neighbouring rung sells hours at a loss.

     A service with no ladder throws rather than returning null. Silently yielding 0 is how an
     unknown service key ('indoor', which never existed) reached a Pay button reading "Pay R0". */
  function ladderPrice(service, hours) {
    const ladder = D().ladders[service];
    if (!ladder) throw new Error('XootQuote: no price ladder for service "' + service + '"');
    const rungs = Object.keys(ladder).map(Number).sort((a, b) => a - b);
    const hit = rungs.find(h => h >= hours - 0.001);
    return ladder[hit != null ? hit : rungs[rungs.length - 1]];
  }

  function hourBounds(service) {
    return D().hourRanges[service] || { min: 3.5, max: 10 };
  }

  /* Default hours for a service+size. Size sets the DEFAULT ONLY — price comes from hours. */
  function defaultHours(service, sizeKey) {
    const hr = hourBounds(service);
    if (hr.bySize && sizeKey && hr.bySize[sizeKey] != null) return hr.bySize[sizeKey];
    if (hr.default != null) return hr.default;
    return hr.min;
  }

  /* ⚠️ COMPLIANCE CONTROL — do not "optimise" away. From 5.5h the ladder went sub-linear, which
     at 35% commission pushed the Xooter's hourly return under the national minimum wage. */
  function withFloor(price, hours) {
    const p = D().pricing;
    if (hours < 5.5) return { price: price, floored: false };
    const floor = r0(hours * p.longJobFloorPerHour);
    return floor > price ? { price: floor, floored: true } : { price: price, floored: false };
  }

  /* Visits per month, from the recurrence the user actually chose. This is the ONLY input to the
     recurring discount — which is why frequency can no longer disagree with the discount. */
  function visitsPerMonth(freq, dayCount) {
    const days = Math.max(1, dayCount || 1);
    if (freq === 'weekly') return days * 4;
    if (freq === 'fortnightly') return days * 2;
    return 0;                                    // 'once' — not recurring, full stop
  }

  function recurringRate(freq, dayCount) {
    const vpm = visitsPerMonth(freq, dayCount);
    if (!vpm) return 0;
    const table = D().pricing.recurringDiscount;
    const keys = Object.keys(table).map(Number).sort((a, b) => a - b);
    return table[clamp(vpm, keys[0], keys[keys.length - 1])] || 0;
  }

  /* Laundry, banded by TOTAL loads. Reads XootData.laundryLadder rather than the design
     system's LaundryPicker, whose ladder is private to its module scope and is presentation
     only — pricing data belongs to the pricing service. */
  function estimateLaundry(washLoads, ironLoads) {
    const total = (washLoads || 0) + (ironLoads || 0);
    if (total === 0) return null;
    const ladder = D().laundryLadder || [];
    const rung = ladder.find(r => total <= r.upTo) || ladder[ladder.length - 1];
    if (!rung) return null;
    return { total, hours: rung.hours, price: rung.price, capped: !!rung.capped };
  }

  /* Marketing "from" price for a service, DERIVED so it can never contradict a real quote.
     Returns null for anything unpriceable (Xoot Lux is still "Soon", so it has no ladder) —
     a teaser is display copy, so absence is a legitimate answer here even though it is not one
     inside resolve(). */
  function teaserFrom(service) {
    try {
      const hrs = hourBounds(service);
      if (service === 'laundry') {
        const est = estimateLaundry(1, 0);
        return est ? est.price : null;
      }
      const base = ladderPrice(service, hrs.min);
      return base == null ? null : withFloor(base, hrs.min).price;
    } catch (e) {
      return null;
    }
  }

  /* ── the resolver ──────────────────────────────────────────────────────────
     Pure. Same input, same quote, every time — which is what makes it safe to re-run on every
     keystroke and what makes the sequencing below meaningful. */
  function resolve(input) {
    const P = D().pricing;
    const i = input || {};
    const requested = i.service || 'regular';

    /* ── SERVICE FIT IS ENFORCED HERE, NOT IN THE UI ─────────────────────────
       The booking screen offers the swap politely and does not block Continue — blocking just
       teaches people to go back and pick "house". Which means the UI cannot be the enforcement,
       and this resolver is where the property type is finally reconciled with the service.

       A move-out booked as a Regular clean is 8 hours of work priced as 4. The Xooter absorbs the
       difference or abandons the job, and losing good Xooters is more expensive than losing the
       booking. So the pairing is priced as the service the PROPERTY requires, not the one the
       client asked for.

       This fails in the over-stating direction on purpose. Under the Consumer Protection Act the
       displayed price is the price: quoting high and charging high is survivable, quoting R280 for
       a job that costs R520 is not. The mismatch is returned on the quote so the UI can say so
       plainly rather than silently showing a bigger number than the one the customer expected. */
    const mismatch = D().serviceFit ? D().serviceFit(requested, i.propertyType) : null;
    const service = mismatch ? mismatch.to : requested;

    const isLaundry = service === 'laundry';
    const carePlus = !!i.carePlus;
    const addOns = i.addOns || [];
    /* Clamped against what this service and size can actually absorb, not a flat 4 — the resolver
       is the last line of defence for a crew size the UI should not have offered. */
    const crewCeiling = i.sizeKey || i.service
      ? D().crewCapFor(i.service || 'regular', i.sizeKey || 'medium')
      : 4;
    const crew = clamp(i.crew || 1, 1, crewCeiling);
    let hours, base, sizeLabel = null, floored = false, laundry = null;

    if (isLaundry) {
      /* Laundry is priced by LOADS, not by hours or rooms, and its ladder already contains the
         elapsed time for each rung — so the hours here are an output, not an input. */
      const est = estimateLaundry(i.washLoads || 0, i.ironLoads || 0);
      if (!est) {
        return {
          service, hours: 0, empty: true, lines: [], total: 0, subtotal: 0,
          note: 'Pick at least one load to see a price.',
          token: null, currency: 'R',
        };
      }
      laundry = est;
      hours = est.hours;
      base = est.price;
      sizeLabel = est.total + (est.total === 1 ? ' load' : ' loads');
    } else {
      const size = i.sizeKey ? D().sizes.find(s => s.key === i.sizeKey) : null;
      const hrs = hourBounds(service);
      /* Add-ons extend the job by half an hour each — real time, so it must be priced. */
      const soloHours = clamp(
        (i.hours != null ? i.hours : defaultHours(service, i.sizeKey)) + addOns.length * 0.5,
        hrs.min, hrs.max
      );
      /* Crew changes ELAPSED time but is priced on TOTAL LABOUR, so two Xooters is ~1.15× the
         solo price rather than 2×. Both numbers come from XootData. */
      hours = D().crewHours(soloHours, crew);
      const rung = ladderPrice(service, soloHours);
      const withCrew = D().crewPrice(rung, crew);
      const fl = withFloor(withCrew, soloHours);
      base = fl.price;
      floored = fl.floored;
      sizeLabel = size ? size.label : null;
    }

    /* Care+ and brand-new customers get the first add-on free each month. That concession comes
       off Xoot's commission, never the Xooter's pay. */
    const freeAddOns = (carePlus || i.isNewUser) ? 1 : 0;
    const chargeable = Math.max(0, addOns.length - freeAddOns);
    const addOnTotal = chargeable * P.addOn;

    /* EVERY booking carries the fee (ZD-026). Care+ is the only waiver — recurring is NOT one,
       which is what the old "waived on repeats" label wrongly promised. */
    const feeCharged = carePlus ? 0 : P.bookingFee;

    const rate = recurringRate(i.freq, i.dayCount);
    const preDiscount = base + addOnTotal;
    const planSaving = r0(preDiscount * rate);

    const cover = i.cover ? P.bookingCover : 0;

    /* A referral discount is a LINE, not a coupon typed into a box. It is passed in by the caller
       from XootRefer.pendingDiscount() and re-validated here (never negative, never more than the
       bill) for the same reason every other number lives in this file: a screen that can invent
       its own discount can invent its own price. In production the server re-checks that the code
       exists, is not the buyer's own, and has not already been burned. */
    const referral = Math.max(0, Math.min(i.referralCredit || 0, base + addOnTotal));

    const payableBeforeCredit = Math.max(0, preDiscount - planSaving + feeCharged + cover - referral);

    /* Credit comes off last and can never exceed what is owed — a credit larger than the bill
       used to produce a negative total on cheap express bookings. */
    const creditAvailable = Math.max(0, i.creditAvailable || 0);
    const creditUsed = i.useCredit ? Math.min(creditAvailable, payableBeforeCredit) : 0;
    const total = Math.max(0, payableBeforeCredit - creditUsed);

    const svc = D().services.find(s => s.key === service);
    const baseLabel = [
      svc ? svc.title : service,
      sizeLabel,
      crew > 1 ? crew + ' Xooters' : null,
    ].filter(Boolean).join(' · ');

    const lines = [{ label: baseLabel, amount: base }];
    if (freeAddOns && addOns.length) lines.push({ label: 'First add-on', amount: 0 });
    if (chargeable) lines.push({ label: 'Add-ons · ' + chargeable + ' × R' + P.addOn, amount: addOnTotal });
    lines.push({
      label: carePlus ? 'Booking fee (Care+)' : 'Booking fee',
      amount: feeCharged,
    });
    if (cover) lines.push({ label: 'XootCover', amount: cover });
    if (planSaving) {
      lines.push({
        label: 'Plan saving · ' + Math.round(rate * 100) + '%',
        amount: -planSaving,
      });
    }
    if (referral) {
      /* Named, not "Discount". "Thandi's invite" is the whole point of a referral appearing on a
         receipt — it credits the person who did the persuading, in front of the person persuaded. */
      lines.push({
        label: (i.referralFrom ? i.referralFrom + "'s invite" : 'Referral credit'),
        amount: -referral,
      });
    }
    if (creditUsed) lines.push({ label: 'XootCred', amount: -creditUsed });
    return {
      service, hours, laundry, sizeLabel, crew, floored,
      /* Set when the requested service did not match the property and the quote was re-priced as
         the correct one. The UI reads this to explain the number rather than let it look like a
         mistake. */
      mismatch: mismatch ? { requested, priced: service, why: mismatch.why, title: mismatch.service.title } : null,
      recurring: rate > 0,
      recurringRate: rate,
      visitsPerMonth: visitsPerMonth(i.freq, i.dayCount),
      base, addOnTotal, chargeableAddOns: chargeable, freeAddOns,
      bookingFee: feeCharged, cover, planSaving, referral,
      creditAvailable, creditUsed, creditMax: payableBeforeCredit,
      subtotal: payableBeforeCredit,
      total,
      lines,
      currency: 'R',
      empty: false,
      /* What the pay step submits. The amount is deliberately absent from what the client sends
         back: the server re-resolves from the token's inputs and charges its own number. */
      token: 'q_' + hashInput(input),
    };
  }

  /* Cheap stable digest of the priced inputs — stands in for the server-side quote id. */
  function hashInput(input) {
    const s = JSON.stringify(input || {});
    let h = 0;
    for (let k = 0; k < s.length; k++) h = (h * 31 + s.charCodeAt(k)) | 0;
    return (h >>> 0).toString(36);
  }

  /* ── the sequenced transport ───────────────────────────────────────────────
     Stands in for the network. The latency is what makes the race real enough to defend
     against: without it, a hand-rolled front end looks correct locally and desynchronises the
     moment a real API is behind it. */
  const LATENCY = 90;

  /* PER-CALLER SEQUENCING, not one global counter.

     This was the frequency-tap bug. There used to be a single module-level `seq`, shared by every
     hook instance on the page. The staleness check was `mine !== seq`, so the moment a SECOND
     component requested a quote, the first component's in-flight response failed that check and
     was dropped — permanently. Its `pending` never cleared and it went on rendering the quote it
     happened to be holding.

     That is exactly the reported symptom: tap through the frequencies and the price walks toward
     the right number, then stops somewhere short of it. It looked like a race inside one
     component; it was two components racing each other through one variable. It also depended on
     mount order, which is why it appeared intermittent.

     Each caller now gets its own channel, so a newer request only ever supersedes an older
     request FROM THE SAME CALLER, which is the only staleness that means anything. */
  function channel() {
    let seq = 0;
    return {
      request(input, cb) {
        const mine = ++seq;
        const quote = resolve(input);   // resolved server-side, at request time
        const t = window.setTimeout(() => {
          if (mine !== seq) return;     // superseded by a newer selection from this caller
          cb(quote, mine);
        }, LATENCY);
        return () => window.clearTimeout(t);
      },
      /* Abandons whatever is in flight without delivering it — used on unmount. */
      drop() { seq++; },
    };
  }

  /* Kept for one-off callers that don't hold a channel. */
  function request(input, cb) { return channel().request(input, cb); }

  /* ── gifting ───────────────────────────────────────────────────────────────
     A gift has to cover what the recipient would otherwise pay, or it isn't a gift — so it
     carries the booking fee too. It is priced off the ladder at the service's default hours,
     which is why it no longer disagrees with booking the same clean yourself: the old flow used
     `services[].from` (R280 for a regular clean) against a real quote of R250 + R39. */
  function giftQuote(input) {
    const P = D().pricing;
    const i = input || {};
    const service = i.service || 'regular';
    const count = clamp(i.count || 1, 1, 24);
    const svc = D().services.find(s => s.key === service);

    let perVisitBase, hours, unitLabel;
    if (service === 'laundry') {
      const est = estimateLaundry(4, 2);
      perVisitBase = est ? est.price : 0;
      hours = est ? est.hours : 0;
      unitLabel = 'A 6-load wash & iron';
    } else {
      /* Medium is the gifting default: the sender rarely knows the recipient's floor plan, and
         a gift that under-covers a large home turns a present into a part-payment. */
      const h = defaultHours(service, 'medium');
      hours = h;
      perVisitBase = withFloor(ladderPrice(service, h), h).price;
      unitLabel = (svc ? svc.title : service) + ' · ' + (h % 1 ? h.toFixed(1) : h) + ' hrs';
    }

    const perVisitFee = P.bookingFee;
    const perVisit = perVisitBase + perVisitFee;
    const total = perVisit * count;

    return {
      service, count, hours, perVisit, perVisitBase, perVisitFee, unitLabel,
      lines: [
        { label: unitLabel + ' × ' + count, amount: perVisitBase * count },
        { label: 'Booking fees × ' + count, amount: perVisitFee * count },
      ],
      total,
      currency: 'R',
      /* Said out loud on the review screen: gifting is not marked up, and there is no bundle
         discount to explain either. Both are pricing decisions, so both live here. */
      note: 'Exactly what these cleans cost to book yourself — no gifting markup.',
      token: 'g_' + hashInput(input),
    };
  }

  /* ── React binding ────────────────────────────────────────────────────────
     Returns the last SERVER-CONFIRMED quote plus a `pending` flag. Components render this and
     nothing else, so there is no local number for a fast tap to corrupt. */
  function useQuote(input) {
    const R = window.React;
    const key = JSON.stringify(input);
    const ch = R.useRef(null);
    if (!ch.current) ch.current = channel();
    const [state, setState] = R.useState(() => ({ quote: resolve(input), pending: false }));
    R.useEffect(() => {
      setState(s => ({ quote: s.quote, pending: true }));
      const cancel = ch.current.request(JSON.parse(key), q => setState({ quote: q, pending: false }));
      return cancel;
    }, [key]);
    R.useEffect(() => () => ch.current.drop(), []);
    return state;
  }

  function useGiftQuote(input) {
    const R = window.React;
    const key = JSON.stringify(input);
    /* Its own channel too — gifting and booking quotes used to share the global counter, so an
       open gift panel silently froze the booking price and vice versa. */
    const ch = R.useRef(null);
    if (!ch.current) ch.current = { seq: 0 };
    const [state, setState] = R.useState(() => ({ quote: giftQuote(input), pending: false }));
    R.useEffect(() => {
      setState(s => ({ quote: s.quote, pending: true }));
      const mine = ++ch.current.seq;
      const q = giftQuote(JSON.parse(key));
      const t = window.setTimeout(() => {
        if (mine !== ch.current.seq) return;
        setState({ quote: q, pending: false });
      }, LATENCY);
      return () => window.clearTimeout(t);
    }, [key]);
    return state;
  }

  window.XootQuote = {
    resolve, request, channel, useQuote, giftQuote, useGiftQuote, estimateLaundry,
    teaserFrom, defaultHours, hourBounds, ladderPrice, recurringRate, visitsPerMonth,
    /* Delegates to XootData.rand so there is one money formatter, not two that can disagree about
       how a negative amount is written. */
    rand: n => D().rand(n),
  };
})();
})();

/* ═══ concierge.js ══════════════════════════════════════════════════════════════ */
(function(){
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
})();

/* ═══ rwd.js ══════════════════════════════════════════════════════════════ */
(function(){
/* ── XootRWD — the site's responsive primitives ───────────────────────────────
 *
 * These live in their own file because the site's modules are evaluated in separate scopes: a
 * hook declared at the top of SiteTop.jsx is NOT visible to SiteBody.jsx, and calling it there
 * took the whole page down with "useNarrow is not defined". One shared module, published on
 * window like the rest of the kit, is the fix.
 *
 * Reflow does almost all of the responsive work on this site — auto-fit grids whose tracks are
 * `minmax(min(100%, Npx), 1fr)` so a track can never demand more width than the viewport has,
 * and clamp() gutters, paddings and type. These hooks exist only for the things reflow cannot
 * express: collapsing the nav into a menu, dropping decorations that only make sense beside a
 * second column, and reacting to SHORT viewports rather than narrow ones.
 */
(function () {
  const R = () => window.React;

  /* Shared matchMedia subscription. Returns a boolean and re-renders on change. */
  function useMedia(query) {
    const React = R();
    const [on, setOn] = React.useState(
      () => typeof window.matchMedia === 'function' && window.matchMedia(query).matches
    );
    React.useEffect(() => {
      if (typeof window.matchMedia !== 'function') return;
      const mq = window.matchMedia(query);
      const handler = e => setOn(e.matches);
      setOn(mq.matches);
      /* Safari below 14 only has the deprecated listener API, and this site's audience is
         phone-heavy enough that the fallback is worth four lines. */
      if (mq.addEventListener) {
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
      }
      mq.addListener(handler);
      return () => mq.removeListener(handler);
    }, [query]);
    return on;
  }

  const useNarrow = px => useMedia('(max-width: ' + px + 'px)');

  /* SHORT, not narrow. A landscape phone is 844×390: wide enough that every width query says
     "desktop", while 390px of height means a tall hero image, a full-height sheet and a 128px
     section rhythm are all wrong. Aspect ratio alone isn't enough either — a 1280×800 laptop and
     a 640×400 window share a ratio and want different layouts — so this asks about real height. */
  const useShort = (px = 560) => useMedia('(max-height: ' + px + 'px)');

  /* True when the viewport is wider than it is tall AND genuinely shallow: the case where
     vertical space is the scarce axis and vertical rhythm has to compress. */
  const useLandscapeCompact = () =>
    useMedia('(orientation: landscape) and (max-height: 560px)');

  window.XootRWD = { useMedia, useNarrow, useShort, useLandscapeCompact };
  /* Bare aliases, matching how the rest of the kit shares across module scopes. */
  window.useNarrow = useNarrow;
  window.useShort = useShort;
  window.useLandscapeCompact = useLandscapeCompact;
})();
})();
