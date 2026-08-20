-- Any signed-in user can file an untraceable row into the admin review queue.
--
-- ── The reachable write ─────────────────────────────────────────────────────────
-- Read from production `mvlrkelahhsyjrwgsxaf` on 2026-08-20 by joining
-- `information_schema.role_table_grants` to `pg_policies`:
--
--   grants     authenticated: INSERT, UPDATE, DELETE
--   policies   admin_review_queue_update_admin  UPDATE   private.has_role(uid, 'admin')
--              admin_review_queue_delete_admin  DELETE   private.has_role(uid, 'admin')
--              admin_review_queue_insert_user_or_admin  INSERT  with check (
--                  private.has_role(uid,'admin') or user_id = uid or user_id IS NULL )
--
-- UPDATE and DELETE hold a grant against an admin-only policy, so they are inert — but they are
-- half of a pair, and the day someone adds a permissive policy for an unrelated reason the write
-- is live with no second decision. That is finding #1 of the authz audit, inverted defence in
-- depth.
--
-- INSERT is not inert. `or user_id IS NULL` is satisfied by **any authenticated session**, so any
-- signed-in user can insert unlimited rows that the queue cannot attribute to anybody. Admins read
-- this table; nothing rate-limits it. The `user_id IS NULL` limb exists so service-role callers can
-- file operational rows that belong to no user — and service_role bypasses RLS entirely, so it
-- never needed the limb in the first place.
--
-- ── Nothing legitimate loses a write ────────────────────────────────────────────
-- Every writer of this table is a service-role Edge Function:
--
--   ops-workflow/index.ts            x7 inserts
--   create-booking-request/index.ts  x1
--   care-plus-membership/index.ts    x1
--   admin-resolve-review/index.ts    updates
--
-- `src/pages/admin/Ops.tsx:61` only `.select()`s. And `admin_review_queue` is already the first
-- entry in `scripts/security/assert-no-frontend-admin-queue-writes.mjs`, which fails the build if
-- any client source writes to it. The client grants are vestigial: nothing is allowed to use them,
-- and nothing does.
--
-- ── PER-OPERATION, NEVER `revoke all` ───────────────────────────────────────────
-- Same discipline as `20260820120000`. SELECT stays — `Ops.tsx` reads through it under an
-- admin-only policy, and `revoke all` would take that with it and break the admin console.

revoke insert, update, delete on public.admin_review_queue from authenticated, anon;

-- Recreate the INSERT policy without the limb any session can satisfy. Kept rather than dropped so
-- that if the grant is ever deliberately restored, what comes back is the safe shape.
drop policy if exists "admin_review_queue_insert_user_or_admin" on public.admin_review_queue;

create policy "admin_review_queue_insert_user_or_admin"
  on public.admin_review_queue for insert
  to authenticated
  with check (
    private.has_role((select auth.uid()), 'admin'::public.app_role)
    or user_id = (select auth.uid())
  );

comment on policy "admin_review_queue_insert_user_or_admin" on public.admin_review_queue
  is 'Admins may file review rows; a user may file one about themselves. Rows belonging to no user '
     'are service-role only — service_role bypasses RLS, so `user_id IS NULL` never needed to be '
     'reachable from a client session, and until 2026-08-20 it let any signed-in user insert rows '
     'the queue could not attribute to anyone. The client grants are revoked as well: both halves, '
     'not one.';
