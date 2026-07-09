-- Phase 7 payments and payout verification foundation.
-- Additive only: records provider readiness, reconciliation checks and payout
-- verification state without activating live checkout, charging, or payout
-- release paths.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to service_role;

create table if not exists public.payment_provider_capabilities (
  id uuid primary key default gen_random_uuid(),
  provider text not null
    check (provider in ('stitch', 'ozow')),
  environment text not null default 'production'
    check (environment in ('staging', 'production')),
  hosted_checkout_enabled boolean not null default false,
  webhook_signature_verified boolean not null default false,
  callback_urls_verified boolean not null default false,
  reconciliation_verified boolean not null default false,
  reconciliation_reference_format text not null default 'ZOOT-{PROVIDER}-{BOOKING8}-{PAYMENT8}',
  payout_supported boolean not null default false,
  approval_request_id uuid references public.approval_requests(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, environment),
  constraint payment_provider_capabilities_approval_consistency
    check (approved_at is null or approved_by is not null),
  constraint payment_provider_reference_format_safe
    check (
      reconciliation_reference_format like 'ZOOT-%'
      and reconciliation_reference_format not like '%{SECRET}%'
      and reconciliation_reference_format not like '%{CARD}%'
    )
);

comment on table public.payment_provider_capabilities
  is 'Provider readiness contract for Stitch and Ozow. It records non-secret verification state only; credentials remain in Edge Function/provider secret stores.';
comment on column public.payment_provider_capabilities.hosted_checkout_enabled
  is 'False until provider-hosted checkout has been approved and smoke-tested. Frontend success is never authoritative.';
comment on column public.payment_provider_capabilities.webhook_signature_verified
  is 'True only after signed provider webhook verification is tested with rotated secrets.';
comment on column public.payment_provider_capabilities.reconciliation_reference_format
  is 'Human-readable reference format for finance reconciliation. It must not include secrets or card/payment credentials.';

create index if not exists payment_provider_capabilities_lookup_idx
  on public.payment_provider_capabilities(provider, environment);

drop trigger if exists payment_provider_capabilities_touch
  on public.payment_provider_capabilities;
create trigger payment_provider_capabilities_touch
  before update on public.payment_provider_capabilities
  for each row execute function private.touch_governance_updated_at();

alter table public.payment_provider_capabilities enable row level security;
revoke all on public.payment_provider_capabilities from anon, authenticated;
grant select on public.payment_provider_capabilities to authenticated;
grant all on public.payment_provider_capabilities to service_role;

drop policy if exists "payment_provider_capabilities_admin_read"
  on public.payment_provider_capabilities;
create policy "payment_provider_capabilities_admin_read"
  on public.payment_provider_capabilities for select
  to authenticated
  using (public.has_role((select auth.uid()), 'admin'::public.app_role));
comment on policy "payment_provider_capabilities_admin_read" on public.payment_provider_capabilities
  is 'Admins can audit payment provider readiness state; clients cannot activate providers or read secrets.';

create table if not exists public.payment_reconciliation_checks (
  id uuid primary key default gen_random_uuid(),
  provider text not null
    check (provider in ('stitch', 'ozow')),
  environment text not null default 'production'
    check (environment in ('staging', 'production')),
  payment_record_id uuid references public.payment_records(id) on delete set null,
  provider_event_id uuid references public.provider_events(id) on delete set null,
  provider_reference text not null,
  expected_amount numeric(12,2) not null check (expected_amount >= 0),
  received_amount numeric(12,2) not null check (received_amount >= 0),
  currency text not null default 'ZAR' check (currency = upper(currency) and char_length(currency) = 3),
  status text not null default 'pending'
    check (status in ('pending', 'matched', 'mismatch', 'ignored', 'failed')),
  checked_by uuid references auth.users(id) on delete set null,
  checked_at timestamptz,
  mismatch_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_reconciliation_reference_length
    check (char_length(trim(provider_reference)) between 3 and 160),
  constraint payment_reconciliation_match_consistency
    check (
      status <> 'matched'
      or (
        expected_amount = received_amount
        and checked_at is not null
      )
    )
);

comment on table public.payment_reconciliation_checks
  is 'Finance audit trail for payment provider reconciliation. Records non-secret references, expected/received amounts and outcomes.';

create index if not exists payment_reconciliation_checks_payment_idx
  on public.payment_reconciliation_checks(payment_record_id, created_at desc)
  where payment_record_id is not null;
create index if not exists payment_reconciliation_checks_provider_idx
  on public.payment_reconciliation_checks(provider, environment, status, created_at desc);

drop trigger if exists payment_reconciliation_checks_touch
  on public.payment_reconciliation_checks;
create trigger payment_reconciliation_checks_touch
  before update on public.payment_reconciliation_checks
  for each row execute function private.touch_governance_updated_at();

alter table public.payment_reconciliation_checks enable row level security;
revoke all on public.payment_reconciliation_checks from anon, authenticated;
grant select on public.payment_reconciliation_checks to authenticated;
grant all on public.payment_reconciliation_checks to service_role;

drop policy if exists "payment_reconciliation_checks_admin_read"
  on public.payment_reconciliation_checks;
create policy "payment_reconciliation_checks_admin_read"
  on public.payment_reconciliation_checks for select
  to authenticated
  using (public.has_role((select auth.uid()), 'admin'::public.app_role));
comment on policy "payment_reconciliation_checks_admin_read" on public.payment_reconciliation_checks
  is 'Admins can review reconciliation outcomes; service-role Edge Functions write provider checks.';

create table if not exists public.zooter_payout_accounts (
  id uuid primary key default gen_random_uuid(),
  zooter_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'manual_bank'
    check (provider in ('manual_bank', 'stitch', 'ozow')),
  account_reference_hash text not null,
  account_label text,
  status text not null default 'pending'
    check (status in ('pending', 'verified', 'rejected', 'disabled')),
  verification_method text not null default 'manual_review'
    check (verification_method in ('manual_review', 'provider_microdeposit', 'provider_bank_check')),
  verified_by uuid references auth.users(id) on delete set null,
  verified_at timestamptz,
  disabled_at timestamptz,
  approval_request_id uuid references public.approval_requests(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint zooter_payout_reference_hash_length
    check (char_length(trim(account_reference_hash)) between 32 and 200),
  constraint zooter_payout_verified_consistency
    check (status <> 'verified' or (verified_by is not null and verified_at is not null)),
  constraint zooter_payout_disabled_consistency
    check (status <> 'disabled' or disabled_at is not null)
);

comment on table public.zooter_payout_accounts
  is 'Verified payout account references for Zooters. Stores hashes/references only, never raw bank account numbers or documents.';

create unique index if not exists zooter_one_active_verified_payout_account_idx
  on public.zooter_payout_accounts(zooter_id)
  where status = 'verified';
create index if not exists zooter_payout_accounts_status_idx
  on public.zooter_payout_accounts(status, created_at desc);

drop trigger if exists zooter_payout_accounts_touch
  on public.zooter_payout_accounts;
create trigger zooter_payout_accounts_touch
  before update on public.zooter_payout_accounts
  for each row execute function private.touch_governance_updated_at();

alter table public.zooter_payout_accounts enable row level security;
revoke all on public.zooter_payout_accounts from anon, authenticated;
grant select on public.zooter_payout_accounts to authenticated;
grant all on public.zooter_payout_accounts to service_role;

drop policy if exists "zooter_payout_accounts_owner_or_admin_read"
  on public.zooter_payout_accounts;
create policy "zooter_payout_accounts_owner_or_admin_read"
  on public.zooter_payout_accounts for select
  to authenticated
  using (
    zooter_id = (select auth.uid())
    or public.has_role((select auth.uid()), 'admin'::public.app_role)
  );
comment on policy "zooter_payout_accounts_owner_or_admin_read" on public.zooter_payout_accounts
  is 'Zooters can see their own payout verification status and admins can audit it; raw banking details are not stored here.';

create table if not exists public.payout_change_requests (
  id uuid primary key default gen_random_uuid(),
  zooter_id uuid not null references auth.users(id) on delete cascade,
  previous_payout_account_id uuid references public.zooter_payout_accounts(id) on delete set null,
  requested_payout_account_id uuid references public.zooter_payout_accounts(id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'step_up_required', 'step_up_verified', 'approved', 'rejected', 'cancelled')),
  reason text not null,
  step_up_verified_at timestamptz,
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz,
  approval_request_id uuid references public.approval_requests(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payout_change_reason_length
    check (char_length(trim(reason)) >= 10),
  constraint payout_change_decision_consistency
    check (status not in ('approved', 'rejected') or (decided_by is not null and decided_at is not null)),
  constraint payout_change_step_up_consistency
    check (status <> 'step_up_verified' or step_up_verified_at is not null)
);

comment on table public.payout_change_requests
  is 'Auditable payout account change workflow. A Zooter payout destination cannot be changed silently or without step-up verification.';

create index if not exists payout_change_requests_zooter_idx
  on public.payout_change_requests(zooter_id, status, created_at desc);

drop trigger if exists payout_change_requests_touch
  on public.payout_change_requests;
create trigger payout_change_requests_touch
  before update on public.payout_change_requests
  for each row execute function private.touch_governance_updated_at();

alter table public.payout_change_requests enable row level security;
revoke all on public.payout_change_requests from anon, authenticated;
grant select on public.payout_change_requests to authenticated;
grant all on public.payout_change_requests to service_role;

drop policy if exists "payout_change_requests_owner_or_admin_read"
  on public.payout_change_requests;
create policy "payout_change_requests_owner_or_admin_read"
  on public.payout_change_requests for select
  to authenticated
  using (
    zooter_id = (select auth.uid())
    or public.has_role((select auth.uid()), 'admin'::public.app_role)
  );
comment on policy "payout_change_requests_owner_or_admin_read" on public.payout_change_requests
  is 'Zooters and admins can audit payout change request status; writes require service-role controlled flows.';

create table if not exists public.zooter_payout_holds (
  id uuid primary key default gen_random_uuid(),
  zooter_id uuid not null references auth.users(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete set null,
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'ZAR' check (currency = upper(currency) and char_length(currency) = 3),
  status text not null default 'active'
    check (status in ('active', 'released', 'cancelled')),
  hold_reason text not null,
  release_after timestamptz not null,
  released_by uuid references auth.users(id) on delete set null,
  released_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint zooter_payout_hold_reason_length
    check (char_length(trim(hold_reason)) >= 10),
  constraint zooter_payout_hold_release_consistency
    check (status <> 'released' or (released_by is not null and released_at is not null))
);

comment on table public.zooter_payout_holds
  is 'Configurable payout hold ledger. Holds delay payout release for disputes, trust review, provider settlement or launch policy.';

create index if not exists zooter_payout_holds_lookup_idx
  on public.zooter_payout_holds(zooter_id, booking_id, status, release_after)
  where status = 'active';

drop trigger if exists zooter_payout_holds_touch
  on public.zooter_payout_holds;
create trigger zooter_payout_holds_touch
  before update on public.zooter_payout_holds
  for each row execute function private.touch_governance_updated_at();

alter table public.zooter_payout_holds enable row level security;
revoke all on public.zooter_payout_holds from anon, authenticated;
grant select on public.zooter_payout_holds to authenticated;
grant all on public.zooter_payout_holds to service_role;

drop policy if exists "zooter_payout_holds_owner_or_admin_read"
  on public.zooter_payout_holds;
create policy "zooter_payout_holds_owner_or_admin_read"
  on public.zooter_payout_holds for select
  to authenticated
  using (
    zooter_id = (select auth.uid())
    or public.has_role((select auth.uid()), 'admin'::public.app_role)
  );
comment on policy "zooter_payout_holds_owner_or_admin_read" on public.zooter_payout_holds
  is 'Zooters can see their own payout hold status and admins can audit holds; release writes stay service-role only.';

create or replace function public.can_activate_payment_provider(
  p_provider text,
  p_environment text default 'production'
) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with normalized as (
    select
      lower(trim(coalesce(p_provider, ''))) as provider,
      lower(trim(coalesce(p_environment, 'production'))) as environment
  )
  select exists (
    select 1
    from normalized n
    join public.payment_provider_capabilities c
      on c.provider = n.provider
     and c.environment = n.environment
    join public.approval_requests ar
      on ar.id = c.approval_request_id
     and ar.status = 'approved'
    where c.hosted_checkout_enabled = true
      and c.webhook_signature_verified = true
      and c.callback_urls_verified = true
      and c.reconciliation_verified = true
      and c.approved_at is not null
      and exists (
        select 1
        from public.operational_controls oc
        where oc.control_key = 'payments.provider_checkout'
          and oc.environment in ('all', n.environment)
          and oc.enabled = true
      )
      and exists (
        select 1
        from public.operational_controls oc
        where oc.control_key = 'payments.hosted_checkout.' || n.provider
          and oc.environment in ('all', n.environment)
          and oc.enabled = true
      )
  );
$$;

comment on function public.can_activate_payment_provider(text, text)
  is 'Service-role readiness check for Stitch/Ozow activation. Requires approved capability evidence, signed webhook checks, callback verification, reconciliation, and explicit operational controls.';

revoke all on function public.can_activate_payment_provider(text, text) from public;
grant execute on function public.can_activate_payment_provider(text, text) to service_role;

create or replace function public.can_release_zooter_payout(
  p_zooter_id uuid,
  p_booking_id uuid default null
) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.zooter_payout_accounts account
    where account.zooter_id = p_zooter_id
      and account.status = 'verified'
      and account.verified_at is not null
      and exists (
        select 1
        from public.operational_controls oc
        where oc.control_key = 'payouts.enabled'
          and oc.environment in ('all', 'production')
          and oc.enabled = true
      )
      and not exists (
        select 1
        from public.payout_change_requests change
        where change.zooter_id = p_zooter_id
          and change.status in ('pending', 'step_up_required', 'step_up_verified')
      )
      and not exists (
        select 1
        from public.zooter_payout_holds hold
        where hold.zooter_id = p_zooter_id
          and (p_booking_id is null or hold.booking_id = p_booking_id)
          and hold.status = 'active'
          and hold.release_after > now()
      )
  );
$$;

comment on function public.can_release_zooter_payout(uuid, uuid)
  is 'Service-role readiness check for payout release. Requires a verified payout account, payout control enabled, no pending payout change, and no active hold.';

revoke all on function public.can_release_zooter_payout(uuid, uuid) from public;
grant execute on function public.can_release_zooter_payout(uuid, uuid) to service_role;

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
  ('payments.hosted_checkout.stitch', 'provider_gate', 'all', false, 'Allows Stitch hosted checkout only after signature, callback and reconciliation smoke tests pass.', 'finance-security', '{"launch_phase":"phase_7","provider":"stitch"}'),
  ('payments.hosted_checkout.ozow', 'provider_gate', 'all', false, 'Allows Ozow hosted checkout only after hash/signature, callback and reconciliation smoke tests pass.', 'finance-security', '{"launch_phase":"phase_7","provider":"ozow"}'),
  ('payments.webhook_signature_required', 'kill_switch', 'all', true, 'Requires server-side webhook signature/hash verification for payment success.', 'finance-security', '{"launch_phase":"phase_7"}'),
  ('payments.reconciliation_required', 'kill_switch', 'all', true, 'Requires provider amount, currency and reference reconciliation before payment state changes.', 'finance-security', '{"launch_phase":"phase_7"}'),
  ('payouts.enabled', 'provider_gate', 'all', false, 'Allows Zooter payout release only after verified payout accounts, payout holds and finance approval are live.', 'finance-ops', '{"launch_phase":"phase_7"}'),
  ('payouts.account_change_step_up', 'kill_switch', 'all', true, 'Requires step-up verification and audit trail for payout account changes.', 'trust-finance', '{"launch_phase":"phase_7"}'),
  ('payouts.default_hold', 'release_gate', 'all', true, 'Keeps configurable payout hold policy active for launch and dispute windows.', 'finance-ops', '{"launch_phase":"phase_7"}')
on conflict (control_key, environment)
do update set
  control_type = excluded.control_type,
  description = excluded.description,
  owner = excluded.owner,
  metadata = excluded.metadata,
  updated_at = now();

insert into public.payment_provider_capabilities (
  provider,
  environment,
  hosted_checkout_enabled,
  webhook_signature_verified,
  callback_urls_verified,
  reconciliation_verified,
  payout_supported,
  metadata
)
values
  ('stitch', 'staging', false, false, false, false, false, '{"status":"blocked_until_provider_credentials_and_signed_smoke_tests"}'),
  ('stitch', 'production', false, false, false, false, false, '{"status":"blocked_until_finance_legal_provider_approval"}'),
  ('ozow', 'staging', false, false, false, false, false, '{"status":"blocked_until_provider_credentials_and_signed_smoke_tests"}'),
  ('ozow', 'production', false, false, false, false, false, '{"status":"blocked_until_finance_legal_provider_approval"}')
on conflict (provider, environment)
do update set
  metadata = public.payment_provider_capabilities.metadata || excluded.metadata,
  updated_at = now();
