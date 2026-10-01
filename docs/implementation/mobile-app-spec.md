# The mobile app — captured as a spec, before the design context goes cold

**Historical capture, 3 September 2026.** The implementation/status claims below are no
longer current: the repository now contains native screens and reviewed shared contracts.
Use the [current handoff coverage](app-handoff-coverage.md),
[visual evidence](visual-fidelity-ledger.md), and
[production checklist](../release/production-checklist.md) for remaining work.
This historical document does not override the founder's approved implementation plan.

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
| `Gift.jsx` | Gift a clean | ⛔ **No server support** — no gift table, no writer |
| `CarePlus.jsx` | Membership | ✅ `care-plus-membership.ts` |
| `Profile.jsx` | Account, household profile | ✅ `household_profiles` |
| `Frame.jsx` / `Overlays.jsx` | Shell, sheets, toasts | n/a — chrome |
| `Xooter.jsx` | Xooter landing | ⚠️ **LRA s200A** |
| `XooterOnboarding.jsx` | Apply, documents | ⚠️ **LRA s200A** |
| `XooterDashboard.jsx` | Earnings, rank, boost | ✅ `xooter-commission.ts` |
| `XooterJob.jsx` | Accept, navigate, complete | ✅ `respond-xooter-job` |

### 🛑 Three findings that matter more than the screen list

**1. `Gift.jsx` has no server behind it.** There is no gift table, no gift writer, no redemption
path. It is the one screen in the set that is **a product proposal wearing a design's clothes**.
Building it would mean designing gift economics — who pays, when it is charged, what happens if the
recipient never books, whether it expires (⚠️ CPA s63 governs unredeemed vouchers). ⛔ **Not a port.
A founder decision.**

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
