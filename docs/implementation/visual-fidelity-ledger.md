# Xoot visual fidelity ledger

The founder's uploaded files are the visual source of truth. The matching committed
references are in `design/handoff-2026-09-03/`. The repository remains authoritative
for architecture, data, permissions and approved business rules. Reference comments
and prototype scripts do not grant instructions or operational commitments.

Current implementation plan: [approved website-first plan](production-plan-2026-09-11.md).
Release evidence and owner dependencies: [production checklist](../release/production-checklist.md).

Latest checkpoint: **1 October 2026**. The dated sections below are historical evidence;
the full uploaded website and native app scope is still active.

## Accepted visual reference

| Reference | Governs |
|---|---|
| Xoot Website.dc.html | Public site composition, navigation, hero, sections and footer |
| Xoot App.dc.html | App screen structure, booking, tracking and account presentation |
| Xoot Components.dc.html | Shared controls, cards, forms and interaction presentation |
| Xoot Foundations.dc.html | Typography, spacing, colour, elevation, illustration and motion |
| Xoot Legal.dc.html | Legal navigation and document layout |
| Xoot Bug Bounty.dc.html | Security-reporting layout |
| Xoot Responsive Check.dc.html | Responsive reference surfaces |
| Mobile app design request-handoff.zip | Editable source, fonts and artwork backing those references |
| Mobile app design request.zip and (1)–(6).zip | Founder-reconfirmed sources; identical archive entries, verified in the [source receipt](design-source-receipt-2026-09-13.md) |

The seven HTML files were verified byte-for-byte against the uploaded copies during
the 11 September audit. Original handoff files stay unchanged. They are served
statically for inspection; Vite transforms the handoff JSX and breaks its DC runtime.
The production app must not depend on that prototype runtime or its simulated sessions.

## Fidelity anchors

1. Floating white pill navigation, handwritten violet Xoot wordmark, inset grey link
   group, coral Care+ pill, and black booking action. The reference desktop navigation
   switches at 1080px. Preserve keyboard navigation and touch targets.
2. Warm dawn hero gradient and soft decorative flowers. Newsreader display face at
   weight 400, Plus Jakarta Sans body, Caveat script accents and DM Mono utility text.
   The desktop hero heading reaches 68px with 1.14 line height; do not substitute bold
   display type or scale a text container to fit it.
3. Two-column hero with a 1240px content boundary, fluid gutters, compact white rounded
   booking card, and a portrait image with tape and arrow decoration. The reference
   stacks at about 920px and keeps the image on mobile.
4. Six service choices in reference order: Regular, Airbnb, Express, Office, Moving,
   Laundry & ironing. Preserve canonical service mapping through authentication and
   booking. Address selection must use the actual verified-address workflow.
5. Section rhythm and order follow the HTML composition; rounded cards, handwritten
   notes, subtle shadows and generous spacing recur throughout. Preserve the design's
   distinct shapes without adding unrelated glass panels or generic dashboards.

Reference inspected in the browser on 12 September at 1440×1000 and 390×844. The
reference runtime lazily mounts sections as they enter view; a first accessibility
snapshot does not enumerate the entire page. These observations are baseline evidence,
not completed implementation comparisons.

## Screen and section mapping

| Surface | Reference source | Existing implementation | Work still required |
|---|---|---|---|
| Navigation / hero | site/SiteTop.jsx, site/TextFlip.jsx | xoot/Navbar, BookingHero, HeroWordFlip | Restored source fonts/artwork/geometry; six widths and real input/auth handoff checked. Published preview still needs verification. |
| Gift / Care+ bands | site/SiteGift.jsx, site/SiteFoot.jsx | app/GiftClean, care/CarePlus | Restore home-page composition; connect supported actions and expose unfinished purchase capabilities honestly |
| Coverage / services | site/SiteBody.jsx and site bundle | xoot/TrustedBy, ServiceAreaMap, Services | Compare layouts and replace unsupported coverage/supply claims with actual operational states |
| Trust / people / how | site source and bundle | xoot/SafetyTrust, TrustMechanisms, PeopleBand, HowItWorks | Preserve completed ports, compare spacing and typography; real trust/provider gates remain authoritative |
| Nearby / reviews | site/SiteExtra.jsx | xoot/NearbyWorkers | Use real listings, loading/error/empty states; no invented reviews or names |
| Merch / recruitment / journal | site/SiteExtra.jsx and related site files | xoot/Merch, BecomeXooter, Journal | Match order and fidelity; retain real articles, application route and honest merch availability |
| Referrals / expansion / feedback / CTA | site/SiteFoot.jsx and related site files | xoot/ReferSection, HomeExpansion, FeedbackSection, CtaBand | Compare composition; remove duplicate editorial teasers and wire real operations |
| Footer | site/SiteFoot.jsx | xoot/Footer | Match columns, spacing and wordmark; use working application/legal/support routes |
| Authentication / booking / checkout | app and component references | Auth, app/Book and booking components | Retain real authentication and accepted server-quote contract while matching design |
| Legal / security | Legal and Bug Bounty HTML | pages/legal | Port navigation and reading layout; publish only approved factual commitments |

Paths in the implementation column are under `src/components/` or `src/pages/`.
Verify exact export locations before editing; the original site bundle is also a
reference when a component is defined there rather than in an individual source file.

Required homepage order: Hero → Gift → Care+ → TrustedBy → Coverage → Services →
arrow → Safety → Trust mechanisms → People → arrow → Nearby → How it works → arrow →
Reviews → Merch → Become a Xooter → Journal → Referrals → Home expansion → Feedback →
CTA → Footer. A review section must contain verified reviews or a useful honest empty
state. It must never reproduce example testimonials as real customer evidence.

## Necessary deviations, to verify during implementation

| Reference detail | Production treatment and reason |
|---|---|
| Raw text colours below AA | Use the repository's audited semantic equivalents; retain decorative washes |
| “Usually within a minute”, unverified coverage density | Do not promise timings or available supply without operational evidence |
| Example worker names / verified badges | Use actual approved listings or clearly labelled illustration; no fabricated identity or verification |
| “We'll text before we arrive” | Use an accurate notification description until a verified SMS service supports that promise |
| App Store / Google Play search URLs | Show honest app availability until actual release links exist; search results are not installation links |
| Extra floating Concierge launcher on the homepage | Keep the reference's “Ask Concierge first” entry and open panel; remove the extra closed launcher covering content |
| Paid bounty, insurance and response-time commitments | Keep layout; publish commitments only after owner approval and functioning operations |
| Duplicate compact “Book” and “Book now” actions | Keep one clear booking action when both cannot fit with the menu and wordmark |
| Prototype browser-calculated prices, session and credit | Use real backend contracts and the repository's approved prices and eligibility rules |
| Animated scaling / blurring of text | Preserve motion intent with crisp final text; reduced-motion presentation must remain complete |

Any further departure must be added with a specific reason. A previous document's
blanket ban on restyling does not supersede the founder's approved faithful port.

## Evidence still required

- Compare the rendered implementation with reference at 320, 390, 768, 1024, 1440 and
  1920 CSS pixels, plus landscape, 200% zoom, high-density displays and reduced motion.
- Check typography, spacing, section order, image crop, navigation and key form states.
- Check horizontal overflow and text clipping after fonts load and after motion settles.
- Check final text-container transforms, filters and unnecessary compositing; an image
  crop transform does not justify leaving text scaled.
- Verify original artwork dimensions and responsive image choices; never stretch a
  low-resolution raster to simulate sharpness.
- Exercise actual routes and form outcomes. Record external dependencies separately
  from verified behaviour; a screenshot does not prove backend correctness.

## Navigation and hero evidence — 13 September 2026

- At 1440px the original and implementation have identical heading, paragraph and card
  start rectangles: heading (140, 206.594), paragraph (140, 459.141), card (140, 620.859).
- Restored Newsreader optical sizing, Jakarta glyph features, Caveat wordmark, original
  flowers, tape, arrow, portrait and crop. Final text has no transform or blur.
- All six comparison widths have no document overflow or page exceptions. The reference
  clips its duplicate navigation actions at 320px; the implementation keeps one there.
- Real interaction checks pass for all five supported service/auth handoffs, unavailable
  laundry, menu open/Escape/anchor navigation, landscape 844×390 and 720×500 reflow.
  The latter approximates a 1440px browser at 200% zoom; it does not prove toolbar zoom
  on every browser. A 1440px capture at device pixel ratio 2 is also saved.
- The longest animated phrase fits using actual font size; reduced motion is static.
  Counts/errors are visible. Example worker identity and unverified timings are not used.

Task evidence: `outputs/xoot-visual-20260912/`; reproduce using the source receipt.
This verifies the opening section. Full Phase 1 and production readiness remain unfinished.

## 20 September implementation checkpoint

This is a partial implementation checkpoint, not a production-readiness declaration.
All seven HTML references and all uploaded ZIP contents remain in scope.

- Original Caveat logo now appears in website navigation, footer, authentication and legal layouts.
- Homepage composition now includes the source Gift/Care+ bands, illustrated map, character artwork,
  service/trust/people/how-it-works sections and footer. Authentication and booking presentation,
  the shared legal layout and the security-reporting page have been ported.
- Native Today and Visits screens use actual profile/booking data, the handoff palette and bundled
  font weights. Remaining native screens, native device comparisons and distribution are unfinished.
- Local public-page checks covered home, auth, Care+, legal terms and security at
  320/390/768/1024/1440/1920. No horizontal overflow or page exceptions were observed.
  The real staging directory returned HTTP 200 with zero approved profiles; this renders an honest
  empty state. Booking deep links reached authentication at all six widths.
- Evidence: workspace outputs/xoot-visual-20260920/public-pages-check.json and associated screenshots.
  These checks prove those routes and widths only; they do not prove authenticated journeys,
  every legal document, browser zoom, landscape, native rendering or a pixel comparison of every section.
- Automated suite: 119 files / 1,220 tests passed on 19 September. The subsequent matching privacy
  regression and profile authenticity checks passed separately. Web/native type checks, lint,
  the staging build and the repository security checks also passed during this checkpoint.
- CodeRabbit attempt ended with `Connection failed: WebSocket closed`; there is no completed
  CodeRabbit report for this batch. A completed external review remains outstanding.

### Hosted preview and review follow-up — 20 September 2026

The retry completed against `0fd0324..e4e2385` and raised 11 issues. Eight were accepted:
character index normalization, preserving long board text, the literal renewal-property check,
OTP resend throttling, sticky booking-footer clipping, map-chip hover contrast, removing an inert
native visit-card press target, and using the current time for the native greeting.
The illustration generators include the corresponding fixes so extraction preserves them.

Three suggestions were rejected after checking the source and behavior:

- “Pick a Xooter, or let us” is the supplied heading; its description explains matching.
- A successful empty matching result is authoritative. Falling back to unrelated directory
  profiles would misrepresent availability. Transport/invalid-response failures still use the fallback.
- `hand` belongs to the private `Arm` illustration helper, not the public `XootCharacter` props.

Vercel deployment `dpl_Cy4tQskQnBfUXTGhYJrmGeihcGk5` serves `e4e2385`. The stable branch
preview rendered the original logo and hero, the real empty roster, email-code sign-in and
the password-mode transition. Use the stable branch alias: rotating deployment hostnames
are intentionally outside the staging backend origin allowlist.

The GitHub test job for `e4e2385` failed because Chromium was installed after the unit suite's
browser tests. The follow-up moves installation before the suite. A regression for this order
and four invalid character indices failed before the repair; the repaired focused run passed
54 tests. Web/native type checks and lint passed. Hosted responsive screenshots do not replace
the remaining native device or authenticated journey checks.

Outstanding: the gift recipient/payment flow still uses its older implementation and must preserve
website bundle choices and accepted server amounts. Authenticated account/booking/crew/payment/referral
journeys, native Search/Profile/remaining flows, remaining screen comparisons and production release
requirements are not closed by this checkpoint. Source visuals must remain intact while those real
contracts are completed.

## 21 September implementation checkpoint

- Gift setup uses the original Gift.jsx card dimensions, seven tints, service grid, bundle grid,
  personalisation fields and review layout. The website's four-visit selection survives navigation
  and sign-in; direct app entry keeps the source's 1/3/6/12 grid. A current server quote is required
  to save, changes need explicit reacceptance, and retries preserve the same request identity.
- The new request contract creates gift/payment/operations records atomically and blocks gift
  checkout until fulfilment exists. It is tested locally, **not deployed**. Types include the expected
  migration contract and must be regenerated after staging delivery. This is not a completed gift
  purchase/delivery/redemption feature.
- Native Search and notifications use real account/booking/notification data. Profile, Rewards,
  XootCred and profile editors use the handoff's controls and actual records. The four-tab capsule
  and separate Book button follow Frame.jsx. Profile editing waits for the loaded record and keeps
  unsaved typing across refreshes. Shared reward arithmetic has one source and a checked native copy.
- Native device-rendered comparisons are still outstanding. The earlier automatic approval review
  rejected starting the Expo preview, including localhost, with `blocked by policy`. No device was
  available in the earlier device inventory. This has not been replaced by a claim based on type checks.
- Local public-page checks for the gift chooser and offline page pass all six required widths.
  The refreshed 1440px homepage retains the original logo, portrait, type and opening composition.
  Screenshots and results: workspace `outputs/xoot-visual-20260921/`.
- Scoped gift and native profile reviews passed after fixes. Gift checks include 22 quote/input cases,
  five isolated UI journeys and executable PostgreSQL validation of atomicity, retries, accepted amounts
  and denied client writes. PostgreSQL concurrency/full migration-chain and live role checks remain open.

### Remaining app source coverage

Every row stays in scope on website and native wherever the handoff exposes that experience.
“Partial” never means accepted as the finished deliverable.

| App handoff source | Web / native mapping and current limit |
|---|---|
| Frame.jsx | Web AppShell logo and native capsule navigation ported; complete shell/overlay comparisons pending |
| Today.jsx | Native home uses actual account and visit data; web authenticated home still needs source comparison |
| Search.jsx | Native Search ported; remaining search/Concierge response and web screen comparisons pending |
| Visits.jsx | Native visit list ported; web list, filtering, empty states and full journeys need comparison |
| Profile.jsx | Native You, name/phone/address and XootCred ported; source child pages and web Profile remain partial |
| Rewards.jsx | Real balances shown; approved server streak/tier/unlock behavior and full visual treatment remain incomplete |
| Booking.jsx / site/SiteBooking.jsx | Website modal and app/native five-step input/review flows ported; server quotes use approved shared-job pricing. Atomic creation, crew lifecycle, live signed-in proof and native device comparison remain unfinished. |
| Tracking.jsx | Existing booking detail routes require full source port and live crew/arrival/completion proof |
| Xooter.jsx | Real roster exists; source Xooter detail, selection and availability behavior remain partial |
| Gift.jsx | Web chooser/personalisation/reviewed request implemented locally; native gift, paid delivery/redemption/history unfinished |
| CarePlus.jsx | Web source presentation partial; native screen, membership checkout and complete benefits journey unfinished |
| Onboarding.jsx | Web auth presentation partial; full native sign-in/onboarding source port and real recovery/device checks unfinished |
| Overlays.jsx | Source dialogs, sheets, toasts, confirmations and recovery states need a complete cross-screen comparison |
| XooterOnboarding.jsx | Existing application/verification routes require source port and actual operator journey checks |
| XooterDashboard.jsx | Existing worker screens require source port, real jobs/earnings/payout states and native coverage |
| XooterJob.jsx | Assignment/acceptance/tracking/crew replacement/completion and source UI remain incomplete |
| ns.js, data.js, app-bundle.jsx | Reference composition and data shapes only; prototype accounts, prices, timers and payment success must never become production data |

The public site, foundation/component library, legal/security pages and responsive handoff remain
subject to the full acceptance matrix above, not just the latest screenshots. The production plan's
crews, referrals, payments, operational gates, GitHub release assets and mobile distribution remain open.

## 26 September verification checkpoint

- Gift request implementation is committed at `303bf9b`, following its scoped review.
- Corrected aggregate: **125 files / 1,274 tests passed**. Chromium regression tests now run
  after build-heavy unit tests. The initial grouping accidentally inherited broad include
  patterns; collection now proves 124 unit files plus one browser file, with no dropped tests.
- The actual staging artifact rendered its homepage and password/OTP sign-in controls.
  Artifact/secret scans and repository security guards passed. The configuration-error stderr
  in unit logs is expected from tests that deliberately reject invalid build environments.
- React Router 7.18.4 and DOMPurify 3.4.15 remove the website's reported dependency advisories;
  the full website audit is zero. Mobile remains on Expo 56 and React Native 0.85, with three
  moderate advisories in the query-string/decode-uri-component chain. That gate stays open.
- Latest dependency/config change passed scoped spec and code-quality review. These checks
  do not close the remaining design, booking, crew, gift fulfilment or native-device gates.
- Hosted `438ace3` is verified and open in the app. Home/sign-in smoke and gift/offline checks
  passed at all six widths. [Hosted screenshots and evidence](../release/evidence/2026-09-26/README.md)
  identify the deployment, CI runs and source download. Draft PR 46 stays unmerged.

## 28 September booking input and quote checkpoint

- The website uses the handoff's separate `SiteBooking.jsx` modal over the homepage: numbered
  steps, seven original service tiles, property/size cards, date strip, crew selection and review.
  Its empty initial service selection and large pill action were corrected against the rendered
  reference. The app/native screens follow `app/Booking.jsx`, preserving their distinct layout.
- The native Book placeholder is replaced with service/place/time/crew/review inputs, original
  vector service artwork, fonts and wordmark. No native rendered comparison is claimed.
- Both clients request server quotes and real public roster data. ZD-038 gives the handoff's
  R393 crew base plus separate fees. Property corrections show the suitable service and total
  for explicit acceptance. Changing input or account discards previous acceptance.
- Shared duration calculation prevents starts ending after 17:00, including extras and crews.
  Changing crew after choosing a time returns the website to valid time selection when necessary.
  Legacy private-address query fields are consumed once and removed with history replacement.
- CodeRabbit's native account-switch and resolved-service crew-cap findings were fixed. Its
  explicit `Date.now()` suggestion was declined because that helper already uses the same default.
  Scoped independent quote and client spec/quality reviews passed after scheduling/privacy fixes.
- Local verification: 130 test files / 1,329 tests; native booking helpers 7; both typechecks and
  lints; staging build; rendered home/sign-in artifact check; artifact/security and lockfile guards
  pass. One complete two-pass UI regression uses a 15-second budget after its five-second limit
  expired under the normal parallel suite. Browser deadlines and assertions remain unchanged.
- The current built website was exercised at 320/390/768/1024/1440/1920 and 844x390 landscape,
  including 390px at double density. All five booking steps were checked for overflow, loaded
  display font, unchanged panel transform, keyboard containment and Escape dismissal.

This is input/review progress, not paid booking completion. Atomic single-job creation, complete
crew lifecycle/access/earnings, payment and referral fulfilment, signed-in staging journeys and
remaining source screens stay unfinished. Supabase migrations and production were not changed.
Native visual verification remains unfinished: automatic approval review rejected Expo startup,
including localhost-only startup, with “blocked by policy” and no further reason.

## 30 September Visits source port

The signed-in website Visits list now uses the original `app/Visits.jsx` composition and
`ds-bundle.js` primitives: pill tabs, grouped task rows, circular service artwork, past-visit
cards, honey rating stars, helper avatars and the message/rebook row. Real names/statuses wrap
instead of clipping. Only actual customer reviews, assigned profiles and confirmed owner
payments are displayed. `service_type` supplies the actual service; `bookings.price` is never
presented as the charged amount. “You paid” is historical gross payment, not net of refunds.

Fourteen focused component tests pass, covering writer-shaped records, pagination/errors,
account changes, payment validation and keyboard tabs; web typecheck and scoped lint pass.
Independent spec and quality review passed after both service/amount binding findings were fixed.
Browser captures of the actual component pass at 320, 390, 768, 1024, 1440 and 1920 pixels,
with no overflow, page errors, heading transform or filter. The reference and implementation
were compared at 390 pixels. [Visual evidence](../release/evidence/2026-09-30/visits/README.md)
uses isolated synthetic account records, not a live authenticated customer session.

This closes the bounded list port only. Source app navigation/Today, visit detail and ratings,
same-helper rebooking, crews and native Visits remain separate unfinished work.

## 1 October customer Home and navigation checkpoint

Frame/Today now uses the supplied floating four-tab capsule and Book action, original
36px weekday heading, Sunday-first calendar, first/returning booking cards, pastel widgets,
section pills and real visit rows. Owner-bound reads paginate and hide former-account or
partial failed data. SAST dates, actual service types/status and verified credit cents replace
prototype values. Unsupported unconditional gifts, helper identity and streaks are not fabricated.
Legacy booking URLs still enter /app/book; weekly selection prepopulates the existing flow.

Review found and verified three repairs: secondary pages retain Home navigation, historical
calendar days cannot create a silently different date, and search's second result/Concierge
action work with native keyboard activation. Seven viewport checks, source primitive comparisons,
28 focused component checks and independent review passed. See the explicitly isolated
[Home evidence](../release/evidence/2026-09-30/today/README.md).

Commit `5f1b150` also passes GitHub Tests `36788417052` and Web build `36788416997`. The configured
stable preview passes actual home/sign-in browser smoke and has fresh 1440/390 captures in
[hosted evidence](../release/evidence/2026-10-01/README.md). One-off Vercel origins correctly
fail the backend allowlist; no origin was added. DOMPurify 3.4.16 resolves the new website audit
finding in both lockfiles. Production schema and external Claude scan remain separate failed gates.

The You/account/home editing source port follows below. Full Profile/Notifications destinations,
verified benefit/task-progress semantics, same-helper and crew fulfilment, paid/referral
journeys and native visual/device/store delivery remain unfinished. No production promotion.

## 1 October You and account editing

The signed-in website now uses the original Profile composition, identity/member card,
Care+ and gift treatments, places, preference rows and grouped menus. Account and place
editors retain source inputs, the quiet 44px Back control and single bottom Save action.
The exact source layout review corrected an added Cancel row and white Back circle;
cancellation remains available through Back. Save text has no persistent transform.

Ordinary edits use owner-filtered reads/writes, returned-row confirmation, bounded inputs,
duplicate-submit protection and late-account guards. Real balances retain cents; failed
reads stay unavailable. The default-place flag is read-only pending an atomic server
operation. Unsupported provider/preferences remain visible with precise availability
states and are not counted as finished functionality.

Sixty focused checks, web typecheck and scoped lint pass. Final visual corrections passed
13 covering component tests, independent scoped review and the seven-size browser rerun.
CodeRabbit completed its 15-file review; its one nullable-name suggestion was declined
against the NOT NULL database column and generated type. [Screenshots and evidence](../release/evidence/2026-10-01/profile/README.md)
distinguish actual components with synthetic test adapters from live authenticated proof.
The [complete app screen inventory](app-handoff-coverage.md) identifies every remaining
source area across the website and native app.

## 2 October Notifications feed

The signed-in website now ports the original Search.jsx NotificationsFeed: source cards,
icon wells, typography, spacing, Back/Home connection and read/unread treatment. Real
owner-filtered queries replace prototype records; total unread accounting is independent
of the visible page. Confirmed updates, keyset pagination, retry and empty states retain
account-transition guards. Full timestamps supplement compact actual relative times.

Review corrected an inaccessible unread count and removed an independent legacy native
push listener. The source unread dot is decorative; its link has a real exact-count
accessible description. The optional Capacitor alert entry is honestly unavailable while
Expo/provider/token lifecycle work remains open. Ordinary auth/app deep links are preserved.

The fix passed 77 focused checks and independent spec/quality re-review. Final browser QA
passed seven sizes without overflow, runtime errors or persistent heading transform/filter.
[Reference and actual-component captures](../release/evidence/2026-10-02/notifications/README.md)
use isolated synthetic records, not live authenticated customers. Realtime publication,
notification/token privilege hardening, full native parity and actual delivery remain.

## 14 October 2026 — gift arithmetic and universal weekly default

Founder override: one calendar year is approximately **52 weeks**, so twelve weekly cleans represent about twelve weeks, not a year. The source `app/Gift.jsx` and previous web implementation had incorrect annual/half-year labels; the public GiftBand and signed-in GiftClean text are being updated without inventing purchasable 52-visit fulfilment. One-weekly preselection applies to regular, Airbnb, express, office and moving services on both website and native booking flows; one-off/fortnightly remain valid explicit choices. Web/mobile source paths and regression cases are on `feature/weekly-default-gift-design-20261014` for separate review and deployment. These fixes do **not** certify completion of the app/native handoff, payments, visual screens or real recurring scheduling.

## 15 October 2026 — Expo source composition slice

Added native Gift a Clean `/gifts` with original `app/Gift.jsx` card-first three-step composition, responsive colour selector, editable notes and reviewed server quote (no unverified payment/delivery), plus the `app/CarePlus.jsx`-inspired membership hero/benefits and cancellation step with real plan/member status. Both routes are linked under native You. UI fidelity is based on source tokens, shape and interaction; **no real iOS/Android screenshot comparison or authenticated device journey has been completed**. Those acceptance gates remain open. Backend checkout and transaction lifecycle are unchanged.

## 15 October 2026 — native visit detail composition

The mobile Visits cards link to a new original-source-inspired visit detail: status hero, service/date/address, assigned Xooter, current journey and support/rebook actions. All values come from the owner-bound native booking provider, with no simulated ETA, GPS, checklist, receipt or completion timeline. Comparison against live iOS/Android captures remains **unverified**; payment settlement, signed-in test accounts and backend live tracking depend on their separate release gates.

## 15 October 2026 — Xooter native jobs and earnings

Source `app/Xooter.jsx` income-first hero, job categories and earnings rows have been implemented using native handoff type, space and palette tokens and live owner-filtered data; no sample payout sums, fabricated jobs or sensitive addresses have been ported. This remains a **code handoff**, not a live mobile pixel-parity acceptance. Device screenshots, financial receipts, job action paths and secure access grants are still gated.

## 15 October 2026 — Xooter native job-detail and earnings fidelity

The Xooter source prioritises compact, factual schedule and earnings over decorative customer-home cards. The worker's native detail view now follows that hierarchy with a real schedule/status card, owner-only identity recheck, and explicit locked address/pay/task states. Earnings records now paginate with worker ID and stable created-at/UUID keyset, exact-cent sums and clear *partial vs fully loaded* language rather than a fictional settled-payout number. This is source-driven interaction/composition work, **not** physical Android/iOS screenshot parity or authenticated live-device acceptance. Production provider payout, location and contractor-response dependencies remain gated.

## 16 October 2026 — native Xooter ledger integrity correction

The release already contains approved Jobs, Earnings, job-detail, training and verification compositions. A production-schema correction distinguishes non-booking ledger entries (nullable booking ID) without disguising them as completed cleaning jobs or changing the visual hierarchy. Strict worker job response validation remains fail-closed. Physical device parity and signed-in staging validation remain outstanding.
