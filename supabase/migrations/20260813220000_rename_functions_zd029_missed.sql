-- ZD-029 renamed 18 tables, 25 columns, 2 views and an enum label. It did not rename a single
-- FUNCTION, and it did not fix a single function BODY.
--
-- ── This is not cosmetic. Eight functions are broken on both projects ───────────────────────
-- A function body is stored as text. `alter table … rename` updates dependent views and policies;
-- it does NOT rewrite the bodies of functions that query the renamed object. So every function
-- below still selects from tables and columns that no longer exist.
--
-- Proven on production rather than argued — calling the sensitive-access gate:
--
--     select public.can_access_sensitive_data('…'::uuid, '…'::uuid);
--     ERROR: 42703: column "zooter_id" does not exist
--     HINT:  Perhaps you meant to reference the column "bookings.xooter_id".
--     CONTEXT: PL/pgSQL function public.can_access_sensitive_data(uuid,uuid) line 11
--
-- Postgres names the fix in its own hint. `can_access_sensitive_data` decides whether a Xooter may
-- see a customer's gate code, alarm code and access notes inside the booking window. It has been
-- raising rather than answering since the rename applied.
--
-- ── And the names are wrong, so live Edge Functions call things that do not exist ───────────
--     supabase/functions/get-xooter-job-cards/index.ts:39  ->  get_xooter_job_cards_for_user
--     supabase/functions/respond-xooter-job/index.ts:85    ->  xooter_job_transition_allowed
--
-- Neither exists. Production has the `zooter_`-prefixed originals. **A Xooter cannot list their
-- jobs and cannot accept one** — the entire worker side of the marketplace. `src/integrations/
-- supabase/types.ts` already expects the new names, which is why "Types match the live schema"
-- fails on `main`: the types are right and the database is wrong.
--
-- ── Every replacement below was read from the live schema, not assumed ──────────────────────
--     tables   xooter_jobs, xooters, xooter_payout_accounts, xooter_payout_holds,
--              xootcred_ledger, xoot_black_status_history, xoot_black_area_pilots,
--              xoot_black_equipment_evidence, payout_change_requests
--     columns  every one is `xooter_id`; no `zooter_id` survives anywhere
--     controls 'xoot_black.enabled', 'xoot_black.area_pilot', 'payouts.enabled'
--
-- ── Why DROP + CREATE for seven, and CREATE OR REPLACE + RENAME for one ─────────────────────
-- `create or replace function` cannot rename an input parameter, and `types.ts` expects
-- `p_xooter_id` where the database has `p_zooter_id`. Renaming the parameter therefore requires a
-- drop. Grants do not survive a drop, so each one is re-granted below to exactly the roles it held
-- (`postgres` and `service_role`; PUBLIC was revoked and stays revoked).
--
-- ⚠️ `check_xootcred_balance` is the exception: it is a TRIGGER function, and dropping it would
-- drop the triggers bound to it. It keeps its OID via `create or replace` + `alter … rename`, which
-- leaves both the trigger bindings and its ACL (which does include anon/authenticated) untouched.

-- ── 1. The sensitive-access gate. The one that raises today. ────────────────────────────────
drop function if exists public.can_access_sensitive_data(uuid, uuid);

create function public.can_access_sensitive_data(p_xooter_id uuid, p_booking_id uuid)
returns boolean
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_start timestamptz;
  v_duration_hours numeric;
  v_completed_at timestamptz;
  v_job_completed_at timestamptz;
  v_revoked timestamptz;
  v_status text;
  v_end timestamptz;
begin
  select scheduled_at, duration_hours, completed_at, job_completed_at,
         sensitive_data_revoked_at, status::text
    into v_start, v_duration_hours, v_completed_at, v_job_completed_at, v_revoked, v_status
    from public.bookings
   where id = p_booking_id
     and xooter_id = p_xooter_id;

  if not found or v_start is null or v_revoked is not null then
    return false;
  end if;

  if v_status in ('cancelled', 'rated') then
    return false;
  end if;

  if v_status = 'completed' then
    v_end := coalesce(v_completed_at, v_job_completed_at,
                      v_start + (coalesce(v_duration_hours, 0) * interval '1 hour'));
  else
    if v_status not in ('assigned', 'contractor_accepted', 'en_route', 'in_progress',
                        'replacement_offered', 'reassigned') then
      return false;
    end if;
    v_end := v_start + (coalesce(v_duration_hours, 0) * interval '1 hour');
  end if;

  return now() between (v_start - interval '45 minutes') and (v_end + interval '30 minutes');
end;
$function$;

revoke execute on function public.can_access_sensitive_data(uuid, uuid) from public;
grant execute on function public.can_access_sensitive_data(uuid, uuid) to service_role;

-- ── 2. The job-state rule. Body is pure text logic and was fine; only the name was wrong. ───
drop function if exists public.zooter_job_transition_allowed(text, text);

create function public.xooter_job_transition_allowed(current_state text, next_state text)
returns boolean
language sql
immutable
set search_path to ''
as $function$
  select (current_state, next_state) in (
    ('offered', 'accepted'),
    ('offered', 'declined'),
    ('offered', 'expired'),
    ('accepted', 'cancelled')
  );
$function$;

revoke execute on function public.xooter_job_transition_allowed(text, text) from public;
grant execute on function public.xooter_job_transition_allowed(text, text) to service_role;

-- ── 3. The Xooter's job list, per user. Called by get-xooter-job-cards. ─────────────────────
drop function if exists public.get_zooter_job_cards_for_user(uuid);

create function public.get_xooter_job_cards_for_user(p_user_id uuid)
returns table(job_id uuid, booking_id uuid, xooter_id uuid, state text,
              offered_at timestamptz, responded_at timestamptz, decline_reason text,
              service text, service_type text, scheduled_at timestamptz, price numeric,
              duration_hours numeric, status text, job_completed_at timestamptz,
              completed_at timestamptz, cancelled_at timestamptz,
              sensitive_data_revoked_at timestamptz,
              sensitive_access_available_notified_at timestamptz,
              user_id uuid, destination_address text)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
  select
    xj.id as job_id,
    b.id as booking_id,
    xj.xooter_id,
    xj.state,
    xj.offered_at,
    xj.responded_at,
    xj.decline_reason,
    b.service::text,
    b.service_type::text,
    b.scheduled_at,
    b.price,
    b.duration_hours,
    b.status::text,
    b.job_completed_at,
    b.completed_at,
    b.cancelled_at,
    b.sensitive_data_revoked_at,
    b.sensitive_access_available_notified_at,
    b.user_id,
    case
      when xj.state = 'accepted'
        and coalesce(b.status::text, '') not in ('cancelled', 'completed', 'rated')
        and b.cancelled_at is null
      then nullif(btrim(b.address), '')
      else null
    end as destination_address
  from public.xooter_jobs xj
  join public.xooters x on x.id = xj.xooter_id
  join public.bookings b on b.id = xj.booking_id
  where p_user_id is not null
    and x.user_id = p_user_id
  order by xj.offered_at desc;
$function$;

revoke execute on function public.get_xooter_job_cards_for_user(uuid) from public;
grant execute on function public.get_xooter_job_cards_for_user(uuid) to service_role;

-- ── 4. The same list for the calling user via auth.uid(). ───────────────────────────────────
drop function if exists public.get_zooter_job_cards();

create function public.get_xooter_job_cards()
returns table(job_id uuid, booking_id uuid, xooter_id uuid, state text,
              offered_at timestamptz, responded_at timestamptz, decline_reason text,
              service text, service_type text, scheduled_at timestamptz, price numeric,
              duration_hours numeric, status text, job_completed_at timestamptz,
              completed_at timestamptz, cancelled_at timestamptz,
              sensitive_data_revoked_at timestamptz,
              sensitive_access_available_notified_at timestamptz,
              user_id uuid, destination_address text)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
  select
    xj.id as job_id,
    b.id as booking_id,
    xj.xooter_id,
    xj.state,
    xj.offered_at,
    xj.responded_at,
    xj.decline_reason,
    b.service::text,
    b.service_type::text,
    b.scheduled_at,
    b.price,
    b.duration_hours,
    b.status::text,
    b.job_completed_at,
    b.completed_at,
    b.cancelled_at,
    b.sensitive_data_revoked_at,
    b.sensitive_access_available_notified_at,
    b.user_id,
    case
      when xj.state = 'accepted'
        and coalesce(b.status::text, '') not in ('cancelled', 'completed', 'rated')
        and b.cancelled_at is null
      then nullif(btrim(b.address), '')
      else null
    end as destination_address
  from public.xooter_jobs xj
  join public.xooters x on x.id = xj.xooter_id
  join public.bookings b on b.id = xj.booking_id
  where x.user_id = auth.uid()
  order by xj.offered_at desc;
$function$;

revoke execute on function public.get_xooter_job_cards() from public;
grant execute on function public.get_xooter_job_cards() to service_role;

-- ── 5. Destination addresses for accepted jobs, via auth.uid(). ─────────────────────────────
drop function if exists public.get_accepted_zooter_job_destinations(uuid[]);

create function public.get_accepted_xooter_job_destinations(p_job_ids uuid[])
returns table(job_id uuid, booking_id uuid, address text)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
  select
    xj.id as job_id,
    b.id as booking_id,
    nullif(btrim(b.address), '') as address
  from public.xooter_jobs xj
  join public.xooters x on x.id = xj.xooter_id
  join public.bookings b on b.id = xj.booking_id
  where xj.id = any(coalesce(p_job_ids, array[]::uuid[]))
    and x.user_id = auth.uid()
    and xj.state = 'accepted'
    and coalesce(b.status::text, '') not in ('cancelled', 'completed', 'rated')
    and b.cancelled_at is null
    and nullif(btrim(b.address), '') is not null;
$function$;

revoke execute on function public.get_accepted_xooter_job_destinations(uuid[]) from public;
grant execute on function public.get_accepted_xooter_job_destinations(uuid[]) to service_role;

-- ── 6. The same, for an explicit user. ──────────────────────────────────────────────────────
drop function if exists public.get_accepted_zooter_job_destinations_for_user(uuid, uuid[]);

create function public.get_accepted_xooter_job_destinations_for_user(p_user_id uuid, p_job_ids uuid[])
returns table(job_id uuid, booking_id uuid, address text)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
  select
    xj.id as job_id,
    b.id as booking_id,
    nullif(btrim(b.address), '') as address
  from public.xooter_jobs xj
  join public.xooters x on x.id = xj.xooter_id
  join public.bookings b on b.id = xj.booking_id
  where p_user_id is not null
    and xj.id = any(coalesce(p_job_ids, array[]::uuid[]))
    and x.user_id = p_user_id
    and xj.state = 'accepted'
    and coalesce(b.status::text, '') not in ('cancelled', 'completed', 'rated')
    and b.cancelled_at is null
    and nullif(btrim(b.address), '') is not null;
$function$;

revoke execute on function public.get_accepted_xooter_job_destinations_for_user(uuid, uuid[]) from public;
grant execute on function public.get_accepted_xooter_job_destinations_for_user(uuid, uuid[]) to service_role;

-- ── 7. Payout release eligibility. ──────────────────────────────────────────────────────────
drop function if exists public.can_release_zooter_payout(uuid, uuid);

create function public.can_release_xooter_payout(p_xooter_id uuid, p_booking_id uuid default null::uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select exists (
    select 1
    from public.xooter_payout_accounts account
    where account.xooter_id = p_xooter_id
      and account.status = 'verified'
      and account.verified_at is not null
      and exists (
        select 1 from public.operational_controls oc
        where oc.control_key = 'payouts.enabled'
          and oc.environment in ('all', 'production')
          and oc.enabled = true
      )
      and not exists (
        select 1 from public.payout_change_requests change
        where change.xooter_id = p_xooter_id
          and change.status in ('pending', 'step_up_required', 'step_up_verified')
      )
      and not exists (
        select 1 from public.xooter_payout_holds hold
        where hold.xooter_id = p_xooter_id
          and (p_booking_id is null or hold.booking_id = p_booking_id)
          and hold.status = 'active'
          and hold.release_after > now()
      )
  );
$function$;

revoke execute on function public.can_release_xooter_payout(uuid, uuid) from public;
grant execute on function public.can_release_xooter_payout(uuid, uuid) to service_role;

-- ── 8. Xoot Black eligibility. Control keys were renamed too, and are matched by value. ─────
drop function if exists public.is_zoot_black_eligible(uuid, text);

create function public.is_xoot_black_eligible(p_xooter_id uuid, p_area_key text default null::text)
returns boolean
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_enabled boolean;
  v_area_required boolean;
  v_xooter_ok boolean;
  v_latest_status text;
begin
  select exists (
    select 1 from public.operational_controls c
    where c.control_key = 'xoot_black.enabled' and c.enabled = true and c.environment = 'all'
  ) into v_enabled;
  if not coalesce(v_enabled, false) then return false; end if;

  select exists (
    select 1 from public.xooters x
    where x.id = p_xooter_id
      and x.active = true
      and x.verified = true
      and lower(coalesce(x.tier, '')) in ('elite', 'elite_verified', 'black')
  ) into v_xooter_ok;
  if not coalesce(v_xooter_ok, false) then return false; end if;

  select h.status into v_latest_status
  from public.xoot_black_status_history h
  where h.xooter_id = p_xooter_id
    and (h.expires_at is null or h.expires_at > now())
  order by h.effective_at desc
  limit 1;
  if coalesce(v_latest_status, '') <> 'elite_verified' then return false; end if;

  select exists (
    select 1 from public.operational_controls c
    where c.control_key = 'xoot_black.area_pilot' and c.enabled = true
  ) into v_area_required;

  if coalesce(v_area_required, false) then
    if nullif(trim(coalesce(p_area_key, '')), '') is null then return false; end if;
    if not exists (
      select 1 from public.xoot_black_area_pilots a
      where a.area_key = lower(trim(p_area_key)) and a.status = 'approved'
    ) then
      return false;
    end if;
  end if;

  return exists (
    select 1 from public.xoot_black_equipment_evidence e
    where e.xooter_id = p_xooter_id
      and e.status = 'approved'
      and (e.expires_at is null or e.expires_at > now())
  );
end;
$function$;

revoke execute on function public.is_xoot_black_eligible(uuid, text) from public;
grant execute on function public.is_xoot_black_eligible(uuid, text) to service_role;

-- ── 9. The XootCred balance trigger. Replaced in place, then renamed. ───────────────────────
-- ⚠️ NOT dropped: triggers are bound to this function by OID, and dropping it would drop them.
-- `create or replace` keeps the OID, so both the trigger bindings and the wider ACL survive.
create or replace function public.check_zootcred_balance()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
declare
  v_balance numeric;
  v_debit numeric;
begin
  if coalesce(new.status, 'available') in ('pending', 'expired', 'cancelled') then
    return new;
  end if;
  if new.expires_at is not null and new.expires_at <= now() then
    return new;
  end if;

  if new.direction = 'debit' or new.amount < 0 then
    v_debit := abs(new.amount);
    select coalesce(sum(
      case
        when direction = 'debit' then -abs(amount)
        when direction = 'credit' then abs(amount)
        else amount
      end
    ), 0) into v_balance
    from public.xootcred_ledger
    where user_id = new.user_id
      and (expires_at is null or expires_at > now())
      and coalesce(status, 'available') not in ('pending', 'expired', 'cancelled');

    if v_balance - v_debit < 0 then
      raise exception 'XootCred balance cannot go negative. Available: %', v_balance;
    end if;
  end if;

  return new;
end;
$function$;

alter function public.check_zootcred_balance() rename to check_xootcred_balance;
