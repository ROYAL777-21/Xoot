-- Close the production Xooter training progress read leak.
--
-- The live SELECT policy previously used USING (true) TO PUBLIC and client
-- roles held excess TRUNCATE/TRIGGER/REFERENCES privileges. RLS does not
-- protect TRUNCATE, so revoking that operation is essential.
--
-- Xoot worker learning progress is personal. The catalogue itself remains
-- readable as before. Authorised admin reads stay possible through the
-- established private.has_role helper. Quiz grading and completion writes
-- use the service_role via the training-module Edge Function and bypass RLS.
--
-- Apply only after production migration-ledger reconciliation and review.
begin;

alter table public.xooter_training_progress enable row level security;

-- Never grant anonymous access or client-wide table operations.
revoke select, insert, update, delete, truncate, trigger, references
  on table public.xooter_training_progress from anon;
revoke insert, update, delete, truncate, trigger, references
  on table public.xooter_training_progress from authenticated;

-- Ensure no insecure policy survives a re-run or a historical alias.
drop policy if exists "training progress visible" on public.xooter_training_progress;
-- Existing staging/full-history schemas may carry these pre-rename policies.
-- They are still TO public even when their predicate is owner-specific.
drop policy if exists "training_progress_public" on public.xooter_training_progress;
drop policy if exists "anyone views progress" on public.xooter_training_progress;
drop policy if exists "training_progress_own" on public.xooter_training_progress;
drop policy if exists "training_progress_insert_own" on public.xooter_training_progress;
drop policy if exists "training_progress_update_own" on public.xooter_training_progress;
drop policy if exists "xooter_training_progress_owner_admin_read" on public.xooter_training_progress;

-- Exact owner via the existing Xooter identity, plus approved admins.
-- A guest never reaches this policy: it is restricted to authenticated.
create policy "xooter_training_progress_owner_admin_read"
  on public.xooter_training_progress
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.xooters x
      where x.id = xooter_training_progress.xooter_id
        and x.user_id = (select auth.uid())
    )
    or (select private.has_role((select auth.uid()), 'admin'::public.app_role))
  );

grant select on table public.xooter_training_progress to authenticated;
commit;
