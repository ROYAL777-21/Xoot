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
