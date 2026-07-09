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
