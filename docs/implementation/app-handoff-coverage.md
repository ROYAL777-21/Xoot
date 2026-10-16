# App handoff coverage

Updated 2 October 2026. This maps the supplied editable app screens to the website's
signed-in experience and the Expo app. It is an implementation inventory, not a release
certificate. The [visual ledger](visual-fidelity-ledger.md) records comparisons; the
[production checklist](../release/production-checklist.md) remains the single register
for launch gates and owner dependencies. The original files under
`design/handoff-2026-09-03/xoot/app/` are unchanged visual references.

“Ported” below refers only to the named screen or behavior. A linked route is not proof
that its entire destination matches the handoff. Unavailable controls and explanatory
copy are unfinished capabilities, not completed functionality. No native rendering,
physical-device, store distribution or complete paid journey is verified yet.

| Handoff screen or group | Website implementation and evidence | Native implementation and remaining work |
|---|---|---|
| Frame / Today | `AppShell` and `Today`: source navigation, calendar, first/returning cards, widgets and real booking rows. Reviewed browser checks at seven sizes; [evidence](../release/evidence/2026-09-30/today/README.md). | `index.tsx` and native shell exist; data pagination/account guards and complete source/device comparison remain. |
| Onboarding / authentication | Actual authentication and source booking entry exist; production-configured home/sign-in rendering verified. Remaining permission/phone/SSO states need complete journey coverage. | Auth and booking entry exist; complete first-run, permissions, interrupted-auth and provider/device verification remain. |
| Search / Concierge | Real search and Concierge entry exist; keyboard selection and unsent question handling reviewed. Full source screen coverage and supported actions remain. | `search.tsx` and `concierge.tsx` exist; native journey verification remains. |
| Notifications feed (`Search.jsx`) | Source feed, Back/Home entry, exact accessible unread count, owner-safe pagination/read actions, retry and empty states are implemented and independently reviewed. [Seven-size evidence](../release/evidence/2026-10-02/notifications/README.md) uses isolated synthetic accounts. Realtime publication/security migration and signed-in live delivery remain. | `notifications.tsx` exists; bounded fetching, account transitions, source fidelity and device delivery remain. Optional legacy web-bridge setup is explicitly unavailable. |
| Booking / service correction / quote | Source website modal and signed-in booking inputs/review ported; shared server quote uses approved ZD-038. Atomic one-job creation, crew lifecycle, payments and referrals remain. | `book.tsx` uses source inputs/artwork and shared quote contract. Native render and the same backend fulfilment gates remain. |
| Visits list | `Bookings.tsx` reviewed: source tabs, rows, past cards and verified payment data; [evidence](../release/evidence/2026-09-30/visits/README.md). | `bookings.tsx` exists; the exact list port, correct displayed money and complete data handling remain. |
| Visit detail / rate / tracking / chat | Existing booking detail, chat and review behavior require the full `Visits.jsx`/`Tracking.jsx` port and crew-aware data/actions. | Dedicated source visit detail, tracking, rating and chat journeys remain. |
| Rewards / XootCred | Wallet reads are reviewed, paginated and preserve cents. Full `Rewards.jsx`/`CredScreen` composition and atomic benefit redemption remain. | Rewards/credits screens exist; source/device comparison and actual redemption remain. |
| Care+ join / manage | Existing `Plans.tsx` requires the full `CarePlus.jsx` join/manage composition and verified membership fulfilment. | `care-plus.tsx` exists; complete source and paid membership/device journeys remain. |
| Gift flow | Source gift request flow exists with reviewed unpaid-request contract. Paid delivery, redemption, reversal and order browsing remain. | Complete native `Gift.jsx` flow and the same fulfilment work remain. |
| You / account / saved-place editor | Source `Profile`, `AccountEdit`, `HomeEdit` implementation, 60 focused checks and independent review pass; [seven-size visual evidence](../release/evidence/2026-10-01/profile/README.md) uses isolated synthetic records. Ordinary owner-bound edits use real queries; authenticated staging verification remains. | Account and separate name/phone/address edits exist; full source overview/account/home-editor parity remains. |
| Profile preferences | Theme and device haptics are implemented. Matching preference, evening scheduling, verified email changes, avatar/language/home-type support and atomic default-place switching remain. | Full source preferences and server/device integration remain. |
| Notifications settings (`Profile.jsx`) | Channels/event rows and persisted preferences tied to actual delivery remain; current You row accurately says unavailable. | Source settings screen and actual channel integration remain. |
| Payment methods / receipts / invoices | You links actual visit payment details. Source saved methods, receipt list/download and company billing flow remain. No fabricated card is shown. | Source payment, receipt and company billing screens remain. |
| Refer & earn | Approved server quote/parser and concurrency foundation exist. Source referral screen, safe redemption, paid-completion reward and reversal remain. | Referral UI and the same verified server fulfilment remain. |
| Manage more / saved Xooters | Real properties/favourites routes exist. Full source property/business composition, screens and journeys remain. | Source property/business and saved-helper screens remain. |
| Connected calendars / Siri / widgets | Source controls currently state unavailable. Actual calendar integrations, shortcuts and widgets remain. Concierge itself has a real entry. | Native platform capabilities, permission handling and device verification remain. |
| Cover / Help / How / Privacy | Existing real destinations are linked. Full app-specific layouts, source privacy export/deletion and verified support/provider commitments remain. Public legal layout is tracked separately in the visual ledger. | Source account-support/privacy screens and working provider/data actions remain. |
| Xooter onboarding / home / dashboard / job / earnings / growth | Existing contractor workflows require screen-by-screen source port, real assignment/crew access and verified earnings/payout records. | `xooter/jobs.tsx` exists; remaining source contractor screens and full journeys remain. |
| Share / call / camera overlays | Source overlays must connect to real permitted sharing, communications and uploads; no simulated call or camera success. | Native platform implementations, permissions, interruption recovery and physical-device checks remain. |

The source overview menus deliberately retain their labels even when their destination
is unfinished. The final acceptance pass must visit every destination above, compare the
original composition at the required sizes and exercise its real data/actions. It must
also verify the separate public website, foundations, components, legal, security and
responsive HTML references, rather than treating this app table as the whole deliverable.

## 14 October 2026 — founder corrections to the design handoff (work in progress)

The founder clarified two non-negotiable product requirements that supersede misleading copy in the September handoff assets, without treating the remaining screens as complete:

- **Cadence:** all five bookable service types must initialise to `weekly` with precisely the chosen first visit's weekday selected on website and Expo. Customers can change to once or fortnightly; service changes preserve explicit cadence. Date changes move the mandatory first repeat day instead of adding an accidental extra weekly visit; manually selected extra days are preserved. The UI still needs live authenticated and physical-device verification.
- **Gift a Clean:** 52 weekly visits are needed for one year. Existing selectable 1/3/4/6/12 bundles remain individual visits, with `12` correctly described as about three months at one per week, and `6` no longer described as half a year. Do **not** offer 52 visits as a payable product while server `GIFT_COUNTS` and fulfilment only support existing bundles. Source prototype `app/Gift.jsx` contains inaccurate 12/6-year copy, overridden intentionally in production components.
- **Design acceptance remains open:** a build passing and a deployed marketing page are not proof of the full handoff. The entire table above, mobile device screenshots, source typography/dimensions/interactions, authenticated routes, crew and contractor screens, help/account screens and real provider actions must be completed and compared screen-by-screen. Do not close this ledger until every route has visual and behavioural evidence, including payment/calling unavailable states as appropriate.

This change is isolated from the active Codex PR #46 and targets the founder-approved `release/xoot-production` branch. It changes UI defaults and copy only; there is **no automatic recurring booking submission**, charged annual gift or enabled provider checkout.

## 15 October 2026 — native Gift and Care+ design-port slice

**Implementation branch:** `design/native-gift-careplus-handoff-20261015` → `release/xoot-production`. Uses original `app/Gift.jsx` and `app/CarePlus.jsx` as visual/compositional references, not as sources of hardcoded accounts, prices, payment receipts, or false retention offers.

- **Native Gift a Clean (new Expo route `/gifts`)**: three-step choose → personalise → review, live-updating coloured card, five priceable services, 1/3/4/6/12 supported visit bundles, preset personal notes, editable recipient/sender details, delivery-mode choice, character limits and visible errors. A signed-in account fetches the approved server `gift_quote`, validates the cents and selection and does not display fabricated totals on an outage. The native view explicitly marks checkout and delivery as unavailable, rather than reporting an invented purchase. 52 weeks/52 cleans is the truthful annual reference; 12 cleans is approximately three months *if* used weekly. Remounts and discards recipient state on user change.
- **Native Care+ (revised `/care-plus`)**: founder-source presentation with Care+ hero, original home-memory/favourite/priority/XootCred benefits, actual plan price and owner membership status, pending-payment state, request action and a true cancellation-confirmation stage. No invented discount, future membership activation, provider availability or fake emailed offers.
- **Native You navigation**: Gift a Clean and Care+ are now accessible alongside existing profile/account actions. Includes pure native tests for quote tampering, gift counts, recipient validation, honest fulfilment labels and route wiring; release CI now includes this native test and the existing native booking tests.

**Still open / not accepted as entire handoff:** physical device screenshots and 390px source comparisons, native gift payment/cancellation/refund/redemption, Care+ provider-settled billing and verified downstream benefits, authenticated staging/prod role flows, Android/iOS distribution and all other outstanding rows above. A passed static/type/browser gate does not constitute full handoff parity.

## 15 October 2026 — native Visit Detail and Tracking UI slice

New owner-bound Expo route `/visits/[id]` from real Visits cards. It displays a selected booking from `useNativeCoreData()`, whose queries require the authenticated owner's user ID, and handles loading, unauthenticated, missing/invalid ID and read errors without exposing another user's booking. Source-inspired `app/Visits.jsx` / `app/Tracking.jsx` cards show real recorded service, scheduled time, address, assignment, optional verified Xooter rating/identity and current server status. Status journey labels are **indicative only**, not fabricated historical event timestamps. A rebooking link opens the actual booking input flow and support opens Concierge. Unverified live location/ETA, chat/voice, checklist tasks, rating writer and financial settlement are expressly unavailable, not simulated. The native Visits list no longer advertises `bookings.price` as a settled paid total.

The native `scripts/native-visit-detail.test.mts` suite checks read-only status narratives, the owner-bound route, safe UUIDs, no fake ETA/refund and service rebooking; CI includes this alongside native gift/booking tests. **Full source fidelity, authenticated staging, real device screenshots, crew state events, verified ledger/receipt, chat/calls, checklist and true tracking remain open**. This is a UI coverage increment, not completion of the entire website/mobile handoff.

**Account-switch privacy finding and fix:** The pre-existing native `NativeCoreDataProvider` could briefly expose the previous account's cached booking/profile data on the first render after an authentication change, before its refresh effect cleared/replaced it. The provider now tags loaded data by owner ID and returns blank bookings, profile and unread counters, with loading state, unless the current user ID matches. This guard applies to Home, Visits, Visit Detail and other consumers. Native source-level regression asserts the guard; real two-account device tests remain required.

## 15 October 2026 — native Xooter job offers and recorded earnings slice

The original `app/Xooter.jsx` contrasts Xooter work (denser, factual, income-first) with the customer interface; its sample Nomsa bookings, R2,840 paid-out figure, weekly Friday payout, invented route ETA and training grades **are not production facts**. This slice replaces the Expo `/xooter/jobs` shortcut placeholder with live, access-controlled job cards, and adds a dedicated `/xooter/earnings` ledger screen.

- `/xooter/jobs`: signed-in `xooters` identity lookup by `user_id`, then production `get-xooter-job-cards` Edge function (deployed and backed by `get_xooter_job_cards_for_user`). Strict success/data/jobs response validation rejects cross-worker records; only service, offered/accepted/history status, date and duration are projected, excluding customer ID, address and all access codes even when present in the privileged API response. Native job responses remain in the existing authenticated website workspace `/xooter/jobs`, reached by an explicit link: the `ops-workflow` accept/decline transaction must receive a correctness review before duplicating writes natively. No photo/checklist/ETA spoofing.
- `/xooter/earnings`: account-scoped `xooter_earnings` query filtered by current Xooter ID and rolling 7/30-day UTC lookback, bounded to 101 rows and displays max 100. Clearly marks truncation and only sums records shown; all money is Postgres-authored rand amounts. Pending rows distinguished, but no ledger status or net figure is presented as proof of bank settlement. No invented weekly payout or commission grade.
- `/account`: links to Xooter Jobs as a discoverable work entry. All signed-in views remount on account switches and clear prior records while fetching. Guests and users without a Xooter row receive an honest sign-in/verification path, not a mock dashboard.
- `mobile/scripts/native-xooter-ledger.test.mts`: covers Edge envelope, cross-worker rejection, sensitive field stripping, strict finite monetary records, seven/thirty-day ranges, route access and absence of fabricated payout or private addresses. CI requires these tests plus Expo typecheck, lint, full web tests and approved design/browser gate.

**Remaining**: physical iOS/Android screenshot comparisons, accepted-address access window UX, secure per-field reveal/audit, atomic job response and crew/checklist migration, real earnings settlement reconciliation, actual payout statements, commission/boost contract, Xooter KYC and training/growth screens. No client access code or payment capability was enabled in this slice.

## 16 October 2026 — native Xooter Jobs and Earnings implementation

**Isolated branch:** `design/native-xooter-jobs-earnings-20261015` → approved `release/xoot-production`. This slice does not modify Codex PR #46 or `main`.

- **Xooter Jobs:** replaces the Expo `/xooter/jobs` placeholder with actual owner-bound Xooter lookup, active production `get-xooter-job-cards` Edge Function, strictly projected job offers/accepted/history, the real booked service/date/duration, pull-to-refresh, verification/sign-in/empty/error states and secure handoff to the existing signed-in Xooter web workspace for responses. The UI excludes customer address, access codes, private user IDs, unverified price claims and any invented offers.
- **Xooter Earnings:** native `/xooter/earnings` shows owner-filtered production `xooter_earnings` RLS rows for rolling 7/30-day windows, integer-cent-summed recorded net and pending totals, gross/platform-fee breakdown and current ledger status. A nullable `booking_id` is valid according to the actual production schema. A 100-row cap is explicitly labelled *partial* when exceeded, never disguised as an exhaustive period total. There are no unverified bank payout receipts, promised pay dates or actionable payout switches.
- **Access and privacy:** jobs and earnings screens remount whenever the authenticated identity changes; all displayed records are parsed against the Xooter ID found under the signed-in user's account. Production catalog inspection confirmed the `xooter_jobs`, `xooter_earnings` and `xooters` RLS policies; these are not a substitute for two-account authenticated penetration tests.
- **Navigation:** Xooter jobs linked under native You, earnings from the jobs workspace, with secure externally authenticated web routing for accept/decline pending a reviewed native mutation.
- **Regression tests:** verifies exact deployed Edge response envelope, worker-owned projections, malformed/cross-worker and duplicated offers, safe null ledger booking references, integer-cent money arithmetic, bounded listing and rejection of fabricated payout claims. Native test is included in the approved release CI.

**Still open:** independent real-device screen-by-screen comparisons; worker approved/declined job **writes** in Expo, logged access code workflow, native job detail/checklist, payout statements/settlement integrations, signed-in staging and production role tests, and physical native release/distribution. This is a production-safe read-only UI slice, not full Xooter end-to-end completion.
