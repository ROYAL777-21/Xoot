# 15 October 2026 — referral client privileges and production prerequisite

This is real project-catalogue evidence, not a synthetic-fixture result or a production deployment claim.

## Scope and before-state

- Staging `fxmxyabdjqviqbcxmvlp` has `public.referrals` and `public.referral_redemptions`, both with RLS.
- Before this pass, PostgreSQL `has_table_privilege` reported `TRUNCATE=true` for BOTH `anon` and `authenticated` on BOTH referral tables. Signed-in roles also held `INSERT/UPDATE/DELETE=true`. RLS is not applied to TRUNCATE. A generated PostgREST interface may not expose TRUNCATE, but a database principal holding the grant can invoke it.
- Referrals use an owner-or-admin authenticated SELECT policy; redemptions have participant-only SELECT. The server uses service-role code for referral redemption. These policies and signup functions were not changed in this slice.
- Production `mvlrkelahhsyjrwgsxaf` has NEITHER referral base table and no `public.gen_referral_code()` function; it has the guarded `public.handle_new_user()` trigger function. Production is missing ZD035/036 and October checklist schema/RPC entries. Its separate `20261008011821` safety-PIN migration must be reconciled before other production migrations.

## Actual staging operation

Applied a single additive, transaction-wrapped DDL migration via the authenticated Supabase connection, named `referral_client_grants_least_privilege`. Its staging migration ledger assigns version `20261015102137`. The identical grant/revoke and error-guard statements are recorded at `supabase/migrations/20261015102137_referral_client_grants_least_privilege.sql`.

The migration fails if either table is missing. It revokes all table grants from `PUBLIC`, `anon` and `authenticated`, re-grants only authenticated SELECT, and checks postconditions inside its transaction. Service-role access is left untouched. No table rows are inserted, updated, deleted or truncated by this migration.

## Actual staged postcondition, re-read

| Role | SELECT | INSERT | UPDATE | DELETE | TRUNCATE |
|---|---|---|---|---|---|
| anon | false | false | false | false | false |
| authenticated | true | false | false | false | false |
| service_role | true | true | true | true | true |

The same result applies independently to **both** referral tables. RLS remains enabled. Review the additive test `scripts/ops/test-referral-client-privileges.mjs` (PostgreSQL 17.6 disposable role fixtures, actual deny operations, synthetic rows, idempotency, missing-table and deliberately broken-REVOKE regressions). Release CI invokes it in `Verify approved Xoot redesign`. A green fixture gate is not equivalent to a production-state check.

## Mandatory production sequence — not executed in this pass

1. Independently inspect the prod-only safety-PIN DDL and catalogue and reconcile migration history. Do not erase the live-only entry.
2. Reconstruct the canonical April referral base tables and `gen_referral_code()` with exact constraints, signup trigger and RLS, without rewriting existing accounts. Compare against staging columns, indexes, policies and role grants. **Do not apply ZD035 before both base tables exist.**
3. Dry-run reviewed crew/referral migration `20260903120000` on staging/production in dependency order, then the checklist `20261003140000` and service-only RPC `20261007150000` on staging with test identities. Confirm live objects and code, not just migration names.
4. After prerequisite effects and ledger order are verified, apply this grant-only migration to production; `anon` and `authenticated` must lack `TRUNCATE/INSERT/UPDATE/DELETE`, and authenticated owner SELECT must still work.
5. Only then deploy dependent booking-quote/checklist Edge Functions as reviewed source, verify signed-in owner and service boundaries, and proceed to the sandbox money gates. Production paid/voice flags remain off.

The work intentionally did **not** touch production schema, production functions, production payment or voice settings, or Codex PR #46 / `main`.
