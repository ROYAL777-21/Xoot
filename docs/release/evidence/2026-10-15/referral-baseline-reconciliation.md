# 15 October 2026 — referral baseline convergence before ZD035

## Why a predecessor is necessary

The live production project `mvlrkelahhsyjrwgsxaf` contains neither `public.referrals`, `public.referral_redemptions` nor `public.gen_referral_code()`. Staging `fxmxyabdjqviqbcxmvlp` contains all three, and its referral redemptions already carry the `booking_id` / `credit_cents` ZD036 additions.

This difference was established using `pg_class`, `pg_attribute`, `pg_constraint`, `pg_proc`, `pg_policies` and actual privilege checks, not inferred from the migration ledger. Production's old April migration is **recorded** but its referral objects are **absent**. The existing `20260903120000_zd035_crew_and_zd036_referrals.sql` only adds redemption columns and assumes both base tables exist. Applying that file to production as-is would abort. It is preserved unchanged.

## Prepared source

`supabase/migrations/20260903000000_referral_base_prerequisite_convergence.sql` is a new, additive predecessor that orders **before ZD035**. It handles exactly two catalog states: both base tables absent (create the April canonical shape) or both present (check the April columns and primary/unique constraints and preserve them). A single missing base table, wrong key/column type or unexpected RLS policy is a **hard abort**. Staging's operational generator is preserved; a missing generator is created with the reviewed April code. It installs participant/owner RLS and service-owned writes, revokes client `TRUNCATE`, and checks all postconditions transactionally.

The migration never drops a table, edits a historic booking, seeds fabricated referred customers, issues credit, changes booking prices, or enables checkout. Existing production users whose referral codes were never generated need a separate reviewed backfill policy, after the table is present. The signup trigger already conditionally inserts a new user's code when both the table and generator exist.

## Verification procedure and evidence boundaries

New `scripts/ops/test-referral-base-prerequisite.mjs` is collected in `Verify approved Xoot redesign` against a disposable **PostgreSQL 17.6** instance, alongside the previously live-verified referral grant test. It executes the actual predecessor, then unchanged ZD035 SQL, then the grant lockdown SQL, checks valid code generation, owner RLS, idempotent existing-schema behavior, and expected aborts for partial state and planted missing RLS.

**This test is not permission to bulk-push all missed production migrations** and is not a live production schema change. Production's `20261008011821` safety-PIN hardening migration is external to the repo; neither its history nor its objects may be removed to force CLI convergence.

## Required controlled delivery order

1. Restore GitHub `SUPABASE_ACCESS_TOKEN` with working project-management rights, and the environment-scoped `SUPABASE_DB_PASSWORD_STAGING` and `SUPABASE_DB_PASSWORD_PRODUCTION` credentials. Verify with non-mutating CLI link and migration-list reads; never paste credentials into source or an issue.
2. Recheck both Supabase project statuses, migration list, actual table/function/policy constraints and the existing production-only safety-PIN change. Save a backup/rollback plan. Confirm no unaudited schema writers are active.
3. Dry-run and read the **entire** missing migration plan, including the older predecessor (current CLI documents `supabase db push --dry-run --include-all` for out-of-order migrations). `--include-all` includes *all* missing files, not just this predecessor; **do not execute it blindly**. Use the repository's controlled migration procedure to apply the exact reviewed prerequisite first, verify both table shapes, generator and ACL, and only then record the matching `20260903000000` ledger version. Do not mark it as applied before actual catalog proof.
4. Apply / verify `20260903120000` ZD035 crew and redemption additions, then `20261003140000` checklist schema, `20261007150000` service-only active checklist RPC, and `20261015102137` referral grant lockdown in audited order. Earlier September/October migration gaps also need separate classification; do not skip them by version timestamp.
5. Confirm live owner/admin/RLS/crew/quote/checklist SQL contracts and deployed Edge dependency closures. Only after staging parity, reviewed promotion, and paid/voice provider evidence may functionality be enabled.

No production DDL/DML, Edge deployment, charge, webhook, voice call, secret exposure or website promotion was performed during this preparation. The next person should inspect `docs/release/production-checklist.md` and `docs/release/build-loop.md` before acting.
