# Xooter Jobs — 17 October 2026 security and release verification

## Scope and current release

Work takes place only in PR #77, `fix/xooter-web-job-cards-eligibility-20261017`, targeted at the founder-approved `release/xoot-production`. `main`, Codex PR #46, and notification PR #76 remain untouched. This change has **not** been merged or delivered to public production.

The approved production deployment observed through Vercel remains READY from `release/xoot-production`. Vercel could not build this PR's preview because the project hit its daily build-rate limit. Do not interpret an older READY preview as this PR's verification.

## Verified API defect

The Edge source `get-xooter-job-cards` calls `ok({jobs}, origin)`; `action-utils.ts` serialises this as `{success:true,data:{jobs}}`. The previous Xooter web Jobs screen incorrectly read `data.jobs`, showing an empty list despite a successful, nonempty server response. New `src/lib/xooter-web-job-cards.ts` validates the actual envelope, rejects malformed or cross-worker rows and drops private customer identifiers, access instructions and unrelated financial amounts.

The web Jobs page now remounts on account switches, checks the current worker's `active` and `background_check_status` before fetching offers, and does not present `bookings.price` as a Xooter payout. Both Expo Jobs and native job detail use the existing canonical Xooter Home worker-approval helper. Historical earnings remain visible to their rightful owner separately.

## Server authorisation and deployment

`get-xooter-job-cards` uses a service-role client; therefore client-side verification is insufficient. The updated Edge handler performs an owner-ID-bound read of `xooters`, rejects missing/inactive/unapproved workers with 403, and fails closed on database read errors **before** its service-role `get_xooter_job_cards_for_user` RPC.

- Staging `fxmxyabdjqviqbcxmvlp`: deployed as `get-xooter-job-cards` **ACTIVE v13**, `verify_jwt=true`. Exact new handler and the current shared authentication source were read back and matched to the PR files.
- Production `mvlrkelahhsyjrwgsxaf`: retained the **older ACTIVE v3** function. The new server authorisation check is NOT yet enforced in production. Production has no Xooter rows available for a positive verified-worker test.
- Staging has one active Xooter row with legacy `background_check_status='passed'`. The current Xoot worker-eligibility policy and existing Xooter Home require `approved`. Do **not** relax the production check to accept `passed` as approved. Resolve the smoke-test fixture through the documented authorised staging seeding workflow and test a separately unapproved user.
- A staging deployment first failed because the import map path was not provided. The corrected deployment explicitly supplied `functions/import_map.json` and the module dependencies, succeeded, and was confirmed by readback.

## Checks completed

GitHub `Verify approved Xoot redesign` (web/native/type/lint/build/rendered checks) **SUCCESS**, public-directory live check **SUCCESS**, PostgreSQL role-security check **SUCCESS**, CodeRabbit **SUCCESS**. Independent Claude security review remains **FAILED due to API credit**. Vercel PR preview **FAILED due to build-rate limiting**; neither represents a successful independent review/preview.

## Missing release acceptance and next action

An actual authenticated staging test must demonstrate that an approved active Xooter receives their own job-card projection, while an inactive/unapproved Xooter and a customer get a forbidden or empty outcome and cannot read another worker's data. This test requires approved staging-only test identities; no real worker accounts or production rows should be modified just to manufacture a test pass.

After a signed-in staging role test and completed review, merge the reviewed commit to `release/xoot-production`, redeploy **this exact** function with all matching bundled dependencies, then verify production function version/JWT and live browser behaviour. The old function currently remains active in production. Do not enable payment, calling or payout flags as part of this repair.

## CI role-test outcome on PR #77

The new read-only `Verify staging Xooter job access` check ran on [GitHub Actions run 38985118481](https://github.com/ROYAL777-21/xoot-your-local-helpers/actions/runs/38985118481) and failed **before authentication** (exit code 2), because these exact staging-only GitHub Actions secrets were absent: `XOOT_STAGING_SUPABASE_PUBLISHABLE_KEY`, `XOOT_SMOKE_XOOTER_EMAIL`, `XOOT_SMOKE_XOOTER_PASSWORD`, `XOOT_SMOKE_CLIENT_EMAIL`, `XOOT_SMOKE_CLIENT_PASSWORD`. No Xooter or customer permission assertion ran. This is **not** evidence of a working or broken live authorisation check.

The staging Xooter fixture must additionally have current approved/active verification, not the obsolete `passed` label; do not silently relax production authorisation or upgrade an actual worker based only on a test.

Once the owner configures these staging-only secrets and an authorised approved fixture, the workflow must return success after a real Xooter 200 owner-scope result and a customer denial. Keep PR #77 and its Edge security change unmerged/unpublished until this is proven and the independent security/preview gates are addressed.
