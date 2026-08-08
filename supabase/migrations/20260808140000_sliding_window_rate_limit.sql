-- Rate limiting was a fixed window, which is the worst of both worlds.
--
-- `private.consume_rate_limit` floored `now()` to a bucket boundary:
--
--     v_window_started_at := to_timestamp(
--       floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
--     );
--
-- Every actor therefore shared the same boundaries — :00, :10, :20 for a ten-minute window — and
-- that produces two failures at once.
--
-- **It punishes real users unevenly.** Reach the masked-call limit at 10:00:05 and you are locked
-- out for very nearly ten minutes. Reach it at 10:09:55 and you wait five seconds. Identical
-- behaviour, wildly different consequence, and nothing tells the user which case they are in. The
-- moment that matters most is the worst one: a call that drops twice during an active booking,
-- while someone is standing at the door, is exactly when a ten-minute lockout lands.
--
-- **And it is weak against the abuse it exists to stop.** Three requests at 10:09:59 and three
-- more at 10:00:01 is six in two seconds, entirely within the rules. A fixed window permits a
-- burst of twice the limit across any boundary.
--
-- ── The fix ────────────────────────────────────────────────────────────────────────────────
--
-- A sliding-window counter. The current window's count is added to the previous window's,
-- weighted by how much of the previous window is still inside the trailing period:
--
--     estimate = previous_count * (1 - elapsed_in_current / window_seconds) + current_count
--
-- Immediately after a boundary the previous window counts almost fully, so the burst above is
-- refused. As the current window fills, the previous one fades out, so allowance returns smoothly
-- rather than all at once at a boundary nobody can see. Users get a limit that behaves the same
-- whenever they happen to arrive; abuse gets a limit that cannot be doubled by timing.
--
-- This is the standard approximation rather than an exact rolling log, deliberately: an exact log
-- needs a row per request and a periodic sweep, and the approximation is within a few percent for
-- the traffic shapes this sees while keeping the existing table and its single upsert.
--
-- No Edge Function redeploy is needed. All six callers reach this through the `public` wrapper
-- added in 20260808100000, so the behaviour changes underneath them.
--
-- What is deliberately unchanged: the fail-closed guards. An invalid limit, a window under ten
-- seconds, or an actor hash shorter than 16 characters still returns false rather than allowing
-- the request. A rate limiter that fails open is not a rate limiter, and this one has already
-- spent the project's life not running at all — see 20260808100000.

begin;

create or replace function private.consume_rate_limit(
  p_bucket text,
  p_actor_hash text,
  p_action text,
  p_limit_count integer,
  p_window_seconds integer
) returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_now timestamptz := now();
  v_window_started_at timestamptz;
  v_previous_started_at timestamptz;
  v_elapsed numeric;
  v_previous_count integer;
  v_count integer;
  v_estimate numeric;
begin
  -- Fail closed, exactly as before.
  if p_limit_count < 1 or p_window_seconds < 10 then
    return false;
  end if;

  if p_actor_hash is null or char_length(trim(p_actor_hash)) < 16 then
    return false;
  end if;

  v_window_started_at := to_timestamp(
    floor(extract(epoch from v_now) / p_window_seconds) * p_window_seconds
  );
  v_previous_started_at := v_window_started_at - (p_window_seconds || ' seconds')::interval;
  v_elapsed := extract(epoch from v_now) - extract(epoch from v_window_started_at);

  -- Read before writing: the previous window's count is what makes this slide. A row that has
  -- aged out entirely simply is not found, and the weight below then has nothing to carry.
  select r.count
    into v_previous_count
    from public.rate_limit_events r
   where r.bucket = lower(trim(p_bucket))
     and r.actor_hash = trim(p_actor_hash)
     and r.action = lower(trim(p_action))
     and r.window_started_at = v_previous_started_at;

  insert into public.rate_limit_events (
    bucket,
    actor_hash,
    action,
    window_started_at,
    window_seconds,
    limit_count,
    count,
    expires_at
  )
  values (
    lower(trim(p_bucket)),
    trim(p_actor_hash),
    lower(trim(p_action)),
    v_window_started_at,
    p_window_seconds,
    p_limit_count,
    1,
    -- Kept alive for two windows, not one: the next window has to be able to read this one to
    -- weight it. Expiring at one window would silently turn this back into a fixed window.
    v_window_started_at + ((p_window_seconds * 2) || ' seconds')::interval
  )
  on conflict (bucket, actor_hash, action, window_started_at)
  do update set
    count = public.rate_limit_events.count + 1,
    limit_count = excluded.limit_count,
    window_seconds = excluded.window_seconds,
    expires_at = excluded.expires_at
  returning count into v_count;

  v_estimate := coalesce(v_previous_count, 0)
                  * (1 - (v_elapsed / p_window_seconds))
                + v_count;

  return v_estimate <= p_limit_count;
end;
$function$;

commit;

-- Verified on production before staging, 2026-08-08. Limit 3 over a 60-second window: calls 1-3
-- allowed, 4 and 5 refused. The weighting, at a previous-window count of 3 out of 3:
--
--     1s after the boundary   estimate 3.95   refused   <- the burst the old window permitted
--     halfway through         estimate 2.50   allowed
--     55s in                  estimate 1.25   allowed
--
-- Note the first check of this ran 57.7 seconds into a window and returned *allowed*, which is
-- correct rather than a failure: by then the previous window had decayed to 0.11 of its weight.
-- Worth recording because it looks like a failed test until the elapsed time is printed alongside.
--
-- ── A trap for whoever applies the next one ────────────────────────────────────────────────
--
-- `apply_migration` over the Supabase MCP **assigns its own version from the wall clock and
-- ignores the filename**. This file is `20260808140000`; production first recorded it as
-- `20260808171912` and staging as `20260808172026`. Left alone, `supabase db push` would see the
-- repo version as unapplied on both and run it again — and the two projects would drift from each
-- other as well as from here.
--
-- Both were realigned by hand:
--
--     update supabase_migrations.schema_migrations
--        set version = '<the filename version>'
--      where version = '<the version the tool assigned>';
--
-- The same happened to 20260808100000 and 20260808120000 and was corrected the same way. Whenever
-- a migration is applied through the MCP rather than the CLI, check `list_migrations` afterwards
-- and realign. The CLI does not have this problem: it takes the version from the filename.
