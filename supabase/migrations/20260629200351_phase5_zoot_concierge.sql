-- Phase 5 Zoot Concierge hardening.
-- Additive controls for versioned public knowledge, answer feedback, and
-- anonymous abuse gates. The Concierge remains answer-only: it cannot create
-- bookings, change payments, approve refunds, reveal sensitive data, or perform
-- admin actions.

create table if not exists public.zoot_concierge_knowledge_versions (
  id uuid primary key default gen_random_uuid(),
  version_key text not null unique,
  status text not null default 'draft'
    check (status in ('draft', 'active', 'retired')),
  source_summary text not null,
  knowledge_context text not null,
  effective_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint zoot_concierge_knowledge_version_key_format
    check (version_key ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}\.[a-z0-9_.:-]{3,80}$')
);

comment on table public.zoot_concierge_knowledge_versions
  is 'Versioned source-of-truth snapshots for Zoot Concierge answers. Edge Functions use bundled knowledge until live DB-backed retrieval is explicitly approved.';
comment on column public.zoot_concierge_knowledge_versions.knowledge_context
  is 'Public-safe Zoot knowledge only. Do not store secrets, private user data, access codes, full addresses, payment data, ID documents, or unsupported guarantees here.';

alter table public.zoot_concierge_knowledge_versions enable row level security;
revoke all on table public.zoot_concierge_knowledge_versions from anon, authenticated;
grant select on table public.zoot_concierge_knowledge_versions to authenticated;

drop policy if exists "zoot_concierge_knowledge_admin_read"
  on public.zoot_concierge_knowledge_versions;
create policy "zoot_concierge_knowledge_admin_read"
  on public.zoot_concierge_knowledge_versions for select
  to authenticated
  using (public.has_role((select auth.uid()), 'admin'::public.app_role));
comment on policy "zoot_concierge_knowledge_admin_read"
  on public.zoot_concierge_knowledge_versions
  is 'Admins can audit Concierge knowledge versions; public answers are served through support-respond, not direct table reads.';

create table if not exists public.zoot_concierge_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  role text not null default 'user'
    check (role in ('user', 'zooter')),
  source text not null
    check (source in ('knowledge_base', 'openai_responses', 'human_escalation', 'local_knowledge', 'unknown')),
  knowledge_version text,
  reason text not null,
  answer_excerpt text,
  conversation_context text,
  status text not null default 'new'
    check (status in ('new', 'triaged', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  constraint zoot_concierge_feedback_reason_length
    check (char_length(trim(reason)) between 3 and 240),
  constraint zoot_concierge_feedback_answer_length
    check (answer_excerpt is null or char_length(answer_excerpt) <= 900),
  constraint zoot_concierge_feedback_context_length
    check (conversation_context is null or char_length(conversation_context) <= 900)
);

comment on table public.zoot_concierge_feedback
  is 'User-reported Concierge answer feedback. Inserts are performed by report-concierge-answer so prompts can be sanitized, rate-limited and audited.';

create index if not exists zoot_concierge_feedback_created_idx
  on public.zoot_concierge_feedback(created_at desc);
create index if not exists zoot_concierge_feedback_user_idx
  on public.zoot_concierge_feedback(user_id, created_at desc);

alter table public.zoot_concierge_feedback enable row level security;
revoke all on table public.zoot_concierge_feedback from anon, authenticated;
grant select on table public.zoot_concierge_feedback to authenticated;

drop policy if exists "zoot_concierge_feedback_admin_read"
  on public.zoot_concierge_feedback;
create policy "zoot_concierge_feedback_admin_read"
  on public.zoot_concierge_feedback for select
  to authenticated
  using (public.has_role((select auth.uid()), 'admin'::public.app_role));
comment on policy "zoot_concierge_feedback_admin_read"
  on public.zoot_concierge_feedback
  is 'Admins can review reported Concierge answers; clients cannot enumerate or insert feedback directly.';

insert into public.zoot_concierge_knowledge_versions (
  version_key,
  status,
  source_summary,
  knowledge_context
)
values (
  '2026-06-29.phase5',
  'active',
  'Bundled public Zoot Concierge knowledge covering services, launch areas, Care+, ZootCred, trust rules, onboarding, and protected support boundaries.',
  'Zoot is a premium South African home-care platform for vetted independent cleaning contractors called Zooters. Launch focus is Johannesburg suburbs before wider Gauteng, Pretoria, then Cape Town. Core services include once-off home cleaning, recurring home care, express resets, deep cleaning, moving cleans, Airbnb turnover cleaning, landlord handovers, and office resets. Care+ is R99/month where live and covers Home Memory, favourite Zooter workflows, smart reminders, priority support, and member ZootCred benefits. Sensitive access details, payments, refunds, booking changes, replacements, damage reports, complaints, and private account details require protected app flows and human review where risk exists.'
)
on conflict (version_key)
do update set
  status = excluded.status,
  source_summary = excluded.source_summary,
  knowledge_context = excluded.knowledge_context;

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
    'support.turnstile_required',
    'feature_flag',
    'all',
    false,
    'Requires successful Cloudflare Turnstile validation for anonymous Zoot Concierge requests after the domain and widget are configured.',
    'support-security',
    '{"launch_phase":"phase_5","domain_required":true}'
  ),
  (
    'support.concierge_feedback',
    'feature_flag',
    'all',
    true,
    'Allows users and guests to report Zoot Concierge answers through a server-side, rate-limited feedback path.',
    'support-security',
    '{"launch_phase":"phase_5"}'
  )
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
    'report_answer_feedback',
    1,
    true,
    'low',
    false,
    array['record_sanitized_feedback', 'queue_human_review_signal'],
    array['refund_payment', 'change_booking', 'approve_claim', 'reveal_sensitive_data', 'admin_action', 'store_access_codes'],
    'Feedback may include sanitized answer excerpts and non-sensitive context only. No private booking state, payments, addresses, gate codes, OTPs or account secrets.',
    'support-security'
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
