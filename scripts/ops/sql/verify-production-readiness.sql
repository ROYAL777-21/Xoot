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
    to_regprocedure('public.get_zooter_job_cards_for_user(uuid)') is not null,
    'public.get_zooter_job_cards_for_user(uuid)'

  union all
  select
    'accepted destination RPC exists',
    to_regprocedure('public.get_accepted_zooter_job_destinations_for_user(uuid,uuid[])') is not null,
    'public.get_accepted_zooter_job_destinations_for_user(uuid,uuid[])'

  union all
  select
    'legacy zooter job card RPC not executable by authenticated',
    to_regprocedure('public.get_zooter_job_cards()') is not null
      and not has_function_privilege('authenticated', 'public.get_zooter_job_cards()', 'EXECUTE'),
    'authenticated execute revoked'

  union all
  select
    'legacy accepted destination RPC not executable by authenticated',
    to_regprocedure('public.get_accepted_zooter_job_destinations(uuid[])') is not null
      and not has_function_privilege('authenticated', 'public.get_accepted_zooter_job_destinations(uuid[])', 'EXECUTE'),
    'authenticated execute revoked'

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

  union all
  select
    'Phase 1 operational controls table exists',
    to_regclass('public.operational_controls') is not null,
    'public.operational_controls'

  union all
  select
    'Phase 1 provider events table exists',
    to_regclass('public.provider_events') is not null,
    'public.provider_events'

  union all
  select
    'Phase 1 approval requests table exists',
    to_regclass('public.approval_requests') is not null,
    'public.approval_requests'

  union all
  select
    'Phase 1 rate limit table exists',
    to_regclass('public.rate_limit_events') is not null,
    'public.rate_limit_events'

  union all
  select
    'Phase 1 provider event claim helper exists',
    to_regprocedure('private.claim_provider_event(text,text,text,text,text,uuid,jsonb)') is not null,
    'private.claim_provider_event(text,text,text,text,text,uuid,jsonb)'

  union all
  select
    'Phase 1 rate-limit helper exists',
    to_regprocedure('private.consume_rate_limit(text,text,text,integer,integer)') is not null,
    'private.consume_rate_limit(text,text,text,integer,integer)'

  union all
  select
    'Phase 1 operational controls admin-read policy exists',
    exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'operational_controls'
        and policyname = 'operational_controls_admin_read'
    ),
    'public.operational_controls.operational_controls_admin_read'

  union all
  select
    'Phase 1 provider controls default disabled',
    exists (
      select 1
      from public.operational_controls
      where control_key = 'payments.provider_checkout'
        and enabled = false
    )
      and exists (
        select 1
        from public.operational_controls
        where control_key = 'support.openai_fallback'
          and enabled = false
    )
      and exists (
        select 1
        from public.operational_controls
        where control_key = 'twilio.operational_messages'
          and enabled = false
      ),
    'payments.provider_checkout/support.openai_fallback/twilio.operational_messages'

  union all
  select
    'Phase 1 governance FK indexes exist',
    not exists (
      select 1
      from (
        values
          ('operational_controls_approved_by_idx'),
          ('approval_requests_requested_by_idx'),
          ('approval_requests_decided_by_idx'),
          ('experiment_registry_approval_request_id_idx'),
          ('agent_action_contracts_approval_request_id_idx'),
          ('analytics_event_contracts_approval_request_id_idx')
      ) as expected(index_name)
      where not exists (
        select 1
        from pg_indexes i
        where i.schemaname = 'public'
          and i.indexname = expected.index_name
      )
    ),
    'governance foreign-key advisor indexes'

  union all
  select
    'Phase 1 governance admin policies use select auth uid',
    not exists (
      select 1
      from (
        values
          ('operational_controls', 'operational_controls_admin_read'),
          ('approval_requests', 'approval_requests_admin_read'),
          ('provider_events', 'provider_events_admin_read'),
          ('rate_limit_events', 'rate_limit_events_admin_read'),
          ('experiment_registry', 'experiment_registry_admin_read'),
          ('agent_action_contracts', 'agent_action_contracts_admin_read'),
          ('analytics_event_contracts', 'analytics_event_contracts_admin_read')
      ) as expected(tablename, policyname)
      where not exists (
        select 1
        from pg_policies p
        where p.schemaname = 'public'
          and p.tablename = expected.tablename
          and p.policyname = expected.policyname
          and p.qual like '%( SELECT auth.uid() AS uid)%'
      )
    ),
    'governance admin-read RLS initplan cleanup'

  union all
  select
    'no duplicate public indexes',
    not exists (
      select 1
      from (
        select
          t.oid as table_oid,
          am.amname as method,
          ix.indisunique,
          ix.indkey::text as indkey,
          coalesce(pg_get_expr(ix.indpred, ix.indrelid), '') as predicate,
          coalesce(pg_get_expr(ix.indexprs, ix.indrelid), '') as expressions
        from pg_index ix
        join pg_class i on i.oid = ix.indexrelid
        join pg_class t on t.oid = ix.indrelid
        join pg_namespace n on n.oid = t.relnamespace
        join pg_am am on am.oid = i.relam
        where n.nspname = 'public'
          and not ix.indisprimary
      ) public_indexes
      group by table_oid, method, indisunique, indkey, predicate, expressions
      having count(*) > 1
    ),
    'duplicate public btree/expression/predicate index groups'
)
select
  check_name,
  case when passed then 'pass' else 'fail' end as status,
  detail
from checks
order by check_name;
