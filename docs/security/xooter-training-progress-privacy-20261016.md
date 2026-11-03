# Xooter training progress — public read policy remediation

**Status: migration authored and synthetic tests required. NOT APPLIED TO STAGING OR PRODUCTION.** Do not claim personal training progress is isolated in production until live verification.

## Evidence from production catalogue (16 October 2026)

Project `mvlrkelahhsyjrwgsxaf` has `public.xooter_training_progress` with RLS enabled but a **permissive SELECT policy for `{public}` whose `USING` condition is `true`**. Both `anon` and `authenticated` have table SELECT grants. The same live catalogue reported `TRUNCATE`, `TRIGGER` and `REFERENCES` client grants; RLS does **not** govern `TRUNCATE`. This is a database-level privacy/privilege gap regardless of filters in the native frontend. No training content, user records, document storage locations or tokens were retrieved to establish this finding.

The training catalogue `training_modules` remains available. Grading and completion updates happen through authenticated `training-module` Edge Function calls using a `service_role` client; this remediation does not remove that privileged writer.

## Isolated source remediation

`supabase/migrations/20261016210000_xooter_training_progress_private_read.sql`:

- Removes the historical production `training progress visible` SELECT policy with `USING (true)` and the staging/full-history `training_progress_own`, `training_progress_insert_own` and `training_progress_update_own` policies. The migration handles both environments' differing policy histories.
- Replaces it with a policy limited to `authenticated`, reading only rows belonging to an `xooters` record whose `user_id = auth.uid()`; retains the existing approved administrator role check.
- Revokes anonymous and inherited `PUBLIC` SELECT and unnecessary client INSERT/UPDATE/DELETE/TRUNCATE/TRIGGER/REFERENCES grants while retaining authenticated SELECT for own progress. It does not alter the `training_modules` catalogue or `service_role` privileges.
- Does not expose grading keys or grant self-completion writes.

`scripts/security/sql/training-progress-privacy-fixture.sql` deliberately reproduces the unsafe public policy in PostgreSQL 17. `scripts/security/sql/assert-training-progress-private.sql` must **fail** on the planted vulnerable fixture, then **pass** after the migration for anonymous rights, two different workers, a non-worker, an admin and service role. The workflow `verify-training-progress-privacy.yml` only operates on this isolated CI database.

## Safe promotion requirements

1. Have the reviewed change merged into `release/xoot-production` after green CI and independent review. Do not touch Codex PR #46, the Mapbox/PayFast branches or `main`.
2. Review the actual migration ledger on **both** projects; previously identified production/staging divergence cannot be ignored. Apply staged migrations in validated order using the authorised GitHub Supabase CLI workflow. **Never fake migration history.**
3. On staging, authenticate as two separate Xooters, an unrelated customer and an admin; verify each worker sees only their own `xooter_training_progress`, the unrelated customer sees none, and the admin's legitimate operational view still works. Run a genuine training attempt and check the `training-module` service-role completion persists.
4. With rollback and owner approval, promote to production only after the same review. Query `pg_policies`, `role_table_grants`, and verify the live outcomes; anonymous SELECT and TRUNCATE must be denied.
5. If deployment access or migration reconciliation blocks the rollout, **leave the production gate red and report the still-open privacy risk**, instead of treating this PR or a synthetic test as an applied fix.

No production SQL writes or provider/payment toggles were made in preparing this change.
