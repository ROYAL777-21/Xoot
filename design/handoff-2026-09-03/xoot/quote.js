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
