-- Phase 1 production/staging convergence, continued after booking enum commit.
-- Legacy enum labels remain in PostgreSQL for compatibility, but the canonical
-- check constraint prevents new rows from using them.

update public.bookings
set status = 'pending_payment'::public.booking_status
where status::text = 'pending';

update public.bookings
set status = 'contractor_accepted'::public.booking_status
where status::text = 'confirmed';

update public.bookings
set status = 'en_route'::public.booking_status
where status::text = 'enroute';

update public.bookings
set status = 'in_progress'::public.booking_status
where status::text = 'arrived';

update public.bookings
set completed_at = coalesce(completed_at, job_completed_at)
where completed_at is null
  and job_completed_at is not null;

alter table public.bookings
  alter column status set default 'draft'::public.booking_status,
  alter column replacement_count set default 0,
  alter column replacement_count set not null;

alter table public.bookings
  drop constraint if exists booking_status_valid;

alter table public.bookings
  add constraint booking_status_valid check (
    status::text in (
      'draft',
      'pending_payment',
      'payment_confirmed',
      'awaiting_assignment',
      'assigned',
      'contractor_accepted',
      'en_route',
      'in_progress',
      'completed',
      'rated',
      'cancelled',
      'replacement_required',
      'replacement_offered',
      'reassigned'
    )
  );

comment on constraint booking_status_valid on public.bookings
  is 'Prevents legacy or skipped booking states; trusted Edge Functions enforce individual transitions.';

alter table public.bookings enable row level security;
revoke insert, update, delete on public.bookings from anon, authenticated;
grant select on public.bookings to authenticated;

do $$
declare
  policy_row record;
begin
  for policy_row in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'bookings'
  loop
    execute format(
      'drop policy if exists %I on public.bookings',
      policy_row.policyname
    );
  end loop;
end
$$;

create policy "bookings_client_own"
  on public.bookings for select
  to authenticated
  using (auth.uid() = user_id);
comment on policy "bookings_client_own" on public.bookings
  is 'Clients can read only bookings they own.';

create policy "bookings_zooter_assigned"
  on public.bookings for select
  to authenticated
  using (
    exists (
      select 1
      from public.zooters z
      where z.id = bookings.zooter_id
        and z.user_id = auth.uid()
    )
  );
comment on policy "bookings_zooter_assigned" on public.bookings
  is 'Zooters can read only bookings assigned to their contractor profile.';

create policy "bookings_admin"
  on public.bookings for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role))
  with check (public.has_role(auth.uid(), 'admin'::public.app_role));
comment on policy "bookings_admin" on public.bookings
  is 'Admins retain policy-level access, while operational writes are routed through audited Edge Functions.';

alter table public.payment_records enable row level security;
revoke insert, update, delete on public.payment_records from anon, authenticated;
grant select on public.payment_records to authenticated;

do $$
declare
  policy_row record;
begin
  for policy_row in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'payment_records'
  loop
    execute format(
      'drop policy if exists %I on public.payment_records',
      policy_row.policyname
    );
  end loop;
end
$$;

create policy "payment_records_own"
  on public.payment_records for select
  to authenticated
  using (auth.uid() = user_id);
comment on policy "payment_records_own" on public.payment_records
  is 'Clients can read only their own payment records and cannot write payment state.';

create policy "payment_records_admin"
  on public.payment_records for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role))
  with check (public.has_role(auth.uid(), 'admin'::public.app_role));
comment on policy "payment_records_admin" on public.payment_records
  is 'Admins retain policy-level access; payment mutations require audited server actions.';

alter table public.user_subscriptions enable row level security;
revoke insert, update, delete on public.user_subscriptions from anon, authenticated;
grant select on public.user_subscriptions to authenticated;

do $$
declare
  policy_row record;
begin
  for policy_row in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'user_subscriptions'
  loop
    execute format(
      'drop policy if exists %I on public.user_subscriptions',
      policy_row.policyname
    );
  end loop;
end
$$;

create policy "user_subscriptions_own"
  on public.user_subscriptions for select
  to authenticated
  using (auth.uid() = user_id);
comment on policy "user_subscriptions_own" on public.user_subscriptions
  is 'Users can read only their own Care+ membership state.';

create policy "user_subscriptions_admin"
  on public.user_subscriptions for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role))
  with check (public.has_role(auth.uid(), 'admin'::public.app_role));
comment on policy "user_subscriptions_admin" on public.user_subscriptions
  is 'Admins retain policy-level access; membership changes are service-side and auditable.';

alter table public.zootcred_ledger enable row level security;
revoke insert, update, delete on public.zootcred_ledger from anon, authenticated;
grant select on public.zootcred_ledger to authenticated;

do $$
declare
  policy_row record;
begin
  for policy_row in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'zootcred_ledger'
  loop
    execute format(
      'drop policy if exists %I on public.zootcred_ledger',
      policy_row.policyname
    );
  end loop;
end
$$;

create policy "zootcred_own"
  on public.zootcred_ledger for select
  to authenticated
  using (auth.uid() = user_id);
comment on policy "zootcred_own" on public.zootcred_ledger
  is 'Users can read only their own immutable ZootCred ledger entries.';

create policy "zootcred_admin"
  on public.zootcred_ledger for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role))
  with check (public.has_role(auth.uid(), 'admin'::public.app_role));
comment on policy "zootcred_admin" on public.zootcred_ledger
  is 'Admins retain policy-level access; credits and debits are created by trusted server actions.';

alter table public.integration_outbox enable row level security;
revoke insert, update, delete on public.integration_outbox from anon, authenticated;
grant select on public.integration_outbox to authenticated;

do $$
declare
  policy_row record;
begin
  for policy_row in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'integration_outbox'
  loop
    execute format(
      'drop policy if exists %I on public.integration_outbox',
      policy_row.policyname
    );
  end loop;
end
$$;

create policy "integration_outbox_admin_read"
  on public.integration_outbox for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role));
comment on policy "integration_outbox_admin_read" on public.integration_outbox
  is 'Only admins can inspect provider delivery jobs; all writes are service-role only.';

alter table public.notifications enable row level security;
revoke insert, delete, update on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
grant update(read) on public.notifications to authenticated;

do $$
declare
  policy_row record;
begin
  for policy_row in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'notifications'
  loop
    execute format(
      'drop policy if exists %I on public.notifications',
      policy_row.policyname
    );
  end loop;
end
$$;

create policy "notifications_select_own"
  on public.notifications for select
  to authenticated
  using (auth.uid() = user_id);
comment on policy "notifications_select_own" on public.notifications
  is 'Users can read only notifications addressed to their account.';

create policy "notifications_update_own"
  on public.notifications for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
comment on policy "notifications_update_own" on public.notifications
  is 'Users can update only the read flag on their own notifications; column grants prevent content changes.';

drop view if exists public.booking_sensitive_access;
drop function if exists public.can_access_sensitive_data(uuid, uuid);

create function public.can_access_sensitive_data(
  p_zooter_id uuid,
  p_booking_id uuid
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_start timestamptz;
  v_duration_hours numeric;
  v_completed_at timestamptz;
  v_job_completed_at timestamptz;
  v_revoked timestamptz;
  v_status text;
  v_end timestamptz;
begin
  select
    b.scheduled_at,
    b.duration_hours,
    b.completed_at,
    b.job_completed_at,
    b.sensitive_data_revoked_at,
    b.status::text
  into
    v_start,
    v_duration_hours,
    v_completed_at,
    v_job_completed_at,
    v_revoked,
    v_status
  from public.bookings b
  where b.id = p_booking_id
    and b.zooter_id = p_zooter_id;

  if not found or v_start is null or v_revoked is not null then
    return false;
  end if;

  if v_status in ('cancelled', 'rated') then
    return false;
  end if;

  if v_status = 'completed' then
    v_end := coalesce(
      v_completed_at,
      v_job_completed_at,
      v_start + (coalesce(v_duration_hours, 0) * interval '1 hour')
    );
  else
    if v_status not in (
      'assigned',
      'contractor_accepted',
      'en_route',
      'in_progress',
      'replacement_offered',
      'reassigned'
    ) then
      return false;
    end if;

    v_end := v_start + (coalesce(v_duration_hours, 0) * interval '1 hour');
  end if;

  return now() between
    (v_start - interval '45 minutes')
    and (v_end + interval '30 minutes');
end;
$$;

comment on function public.can_access_sensitive_data(uuid, uuid)
  is 'Service-role-only check for an assigned Zooter inside the 45-minute-before to 30-minute-after sensitive access window.';

revoke all on function public.can_access_sensitive_data(uuid, uuid) from public;
revoke all on function public.can_access_sensitive_data(uuid, uuid) from anon;
revoke all on function public.can_access_sensitive_data(uuid, uuid) from authenticated;
grant execute on function public.can_access_sensitive_data(uuid, uuid) to service_role;

create view public.booking_sensitive_access
with (security_invoker = true)
as
  select
    b.id as booking_id,
    b.zooter_id,
    h.gate_code,
    h.alarm_code,
    h.access_instructions,
    h.parking_instructions,
    h.pet_notes
  from public.bookings b
  join public.household_profiles h on h.id = b.household_profile_id
  where public.can_access_sensitive_data(b.zooter_id, b.id);

comment on view public.booking_sensitive_access
  is 'Database-internal compatibility view. Sensitive household values are returned to clients only through get-sensitive-access.';

revoke all on public.booking_sensitive_access from public;
revoke all on public.booking_sensitive_access from anon;
revoke all on public.booking_sensitive_access from authenticated;

create or replace function private.enqueue_sensitive_access_notifications()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  with due as (
    select
      b.id as booking_id,
      z.user_id as zooter_user_id
    from public.bookings b
    join public.zooters z on z.id = b.zooter_id
    where z.user_id is not null
      and b.scheduled_at - interval '45 minutes' <= now()
      and b.sensitive_access_available_notified_at is null
      and b.sensitive_data_revoked_at is null
      and b.cancelled_at is null
      and b.status::text in (
        'assigned',
        'contractor_accepted',
        'en_route',
        'in_progress',
        'replacement_offered',
        'reassigned'
      )
    for update of b skip locked
  ),
  marked as (
    update public.bookings b
    set sensitive_access_available_notified_at = now()
    from due d
    where b.id = d.booking_id
    returning b.id, d.zooter_user_id
  ),
  notification_rows as (
    insert into public.notifications (
      user_id,
      kind,
      title,
      body,
      link
    )
    select
      m.zooter_user_id,
      'sensitive_access_available',
      'Sensitive access is available',
      'Secure access information for this booking is now available in the Zoot app. Viewing is logged and access closes automatically.',
      '/zooter/jobs'
    from marked m
    returning 1
  ),
  outbox_rows as (
    insert into public.integration_outbox (
      source_table,
      source_id,
      event_type,
      channel,
      owner,
      stack_tool,
      payload,
      status,
      approval_required
    )
    select
      'bookings',
      m.id,
      'sensitive_access_available',
      'expo_push',
      'platform',
      'supabase_edge',
      jsonb_build_object(
        'booking_id', m.id,
        'user_id', m.zooter_user_id,
        'route', '/zooter/jobs',
        'notification_kind', 'sensitive_access_available'
      ),
      'queued',
      false
    from marked m
    returning 1
  )
  select count(*)::integer
  into v_count
  from marked;

  return v_count;
end;
$$;

comment on function private.enqueue_sensitive_access_notifications()
  is 'Atomically marks due bookings and queues a non-sensitive in-app and Expo push notification when the 45-minute access window opens.';

revoke all on function private.enqueue_sensitive_access_notifications() from public;
revoke all on function private.enqueue_sensitive_access_notifications() from anon;
revoke all on function private.enqueue_sensitive_access_notifications() from authenticated;
grant execute on function private.enqueue_sensitive_access_notifications() to service_role;

create extension if not exists pg_cron;

do $$
declare
  existing_job_id bigint;
begin
  select jobid
  into existing_job_id
  from cron.job
  where jobname = 'zoot-sensitive-access-ready'
  limit 1;

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;
end
$$;

select cron.schedule(
  'zoot-sensitive-access-ready',
  '* * * * *',
  $cron$select private.enqueue_sensitive_access_notifications();$cron$
);

comment on column public.bookings.sensitive_access_available_notified_at
  is 'Records the single notification dispatch when sensitive household access becomes available to the assigned Zooter.';
