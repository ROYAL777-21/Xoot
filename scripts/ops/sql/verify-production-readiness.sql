-- Zoot production-readiness live database checks.
-- Run only against staging/prod from an authenticated ops shell.
-- This query reads catalog metadata only and does not expose secret values.

with expected_statuses(status) as (
  values
    ('draft'),
    ('pending_payment'),
    ('payment_confirmed'),
    ('awaiting_assignment'),
    ('assigned'),
    ('contractor_accepted'),
    ('en_route'),
    ('in_progress'),
    ('completed'),
    ('rated'),
    ('cancelled'),
    ('replacement_required'),
    ('replacement_offered'),
    ('reassigned')
),
booking_status_constraint as (
  select pg_get_constraintdef(c.oid) as definition
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relname = 'bookings'
    and c.conname = 'booking_status_valid'
  limit 1
),
checks as (
  select
    'booking_status_valid constraint exists' as check_name,
    exists (select 1 from booking_status_constraint) as passed,
    coalesce((select definition from booking_status_constraint), 'missing') as detail

  union all
  select
    'booking_status_valid contains canonical statuses',
    not exists (
      select 1
      from expected_statuses e
      where not exists (
        select 1
        from booking_status_constraint c
        where c.definition like '%' || e.status || '%'
      )
    ),
    coalesce((select string_agg(status, ', ' order by status) from expected_statuses), '')

  union all
  select
    'bookings.status default is draft',
    exists (
      select 1
      from pg_attribute a
      join pg_class t on t.oid = a.attrelid
      join pg_namespace n on n.oid = t.relnamespace
      join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
      where n.nspname = 'public'
        and t.relname = 'bookings'
        and a.attname = 'status'
        and pg_get_expr(d.adbin, d.adrelid) like '%draft%'
    ),
    'public.bookings.status default'

  union all
  select
    'sensitive access notification column exists',
    exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'bookings'
        and column_name = 'sensitive_access_available_notified_at'
    ),
    'public.bookings.sensitive_access_available_notified_at'

  union all
  select
    'sensitive data audit table exists',
    to_regclass('public.sensitive_data_access_log') is not null,
    'public.sensitive_data_access_log'

  union all
  select
    'legacy sensitive access audit table exists',
    to_regclass('public.sensitive_access_logs') is not null,
    'public.sensitive_access_logs'

  union all
  select
    'safe zooter job cards RPC exists',
    to_regprocedure('public.get_zooter_job_cards()') is not null,
    'public.get_zooter_job_cards()'

  union all
  select
    'accepted destination RPC exists',
    to_regprocedure('public.get_accepted_zooter_job_destinations(uuid[])') is not null,
    'public.get_accepted_zooter_job_destinations(uuid[])'

  union all
  select
    'sensitive access checker exists',
    to_regprocedure('public.can_access_sensitive_data(uuid,uuid)') is not null,
    'public.can_access_sensitive_data(uuid,uuid)'

  union all
  select
    'sensitive access checker not executable by anon',
    to_regprocedure('public.can_access_sensitive_data(uuid,uuid)') is not null
      and not has_function_privilege('anon', 'public.can_access_sensitive_data(uuid,uuid)', 'EXECUTE'),
    'anon execute revoked'

  union all
  select
    'sensitive access checker not executable by authenticated',
    to_regprocedure('public.can_access_sensitive_data(uuid,uuid)') is not null
      and not has_function_privilege('authenticated', 'public.can_access_sensitive_data(uuid,uuid)', 'EXECUTE'),
    'authenticated execute revoked'

  union all
  select
    'sensitive access enqueue function exists',
    to_regprocedure('private.enqueue_sensitive_access_notifications()') is not null,
    'private.enqueue_sensitive_access_notifications()'

  union all
  select
    'pg_cron extension installed',
    exists (select 1 from pg_extension where extname = 'pg_cron'),
    'pg_cron'

  union all
  select
    'bookings participant read policy exists',
    exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'bookings'
        and policyname = 'bookings_participant_read'
    ),
    'public.bookings.bookings_participant_read'

  union all
  select
    'notifications client insert not granted',
    not has_table_privilege('authenticated', 'public.notifications', 'INSERT'),
    'authenticated insert denied'
)
select
  check_name,
  case when passed then 'pass' else 'fail' end as status,
  detail
from checks
order by check_name;
