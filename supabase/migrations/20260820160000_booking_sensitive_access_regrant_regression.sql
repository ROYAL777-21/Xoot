-- Rebuilding a view silently handed back grants three migrations had explicitly revoked.
--
-- ── The regression ──────────────────────────────────────────────────────────────
-- `public.booking_sensitive_access` is a view over gate codes and alarm codes. Three separate
-- migrations took client access away from it, deliberately and repeatedly:
--
--   20260603000000  revoke all ... from anon
--   20260621000000  revoke all ... from public, anon, authenticated
--   20260624114953  revoke all ... from public, anon, authenticated
--
-- `20260813220000_rename_functions_zd029_missed` then had to DROP and recreate the view, because
-- `can_access_sensitive_data(uuid, uuid)` could not be renamed while the view depended on it. That
-- migration carefully preserved `security_invoker = true` and even named it as a property that
-- "has to survive… because a rebuilt view inherits none of them".
--
-- The grants were a fourth such property, and they were not on the list. A new view takes Supabase's
-- default privileges, so `anon` and `authenticated` were handed
-- SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES and TRIGGER on it. Measured on production
-- and staging 2026-08-20; both are affected.
--
-- ── What was and was not established ────────────────────────────────────────────
-- **Not a data leak.** `security_invoker = true` survived, so the view runs with the caller's own
-- privileges and the RLS on its base tables still applies. `bookings`, which the view must join
-- through, has RLS enabled and **no SELECT policy admitting anon**. Writes are impossible by a
-- second, independent route: the view is not auto-updatable (`is_updatable = NO`,
-- `is_insertable_into = NO`) and carries no INSTEAD OF trigger, so Postgres rejects them whatever
-- the grant says.
--
-- ⚠️ **A direct test of this was vacuous and is not the evidence.** Running
-- `set local role anon; select count(*) from public.booking_sensitive_access;` returns 0 — but
-- `bookings` and `household_profiles` are both EMPTY on production, so zero rows is what that query
-- returns for everybody. It could not have failed. The evidence above is structural: RLS enabled,
-- no anon-admitting policy on `bookings`, view not updatable.
--
-- ── Why revoke anyway ───────────────────────────────────────────────────────────
-- Because "inert for two independent reasons" is not the same as "intended", and both reasons are
-- one edit away from not holding: a future rebuild that forgets `security_invoker`, or an INSTEAD OF
-- trigger added for a legitimate reason. Three migrations already decided this view is not client
-- accessible. This restores that decision and nothing more.
--
-- `revoke all` is correct here and is not the trap it was on `profiles`: nothing in `src/`,
-- `mobile/` or `supabase/functions/` reads this view — grep finds references only in migrations —
-- and `20260624114953` used exactly these three statements. Service-role callers are unaffected.

revoke all on public.booking_sensitive_access from public;
revoke all on public.booking_sensitive_access from anon;
revoke all on public.booking_sensitive_access from authenticated;

comment on view public.booking_sensitive_access
  is 'Gate and alarm codes for an in-progress booking. NOT client accessible: revoked from public, '
     'anon and authenticated. security_invoker = true is load-bearing and must survive any rebuild, '
     'and so must these revokes — a recreated view takes Supabase default privileges and silently '
     'regains all of them, which is what happened between 20260813220000 and 20260820160000.';
