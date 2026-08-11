-- The same unreachable-RPC bug, in a second place the first fix did not reach.
--
-- `20260808100000_public_governance_rpc_wrappers.sql` fixed the three helpers in
-- `_shared/governance-utils.ts`. It did not fix `can_create_masked_call`, because that one is not
-- called through the shared module at all: `ops-workflow/index.ts` and
-- `create-masked-call/index.ts` each carry their own private copy of the same broken helper —
--
--     const privateRpc = (supa, fn, args) => {
--       if (typeof supa.schema === "function") return supa.schema("private").rpc(fn, args);
--       return supa.rpc(fn, args);
--     };
--
-- Identical defect, identical reason it cannot work: the call goes over PostgREST and `private`
-- is deliberately invisible to PostgREST. Both functions therefore threw at the eligibility check
-- and returned 500, and redeploying them with the fixed `governance-utils` would have fixed their
-- rate limiting while leaving masked calls just as dead. Found 2026-08-08 by reading the two
-- functions while deploying them, not by a test — nothing covers this path.
--
-- Verified before writing this: `can_create_masked_call` existed only in `private`, with no
-- `public` counterpart, so there was no reachable path to it from any Edge Function.
--
-- Same shape as the earlier wrappers, for the same reasons: SECURITY INVOKER rather than DEFINER,
-- because `private.can_create_masked_call` is already SECURITY DEFINER with `search_path = ''`
-- and `service_role` already holds EXECUTE on it. A caller needs EXECUTE on both the wrapper and
-- the function underneath, so this adds a reachable path without widening what anyone can reach.
--
-- The REVOKE is load-bearing, not decoration: Postgres grants EXECUTE to PUBLIC on every newly
-- created function, so without it this would be callable by `anon` the moment it exists. That
-- matters more here than for the other three — this function answers "may this person open a
-- voice channel to the other party on this booking", and it is STABLE, so an unrevoked wrapper
-- would let anyone probe booking participation and scheduling windows by actor id.

begin;

create or replace function public.can_create_masked_call(
  p_booking_id uuid,
  p_actor_id uuid
) returns table(allowed boolean, reason text, participant_role text, eligible_until timestamptz)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from private.can_create_masked_call(p_booking_id, p_actor_id);
$$;

revoke all on function public.can_create_masked_call(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.can_create_masked_call(uuid, uuid)
  to service_role;

commit;

-- Still required after this migration: `ops-workflow` and `create-masked-call` must drop their
-- local `privateRpc` helpers and call the public wrapper, then both must be redeployed. As with
-- the last one, the migration alone changes nothing — it only makes the reachable path exist.
--
-- And reachability is only the first of five gates on masked calling. Measured 2026-08-08:
-- `twilio.masked_voice` is false and `twilio.operational_messages` is false (the code requires
-- both), no profile carries a phone number, and whether the four Twilio Proxy secrets are set
-- cannot be read back from a session. Fixing this RPC does not switch masked calls on; it stops
-- them failing before Twilio is ever reached.
