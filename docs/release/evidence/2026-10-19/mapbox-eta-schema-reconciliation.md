# Xoot Mapbox GPS/ETA — Supabase migration and security inventory (19 October 2026)

**Scope:** read-only verification of existing staging and production; no migration, secret, provider API, customer GPS, feature flag or Edge deploy performed by this inventory. Source work belongs to [PR #71](https://github.com/ROYAL777-21/xoot-your-local-helpers/pull/71). Verified-coverage [PR #81](https://github.com/ROYAL777-21/xoot-your-local-helpers/pull/81) remains separate.

## Project inventory

| Runtime | Supabase ref | GPS table | Atomic publish RPC | Generic server-side rate limit | pg_cron |
| --- | --- | --- | --- | --- | --- |
| Staging | `fxmxyabdjqviqbcxmvlp` | present | present | present | installed |
| Production | `mvlrkelahhsyjrwgsxaf` | **absent** | **absent** | present | installed |

Staging GPS RLS was enabled with **zero** client policies; `anon` and `authenticated` had no direct SELECT grant while `service_role` did. It was absent from Supabase Realtime publication and had exactly one active expiry schedule, with 3,238 successful recorded executions at read time. This is evidence the scheduled SQL executed, **not** a seeded record's physical deletion test or a JWT cross-account end-to-end test.

Staging has deployed `xoot-job-location` Edge v3 with `verify_jwt=true`, but **does not** have the new server ETA code from this PR. Production has no such Edge function. Native/web tracking feature flags must remain OFF.

## Migration history differences from Supabase ledger API

Staging: 87 migrations. Production: 82 migrations. **Six staging-only versions:**

| Version | Migration |
| --- | --- |
| `20260903120000` | `zd035_crew_and_zd036_referrals` |
| `20261003140000` | `company_wide_defaults_and_xooter_checklists` |
| `20261015102137` | `referral_client_grants_least_privilege` |
| `20261015155437` | `checklist_active_job_mutation` |
| `20261016234838` | `xoot_job_live_positions_private` |
| `20261018182829` | `llm_booking_intents` |

**One production-only version:** `20261008011821` — `live_security_advisor_safety_pin_hardening`. Thus production is **not** merely one GPS migration behind. Applying the full staging directory to production, marking versions applied, or dropping the production-only safety patch without verifying DDL would be unsafe.

## Release sequence and acceptance gates

1. Produce a reviewer-approved schema/migration reconciliation plan, including the production-only security patch, dependency ordering, existing function definitions and effects on payments/bookings. Backup and dry-run on disposable or branched database before any production writes.
2. Verify PR #71 exact head: full web/native/source/SQL CI, external security review, correctness peer review, real Vercel preview and no UX regression. Web/native customer ETA now uses server-derived GPS and booking address, not client-supplied coordinates. **Accepted jobs outside service zones must still be routable**, while eligibility for new bookings remains PR #81's responsibility.
3. Configure a dedicated `MAPBOX_DIRECTIONS_TOKEN` in the staging Supabase Edge secret store, with provider v6 temporary geocode + driving-traffic Directions enabled and billing/rate ceilings verified. The value must never appear in Git, this document, browser environment variables or Expo EAS client variables.
4. Deploy the revised Edge handler **to staging first**, with `verify_jwt=true` and exact `_shared` bundles; test two unrelated consenting customer/Xooter pairs, fresh GPS, expired fix, cancellation, STOP during provider call, cross-account forbidden, rate limit, physical cron expiry and out-of-zone route. Verify installed iOS and Android foreground permission/tiles and offline behavior.
5. Obtain founder security/POPIA and provider terms review, then explicitly approve production migration/deployment and feature flag promotion. Verify deployed exact commit and end-user acceptance before describing GPS/ETA as live.

**Release decision:** not approved / no live GPS or ETA production claim.
