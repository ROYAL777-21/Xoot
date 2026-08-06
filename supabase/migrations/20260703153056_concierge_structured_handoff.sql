-- Concierge structured human handoff.
-- Additive only: support_tickets remains the canonical support case table.
-- This table stores a privacy-safe handoff envelope for support review.

create table if not exists public.support_handoff_contexts (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete set null,
  role_type text not null default 'user'
    check (role_type in ('user', 'zooter', 'admin')),
  intent_category text not null default 'general',
  urgency_level integer not null default 2
    check (urgency_level between 1 and 5),
  customer_stated_issue text not null,
  safe_context jsonb not null default '{}'::jsonb,
  recommended_queue text not null default 'support',
  recommended_owner text not null default 'Customer Support Agent',
  requested_action text not null default 'review_and_reply',
  consent_to_share_context boolean not null default false,
  correlation_id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint support_handoff_contexts_safe_context_is_object
    check (jsonb_typeof(safe_context) = 'object')
);

comment on table public.support_handoff_contexts
  is 'Privacy-safe Concierge handoff context tied to the canonical support_tickets record. Excludes gate codes, alarm codes, lockbox codes, raw payment data, OTPs, private household access notes, fraud data and provider payloads.';
comment on column public.support_handoff_contexts.safe_context
  is 'Only sanitized non-sensitive routing context is allowed. Do not store full addresses, access codes, raw payment details, internal notes, secrets or provider payloads.';
comment on column public.support_handoff_contexts.customer_stated_issue
  is 'Sanitized summary of the user-stated issue. Sensitive values must be redacted before insert.';

create index if not exists support_handoff_contexts_ticket_idx
  on public.support_handoff_contexts(ticket_id);
create index if not exists support_handoff_contexts_user_created_idx
  on public.support_handoff_contexts(user_id, created_at desc);
create index if not exists support_handoff_contexts_urgency_created_idx
  on public.support_handoff_contexts(urgency_level desc, created_at desc);
create index if not exists support_handoff_contexts_correlation_idx
  on public.support_handoff_contexts(correlation_id);

-- `public.touch_updated_at()` is this repo's timestamp helper, created in
-- 20260421080011 and hardened in 20260620001000 (execute revoked from anon and
-- authenticated so it cannot be called as an RPC).
--
-- This trigger originally named `public.update_updated_at_column()`, which no
-- migration creates and which does not exist in production or staging either —
-- so the statement failed on any build from scratch and would have failed on a
-- real apply too. Caught by the Supabase Preview branch on PR #26.
drop trigger if exists support_handoff_contexts_touch
  on public.support_handoff_contexts;
create trigger support_handoff_contexts_touch
  before update on public.support_handoff_contexts
  for each row execute function public.touch_updated_at();

alter table public.support_handoff_contexts enable row level security;
revoke all on public.support_handoff_contexts from anon, authenticated;
grant select on public.support_handoff_contexts to authenticated;
grant select, insert, update, delete on public.support_handoff_contexts to service_role;

drop policy if exists "support_handoff_contexts_owner_or_admin_read" on public.support_handoff_contexts;
create policy "support_handoff_contexts_owner_or_admin_read"
  on public.support_handoff_contexts for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or private.has_role((select auth.uid()), 'admin'::public.app_role)
  );
comment on policy "support_handoff_contexts_owner_or_admin_read" on public.support_handoff_contexts
  is 'Users may read only their own Concierge handoff envelopes; admins may read them for support operations.';

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
    'concierge.handoff.case_creation_tool',
    'feature_flag',
    'all',
    false,
    'Allows the create-concierge-handoff Edge Function to create sanitized support tickets and handoff envelopes.',
    'support-security',
    '{"phase":"concierge_phase_2","requires":"concierge.support_case_creation,concierge.human_handoff","default":"disabled"}'
  )
on conflict (control_key, environment)
do update set
  control_type = excluded.control_type,
  description = excluded.description,
  owner = excluded.owner,
  metadata = public.operational_controls.metadata || excluded.metadata,
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
    'create_support_escalation_request',
    1,
    true,
    'medium',
    false,
    array['create_support_ticket', 'create_sanitized_handoff_context', 'queue_admin_review', 'queue_in_app_outbox'],
    array[
      'refund_payment',
      'confirm_payment',
      'change_booking',
      'cancel_booking',
      'reschedule_booking',
      'assign_zooter',
      'change_payment_method',
      'issue_zootcred',
      'change_care_plus',
      'submit_claim',
      'approve_claim',
      'change_payout_details',
      'suspend_account',
      'send_unrestricted_provider_message',
      'reveal_sensitive_household_access'
    ],
    'The action may store only a redacted support summary, role type, intent, urgency and non-sensitive routing context. It must not store or expose full addresses, access codes, OTPs, payment details, private notes, provider payloads, internal fraud data or support investigation notes.',
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
