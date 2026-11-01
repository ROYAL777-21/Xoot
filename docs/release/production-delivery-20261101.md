# Production delivery and remaining work — 1 November 2026

The reviewed website/application source is `db0c5cc9`, merged through PR101 into the approved
production branch. The live website and the eight selected customer review cards are published.
The [main checklist](production-checklist.md) is the current release authority; older dated
worklogs and external handoffs describe their own earlier states.

| Request | Current evidence and remaining boundary |
| --- | --- |
| Handoff website/account/Xooter design, branding, Safety nav, profile/rewards/Manage more | Reviewed release is live. Phone and desktop design/startup checks pass. Personalized home-first onboarding remains planning-only, as requested. |
| Genuine reviews | Eight exact approved quotes/names/individual five-star cards are live. Quotes about disabled features remain excluded. No fabricated Xooter quotes, booking badge or aggregate. |
| Account creation, email code, Google sign-in/out | Frontend corrections are live; genuine prior founder sign-in and new staging signup/confirmation evidence retained. No passwords/codes read. Fresh ordinary production account acceptance remains distinct from build proof. |
| Address suggestions/selection | Production backend and visible UI work with a real Mapbox public-address result and successful confirmation. Misses remain, including the prior Sunninghill example. Manual entry is not labelled provider-verified. |
| Coverage and matching | Authoritative provincial source remains separate from capacity. No production service zone or active approved Xooter exists. Do not advertise live fulfilment from a map result. |
| Your places | Owner-bound schema and application are deployed. Founder previously confirmed cross-device iPhone persistence on staging. No other customer's place is exposed by unsigned tests. |
| Calendar | Private subscription schema, handlers and opt-in controls are live. Real Google subscription/reschedule proof is staging. Each production user must connect their own private feed; providers determine refresh timing. |
| GPS/road ETA | Reviewed code, private schema, cleanup and JWT function are delivered. Prior four-account real staging privacy/ETA/STOP groups passed. Production UI stays off pending real phone acceptance, consent/cost and verified operational supply. |
| Messages inside Xoot | Reviewed encrypted booking-chat changes and access-rule fix are deployed; earlier real staging bidirectional/outsider-denial proof retained. Ordinary production two-party acceptance still pending. |
| Voice calls | Function source delivered; both voice controls remain off. Real two-party audio/device/cost acceptance and signed native builds remain required. No number, credit or upgrade purchased. |
| Xooter documents | Owner-bound submission and private quarantine protections deployed. Cloudmersive free account/MFA/API operation is unresolved. An unscanned file cannot become clearance; malware cleanliness alone does not prove document authenticity. |
| PayFast methods and commissions | Sandbox signed callback/duplicate protection is proven. Live merchant still pending verification. Live keys, callback/reconciliation smoke and the earnings/dispute/crew settlement integration remain required before live charges. |
| Weekly/instant worker payouts | Intended policy recorded. Beneficiary transfer integration, verified recipient banks, cutoff, approved cash-out fee/reserve and idempotent genuine first transfer remain unfinished. No automatic payout is enabled. |
| Care+ recurring, rewards/referrals, gifts | Existing presentation and reviewed guard layers shipped. Recurring mandates/cycles, full reward/redemption settlement and gift balance/redemption/refund rules still require implementation and acceptance. Annual gifts are not sold as twelve weekly visits. |
| Laundry/ironing | Existing add-ons appear first and affect duration/price. Standalone service remains held until quantity/load/pricing rules are reconciled; no guessed tariffs. |
| Invoices | Production legal identity saved exactly from founder: Xoot Home Service,2026/709372/07. No VAT number invented. A genuinely settled booking/invoice acceptance is still required. |
| SOS, Apple, native stores/widgets | SOS stays gated pending an arranged physical acceptance/ops drill. Apple team enrolment explicitly pending. Web/PWA/widget surfaces are not signed native/store releases. |
| Google account chooser branding/domain | Previous branding/publish/domain work retained. A provider authentication-domain change is not established by this release; do not promise an OAuth journey stays on one hostname. |
| Notifications/email journey | Auth-email setup and application changes retained. Full customer/worker event-by-event delivery, reschedule/cancel/refund/retry acceptance is still unfinished. Zoho mailboxes and Brevo sending are different capabilities. |
| Security and performance | Free substantive gates, actual schema matching and live security headers pass. Leaked-password protection needs SupabasePro; no upgrade made. Measured startup/address tests do not prove zero lag or explain all historic PostgREST warnings. |

## Payment statement correction

A successful PayFast confirmation does not prove that all money has already reached Xoot's bank.
PayFast describes receipts accruing to the merchant account and a separate holding/payout process.
Its immediate-payout feature transfers to the merchant's registered bank; it does not by itself
prove transfer support for every contractor beneficiary. Do not call this implemented escrow,
promise immunity from chargebacks or invent an instant cash-out fee.
[Collection and payout](https://support.payfast.help/portal/en/kb/articles/collection-and-payout-process-20-9-2022),
[immediate payout eligibility](https://support.payfast.help/portal/en/kb/articles/immediate-payouts-28-10-2024).

## Current concrete owner dependencies

- PayFast approval is outstanding in the actual signed-in dashboard; the founder already submitted
  documents. Prepare live keys and an explicitly bounded genuine smoke only once eligible.
- Cloudmersive free account access/API configuration is outstanding after the earlier verification
  failures. Do not clear uploads on the strength of a configured variable or mocked response.
- A real verified operational Xooter and agreed service availability are needed for fulfilment.
  Staging founder aliases are not verified production contractors.
- Real phone GPS and two-party call acceptance, admin AAL2 enrolment and the separate SOS drill
  remain. Codes, keys, private calendar links and identity documents stay on their own sites.
- Apple enrolment remains pending by the founder's explicit choice. Do not purchase it or a paid
  Supabase plan automatically. Supabase's breached-password check is
  [Pro and above](https://supabase.com/docs/guides/auth/password-security).

## Retained legacy endpoints

Six historical zoot-spelling routes remain in the hosted inventory although current source uses
xoot spellings. They depend first on absent schema names; independent isolated fixtures found
no present ordinary-user path into current credits, approval or crew/cancellation writes. Their
frozen logic is unsuitable for revived compatibility tables. Retire/tombstone them in a separate
bounded change; do not restore the old schema just to make them respond. No production user's
JWT or data was fabricated during this review.

## Rollback and evidence

Previous approved production deployment `dpl_ASWQX8BSgase9gUDTAZLxiF5GwDn` / `e0c021e9` remains the
website rollback pointer. Keep durable private receipts/quarantine/history and repair schema
forward rather than restoring broad grants. Closing the address UI does not replenish its
non-renewing counters; backend allowances and all paid/provider controls remain separately governed.
See [redacted release evidence](evidence/2026-11-01/production-delivery.json), frozen-source hashes,
real address response counts, failed-recall record and unsigned boundary results in that folder.
