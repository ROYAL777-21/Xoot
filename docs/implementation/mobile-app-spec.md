# The mobile app — captured as a spec, before the design context goes cold

Written 2026-09-03. `design-port-plan.md` Phase 4 says the 16 app screens in
`design/handoff-2026-09-03/xoot/app/` are **"a rewrite, not a port"** and defers them until the site
is live. It also says to capture them as a spec first. This is that capture.

## ⛔ No mobile code was written, deliberately

**Measured:** `find mobile/app -name "*.tsx"` returns **zero files**. The Expo project exists and
carries the voice scaffold (`useVoiceCall`, the Twilio RN wiring, the config plugin) — but there are
no screens. Building 16 screens against a product whose gate 2 and gate 3 are both open would be the
largest speculative investment in this repo, and the port plan already ruled against it.

⚠️ **What this document protects against is different: the design context going cold.** The handoff
is a working JSX prototype. It will be read once more, months from now, by someone who was not here
— and the reasoning inside it is not recoverable from the pixels.

---

## The 16 screens, and which are real product

| Screen | What it is | Backed by code today? |
|---|---|---|
| `Onboarding.jsx` | First-run, address, permissions | Partly — auth exists |
| `Today.jsx` | Home / next visit | ✅ `bookings` |
| `Search.jsx` | Service + size + date picker | ✅ `_shared/pricing.ts` ladder |
| `Booking.jsx` | Quote, add-ons, cover, confirm | ✅ `create-booking` |
| `Tracking.jsx` | Live job state | ✅ `booking_status_events` + state machine |
| `Visits.jsx` | History | ✅ `bookings` |
| `Rewards.jsx` | XootCred, referrals | ✅ `xootcred_ledger`, `referrals` |
| `Gift.jsx` | Gift a clean | ⚠️ **Capture only** — table + writer + routed page exist; **no redemption path** |
| `CarePlus.jsx` | Membership | ✅ `care-plus-membership.ts` |
| `Profile.jsx` | Account, household profile | ✅ `household_profiles` |
| `Frame.jsx` / `Overlays.jsx` | Shell, sheets, toasts | n/a — chrome |
| `Xooter.jsx` | Xooter landing | ⚠️ **LRA s200A** |
| `XooterOnboarding.jsx` | Apply, documents | ⚠️ **LRA s200A** |
| `XooterDashboard.jsx` | Earnings, rank, boost | ✅ `xooter-commission.ts` |
| `XooterJob.jsx` | Accept, navigate, complete | ✅ `respond-xooter-job` |

### 🛑 Three findings that matter more than the screen list

**1. `Gift.jsx` cannot deliver a gift. ⚠️ CORRECTED 2026-09-04 — the first version of this line
was wrong.**

It said *"there is no gift table, no gift writer, no redemption path."* **Two-thirds of that is
false**, and a full backend search found:

- ✅ **`public.gift_clean_orders` has existed since `20260518123000`** — purchaser, recipient,
  occasion, message, amount, and a status check of
  `pending_payment | paid | sent | redeemed | cancelled`
- ✅ **A writer exists** — `ops-workflow/index.ts`, action `gift_clean_order_requested`
- ✅ **A routed page already ships** — `src/pages/app/GiftClean.tsx` at `/app/gifts`, in the nav and
  the omnibox

⛔ **The accurate third: there is no redemption path.** Nothing anywhere sets `paid`, `sent` or
`redeemed`; nothing writes `redeemed_at`; the recipient is never notified and cannot book against a
gift. **Three of the five states in the constraint are unreachable.**

So the honest one-liner is: **someone can record a gift order; nobody can pay for it, be told about
it, or redeem it.**

⚠️ **The search also found a live money defect, now fixed as ZD-038.** Both `GiftClean.tsx` and
`ops-workflow` hardcoded `{ residential: 270, deep: 365, airbnb: 315, premium: 420, moving: 455 }` —
numbers that existed nowhere in `_shared/pricing.ts`, two of which (270, 315) are the exact phantom
prices ZD-037 proved had never been charged by anything. Gift now prices from the ladder and
`gift-pricing-parity.test.ts` pins it.

**What remains a founder decision** is the gift *economics*: who pays, when it is charged, what
happens if the recipient never books, and whether it expires (⚠️ **CPA s63 governs unredeemed
vouchers**). ⛔ Not a port.

**2. Every Xooter-facing screen is behind LRA s200A.** Four of sixteen. The classification decision
does not just block recruitment *marketing* — **it blocks a quarter of the app.**

**3. The app must not re-implement the price ladder.** The single most repeated defect in this
repository is a client pricing independently of the server. `pricing-parity.test.ts` pins
`src/lib/xoot-pricing.ts` to `_shared/pricing.ts`; **a third copy in React Native would need a third
parity test, and would be a third chance to be wrong.**

> ⚠️ **The mobile app should call the server for its quote, not compute one.** Where it must show a
> number before a round trip, it imports the existing web module rather than re-typing it.

---

## What to carry over, and what to leave

| Carry | Leave |
|---|---|
| Screen inventory and navigation graph | The JSX itself — it targets a browser and `window.*` globals |
| The token layer — already extracted to `design-tokens.ts` / `index.css` | Any hardcoded colour; violet is `#7C5CFC` and nothing else |
| The access-window model (`AccessWindowTimeline` ports cleanly) | `referral.js` — ⛔ it decides eligibility in the browser |
| Copy that survived the trust-claim rewrite | Any copy predating it — several strings claimed completed training |

⚠️ **`referral.js` is the trap worth naming twice.** It implements every eligibility check
client-side. `_shared/referrals.ts` has no client mirror precisely because a screen that decides its
own eligibility decides its own discount. **The mobile app must make the same choice the web app
just made:** render the credit the server returned; compute nothing.

---

## The order, when it is time

1. **Gate 2 and gate 3 first.** An app that cannot take a payment is a demo.
2. **Shell + `Today` + `Search` + `Booking`** — the booking path end to end, server-priced.
3. **`Tracking` + `Visits`** — read-only against existing tables.
4. **`Profile` + `Rewards` + `CarePlus`.**
5. ⛔ **Xooter screens only after LRA s200A.**
6. ⛔ **`Gift` only after the founder settles gift economics.**

## What would prove each step

Not "it renders". **A booking created on the phone that appears in `bookings` with the same total
the screen showed** — which is the same standard the web app is held to, and the one this repo has
failed three times.
