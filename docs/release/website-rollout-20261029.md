# Website rollout — 29 October 2026

Current release authority is [production-checklist.md](production-checklist.md). The founder
explicitly authorised production delivery again on29 October. This plan does not authorise
provider charges, false worker approvals, synthetic JWT acceptance or SOS activation.

## Exact schema delivery

[The manifest](evidence/2026-10-29/production-schema-manifest.json) identifies25unchanged source
bodies and their executed hashes:23missing production versions plus two forward security
fixes. The original production-only PIN version20261008011821 is restored from its actual
history into source; its ledger row stays intact. Source reference packages and the v4bundle
are not deployment inputs. Unreviewed Care+/earnings/SOS enablement SQL is excluded.

The convergence migration is a single DO statement. Each absent original version is recorded
only after its SQL has executed successfully inside that same transaction. One late failure
rolls back both schema effects and all25history inserts. Existing history is not deleted.
A real PostgreSQL-engine local rehearsal against captured production tables, constraints,
functions and affected policies passes the body chain, late failure, replay and PIN retention.
It is rowless and excludes two native pg_cron blocks; it is not a production clone or JWT test.

Staging has a newer quote definition with a different history path. Do not replay the entire
production chain there, or mark the older CREATE FUNCTION applied merely to get past it.
Apply only the two new ACL/quota fixes on staging and verify actual roles/functions/counters.
The previously deployed contracts have their own dated staging evidence. Retain the gap:
there is no hosted execution of the complete production chain on an identical staging clone.

Before production, recheck the ledger, zero live bookings/jobs, duplicate defaults, installed
pgcrypto/pg_cron and the pre-existing credit trigger. Capture schema-only function/policy and
bucket settings for rollback. After applying the exact reviewed transaction, verify versions,
effective privileges, native cleanup jobs and unchanged closed operational/provider controls.
Generate types from actual production using the pinned CI generator; never copy staging types.

## Application delivery

Pass free Semgrep, real CodeQL with exact reviewed false-positive evidence, unit/SQL/browser
checks, source and artifact scans. Publish the reviewed website from release/xoot-production.
Refresh every changed frozen Edge bundle and every importer of changed shared code, keeping
its real JWT/HMAC authentication. Booking writers follow the matching published pricing rule.
Read actual deployed versions/files and the live website build identity after delivery.

## Rollback and retained evidence

On a failed schema transaction, verify no new original-version records before retrying.
After a committed schema change, retain receipts, private evidence, quarantine, account guards
and cancellation history. Do not drop durable data or restore broad client privileges as a
rollback. Close the affected operational controls first, preserve error/receipt evidence, and
repair forward from the saved definitions. The previous approved Vercel deployment is the
website rollback target; do not force-rewrite the release branch or erase unrelated PRs.

New production geocoding tables start with zero paid allowance. Staging's approved200suggest/
20Permanent cap is not a production budget. Keep the total cap and authenticated reservation;
do not refill counters to make a test pass. Merchant verification submission is not approval.
No live checkout, payout, voice or SOS switch is enabled by the schema delivery.

## Weekly payouts requested

The founder has requested standard weekly Xooter payouts and optional instant cash-outs for a
small additional fee. Record this as the intended policy. The beneficiary transfer provider,
verified bank recipients, eligibility/refund reserve, weekly cutoff, quoted fee, idempotent
transfer ledger and genuine first payout acceptance remain implementation dependencies.
PayFast's immediate merchant payout transfers to the merchant's own registered bank account;
it is not proof of individual worker transfer support. Do not advertise cash-outs as live,
charge a guessed fee, or enable an automatic paid payout schedule while those are unresolved.
