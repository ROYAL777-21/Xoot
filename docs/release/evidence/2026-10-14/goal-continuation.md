# Xoot GOAL continuation — 14 October 2026

This record covers actions actually checked during the founder's request to continue the six-gate production goal. It is **not** a declaration of completed paid-marketplace production readiness.

## Verified website/hosting improvements

- Selected public website: Vercel project `xoot`, branch `release/xoot-production`; the original Codex draft PR #46 remains separate.
- The previously supplied `sb_publishable_1DEKWv_…` string was **not listed as an active key** for project `mvlrkelahhsyjrwgsxaf`. Supabase reported one enabled named publishable key, matching `config/public-environments.json`; no secret key was printed or persisted here.
- Vercel had four shared `Production + Preview` settings (`VITE_APP_ENV`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_PUBLISHABLE_KEY`). All four were changed to **Production-only**, set to the active public production configuration, and confirmed with a second read. The separate `codex/xoot-production-20260911` preview variables were preserved.
- A new production build `dpl_37dVcdQ1S4hYcsQBNoN7hJrC82cL` was triggered from approved release commit `4d0e59499d193dc93165badd026cdc89a3476309`. Vercel reported `READY` and assigned `xoot.co.za` and `xoot.vercel.app`. Build logs show `Xoot public environment check passed for production.` This does **not** prove external DNS/browser behaviour.
- Existing Vercel Ignored Build Step prevents routine production rebuilds from unapproved Git branches, but manual promotion can override it. The approved site is still protected with source-level design checks; it must also pass hosted browser smoke in the release CI.

## Read-only backend inventory

- Production: **82** migration history records and **57** Edge Functions.
- Staging: **83** migration history records and **54** Edge Functions.
- Staging-only migration `20260903120000` — `zd035_crew_and_zd036_referrals`.
- Staging-only migration `20261003140000` — `company_wide_defaults_and_xooter_checklists`.
- Production-only migration `20261008011821` — `live_security_advisor_safety_pin_hardening` (externally created and not proven equivalent to local history).
- Production still lacks three functions in source/staging: `public-xooter-directory`, `get-booking-quote`, `xooter-job-checklist`. Do not treat a new timestamp as proof all earlier migrations were delivered.
- Live `public.xooters` contains the column names used by the read-only `public-xooter-directory` projection. The production roster function is missing, though its staging source and two shared dependencies were inspected; `public-directory.ts` matches the release source. Deploy it using the repository's audited Supabase CLI workflow, not by blind migration repair. The other two functions depend on reviewed server quote/checklist/crew contracts and should be delivered in migration-first order.
- Supabase security advisor: *Leaked Password Protection Disabled*. [Fix guidance](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Isolated PR #51: fail-closed verification and deployment provenance

- Branch `goal/live-release-verification-20261014`, target `release/xoot-production`. PR #46 and `main` were not edited.
- The existing `Verify live deploy` workflow no longer permits a green result on missing build stamps or unverified headers. It explicitly requires the approved release branch, checks the exact live build, header policy, redesigned home/typing and rendered sign-in, and now checks public/private Edge endpoints.
- New `scripts/ops/verify-production-edge-contracts.mjs` does **read-only** unauthenticated calls: public directory must return a bounded approved projection, and quote/checklist must reject an unauthenticated caller. Planted negative cases check missing function HTTP 404, leaked private columns and accidental public access. No customer bookings, payments or private records are accessed.
- The `Verify approved Xoot redesign` CI workflow adds full lint and Vitest checks alongside existing typecheck, security scan, artifact build and browser checks. These must actually complete before a green GOAL is claimed.
- Existing `db-push.yml` and `deploy-edge-functions.yml` now refuse **production writes** when the dispatched branch is not `release/xoot-production`. Staging jobs remain available on development refs; dry-run migrations can still run against production with read-only intent.

## Remaining owner/provider dependencies and completion proof

1. **Supabase deployment permissions:** grant the repository's personal access token project/database-management access. Replace `SUPABASE_ACCESS_TOKEN` through GitHub secret settings, keep separate `SUPABASE_DB_PASSWORD_STAGING` / `SUPABASE_DB_PASSWORD_PRODUCTION`, and prove successful CLI link. The 8 October preflight failed before password validation. Do not add secrets to source.
2. **Schema/function rollout:** measure and reconcile the prod-only October PIN hardening change and the two missing staging migration versions against the actual live catalog. Run audited staging dry-run/apply and dependent functions; test authenticated role, money and RLS invariants; then deliver reviewed production migrations *before* functions with rollback readiness and explicit confirmation. Never repair-mark missing migrations without confirming equivalent schema effects.
3. **PayFast:** owner verifies merchant and configures separate sandbox/live server secrets; engineer proves full sandbox signed callback, matching cents/currency, replay/idempotency and reconciliation. Only then enable paid checkout.
4. **Twilio:** owner verifies API/voice/webhook credentials and any account/regulatory requirements; engineer proves two real participants connected to the same Twilio conference, then reviews feature gates.
5. **External security:** replenish the independent Claude audit credit or supply an equivalent successful review; test RLS against actual signed-in customer/Xooter/admin identities and enable the leaked-password defence if available.
6. **Design/full product:** finish all handoff screens and operational flows on the ongoing development branch, with real browser/mobile and authenticated smoke checks. The deployed marketing redesign by itself is not sufficient.

The `LIVE SITE` and `GREEN` GOAL checks remain open until the actual hosted workflow logs and full test results pass. If the production function list remains incomplete, fail visibly rather than bypassing the required directory/quote/checklist contracts.

## Verified follow-up — production directory released and remaining checklist RPC dependency

- PR #51 passed `Verify approved Xoot redesign` and was merged by squash into the approved release branch as `250c21114f2c4974f5fc108364e99da09e7e7d78`. Independent Claude Security Review continued to report failure. Release verification is not a substitute for a completed independent security audit.
- Vercel production deployment `dpl_87WSF9AuX1g4yzZuunHqKerRQRQs` reported `READY` from `release/xoot-production`, with `xoot.co.za` and `xoot.vercel.app` assigned. Live DNS/browser rendering is not established by this API result alone.
- Public read-only Edge Function `public-xooter-directory` was deployed to production using the exact three bundled files from `release/xoot-production`. A second Supabase read confirmed `ACTIVE`, version `1`, `verify_jwt=false` as intended for the public projection; allowed profiles require `active=true`, `background_check_status='approved'` and `reliability_flagged=false`. At deployment time the production table contained **zero** qualifying Xooters. This is deployment evidence only; independently verify its actual HTTP 200/public JSON contract from GitHub Actions.
- Production and staging **both lack** `public.update_active_xooter_checklist(uuid, uuid, text, boolean)` despite staging having the `xooter-job-checklist` Edge Function already deployed. The missing required RPC is defined in `20261007150000_checklist_active_job_mutation.sql`. Applying just the checklist Edge Function would produce a broken endpoint. Deploy staging `20261003140000` checklist schema first, then `20261007150000` RPC; verify service-role-only grant and the 30+ positive/negative SQL contract cases before considering production migration/function promotion.
- Production lacks staging migrations `20260903120000` (crew/referrals) and `20261003140000` (default household/address + checklist). Staging history also lacks the `20261007150000` RPC migration; production additionally carries `20261008011821` safety-PIN hardening not present on staging. Production migrations must be reconciled with this live-only change before any schema write. Never mark history repaired merely to make the CLI green.
- The existing `docs/release/build-loop.md` goal still referred to current `main` for the website release and was corrected to the founder-approved `release/xoot-production` without touching Codex PR #46. The CI source guard remains in place.
- The independent production directory contract workflow uses only the committed public key and an unauthenticated POST. All-functions verification deliberately remains red until `get-booking-quote` and `xooter-job-checklist` are deployed and protected.


## Additional blocker confirmed by live catalogue reads

Production `information_schema.tables` returned **no** `public.referrals` or `public.referral_redemptions` table, whereas both tables exist on staging. This contradicts the source's `20260903120000_zd035_crew_and_zd036_referrals.sql` prerequisite comments (which assumed both tables already existed). The authenticated `get-booking-quote` reads `referrals` and `referral_redemptions` when a referral code is supplied; therefore it must **not** be promoted on the assumption that adding two referral columns will work. Reconcile the full referral base schema and migration ledger, plus any production-only data, before applying ZD035 or deploying the quote endpoint. No tables were created and no user data was read during this check.
