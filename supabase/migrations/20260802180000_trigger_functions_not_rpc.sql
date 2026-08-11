-- Trigger functions must not be callable over the REST API.
--
-- Found by the Supabase security advisor immediately after the safety migrations landed:
-- `enforce_status_event_actor` and `sync_recording_retention` are SECURITY DEFINER functions
-- living in `public`, and every function in `public` is exposed at `/rest/v1/rpc/<name>`. So
-- both were callable by `anon`.
--
-- Calling them directly would fail — a trigger function dereferences `new` and `old`, which do
-- not exist outside trigger context — but "fails noisily" is not an access control. They run as
-- the definer, and a SECURITY DEFINER function reachable without signing in is exactly the
-- category of mistake that gets found later by someone else.
--
-- Revoking EXECUTE does not affect the triggers. A trigger runs the function as the table
-- owner through the trigger mechanism, which does not consult EXECUTE grants.
--
-- The rule worth generalising: a function that exists to serve a trigger should have its
-- EXECUTE revoked in the same migration that creates it.

begin;

revoke all on function public.enforce_status_event_actor() from public, anon, authenticated;
revoke all on function public.sync_recording_retention() from public, anon, authenticated;

commit;

-- Deliberately left as they are, and not advisor findings to chase:
--
-- `public.set_safety_pin(text)` is callable by `authenticated` on purpose — the account holder
-- setting their own PIN is the entire point, and it refuses to run without a session.
--
-- `public.user_safety_pins` has RLS enabled and no policy, which the advisor reports as INFO.
-- That is the intent: RLS with no policy denies everything, and nobody should read a PIN hash,
-- including its owner.
