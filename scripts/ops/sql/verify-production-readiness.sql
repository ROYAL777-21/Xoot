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
    'integration outbox allows expo push channel',
    exists (
      select 1
      from pg_constraint c
      where c.conrelid = 'public.integration_outbox'::regclass
        and c.conname = 'integration_outbox_channel_check'
        and pg_get_constraintdef(c.oid) like '%expo_push%'
    ),
    'public.integration_outbox.integration_outbox_channel_check'

  union all
  select
    'booking invoices table exists',
    to_regclass('public.booking_invoices') is not null,
    'public.booking_invoices'

  union all
  select
    'booking invoices unique per booking',
    exists (
      select 1
      from pg_constraint c
      where c.conrelid = 'public.booking_invoices'::regclass
        and c.conname = 'booking_invoices_booking_unique'
        and c.contype = 'u'
    ),
    'public.booking_invoices.booking_invoices_booking_unique'

  union all
  select
    'booking invoices immutable trigger exists',
    exists (
      select 1
      from pg_trigger t
      where t.tgrelid = 'public.booking_invoices'::regclass
        and t.tgname = 'prevent_booking_invoice_snapshot_mutation'
        and not t.tgisinternal
    ),
    'public.booking_invoices.prevent_booking_invoice_snapshot_mutation'

  union all
  select
    'booking invoices owner admin read policy exists',
    exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'booking_invoices'
        and policyname = 'booking_invoices_owner_or_admin_read'
    ),
    'public.booking_invoices.booking_invoices_owner_or_admin_read'

  union all
  select
    'booking invoices no authenticated writes',
    not has_table_privilege('authenticated', 'public.booking_invoices', 'INSERT')
      and not has_table_privilege('authenticated', 'public.booking_invoices', 'UPDATE')
      and not has_table_privilege('authenticated', 'public.booking_invoices', 'DELETE'),
    'authenticated invoice writes denied'

  union all
  select
    'booking invoice private bucket exists',
    exists (
      select 1
      from storage.buckets
      where id = 'booking-invoices'
        and public = false
    ),
    'storage.buckets.booking-invoices'

  union all
  select
    'booking invoice storage owner admin read policy exists',
    exists (
      select 1
      from pg_policies
      where schemaname = 'storage'
        and tablename = 'objects'
        and policyname = 'booking_invoices_owner_admin_read'
    ),
    'storage.objects.booking_invoices_owner_admin_read'

  union all
  select
    'concierge knowledge versions table exists',
    to_regclass('public.zoot_concierge_knowledge_versions') is not null,
    'public.zoot_concierge_knowledge_versions'

  union all
  select
    'concierge feedback table exists',
    to_regclass('public.zoot_concierge_feedback') is not null,
    'public.zoot_concierge_feedback'

  union all
  select
    'concierge feedback direct client writes denied',
    not has_table_privilege('authenticated', 'public.zoot_concierge_feedback', 'INSERT')
      and not has_table_privilege('anon', 'public.zoot_concierge_feedback', 'INSERT'),
    'public.zoot_concierge_feedback insert denied'

  union all
  select
    'concierge Turnstile gate exists',
    exists (
      select 1
      from public.operational_controls
      where control_key = 'support.turnstile_required'
    ),
    'public.operational_controls.support.turnstile_required'

  union all
  select
    'Zoot Black controls default disabled',
    exists (
      select 1
      from public.operational_controls
      where control_key = 'zoot_black.enabled'
        and enabled = false
    )
      and exists (
        select 1
        from public.operational_controls
        where control_key = 'zoot_black.area_pilot'
          and enabled = false
      )
      and exists (
        select 1
        from public.operational_controls
        where control_key = 'zoot_black.certificates'
          and enabled = false
      ),
    'public.operational_controls zoot_black.*'

  union all
  select
    'Zoot Black selected area table exists',
    to_regclass('public.zoot_black_area_pilots') is not null,
    'public.zoot_black_area_pilots'

  union all
  select
    'Zoot Black equipment evidence table exists',
    to_regclass('public.zoot_black_equipment_evidence') is not null,
    'public.zoot_black_equipment_evidence'

  union all
  select
    'Zoot Black status history table exists',
    to_regclass('public.zoot_black_status_history') is not null,
    'public.zoot_black_status_history'

  union all
  select
    'Zoot Black training requirements table exists',
    to_regclass('public.zoot_black_training_requirements') is not null,
    'public.zoot_black_training_requirements'

  union all
  select
    'Zoot Black explicit line items table exists',
    to_regclass('public.booking_service_line_items') is not null,
    'public.booking_service_line_items'

  union all
  select
    'Zoot Black completion certificates table exists',
    to_regclass('public.zoot_black_completion_certificates') is not null,
    'public.zoot_black_completion_certificates'

  union all
  select
    'Zoot Black certificate private bucket exists',
    exists (
      select 1
      from storage.buckets
      where id = 'zoot-black-certificates'
        and public = false
    ),
    'storage.buckets.zoot-black-certificates'

  union all
  select
    'Zoot Black eligibility helper not client executable',
    to_regprocedure('public.is_zoot_black_eligible(uuid,text)') is not null
      and not has_function_privilege('anon', 'public.is_zoot_black_eligible(uuid,text)', 'EXECUTE')
      and not has_function_privilege('authenticated', 'public.is_zoot_black_eligible(uuid,text)', 'EXECUTE'),
    'public.is_zoot_black_eligible(uuid,text)'

  union all
  select
    'public has_role is self-scoped invoker',
    exists (
      select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'has_role'
        and pg_get_function_identity_arguments(p.oid) = '_user_id uuid, _role app_role'
        and p.prosecdef = false
        and exists (
          select 1
          from unnest(p.proconfig) cfg
          where cfg = 'search_path=""'
        )
        and pg_get_functiondef(p.oid) like '%_user_id <> auth.uid()%'
    ),
    'public.has_role(uuid, public.app_role)'

  union all
  select
    'private has_role uses locked search path',
    exists (
      select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'private'
        and p.proname = 'has_role'
        and pg_get_function_identity_arguments(p.oid) = '_user_id uuid, _role app_role'
        and p.prosecdef = true
        and exists (
          select 1
          from unnest(p.proconfig) cfg
          where cfg = 'search_path=""'
        )
    ),
    'private.has_role(uuid, public.app_role)'

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

  union all
  select
    'legacy targeted RLS policies converged',
    not exists (
      select 1
      from (
        values
          ('support_tickets', 'support_tickets_select_owner_or_admin'),
          ('support_tickets', 'support_tickets_insert_owner'),
          ('support_tickets', 'support_tickets_update_admin'),
          ('support_tickets', 'support_tickets_delete_admin'),
          ('user_roles', 'user_roles_select_owner_or_admin'),
          ('user_roles', 'user_roles_insert_admin'),
          ('user_roles', 'user_roles_update_admin'),
          ('user_roles', 'user_roles_delete_admin'),
          ('zooter_reliability_metrics', 'zooter_reliability_metrics_select_owner_or_admin'),
          ('zooter_reliability_metrics', 'zooter_reliability_metrics_insert_admin'),
          ('zooter_reliability_metrics', 'zooter_reliability_metrics_update_admin'),
          ('zooter_reliability_metrics', 'zooter_reliability_metrics_delete_admin'),
          ('zooters', 'zooters_select_self_or_admin'),
          ('zooters', 'zooters_insert_admin'),
          ('zooters', 'zooters_update_self_or_admin'),
          ('zooters', 'zooters_delete_admin')
      ) as expected(tablename, policyname)
      where not exists (
        select 1
        from pg_policies p
        where p.schemaname = 'public'
          and p.tablename = expected.tablename
          and p.policyname = expected.policyname
      )
    ),
    'support_tickets/user_roles/zooter_reliability_metrics/zooters policy set'

  union all
  select
    'legacy targeted RLS policies removed',
    not exists (
      select 1
      from pg_policies p
      where p.schemaname = 'public'
        and (p.tablename, p.policyname) in (
          values
            ('support_tickets', 'support_tickets_admin'),
            ('support_tickets', 'support_tickets_insert_own'),
            ('support_tickets', 'support_tickets_own'),
            ('support_tickets', 'own support tickets'),
            ('user_roles', 'admins manage roles'),
            ('user_roles', 'view own roles'),
            ('user_roles', 'roles select own or admin'),
            ('user_roles', 'roles admin insert'),
            ('user_roles', 'roles admin update'),
            ('user_roles', 'roles admin delete'),
            ('zooter_reliability_metrics', 'admins manage reliability metrics'),
            ('zooter_reliability_metrics', 'zooters and admins view reliability metrics'),
            ('zooter_reliability_metrics', 'reliability own zooter or admin'),
            ('zooters', 'active zooters visible'),
            ('zooters', 'admins insert zooters'),
            ('zooters', 'admins manage zooters'),
            ('zooters', 'zooters update own'),
            ('zooters', 'zooters update own profile'),
            ('zooters', 'zooters_self_select'),
            ('zooters', 'zooters_self_update')
        )
    ),
    'old support/user-role/reliability/zooter policy names'

  union all
  select
    'targeted RLS policies avoid ALL command',
    not exists (
      select 1
      from pg_policies p
      where p.schemaname = 'public'
        and p.tablename in ('support_tickets', 'user_roles', 'zooter_reliability_metrics', 'zooters')
        and p.cmd = 'ALL'
    ),
    'no broad ALL policies on targeted legacy tables'

  union all
  select
    'zooters base table not readable by anon',
    not has_table_privilege('anon', 'public.zooters', 'SELECT'),
    'anon select revoked from public.zooters'

  union all
  select
    'zooters public view readable only as select',
    has_table_privilege('anon', 'public.zooters_public', 'SELECT')
      and not has_table_privilege('anon', 'public.zooters_public', 'INSERT')
      and not has_table_privilege('anon', 'public.zooters_public', 'UPDATE')
      and not has_table_privilege('anon', 'public.zooters_public', 'DELETE'),
    'anon can select public-safe view only'

  union all
  select
    'performance advisor RLS policy cleanup converged',
    not exists (
      select 1
      from (
        values
          ('admin_audit_log', 'audit_log_admin_read'),
          ('push_tokens', 'push_tokens_select_own'),
          ('push_tokens', 'push_tokens_insert_own'),
          ('push_tokens', 'push_tokens_update_own'),
          ('push_tokens', 'push_tokens_delete_own'),
          ('twilio_webhook_events', 'twilio_events_admin_read'),
          ('admin_review_queue', 'admin_review_queue_select_admin'),
          ('admin_review_queue', 'admin_review_queue_insert_user_or_admin'),
          ('admin_review_queue', 'admin_review_queue_update_admin'),
          ('admin_review_queue', 'admin_review_queue_delete_admin'),
          ('favorites', 'favorites_select_own'),
          ('favorites', 'favorites_insert_own'),
          ('favorites', 'favorites_update_own'),
          ('favorites', 'favorites_delete_own'),
          ('messages', 'messages_participants_select'),
          ('messages', 'messages_participants_insert')
      ) as expected(tablename, policyname)
      where to_regclass(format('public.%I', expected.tablename)) is not null
        and not exists (
          select 1
          from pg_policies p
          where p.schemaname = 'public'
            and p.tablename = expected.tablename
            and p.policyname = expected.policyname
        )
    )
      and not exists (
        select 1
        from pg_policies p
        where p.schemaname = 'public'
          and p.tablename in (
            'admin_audit_log',
            'push_tokens',
            'twilio_webhook_events',
            'admin_review_queue',
            'favorites',
            'messages',
            'referrals'
          )
          and p.policyname in (
            'admins manage review queue',
            'users create review requests',
            'review queue admin select',
            'review queue admin update',
            'review queue insert own',
            'manage own favorites',
            'view own favorites',
            'own favorites',
            'send messages on own booking',
            'view messages on own booking',
            'zooters send messages on assigned bookings',
            'zooters view messages on assigned bookings',
            'messages participants insert',
            'messages participants select',
            'referral_codes_own',
            'users view own referral codes'
          )
      ),
    'admin_audit_log/push_tokens/twilio/admin_review_queue/favorites/messages/referrals'

  union all
  select
    'performance advisor RLS predicates use select auth uid',
    not exists (
      select 1
      from pg_policies p
      where p.schemaname = 'public'
        and p.tablename in (
          'admin_audit_log',
          'push_tokens',
          'twilio_webhook_events',
          'admin_review_queue',
          'favorites',
          'messages',
          'referrals'
        )
        and (
          (
            coalesce(p.qual, '') ~ '(^|[^A-Za-z0-9_\\.])auth\\.uid\\(\\)'
            and coalesce(p.qual, '') not like '%( SELECT auth.uid() AS uid)%'
            and coalesce(p.qual, '') not like '%(select auth.uid())%'
          )
          or (
            coalesce(p.with_check, '') ~ '(^|[^A-Za-z0-9_\\.])auth\\.uid\\(\\)'
            and coalesce(p.with_check, '') not like '%( SELECT auth.uid() AS uid)%'
            and coalesce(p.with_check, '') not like '%(select auth.uid())%'
          )
        )
    ),
    'auth.uid wrapped as initplan in advisor-targeted policies'

  union all
  select
    'no raw auth uid in public policies',
    not exists (
      select 1
      from pg_policies p
      where p.schemaname = 'public'
        and (
          (
            coalesce(p.qual, '') ~ '(^|[^A-Za-z0-9_\\.])auth\\.uid\\(\\)'
            and coalesce(p.qual, '') not like '%( SELECT auth.uid() AS uid)%'
            and coalesce(p.qual, '') not like '%(select auth.uid())%'
          )
          or (
            coalesce(p.with_check, '') ~ '(^|[^A-Za-z0-9_\\.])auth\\.uid\\(\\)'
            and coalesce(p.with_check, '') not like '%( SELECT auth.uid() AS uid)%'
            and coalesce(p.with_check, '') not like '%(select auth.uid())%'
          )
        )
    ),
    'all public RLS policies wrap auth.uid as initplan'

  union all
  select
    'no missing public foreign-key covering indexes',
    not exists (
      with fk as (
        select
          con.conrelid,
          con.conkey
        from pg_constraint con
        join pg_class rel on rel.oid = con.conrelid
        join pg_namespace ns on ns.oid = rel.relnamespace
        where con.contype = 'f'
          and ns.nspname = 'public'
      )
      select 1
      from fk
      where not exists (
        select 1
        from pg_index i
        where i.indrelid = fk.conrelid
          and i.indisvalid
          and i.indpred is null
          and (i.indkey::int2[])[0:array_length(fk.conkey, 1) - 1] = fk.conkey::int2[]
      )
    ),
    'all public foreign keys have a valid covering index prefix'
)
select
  check_name,
  case when passed then 'pass' else 'fail' end as status,
  detail
from checks
order by check_name;
