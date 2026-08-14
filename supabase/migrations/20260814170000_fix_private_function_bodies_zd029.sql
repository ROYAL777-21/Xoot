-- ZD-029, seventh surface: the two `private` functions, one of which is failing every minute.
--
-- `20260813220000` fixed the eight `public` functions ZD-029 left pointing at renamed objects.
-- **It never looked in the `private` schema.** Two more are broken there, and one of them is on a
-- cron schedule, so it has been failing silently once a minute ever since the rename.
--
-- ── Measured on production, not inferred ────────────────────────────────────────
--   cron.job_run_details, jobid 1 ("zoot-sensitive-access-ready", every minute):
--     last success  2026-08-13 09:35:00
--     first failure 2026-08-13 09:36:00     <- the minute ZD-029 was applied
--     1,975 consecutive failures, still failing at 18:30Z on 2026-08-14
--
--     ERROR: relation "public.zooters" does not exist
--     CONTEXT: PL/pgSQL function private.enqueue_sensitive_access_notifications() line 1
--
--   Staging is the same: 1,977 failures, last at 18:32Z.
--
-- A function body is stored as text. `alter table … rename` rewrote dependent views and policies
-- and did not touch it — the same mechanism, for the third time in this rename.
--
-- ── What is actually broken ─────────────────────────────────────────────────────
-- `enqueue_sensitive_access_notifications` is the job that tells a Xooter, 45 minutes before a
-- booking, that gate codes and entry instructions are now available. It marks the booking, writes
-- the notification, and queues the push. **None of that has happened since 2026-08-13.**
--
-- Together with the read path — `sensitive-access-read` passed `p_actor_id` to a function declaring
-- `p_xooter_id`, so it answered 500 to every request, and `can_access_sensitive_data`'s body also
-- named `zooter_id` — the sensitive-access feature was dead end to end: never announced, and
-- unreadable if you found it anyway.
--
-- ⚠️ **Blast radius today is zero, and saying so is part of reporting it honestly.** Production has
-- **0 bookings, 0 xooters and 0 `sensitive_access_available` notifications ever sent**, so the `due`
-- CTE selects nothing and no person has missed anything. This is a feature that is dead on arrival
-- rather than an incident with victims. It becomes real with the first booking.
--
-- ── Cross-role ─────────────────────────────────────────────────────────────────
-- `supabase/migrations/**` is Release's path, and `can_create_masked_call` gates voice, also
-- Release's. Written here because ZD-029 is mine and this is its seventh casualty. Flagged in the
-- worklog. **Not applied to either project** — needs a `db-push`.

-- ─────────────────────────────────────────────────────────────────────────────────
-- 1. The one that is failing every minute.
-- ─────────────────────────────────────────────────────────────────────────────────
--
-- Rebuilt from the live definition (`pg_get_functiondef`), not from the migration that created it,
-- so nothing that has changed since is silently reverted. Only the renamed identifiers and two
-- user-visible strings differ; every predicate, status value and lock clause is byte-identical.
--
-- The two string fixes are real defects, not tidying:
--   * the notification link was `/zooter/jobs`. The app serves `/xooter/jobs` (`src/App.tsx:206`),
--     so the deep link in the one notification that matters led nowhere.
--   * the body said "in the Zoot app", which is the name of a company that no longer exists.
create or replace function private.enqueue_sensitive_access_notifications()
returns integer
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_count integer;
begin
  with due as (
    select b.id booking_id, x.user_id xooter_user_id
    from public.bookings b
    join public.xooters x on x.id = b.xooter_id
    where x.user_id is not null
      and b.scheduled_at - interval '45 minutes' <= now()
      and b.sensitive_access_available_notified_at is null
      and b.sensitive_data_revoked_at is null
      and b.cancelled_at is null
      and b.status::text in (
        'assigned', 'contractor_accepted', 'en_route', 'in_progress', 'replacement_offered', 'reassigned'
      )
    for update of b skip locked
  ),
  marked as (
    update public.bookings b
       set sensitive_access_available_notified_at = now()
      from due d
     where b.id = d.booking_id
    returning b.id, d.xooter_user_id
  ),
  notification_rows as (
    insert into public.notifications (user_id, kind, title, body, link)
    select m.xooter_user_id,
           'sensitive_access_available',
           'Sensitive access is available',
           'Secure access information for this booking is now available in the Xoot app. Viewing is logged and access closes automatically.',
           '/xooter/jobs'
      from marked m
    returning 1
  ),
  outbox_rows as (
    insert into public.integration_outbox (
      source_table, source_id, event_type, channel, owner, stack_tool, payload, status, approval_required
    )
    select 'bookings',
           m.id,
           'sensitive_access_available',
           'expo_push',
           'platform',
           'supabase_edge',
           jsonb_build_object(
             'booking_id', m.id,
             'user_id', m.xooter_user_id,
             'route', '/xooter/jobs',
             'notification_kind', 'sensitive_access_available'
           ),
           'queued',
           false
      from marked m
    returning 1
  )
  select count(*)::integer into v_count from marked;

  return v_count;
end;
$function$;

-- ─────────────────────────────────────────────────────────────────────────────────
-- 2. The one that is not firing yet, and would fail the moment voice is switched on.
-- ─────────────────────────────────────────────────────────────────────────────────
--
-- `private.can_create_masked_call` is reached through a `public` wrapper from `create-masked-call`
-- and `ops-workflow`. It has not failed in the logs because `twilio.masked_voice` is false, so
-- nothing calls it. It would have broken on the first masked call after voice was enabled — which
-- is the worst possible time to discover it.
--
-- ⚠️ **The reason strings are deliberately unchanged, including `booking_has_no_assigned_zooter`.**
-- They are a return value, not an internal name: `twilio-phase9-readiness.test.ts` pins two of its
-- siblings (`not_booking_participant`, `masked_voice_requires_accepted_active_booking`) against the
-- migration text, which is how this repo treats them — as contract. Renaming a contract string
-- while fixing an outage mixes two changes with different risks. Nothing in `src/`, `mobile/src/`
-- or `supabase/functions/` matches on it today, so renaming it later is cheap; doing it here is
-- not free. Left as a follow-up rather than smuggled in.
create or replace function private.can_create_masked_call(p_booking_id uuid, p_actor_id uuid)
returns table(allowed boolean, reason text, participant_role text, eligible_until timestamp with time zone)
language plpgsql
stable security definer
set search_path to ''
as $function$
declare
  v_booking record;
  v_actor_role text := 'none';
  v_window_start timestamptz;
  v_window_end timestamptz;
begin
  if p_booking_id is null or p_actor_id is null then
    return query select false, 'booking_and_actor_required', 'none', null::timestamptz;
    return;
  end if;

  select
    b.id,
    b.user_id,
    b.xooter_id,
    b.status::text as status,
    b.scheduled_at,
    b.duration_hours,
    b.cancelled_at,
    b.completed_at,
    b.job_completed_at,
    x.user_id as xooter_user_id
  into v_booking
  from public.bookings b
  left join public.xooters x
    on x.id = b.xooter_id
  where b.id = p_booking_id;

  if not found then
    return query select false, 'booking_not_found', 'none', null::timestamptz;
    return;
  end if;

  if v_booking.user_id = p_actor_id then
    v_actor_role := 'client';
  elsif v_booking.xooter_user_id = p_actor_id then
    v_actor_role := 'contractor';
  else
    return query select false, 'not_booking_participant', 'none', null::timestamptz;
    return;
  end if;

  if v_booking.xooter_id is null or v_booking.xooter_user_id is null then
    return query select false, 'booking_has_no_assigned_zooter', v_actor_role, null::timestamptz;
    return;
  end if;

  if v_booking.scheduled_at is null then
    return query select false, 'booking_has_no_schedule', v_actor_role, null::timestamptz;
    return;
  end if;

  v_window_start := v_booking.scheduled_at - interval '45 minutes';
  v_window_end := coalesce(
    v_booking.completed_at,
    v_booking.job_completed_at,
    v_booking.scheduled_at + (coalesce(v_booking.duration_hours, 0) * interval '1 hour')
  ) + interval '30 minutes';

  if v_booking.cancelled_at is not null
    or v_booking.status in ('cancelled', 'completed', 'rated')
  then
    return query select false, 'terminal_booking_state', v_actor_role, v_window_end;
    return;
  end if;

  if v_booking.status not in ('contractor_accepted', 'en_route', 'enroute', 'in_progress') then
    return query select false, 'masked_voice_requires_accepted_active_booking', v_actor_role, v_window_end;
    return;
  end if;

  if now() < v_window_start then
    return query select false, 'masked_voice_window_not_open', v_actor_role, v_window_end;
    return;
  end if;

  if now() > v_window_end then
    return query select false, 'masked_voice_window_closed', v_actor_role, v_window_end;
    return;
  end if;

  return query select true, 'eligible', v_actor_role, v_window_end;
end;
$function$;

-- The cron job is still named `zoot-sensitive-access-ready`. Left alone deliberately: a job name is
-- cosmetic, nothing looks it up, and renaming means unschedule + reschedule — trading a real
-- schedule for a cosmetic string. Rename it when something else needs to touch that job.
