# Zoot Decision Log

Reviewed: 2026-06-24

| ID | Decision | Status | Reason | Consequence |
| --- | --- | --- | --- | --- |
| ZD-001 | Expo is the approved native mobile path. Capacitor references are legacy documentation only. | Approved by founder request | `/mobile` exists and is initialized in EAS. | Do not revive Capacitor. Update company docs during Phase 1. |
| ZD-002 | Phase execution follows the Master Phased Implementation Program in strict order. | Approved by supplied program | Later provider/store work depends on unresolved security and schema governance. | Stop at the founder checkpoint after each phase. |
| ZD-003 | No further production deployment or provider mutation occurs during Phase 0. | Active | The master program explicitly forbids it. | Phase 0 remains inspection and documentation only. |
| ZD-004 | Staging is a separate Supabase project because branching is unavailable on the current plan. | Existing | Separate project already exists and contains the local forward schema. | Maintain isolated credentials and data. |
| ZD-005 | Schema source of truth is unresolved. | Founder decision required | Staging/local and production histories differ materially. | Do not push the local chain blindly to production. |
| ZD-006 | The locked booking state list is authoritative for future work. | Approved by supplied program | Existing production uses legacy enum values. | Phase 1 requires a compatibility and migration plan. |
| ZD-007 | Locked prices are R280/R325/R400, R30 add-ons, R39 one-time fee, R21 optional Booking Cover and R99 Care+ membership. | Approved by supplied program | Current booking backend uses R270/R315/R390. | Do not change silently; create an approved server-pricing migration and release plan. |
| ZD-008 | Public marketing and SEO content remains crawlable. Private data is protected by Auth, RLS, Edge authorization, rate limits and WAF. | Approved security position | A public website cannot be made completely unscrapable without harming legitimate indexing. | Cloudflare controls target abuse, not ordinary public indexing. |
| ZD-009 | Twilio is for Verify, masked voice and tightly limited urgent operational messages. | Approved by supplied program | Current Messaging Service is classified as marketing. | Do not use the existing service for Zoot operational traffic without replacement or reclassification approval. |
| ZD-010 | WhatsApp is not routine chat and is not a marketing channel. | Approved by supplied program | In-app chat is primary. | Only approved urgent templates may be activated in Phase 9. |
| ZD-011 | Brevo is the preferred transactional email provider. | Proposed | The stack already names Brevo; SendGrid remains optional. | Founder must confirm that SendGrid stays disabled. |
| ZD-012 | Mapbox web and native tokens must be separate. | Approved security requirement | URL restrictions are appropriate for web and incompatible with native SDK use. | Create a URL-restricted web token and a separate least-privilege native token. |
| ZD-013 | Siri/App Intents are route launchers only. | Approved by supplied program | Booking/payment actions require authenticated in-app confirmation. | Keep safe parameters only; no booking IDs or private data. |
| ZD-014 | No store record or privacy declaration is submitted without final legal/business answers. | Active | Store declarations are legal representations. | Prepare evidence and drafts, then require founder/legal sign-off. |
| ZD-015 | GitHub CLI may be installed locally, but repository publishing waits for the Phase 0 founder checkpoint. | Active | The working tree includes a large mixed implementation. | Authenticate and publish only after scope approval. |
| ZD-016 | CodeRabbit must use an official supported path. | Active | Native Windows installer is unsupported; official docs require WSL. | Install WSL only with founder approval or use the GitHub app review after a PR exists. |
| ZD-017 | Cloudflare configuration waits until the Zoot domain is added to the connected account. | Active | Connected account currently contains no zones. | Prepare rules now; activate only after DNS/hosting approval. |
| ZD-018 | Care+ activation paths must be consolidated. | Founder/product decision required | Current functions overlap and one expects missing columns. | Phase 1 defines the authority before Phase 3 expansion. |
| ZD-019 | Existing integration outbox is reused for invoices, communications and provider jobs. | Approved architecture direction | Duplicate queues increase replay and audit risk. | Add typed event contracts and idempotency instead of a second queue. |
| ZD-020 | ZD-007 is superseded. Pricing moves from flat per-home-size to per-half-hour ladders per service, defined in `docs/xoot-master-brief.md` §4. Booking Cover moves R21 to R22. | Approved by founder 2026-07-29 | Founder supplied full per-hour ladders for all services and confirmed they supersede the locked commercial facts. | See ZD-020 notes below. Nothing reaches production pricing without founder sign-off on the migration plan. |

## ZD-020 notes — pricing model change

**What is approved.** The pricing *model* changes: price becomes a function of booked hours
per service, on a half-hour ladder, instead of a flat charge per home size. Booking Cover
becomes R22. The ladders live in `docs/xoot-master-brief.md` §4 and that document is the
reference — do not re-key the numbers into a second place.

**What this obsoletes.** `docs/product/locked-commercial-facts.md` pricing table is now
stale and must be reissued against §4. Two implementations are also now non-conforming:

- `supabase/functions/create-booking/index.ts` — R270/R315/R390 plus unapproved service
  multipliers and a high-demand premium.
- `src/lib/pricing.ts` (app-iteration) — bedroom/bathroom/property-type multipliers,
  recurrence discounts and a surge multiplier. Structurally incompatible: it prices by
  property attributes, the new model prices by hours.

**This is not a price cut — corrected 2026-07-29.** An earlier revision of this entry read
the new ladders as a price decrease. That was wrong. The founder clarified that the ZD-007
prices already had one add-on baked in, and the arithmetic confirms it exactly:

| Size | Default hours | ZD-007 locked | New ladder | Difference |
|---|---|---|---|---|
| Small | 4.0h | R280 | R250 | **R30** |
| Medium | 5.5h | R325 | R296 | **R29** |
| Large | 8.0h | R400 | R370 | **R30** |

The gap is one standard R30 add-on at every size — the preselected interior-windows add-on.
So ZD-007 quoted an add-on-inclusive price, and §4 quotes the **base service price before
add-ons**. Headline revenue per booking is unchanged. No margin check is needed on this
basis. Do not "restore" the old numbers on top of the ladder; that would double-charge the
add-on.

**This also closes the single-ladder question.** All three locked sizes land on *one* ladder
at their own default hours once the R30 add-on is removed. Home size therefore sets the
**default hours only** — it does not change the price of an hour. One ladder, three defaults.

Minor: medium is R29 rather than R30. Almost certainly rounding in the original R325, but
worth confirming that R296 is right and not R295.

**Approval is to the model, not yet to every number.** Still open, marked `CONFIRM` in the
master brief, and gating the migration:

1. Moving cleaning — the single shared ladder is a reconstruction from a degraded
   transcript, not a transcription.
2. Airbnb 7.0h — R372 or R388.
3. Laundry/ironing band boundaries, and whether wash and ironing compose into one estimate.
4. Last-minute surcharge — cutoff window, multiplier vs flat, per-service, Care+ exemption.
5. Whether the recurring discounts (1-2 / 3-4 / 5+ days per week) survive the change.
6. Office cleaning add-ons — none by design, or not yet specified.

**Closed:** regular-cleaning ladder is shared across sizes (above). Airbnb linen is **R20**,
not R30 (founder, 2026-07-29).

**Sequencing.** Phase 1 may build UI against §4 because no price is shown until the end of
the booking flow. Server pricing is a separate, founder-signed-off migration. Client and
server must not diverge in production.

## Pending Founder Decisions

1. Canonical Supabase schema source.
2. Care+ placement product ownership and naming.
3. Booking creation authority.
4. Launch payment provider order.
5. Booking Cover preselection approval.
6. Twilio account upgrade/subaccount strategy.
7. Cloudflare and primary production host arrangement.
8. Legal entity and Information Officer details.
9. Native Care+ billing classification.
10. WSL installation for CodeRabbit.
