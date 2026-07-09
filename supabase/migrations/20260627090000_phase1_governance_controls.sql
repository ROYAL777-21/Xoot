-- Phase 1 governance controls.
-- Additive only: creates disabled-by-default operational controls, approval
-- contracts, provider idempotency, rate-limit primitives and analytics
-- contracts without activating any external provider or paid flow.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;

create or replace function private.touch_governance_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function private.touch_governance_updated_at()
  is 'Shared trigger helper for Phase 1 governance tables.';

revoke all on function private.touch_governance_updated_at() from public;
grant execute on function private.touch_governance_updated_at() to service_role;

create table if not exists public.operational_controls (
  id uuid primary key default gen_random_uuid(),
  control_key text not null,
  control_type text not null
    check (control_type in ('feature_flag', 'kill_switch', 'provider_gate', 'release_gate')),
  environment text not null default 'all'
    check (environment in ('all', 'development', 'preview', 'staging', 'production')),
  enabled boolean not null default false,
  description text not null,
  owner text not null,
  approval_required boolean not null default true,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint operational_controls_key_format
    check (control_key ~ '^[a-z0-9_.:-]{3,120}$'),
  constraint operational_controls_approval_consistency
    check (
      approved_at is null
      or approved_by is not null
    ),
  unique (control_key, environment)
);

comment on table public.operational_controls
  is 'Database-backed feature flags, kill switches and provider gates. Values are read by trusted backends; client exposure requires a separate public-safe view.';
comment on column public.operational_controls.enabled
  is 'Disabled by default for new provider and AI capabilities until an approval request is completed.';

create index if not exists operational_controls_lookup_idx
  on public.operational_controls(control_key, environment, enabled);

drop trigger if exists operational_controls_touch
  on public.operational_controls;
create trigger operational_controls_touch
  before update on public.operational_controls
  for each row execute function private.touch_governance_updated_at();

alter table public.operational_controls enable row level security;
revoke all on public.operational_controls from anon, authenticated;
grant select on public.operational_controls to authenticated;

drop policy if exists "operational_controls_admin_read" on public.operational_controls;
create policy "operational_controls_admin_read"
  on public.operational_controls for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role));
comment on policy "operational_controls_admin_read" on public.operational_controls
  is 'Admins can inspect feature flags and kill switches; writes remain service-role or approved admin tooling only.';

create table if not exists public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  request_type text not null
    check (request_type in ('feature_flag', 'provider_activation', 'release_gate', 'refund', 'admin_action', 'experiment', 'legal')),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'cancelled', 'expired')),
  title text not null,
  reason text not null,
  requested_by uuid references auth.users(id) on delete set null,
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz,
  target_table text,
  target_id uuid,
  control_key text,
  risk_level text not null default 'medium'
    check (risk_level in ('low', 'medium', 'high', 'critical')),
  evidence jsonb not null default '{}'::jsonb,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint approval_requests_reason_length
    check (char_length(trim(reason)) >= 10),
  constraint approval_requests_decision_consistency
    check (
      status = 'pending'
      or decided_by is not null
    )
);

comment on table public.approval_requests
  is 'Auditable approval queue for sensitive operational changes, provider activation, releases and high-risk admin actions.';

create index if not exists approval_requests_status_idx
  on public.approval_requests(status, risk_level, created_at desc);
create index if not exists approval_requests_target_idx
  on public.approval_requests(target_table, target_id);

drop trigger if exists approval_requests_touch
  on public.approval_requests;
create trigger approval_requests_touch
  before update on public.approval_requests
  for each row execute function private.touch_governance_updated_at();

alter table public.approval_requests enable row level security;
revoke all on public.approval_requests from anon, authenticated;
grant select on public.approval_requests to authenticated;

drop policy if exists "approval_requests_admin_read" on public.approval_requests;
create policy "approval_requests_admin_read"
  on public.approval_requests for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role));
comment on policy "approval_requests_admin_read" on public.approval_requests
  is 'Admins can inspect pending and historical approvals; creation and decisions are performed by audited server actions.';

create table if not exists public.provider_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null
    check (provider in ('stitch', 'ozow', 'twilio', 'brevo', 'openai', 'mapbox', 'expo', 'cloudflare', 'hostinger', 'airtable', 'internal')),
  event_id text not null,
  event_type text not null,
  idempotency_key text not null,
  subject_table text,
  subject_id uuid,
  payload_hash text not null,
  status text not null default 'received'
    check (status in ('received', 'processing', 'processed', 'ignored', 'failed')),
  error_message text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint provider_events_event_id_length
    check (char_length(trim(event_id)) between 3 and 200),
  constraint provider_events_payload_hash_length
    check (char_length(trim(payload_hash)) between 16 and 200),
  unique (provider, event_id),
  unique (provider, idempotency_key)
);

comment on table public.provider_events
  is 'Central idempotency registry for external provider events. Edge Functions must claim an event before applying side effects.';

create index if not exists provider_events_status_idx
  on public.provider_events(provider, status, received_at desc);
create index if not exists provider_events_subject_idx
  on public.provider_events(subject_table, subject_id);

drop trigger if exists provider_events_touch
  on public.provider_events;
create trigger provider_events_touch
  before update on public.provider_events
  for each row execute function private.touch_governance_updated_at();

alter table public.provider_events enable row level security;
revoke all on public.provider_events from anon, authenticated;
grant select on public.provider_events to authenticated;

drop policy if exists "provider_events_admin_read" on public.provider_events;
create policy "provider_events_admin_read"
  on public.provider_events for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role));
comment on policy "provider_events_admin_read" on public.provider_events
  is 'Admins can audit provider event processing without gaining write access to replay side effects.';

create or replace function private.claim_provider_event(
  p_provider text,
  p_event_id text,
  p_event_type text,
  p_payload_hash text,
  p_subject_table text default null,
  p_subject_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
) returns table(provider_event_id uuid, already_seen boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if p_provider is null
    or p_event_id is null
    or p_event_type is null
    or p_payload_hash is null
    or char_length(trim(p_event_id)) < 3
  then
    raise exception 'provider event identity is required';
  end if;

  insert into public.provider_events (
    provider,
    event_id,
    event_type,
    idempotency_key,
    subject_table,
    subject_id,
    payload_hash,
    metadata
  )
  values (
    lower(trim(p_provider)),
    trim(p_event_id),
    trim(p_event_type),
    lower(trim(p_provider)) || ':' || trim(p_event_id),
    nullif(trim(coalesce(p_subject_table, '')), ''),
    p_subject_id,
    trim(p_payload_hash),
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (provider, event_id) do nothing
  returning id into v_id;

  if v_id is not null then
    return query select v_id, false;
    return;
  end if;

  select id
  into v_id
  from public.provider_events
  where provider = lower(trim(p_provider))
    and event_id = trim(p_event_id);

  return query select v_id, true;
end;
$$;

comment on function private.claim_provider_event(text, text, text, text, text, uuid, jsonb)
  is 'Service-role idempotency primitive. Returns already_seen=true when a webhook event has already been claimed.';

revoke all on function private.claim_provider_event(text, text, text, text, text, uuid, jsonb) from public;
grant execute on function private.claim_provider_event(text, text, text, text, text, uuid, jsonb) to service_role;

create or replace function private.mark_provider_event_processed(
  p_provider_event_id uuid,
  p_status text,
  p_error_message text default null
) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.provider_events
  set
    status = p_status,
    processed_at = case when p_status in ('processed', 'ignored', 'failed') then now() else processed_at end,
    error_message = nullif(trim(coalesce(p_error_message, '')), '')
  where id = p_provider_event_id
    and p_status in ('processing', 'processed', 'ignored', 'failed');
end;
$$;

comment on function private.mark_provider_event_processed(uuid, text, text)
  is 'Service-role helper for recording provider event processing outcome after side effects complete.';

revoke all on function private.mark_provider_event_processed(uuid, text, text) from public;
grant execute on function private.mark_provider_event_processed(uuid, text, text) to service_role;

create table if not exists public.rate_limit_events (
  id uuid primary key default gen_random_uuid(),
  bucket text not null,
  actor_hash text not null,
  action text not null,
  window_started_at timestamptz not null,
  window_seconds integer not null check (window_seconds between 10 and 86400),
  limit_count integer not null check (limit_count between 1 and 100000),
  count integer not null default 1 check (count >= 0),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rate_limit_actor_hash_length
    check (char_length(trim(actor_hash)) between 16 and 200),
  unique (bucket, actor_hash, action, window_started_at)
);

comment on table public.rate_limit_events
  is 'Server-side rate-limit counters keyed by hashed actors. Raw IPs, emails and phone numbers must not be stored here.';

create index if not exists rate_limit_events_expiry_idx
  on public.rate_limit_events(expires_at);

drop trigger if exists rate_limit_events_touch
  on public.rate_limit_events;
create trigger rate_limit_events_touch
  before update on public.rate_limit_events
  for each row execute function private.touch_governance_updated_at();

alter table public.rate_limit_events enable row level security;
revoke all on public.rate_limit_events from anon, authenticated;
grant select on public.rate_limit_events to authenticated;

drop policy if exists "rate_limit_events_admin_read" on public.rate_limit_events;
create policy "rate_limit_events_admin_read"
  on public.rate_limit_events for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role));
comment on policy "rate_limit_events_admin_read" on public.rate_limit_events
  is 'Admins can audit rate-limit pressure; clients cannot write or enumerate raw actor identifiers.';

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
as $$
declare
  v_window_started_at timestamptz;
  v_count integer;
begin
  if p_limit_count < 1 or p_window_seconds < 10 then
    return false;
  end if;

  if p_actor_hash is null or char_length(trim(p_actor_hash)) < 16 then
    return false;
  end if;

  v_window_started_at := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

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
    v_window_started_at + (p_window_seconds || ' seconds')::interval
  )
  on conflict (bucket, actor_hash, action, window_started_at)
  do update set
    count = public.rate_limit_events.count + 1,
    limit_count = excluded.limit_count,
    window_seconds = excluded.window_seconds,
    expires_at = excluded.expires_at
  returning count into v_count;

  return v_count <= p_limit_count;
end;
$$;

comment on function private.consume_rate_limit(text, text, text, integer, integer)
  is 'Service-role rate-limit primitive. Callers pass a pre-hashed actor identifier and receive false when the window is exhausted.';

revoke all on function private.consume_rate_limit(text, text, text, integer, integer) from public;
grant execute on function private.consume_rate_limit(text, text, text, integer, integer) to service_role;

create table if not exists public.experiment_registry (
  id uuid primary key default gen_random_uuid(),
  experiment_key text not null unique,
  status text not null default 'draft'
    check (status in ('draft', 'approved', 'running', 'paused', 'completed', 'cancelled')),
  owner text not null,
  metric_owner text not null,
  hypothesis text not null,
  primary_metric text not null,
  data_collected text[] not null default '{}'::text[],
  pii_allowed boolean not null default false,
  approval_request_id uuid references public.approval_requests(id) on delete set null,
  started_at timestamptz,
  ended_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint experiment_registry_key_format
    check (experiment_key ~ '^[a-z0-9_.:-]{3,120}$')
);

comment on table public.experiment_registry
  is 'Approved experiment catalog. Experiments cannot collect PII unless explicitly approved and documented.';

drop trigger if exists experiment_registry_touch
  on public.experiment_registry;
create trigger experiment_registry_touch
  before update on public.experiment_registry
  for each row execute function private.touch_governance_updated_at();

alter table public.experiment_registry enable row level security;
revoke all on public.experiment_registry from anon, authenticated;
grant select on public.experiment_registry to authenticated;

drop policy if exists "experiment_registry_admin_read" on public.experiment_registry;
create policy "experiment_registry_admin_read"
  on public.experiment_registry for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role));
comment on policy "experiment_registry_admin_read" on public.experiment_registry
  is 'Admins can audit approved experiments and data collection contracts.';

create table if not exists public.agent_action_contracts (
  id uuid primary key default gen_random_uuid(),
  agent_key text not null,
  action_key text not null,
  version integer not null default 1 check (version > 0),
  active boolean not null default false,
  risk_level text not null default 'medium'
    check (risk_level in ('low', 'medium', 'high', 'critical')),
  requires_human_approval boolean not null default true,
  allowed_operations text[] not null default '{}'::text[],
  prohibited_operations text[] not null default '{}'::text[],
  data_boundaries text not null,
  owner text not null,
  approval_request_id uuid references public.approval_requests(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agent_key, action_key, version),
  constraint agent_action_contracts_key_format
    check (
      agent_key ~ '^[a-z0-9_.:-]{3,120}$'
      and action_key ~ '^[a-z0-9_.:-]{3,120}$'
    )
);

comment on table public.agent_action_contracts
  is 'Machine-readable action boundaries for Zoot Concierge, Hermes and automation agents.';

drop trigger if exists agent_action_contracts_touch
  on public.agent_action_contracts;
create trigger agent_action_contracts_touch
  before update on public.agent_action_contracts
  for each row execute function private.touch_governance_updated_at();

alter table public.agent_action_contracts enable row level security;
revoke all on public.agent_action_contracts from anon, authenticated;
grant select on public.agent_action_contracts to authenticated;

drop policy if exists "agent_action_contracts_admin_read" on public.agent_action_contracts;
create policy "agent_action_contracts_admin_read"
  on public.agent_action_contracts for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role));
comment on policy "agent_action_contracts_admin_read" on public.agent_action_contracts
  is 'Admins can audit agent permissions; no agent can self-approve or expand its own authority.';

create table if not exists public.analytics_event_contracts (
  id uuid primary key default gen_random_uuid(),
  event_name text not null unique,
  destination text not null default 'posthog'
    check (destination in ('posthog', 'sentry', 'internal')),
  status text not null default 'draft'
    check (status in ('draft', 'approved', 'retired')),
  owner text not null,
  purpose text not null,
  allowed_properties text[] not null default '{}'::text[],
  prohibited_properties text[] not null default array[
    'email',
    'phone',
    'address',
    'gate_code',
    'alarm_code',
    'access_instructions',
    'payment_method',
    'card',
    'otp'
  ],
  pii_allowed boolean not null default false,
  retention_days integer not null default 365 check (retention_days between 1 and 2555),
  approval_request_id uuid references public.approval_requests(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint analytics_event_contracts_event_format
    check (event_name ~ '^[a-z0-9_.:-]{3,120}$')
);

comment on table public.analytics_event_contracts
  is 'PostHog/Sentry event privacy contract. Events must be approved before analytics instrumentation ships.';

drop trigger if exists analytics_event_contracts_touch
  on public.analytics_event_contracts;
create trigger analytics_event_contracts_touch
  before update on public.analytics_event_contracts
  for each row execute function private.touch_governance_updated_at();

alter table public.analytics_event_contracts enable row level security;
revoke all on public.analytics_event_contracts from anon, authenticated;
grant select on public.analytics_event_contracts to authenticated;

drop policy if exists "analytics_event_contracts_admin_read" on public.analytics_event_contracts;
create policy "analytics_event_contracts_admin_read"
  on public.analytics_event_contracts for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role));
comment on policy "analytics_event_contracts_admin_read" on public.analytics_event_contracts
  is 'Admins can inspect privacy-approved analytics contracts before instrumentation is activated.';

insert into public.operational_controls (
  control_key,
  control_type,
  environment,
  enabled,
  description,
  owner,
  metadata
)
values
  ('payments.provider_checkout', 'provider_gate', 'all', false, 'Allows Stitch/Ozow hosted checkout creation after provider signature and reconciliation are approved.', 'finance-security', '{"launch_phase":"phase_7"}'),
  ('support.openai_fallback', 'feature_flag', 'all', false, 'Allows Zoot Concierge to call OpenAI after redaction, rate limiting and escalation controls pass review.', 'support-security', '{"launch_phase":"phase_5"}'),
  ('twilio.operational_messages', 'provider_gate', 'all', false, 'Allows transactional SMS/WhatsApp sends after Twilio account upgrade, approved sender, templates and signature callbacks are verified.', 'operations-security', '{"launch_phase":"phase_9"}'),
  ('care_plus.checkout', 'feature_flag', 'all', false, 'Allows Care+ paid membership checkout after payment backend and app-store policy review.', 'product-finance', '{"launch_phase":"phase_3"}'),
  ('zooter.sensitive_access', 'kill_switch', 'all', true, 'Emergency switch for contractor sensitive household access. If disabled, get-sensitive-access must deny all reveals.', 'trust-safety', '{"sensitive_data":true}'),
  ('native.voice_booking_prefill', 'feature_flag', 'all', false, 'Allows Siri/Android assistant deep links to prefill booking flows without creating bookings or charging payments.', 'mobile-security', '{"launch_phase":"phase_10"}')
on conflict (control_key, environment)
do update set
  control_type = excluded.control_type,
  description = excluded.description,
  owner = excluded.owner,
  metadata = excluded.metadata,
  updated_at = now();

insert into public.agent_action_contracts (
  agent_key,
  action_key,
  version,
  active,
  risk_level,
  requires_human_approval,
  allowed_operations,
  prohibited_operations,
  data_boundaries,
  owner
)
values
  (
    'zoot_concierge',
    'answer_public_support_question',
    1,
    true,
    'low',
    false,
    array['answer_from_approved_knowledge', 'suggest_app_route', 'offer_human_escalation'],
    array['refund_payment', 'change_booking', 'approve_claim', 'reveal_sensitive_data', 'admin_action'],
    'Use public Zoot knowledge and redacted user text only. No account-specific claims without authenticated Edge Function context.',
    'support-security'
  ),
  (
    'zoot_concierge',
    'account_support_triage',
    1,
    false,
    'high',
    true,
    array['create_support_followup', 'mark_ticket_escalated'],
    array['refund_payment', 'change_payment_method', 'reassign_zooter', 'reveal_sensitive_data', 'delete_account'],
    'Authenticated support tickets only. High-risk payment, safety, legal and account-impacting cases require human review.',
    'support-security'
  ),
  (
    'native_assistant',
    'prefill_booking_flow',
    1,
    false,
    'medium',
    false,
    array['open_app_route', 'prefill_service_type', 'prefill_requested_date'],
    array['create_booking', 'confirm_payment', 'include_address', 'include_booking_id', 'include_sensitive_household_notes'],
    'Deep links may carry only safe intent, date and service category parameters. Final booking confirmation happens in-app.',
    'mobile-security'
  )
on conflict (agent_key, action_key, version)
do update set
  active = excluded.active,
  risk_level = excluded.risk_level,
  requires_human_approval = excluded.requires_human_approval,
  allowed_operations = excluded.allowed_operations,
  prohibited_operations = excluded.prohibited_operations,
  data_boundaries = excluded.data_boundaries,
  owner = excluded.owner,
  updated_at = now();

insert into public.analytics_event_contracts (
  event_name,
  destination,
  status,
  owner,
  purpose,
  allowed_properties,
  pii_allowed
)
values
  ('booking_flow_started', 'posthog', 'draft', 'growth-product', 'Measure booking funnel entry by service category and area without identifying private addresses.', array['service_category', 'launch_area', 'source', 'device_type'], false),
  ('care_plus_cta_clicked', 'posthog', 'draft', 'growth-product', 'Measure Care+ conversion interest without recording household details.', array['cta_location', 'membership_state', 'device_type'], false),
  ('concierge_answer_reported', 'posthog', 'draft', 'support-security', 'Track support answer quality and safety feedback.', array['source', 'reason', 'signed_in', 'role'], false),
  ('zooter_training_module_completed', 'posthog', 'draft', 'operations-quality', 'Measure Zooter training completion by module category without storing private contractor documents.', array['module_category', 'score_band', 'badge_awarded'], false)
on conflict (event_name)
do update set
  destination = excluded.destination,
  status = excluded.status,
  owner = excluded.owner,
  purpose = excluded.purpose,
  allowed_properties = excluded.allowed_properties,
  pii_allowed = excluded.pii_allowed,
  updated_at = now();
