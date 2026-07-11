-- Restricted vulnerability-disclosure intake. Public clients may submit only
-- through the rate-limited submit-security-report Edge Function.

create table if not exists public.security_disclosure_reports (
  id uuid primary key default gen_random_uuid(),
  public_reference text not null unique,
  status text not null default 'new'
    check (status in ('new', 'triaged', 'needs_information', 'accepted', 'duplicate', 'not_applicable', 'remediated', 'closed')),
  reporter_name text,
  contact_email text,
  contact_preference text not null
    check (contact_preference in ('email', 'no_reply')),
  consent_to_follow_up boolean not null default false,
  affected_asset text not null,
  vulnerability_class text not null
    check (vulnerability_class in ('access_control', 'authentication', 'data_exposure', 'injection', 'business_logic', 'mobile', 'configuration', 'other')),
  reporter_severity text not null
    check (reporter_severity in ('low', 'medium', 'high', 'critical')),
  summary text not null,
  reproduction_steps text not null,
  expected_behavior text not null,
  actual_behavior text not null,
  impact text not null,
  minimal_evidence text,
  disclosure_status text not null
    check (disclosure_status in ('private', 'shared_with_zoot_only', 'previously_disclosed')),
  source text not null default 'public_web'
    check (source in ('public_web', 'approved_internal_import')),
  actor_hash text not null,
  correlation_id uuid not null default gen_random_uuid(),
  assigned_reviewer_id uuid references auth.users(id) on delete set null,
  retention_until timestamptz not null default (now() + interval '180 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint security_disclosure_reports_actor_hash_format
    check (actor_hash ~ '^[a-f0-9]{64}$'),
  constraint security_disclosure_reports_contact_requirement
    check (
      (contact_preference = 'no_reply' and contact_email is null)
      or
      (contact_preference = 'email' and contact_email is not null and consent_to_follow_up)
    )
);

comment on table public.security_disclosure_reports is
  'Restricted vulnerability reports. No direct browser/mobile access; service-role workflows only.';
comment on column public.security_disclosure_reports.actor_hash is
  'Salted rate-limit actor hash. Raw IP addresses and raw user-agent strings are not stored.';

create index if not exists security_disclosure_reports_status_created_idx
  on public.security_disclosure_reports(status, created_at desc);
create index if not exists security_disclosure_reports_retention_idx
  on public.security_disclosure_reports(retention_until);

create table if not exists public.security_disclosure_events (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.security_disclosure_reports(id) on delete cascade,
  event_type text not null
    check (event_type in ('submitted', 'triaged', 'status_changed', 'reviewer_assigned', 'redaction_applied', 'retention_reviewed')),
  actor_type text not null
    check (actor_type in ('public_intake', 'security_reviewer', 'system')),
  actor_user_id uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint security_disclosure_events_metadata_object
    check (jsonb_typeof(metadata) = 'object')
);

comment on table public.security_disclosure_events is
  'Append-only restricted audit trail for vulnerability disclosure handling.';

create index if not exists security_disclosure_events_report_created_idx
  on public.security_disclosure_events(report_id, created_at desc);

alter table public.security_disclosure_reports enable row level security;
alter table public.security_disclosure_events enable row level security;

revoke all on public.security_disclosure_reports from anon, authenticated;
revoke all on public.security_disclosure_events from anon, authenticated;

drop trigger if exists security_disclosure_reports_touch on public.security_disclosure_reports;
create trigger security_disclosure_reports_touch
  before update on public.security_disclosure_reports
  for each row execute function public.set_updated_at();

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
  (
    'security.disclosure_intake',
    'feature_flag',
    'all',
    false,
    'Allows the restricted public vulnerability-disclosure Edge Function to accept reports.',
    'security',
    '{"requires_legal_review":true,"requires_security_owner":true,"requires_turnstile":true,"requires_private_triage_runbook":true}'::jsonb
  ),
  (
    'security.disclosure_turnstile_required',
    'feature_flag',
    'all',
    true,
    'Requires Cloudflare Turnstile verification for every public vulnerability report.',
    'security',
    '{"fail_closed":true}'::jsonb
  ),
  (
    'security.kill.disclosure_intake',
    'kill_switch',
    'all',
    false,
    'Immediately stops public vulnerability-report intake without removing the informational page.',
    'security',
    '{"scope":"security_disclosure_intake"}'::jsonb
  )
on conflict (control_key, environment)
do update set
  control_type = excluded.control_type,
  description = excluded.description,
  owner = excluded.owner,
  metadata = public.operational_controls.metadata || excluded.metadata,
  updated_at = now();

