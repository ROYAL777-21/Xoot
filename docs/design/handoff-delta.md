# Design handoff → shipped code: the measured delta

Produced 2026-09-05. **Every count below is from `grep`/`ls`, not estimated.**

⚠️ **Why this exists.** `docs/SOURCES-OF-TRUTH.md` named ten HTML files as source of truth when
three of them had never been opened — including the 2.8 MB mobile handoff. This is the inventory
that should have preceded that claim.

⛔ **Inventory, not a port plan.** Phase 4 (React Native) is a rewrite the founder deferred.

---

## The mobile design handoff — `design/Xoot_App.html`

**2.8 MB. 36 screens and flows**, measured by
`grep -oE "[A-Z][A-Za-z]{2,24}(Screen|Flow)" | sort -u`:

> `AccountScreen` `BookingFlow` `CalendarScreen` `CarePlusJoinScreen` `CarePlusManageScreen`
> `ChatScreen` `ConciergeScreen` `CoverScreen` `CredScreen` `GiftFlow` `HelpScreen`
> `HomeEditScreen` `HowScreen` `InvoicesScreen` `LockScreen` `ManageMoreScreen`
> `NotificationsFeedScreen` `NotificationsScreen` `OnboardingFlow` `PaymentScreen` `PrivacyScreen`
> `ProfileScreen` `RateScreen` `ReferScreen` `RewardsScreen` `SearchScreen` `SiriScreen`
> `TodayScreen` `TrackingScreen` `VisitScreen` `VisitsListScreen` `WidgetsScreen`
> `XooterEarningsScreen` `XooterGrowthScreen` `XooterHomeScreen` `XooterJobScreen`

### Against `mobile/` (Expo)

⚠️ **`mobile/` has 545 `.tsx` files and only 23 of its own.** The other 522 are vendored library
code — every file matching `*screen*` there is `react-native-screens` internals, not a Xoot screen.
Counting them would have produced a flattering and false answer.

Its own routes, from `ls mobile/src/app/`: `index` · `book` · `bookings` · `account` ·
`care-plus` · `concierge` · `xooter/jobs`, plus `_layout`.

**So: 7 screens against 36 designed.** The native app is scaffolding — tokens, providers, splash, a
tab bar, seven screens — not a port in progress.

### Against the web app — `src/pages/app/`

14 pages: `AirbnbHostDashboard` `Book` `BookingDetail` `Bookings` `Favorites` `GiftClean`
`Insurance` `Loyalty` `OfficeDashboard` `Plans` `Profile` `Properties` `Support` `Training`

| Designed | Web equivalent |
|---|---|
| `BookingFlow` · `TrackingScreen` · `ChatScreen` | `Book` · `BookingDetail` |
| `VisitScreen` · `RateScreen` · `VisitsListScreen` | `Bookings` |
| `RewardsScreen` · `CredScreen` | `Loyalty` |
| `GiftFlow` | `GiftClean` |
| `CarePlusJoinScreen` · `CarePlusManageScreen` | `Plans` / `CarePlusPaywall` |
| `ProfileScreen` + `Account/Invoices/Payment/Privacy/HomeEdit/ManageMore` | `Profile` (sub-screens not split out) |
| `XooterHomeScreen` · `XooterEarningsScreen` · `XooterJobScreen` | `xooter/Dashboard` · `Earnings` · `Jobs` |
| `CoverScreen` | `Insurance` |
| **`TodayScreen`** | ⛔ **absent** — the design's home surface is a calendar-style "today", the web app has no equivalent |
| **`SiriScreen` · `WidgetsScreen` · `CalendarScreen`** | ⛔ **absent** — native-only surfaces with no web counterpart, and no `mobile/` implementation either |
| **`SearchScreen`** | ⛔ absent — `ConciergeOmnibox` is adjacent, not the same |
| **`XooterGrowthScreen`** | ⛔ absent |
| **`LockScreen`** | ⛔ absent |

⚠️ **`PaymentScreen` and `RewardsScreen` describe flows the product cannot complete today** —
PayFast is not connected. Same failure the website port surfaced; recorded before anyone ports them.

---

## The prototypes — the only end-to-end flow anyone has specced

`design/prototypes/customer-sign-in-first-booking/` (`index.html` 40 K, `selected-bc.html` 8 K),
with a **124-line screen spec** and a `features/…/BRIEF.md`.

It covers the exact path the product needs to work: **guest browses → prepares a booking →
authenticates only when the draft becomes account-owned → the draft survives the callback.**

Its own stated product outcome:

> *"A guest can understand services and prepare a booking without account friction. Authentication
> begins only when the draft becomes account-owned. The draft survives the secure callback, and all
> payment, booking, matching, and assignment statuses come from approved backend state."*

✅ This matches `UX-PRINCIPLES.md` #2 (*progressive commitment — place sign-in at the latest safe
point*) and #4 (*backend truth*).

⚠️ **Status: "exploration handoff; Figma approval required before production UI implementation."**
It is not approved, which is consistent with `approved-frames.json` being empty.

⛔ **Open question for the founder:** the spec's governing-files list names `apps/mobile/AGENTS.md`
and `mobile/AGENTS.md`. Whether the shipped `Book.tsx` flow satisfies this spec has never been
checked — and it is the single most important flow in the product.

---

## Summary

| Source | Designed | Shipped | Gap |
|---|---|---|---|
| Mobile handoff → `mobile/` | 36 screens | 7 own screens | **29** |
| Mobile handoff → web `src/pages/app/` | 36 screens | 14 pages covering ~22 | **6 with no counterpart anywhere** |
| Prototype flow | 1 specced end-to-end flow | unverified against `Book.tsx` | **1 unchecked** |
