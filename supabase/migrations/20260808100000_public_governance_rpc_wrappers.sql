-- Governance RPCs were unreachable, so rate limiting never ran.
--
-- `_shared/governance-utils.ts` calls its helpers with `supa.schema("private").rpc(...)`, which
-- goes over PostgREST. Those functions live in `private` precisely so PostgREST cannot see them
-- — `20260621000000_helper_function_hardening.sql` says so in its own words: "privileged table
-- reads live in the unexposed private schema." The call could never succeed.
--
-- Measured rather than argued, 2026-08-08: `public.rate_limit_events` held **0 rows**. Not "few",
-- none. `private.consume_rate_limit` has never once executed, across all six callers
-- (`support-respond`, `create-concierge-handoff`, `create-masked-call`, `ops-workflow`,
-- `report-concierge-answer`, `send-booking-message`). On `support-respond`, which is
-- `verify_jwt: false` and therefore public, the 20-per-5-minutes guest limit has never applied to
-- anyone. The throw was swallowed by a bare `catch` returning a generic 500, which is why the
-- Concierge answered "support response failed" to every real question instead of failing loudly.
--
-- ── Why wrappers, and why SECURITY INVOKER ────────────────────────────────────────────────
--
-- The alternative fix is to expose `private` to PostgREST. That would work and is wrong: it
-- discards the single property the schema exists to provide.
--
-- These wrappers are deliberately **SECURITY INVOKER**, not DEFINER. The `private` functions are
-- already SECURITY DEFINER with `search_path=''`, and `service_role` already holds EXECUTE on
-- them, so a plain invoker wrapper is enough to make the call reachable. That leaves two
-- independent barriers rather than one: a caller must both hold EXECUTE on the public wrapper
-- **and** hold EXECUTE on the private function underneath. Revoking either stops them.
--
-- Adding a new SECURITY DEFINER function in `public` is exactly the mistake
-- `20260802180000_trigger_functions_not_rpc.sql` was written to clean up — every function in
-- `public` is exposed at `/rest/v1/rpc/<name>`, so a definer function there is reachable by
-- whoever holds EXECUTE. Not repeating it.
--
-- The REVOKE is not decoration: Postgres grants EXECUTE to PUBLIC on every newly created
-- function by default, so without it these would be callable by `anon` the moment they exist.

begin;

-- Rate limiting ------------------------------------------------------------------------------

create or replace function public.consume_rate_limit(
  p_bucket text,
  p_actor_hash text,
  p_action text,
  p_limit_count integer,
  p_window_seconds integer
) returns boolean
language sql
security invoker
set search_path = ''
as $$
  select private.consume_rate_limit(p_bucket, p_actor_hash, p_action, p_limit_count, p_window_seconds);
$$;

revoke all on function public.consume_rate_limit(text, text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, text, text, integer, integer)
  to service_role;

-- Provider event idempotency (confirm-payment) -----------------------------------------------

create or replace function public.claim_provider_event(
  p_provider text,
  p_event_id text,
  p_event_type text,
  p_payload_hash text,
  p_subject_table text,
  p_subject_id uuid,
  p_metadata jsonb
) returns table(provider_event_id uuid, already_seen boolean)
language sql
security invoker
set search_path = ''
as $$
  select *
  from private.claim_provider_event(
    p_provider, p_event_id, p_event_type, p_payload_hash, p_subject_table, p_subject_id, p_metadata
  );
$$;

revoke all on function public.claim_provider_event(text, text, text, text, text, uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.claim_provider_event(text, text, text, text, text, uuid, jsonb)
  to service_role;

create or replace function public.mark_provider_event_processed(
  p_provider_event_id uuid,
  p_status text,
  p_error_message text
) returns void
language sql
security invoker
set search_path = ''
as $$
  select private.mark_provider_event_processed(p_provider_event_id, p_status, p_error_message);
$$;

revoke all on function public.mark_provider_event_processed(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.mark_provider_event_processed(uuid, text, text)
  to service_role;

commit;

-- Still required after this migration: `governance-utils.ts` must stop calling
-- `supa.schema("private")` and call the public wrapper instead, and every function bundling that
-- module must be redeployed. The migration alone changes nothing until then — it only makes the
-- reachable path exist.
