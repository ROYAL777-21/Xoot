-- Connector-safe public schema convergence for Phase 4 invoices and Phase 6
-- Zoot Black. This migration intentionally excludes policies on
-- storage.objects because the Supabase connector role is not the owner of that
-- relation in live projects. The original full migrations remain authoritative
-- for private file-object policies when run through the dashboard/CLI owner.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to service_role;

-- Production was created from squashed launch migrations and can be missing
-- legacy Zooter columns that later local-chain migrations expect.
alter table public.zooters
  add column if not exists tier text not null default 'new',
  add column if not exists verified boolean not null default false;

comment on column public.zooters.tier
  is 'Compatibility tier used by launch-gated contractor workflows. Zoot Black remains disabled unless explicit controls and evidence pass.';
comment on column public.zooters.verified
  is 'Compatibility verification flag used by contractor readiness workflows. It is not sufficient on its own for Zoot Black eligibility.';

-- Phase 4 invoice public schema. PDF objects remain private and require the
-- storage.objects read policy from the original invoice migration.
create table if not exists public.booking_invoices (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  payment_record_id uuid references public.payment_records(id) on delete set null,
  invoice_number text not null,
  status text not null default 'queued'
    check (status in ('queued', 'generated', 'sent', 'failed', 'void')),
  currency text not null default 'ZAR',
  subtotal_amount numeric(10,2) not null check (subtotal_amount >= 0),
  vat_amount numeric(10,2) not null default 0 check (vat_amount >= 0),
  total_amount numeric(10,2) not null check (total_amount >= 0),
  vat_rate numeric(5,4) not null default 0 check (vat_rate >= 0 and vat_rate <= 1),
  legal_entity_name text not null,
  legal_entity_registration text,
  vat_number text,
  line_items jsonb not null default '[]'::jsonb,
  snapshot jsonb not null default '{}'::jsonb,
  pdf_bucket text not null default 'booking-invoices',
  pdf_path text,
  failure_mode text,
  generated_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_invoices_booking_unique unique (booking_id),
  constraint booking_invoices_invoice_number_unique unique (invoice_number),
  constraint booking_invoices_pdf_bucket_check check (pdf_bucket = 'booking-invoices')
);

comment on table public.booking_invoices
  is 'Immutable completed-booking invoice snapshots. Clients/admins may read rows; private PDF object reads require storage policy deployment by storage owner.';
comment on column public.booking_invoices.snapshot
  is 'Point-in-time invoice facts captured from bookings and payment_records so later booking edits cannot alter issued invoices.';
comment on column public.booking_invoices.pdf_path
  is 'Private storage path in booking-invoices bucket. Object access requires the storage policy from the full invoice migration.';

create index if not exists booking_invoices_user_created_idx
  on public.booking_invoices(user_id, created_at desc);
create index if not exists booking_invoices_payment_record_idx
  on public.booking_invoices(payment_record_id)
  where payment_record_id is not null;

create or replace function public.prevent_booking_invoice_snapshot_mutation()
returns trigger as $$
begin
  if new.booking_id is distinct from old.booking_id
    or new.user_id is distinct from old.user_id
    or new.payment_record_id is distinct from old.payment_record_id
    or new.invoice_number is distinct from old.invoice_number
    or new.currency is distinct from old.currency
    or new.subtotal_amount is distinct from old.subtotal_amount
    or new.vat_amount is distinct from old.vat_amount
    or new.total_amount is distinct from old.total_amount
    or new.vat_rate is distinct from old.vat_rate
    or new.legal_entity_name is distinct from old.legal_entity_name
    or new.legal_entity_registration is distinct from old.legal_entity_registration
    or new.vat_number is distinct from old.vat_number
    or new.line_items is distinct from old.line_items
    or new.snapshot is distinct from old.snapshot
  then
    raise exception 'booking invoice snapshots are immutable';
  end if;

  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

comment on function public.prevent_booking_invoice_snapshot_mutation()
  is 'Prevents post-issue mutation of invoice facts while allowing backend status/PDF delivery fields to advance.';

revoke all on function public.prevent_booking_invoice_snapshot_mutation() from public;
revoke all on function public.prevent_booking_invoice_snapshot_mutation() from anon;
revoke all on function public.prevent_booking_invoice_snapshot_mutation() from authenticated;

drop trigger if exists prevent_booking_invoice_snapshot_mutation on public.booking_invoices;
create trigger prevent_booking_invoice_snapshot_mutation
  before update on public.booking_invoices
  for each row execute function public.prevent_booking_invoice_snapshot_mutation();

alter table public.booking_invoices enable row level security;
revoke all on table public.booking_invoices from anon, authenticated;
grant select on table public.booking_invoices to authenticated;
grant all on table public.booking_invoices to service_role;

drop policy if exists "booking_invoices_owner_or_admin_read" on public.booking_invoices;
create policy "booking_invoices_owner_or_admin_read"
  on public.booking_invoices for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or public.has_role((select auth.uid()), 'admin'::public.app_role)
  );
comment on policy "booking_invoices_owner_or_admin_read" on public.booking_invoices
  is 'Clients can read their own completed-booking invoice rows; admins can read rows for support and finance reconciliation.';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('booking-invoices', 'booking-invoices', false, 2097152, array['application/pdf'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Phase 6 Zoot Black public schema. All customer-facing activation remains
-- disabled by operational controls and explicit approvals.
alter table public.bookings
  add column if not exists zoot_black_requested boolean not null default false,
  add column if not exists zoot_black_line_item_amount numeric(10,2),
  add column if not exists zoot_black_certificate_id uuid;

comment on column public.bookings.zoot_black_requested
  is 'True only when the customer explicitly selected Zoot Black; it must never be preselected.';
comment on column public.bookings.zoot_black_line_item_amount
  is 'Explicit Zoot Black line-item amount captured by a trusted backend after approval gates pass.';
comment on column public.bookings.zoot_black_certificate_id
  is 'Issued Zoot Black service completion certificate reference, if any.';

insert into public.operational_controls (
  control_key,
  control_type,
  environment,
  enabled,
  description,
  owner,
  approval_required,
  metadata
)
values
  (
    'zoot_black.enabled',
    'feature_flag',
    'all',
    false,
    'Allows Zoot Black to appear in booking/payment flows only after founder, operations, supplier and legal approval.',
    'founder-ops-legal',
    true,
    '{"launch_phase":"phase_6","requires":["founder","operations","supplier","legal"],"explicit_only":true}'::jsonb
  ),
  (
    'zoot_black.area_pilot',
    'release_gate',
    'all',
    false,
    'Allows selected-area Zoot Black pilots after supply, equipment and training evidence are approved.',
    'operations-quality',
    true,
    '{"launch_phase":"phase_6","selected_area_only":true}'::jsonb
  ),
  (
    'zoot_black.certificates',
    'feature_flag',
    'all',
    false,
    'Allows backend-issued Zoot Black completion certificates after legal wording and evidence requirements are approved.',
    'trust-legal',
    true,
    '{"launch_phase":"phase_6","no_external_certification_claims":true}'::jsonb
  )
on conflict (control_key, environment)
do update set
  control_type = excluded.control_type,
  description = excluded.description,
  owner = excluded.owner,
  approval_required = excluded.approval_required,
  metadata = excluded.metadata,
  updated_at = now();

create table if not exists public.zoot_black_area_pilots (
  id uuid primary key default gen_random_uuid(),
  area_key text not null unique,
  area_name text not null,
  status text not null default 'draft'
    check (status in ('draft', 'approved', 'paused', 'retired')),
  approval_request_id uuid references public.approval_requests(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  pilot_notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint zoot_black_area_key_format
    check (area_key ~ '^[a-z0-9_-]{3,80}$'),
  constraint zoot_black_area_approval_consistency
    check (status <> 'approved' or (approved_by is not null and approved_at is not null))
);

comment on table public.zoot_black_area_pilots
  is 'Selected-area Zoot Black pilot gates. Rows are admin/service managed and do not imply public availability.';

create index if not exists zoot_black_area_pilots_status_idx
  on public.zoot_black_area_pilots(status, area_key);
create index if not exists zoot_black_area_pilots_approval_idx
  on public.zoot_black_area_pilots(approval_request_id)
  where approval_request_id is not null;

alter table public.zoot_black_area_pilots enable row level security;
revoke all on public.zoot_black_area_pilots from anon, authenticated;
grant select on public.zoot_black_area_pilots to authenticated;
grant all on public.zoot_black_area_pilots to service_role;

drop policy if exists "zoot_black_area_pilots_admin_read"
  on public.zoot_black_area_pilots;
create policy "zoot_black_area_pilots_admin_read"
  on public.zoot_black_area_pilots for select
  to authenticated
  using (public.has_role((select auth.uid()), 'admin'::public.app_role));
comment on policy "zoot_black_area_pilots_admin_read"
  on public.zoot_black_area_pilots
  is 'Only admins can inspect selected-area Zoot Black pilot gates; writes remain service-role/admin tooling only.';

create table if not exists public.zoot_black_training_requirements (
  id uuid primary key default gen_random_uuid(),
  requirement_key text not null unique,
  title text not null,
  description text not null,
  status text not null default 'draft'
    check (status in ('draft', 'approved', 'retired')),
  required_for_status text not null default 'elite_verified'
    check (required_for_status in ('candidate', 'equipment_review', 'training_review', 'elite_verified')),
  approval_request_id uuid references public.approval_requests(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint zoot_black_training_requirement_key_format
    check (requirement_key ~ '^[a-z0-9_.:-]{3,120}$')
);

comment on table public.zoot_black_training_requirements
  is 'Admin-approved Zoot Black training requirements. Existing public training modules are not enough to activate this service.';

create index if not exists zoot_black_training_requirements_status_idx
  on public.zoot_black_training_requirements(status, required_for_status);

alter table public.zoot_black_training_requirements enable row level security;
revoke all on public.zoot_black_training_requirements from anon, authenticated;
grant select on public.zoot_black_training_requirements to authenticated;
grant all on public.zoot_black_training_requirements to service_role;

drop policy if exists "zoot_black_training_requirements_admin_read"
  on public.zoot_black_training_requirements;
create policy "zoot_black_training_requirements_admin_read"
  on public.zoot_black_training_requirements for select
  to authenticated
  using (public.has_role((select auth.uid()), 'admin'::public.app_role));
comment on policy "zoot_black_training_requirements_admin_read"
  on public.zoot_black_training_requirements
  is 'Only admins can inspect Zoot Black training requirements before launch approval.';

create table if not exists public.zoot_black_status_history (
  id uuid primary key default gen_random_uuid(),
  zooter_id uuid not null references public.zooters(id) on delete cascade,
  status text not null
    check (status in ('candidate', 'equipment_review', 'training_review', 'elite_verified', 'paused', 'revoked')),
  reason text not null,
  changed_by uuid references auth.users(id) on delete set null,
  approval_request_id uuid references public.approval_requests(id) on delete set null,
  effective_at timestamptz not null default now(),
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint zoot_black_status_reason_length
    check (char_length(trim(reason)) >= 10)
);

comment on table public.zoot_black_status_history
  is 'Append-only Zoot Black eligibility and status history for Zooters. Only trusted server/admin flows may write rows.';

create index if not exists zoot_black_status_history_zooter_idx
  on public.zoot_black_status_history(zooter_id, effective_at desc);
create index if not exists zoot_black_status_history_status_idx
  on public.zoot_black_status_history(status, effective_at desc);
create index if not exists zoot_black_status_history_approval_idx
  on public.zoot_black_status_history(approval_request_id)
  where approval_request_id is not null;

alter table public.zoot_black_status_history enable row level security;
revoke all on public.zoot_black_status_history from anon, authenticated;
grant select on public.zoot_black_status_history to authenticated;
grant all on public.zoot_black_status_history to service_role;

drop policy if exists "zoot_black_status_history_admin_read"
  on public.zoot_black_status_history;
drop policy if exists "zoot_black_status_history_zooter_read"
  on public.zoot_black_status_history;
create policy "zoot_black_status_history_admin_read"
  on public.zoot_black_status_history for select
  to authenticated
  using (public.has_role((select auth.uid()), 'admin'::public.app_role));
comment on policy "zoot_black_status_history_admin_read"
  on public.zoot_black_status_history
  is 'Admins can audit Zoot Black eligibility decisions and status history.';
create policy "zoot_black_status_history_zooter_read"
  on public.zoot_black_status_history for select
  to authenticated
  using (
    exists (
      select 1
      from public.zooters z
      where z.id = zoot_black_status_history.zooter_id
        and z.user_id = (select auth.uid())
    )
  );
comment on policy "zoot_black_status_history_zooter_read"
  on public.zoot_black_status_history
  is 'Zooters can read their own Zoot Black status history without seeing other contractors.';

create table if not exists public.zoot_black_equipment_evidence (
  id uuid primary key default gen_random_uuid(),
  zooter_id uuid not null references public.zooters(id) on delete cascade,
  evidence_type text not null
    check (evidence_type in ('equipment_photo', 'supplies_receipt', 'sterilisation_protocol', 'storage_photo', 'other')),
  storage_bucket text not null default 'zooter-documents',
  storage_path text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'expired')),
  submitted_by uuid references auth.users(id) on delete set null,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  expires_at timestamptz,
  review_notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint zoot_black_equipment_review_consistency
    check (status = 'pending' or reviewed_at is not null)
);

comment on table public.zoot_black_equipment_evidence
  is 'Private Zoot Black equipment/supply evidence metadata. Files remain in private storage and are never public proof.';

create index if not exists zoot_black_equipment_evidence_zooter_idx
  on public.zoot_black_equipment_evidence(zooter_id, status, created_at desc);
create index if not exists zoot_black_equipment_evidence_review_idx
  on public.zoot_black_equipment_evidence(reviewed_by)
  where reviewed_by is not null;

alter table public.zoot_black_equipment_evidence enable row level security;
revoke all on public.zoot_black_equipment_evidence from anon, authenticated;
grant select on public.zoot_black_equipment_evidence to authenticated;
grant all on public.zoot_black_equipment_evidence to service_role;

drop policy if exists "zoot_black_equipment_evidence_admin_read"
  on public.zoot_black_equipment_evidence;
drop policy if exists "zoot_black_equipment_evidence_zooter_read"
  on public.zoot_black_equipment_evidence;
create policy "zoot_black_equipment_evidence_admin_read"
  on public.zoot_black_equipment_evidence for select
  to authenticated
  using (public.has_role((select auth.uid()), 'admin'::public.app_role));
comment on policy "zoot_black_equipment_evidence_admin_read"
  on public.zoot_black_equipment_evidence
  is 'Admins can review private Zoot Black equipment evidence metadata.';
create policy "zoot_black_equipment_evidence_zooter_read"
  on public.zoot_black_equipment_evidence for select
  to authenticated
  using (
    exists (
      select 1
      from public.zooters z
      where z.id = zoot_black_equipment_evidence.zooter_id
        and z.user_id = (select auth.uid())
    )
  );
comment on policy "zoot_black_equipment_evidence_zooter_read"
  on public.zoot_black_equipment_evidence
  is 'Zooters can read their own Zoot Black equipment review status without enumerating other contractors.';

create table if not exists public.booking_service_line_items (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  item_key text not null,
  label text not null,
  quantity numeric(10,2) not null default 1,
  unit_amount numeric(10,2) not null,
  total_amount numeric(10,2) not null,
  currency text not null default 'ZAR',
  source text not null default 'backend'
    check (source in ('backend', 'payment_provider', 'admin')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint booking_service_line_items_key_format
    check (item_key ~ '^[a-z0-9_.:-]{3,120}$'),
  constraint booking_service_line_items_amounts_nonnegative
    check (quantity > 0 and unit_amount >= 0 and total_amount >= 0),
  constraint booking_service_line_items_currency_zar
    check (currency = 'ZAR'),
  unique (booking_id, item_key)
);

comment on table public.booking_service_line_items
  is 'Backend-owned explicit booking line items. Zoot Black must appear here as its own item and never as a hidden bundled charge.';

create index if not exists booking_service_line_items_booking_idx
  on public.booking_service_line_items(booking_id, created_at desc);

alter table public.booking_service_line_items enable row level security;
revoke all on public.booking_service_line_items from anon, authenticated;
grant select on public.booking_service_line_items to authenticated;
grant all on public.booking_service_line_items to service_role;

drop policy if exists "booking_service_line_items_participant_read"
  on public.booking_service_line_items;
create policy "booking_service_line_items_participant_read"
  on public.booking_service_line_items for select
  to authenticated
  using (
    exists (
      select 1
      from public.bookings b
      left join public.zooters z on z.id = b.zooter_id
      where b.id = booking_service_line_items.booking_id
        and (
          b.user_id = (select auth.uid())
          or z.user_id = (select auth.uid())
          or public.has_role((select auth.uid()), 'admin'::public.app_role)
        )
    )
  );
comment on policy "booking_service_line_items_participant_read"
  on public.booking_service_line_items
  is 'Booking clients, assigned Zooters and admins can read explicit service line items; writes stay backend-only.';

create table if not exists public.zoot_black_completion_certificates (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  zooter_id uuid references public.zooters(id) on delete set null,
  client_id uuid not null references auth.users(id) on delete cascade,
  certificate_number text not null unique,
  status text not null default 'draft'
    check (status in ('draft', 'issued', 'revoked')),
  evidence_summary jsonb not null default '{}'::jsonb,
  storage_bucket text not null default 'zoot-black-certificates',
  storage_path text,
  issued_by uuid references auth.users(id) on delete set null,
  issued_at timestamptz,
  revoked_at timestamptz,
  revoke_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint zoot_black_certificate_booking_unique unique (booking_id),
  constraint zoot_black_certificate_status_consistency
    check (
      (status = 'issued' and issued_by is not null and issued_at is not null)
      or (status <> 'issued')
    ),
  constraint zoot_black_certificate_revocation_consistency
    check (
      (status = 'revoked' and revoked_at is not null and char_length(trim(coalesce(revoke_reason, ''))) >= 10)
      or (status <> 'revoked')
    ),
  constraint zoot_black_certificate_number_format
    check (certificate_number ~ '^ZB-[0-9]{8}-[A-Z0-9]{4,}$')
);

comment on table public.zoot_black_completion_certificates
  is 'Zoot-issued Zoot Black completion certificates. These are internal service records, not government, insurer, medical or independent certifications.';
comment on column public.zoot_black_completion_certificates.evidence_summary
  is 'Public-safe service evidence summary. It must not contain gate codes, alarm codes, private notes, identity data or payment secrets.';

create index if not exists zoot_black_completion_certificates_client_idx
  on public.zoot_black_completion_certificates(client_id, created_at desc);
create index if not exists zoot_black_completion_certificates_zooter_idx
  on public.zoot_black_completion_certificates(zooter_id, created_at desc)
  where zooter_id is not null;

alter table public.zoot_black_completion_certificates enable row level security;
revoke all on public.zoot_black_completion_certificates from anon, authenticated;
grant select on public.zoot_black_completion_certificates to authenticated;
grant all on public.zoot_black_completion_certificates to service_role;

drop policy if exists "zoot_black_certificates_client_read"
  on public.zoot_black_completion_certificates;
drop policy if exists "zoot_black_certificates_zooter_read"
  on public.zoot_black_completion_certificates;
drop policy if exists "zoot_black_certificates_admin_read"
  on public.zoot_black_completion_certificates;
create policy "zoot_black_certificates_client_read"
  on public.zoot_black_completion_certificates for select
  to authenticated
  using (client_id = (select auth.uid()));
comment on policy "zoot_black_certificates_client_read"
  on public.zoot_black_completion_certificates
  is 'Clients can read their own Zoot Black completion certificate records.';
create policy "zoot_black_certificates_zooter_read"
  on public.zoot_black_completion_certificates for select
  to authenticated
  using (
    exists (
      select 1
      from public.zooters z
      where z.id = zoot_black_completion_certificates.zooter_id
        and z.user_id = (select auth.uid())
    )
  );
comment on policy "zoot_black_certificates_zooter_read"
  on public.zoot_black_completion_certificates
  is 'Assigned Zooters can read certificate status for work they completed without seeing unrelated clients.';
create policy "zoot_black_certificates_admin_read"
  on public.zoot_black_completion_certificates for select
  to authenticated
  using (public.has_role((select auth.uid()), 'admin'::public.app_role));
comment on policy "zoot_black_certificates_admin_read"
  on public.zoot_black_completion_certificates
  is 'Admins can audit Zoot Black completion certificates for support, quality and legal review.';

alter table public.bookings
  drop constraint if exists bookings_zoot_black_certificate_fk;
alter table public.bookings
  add constraint bookings_zoot_black_certificate_fk
  foreign key (zoot_black_certificate_id)
  references public.zoot_black_completion_certificates(id)
  on delete set null;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('zoot-black-certificates', 'zoot-black-certificates', false, 2097152, array['application/pdf'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.is_zoot_black_eligible(
  p_zooter_id uuid,
  p_area_key text default null
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_enabled boolean;
  v_area_required boolean;
  v_zooter_ok boolean;
  v_latest_status text;
begin
  select exists (
    select 1
    from public.operational_controls c
    where c.control_key = 'zoot_black.enabled'
      and c.enabled = true
      and c.environment = 'all'
  )
  into v_enabled;

  if not coalesce(v_enabled, false) then
    return false;
  end if;

  select exists (
    select 1
    from public.zooters z
    where z.id = p_zooter_id
      and z.active = true
      and z.verified = true
      and lower(coalesce(z.tier, '')) in ('elite', 'elite_verified', 'black')
  )
  into v_zooter_ok;

  if not coalesce(v_zooter_ok, false) then
    return false;
  end if;

  select h.status
  into v_latest_status
  from public.zoot_black_status_history h
  where h.zooter_id = p_zooter_id
    and (h.expires_at is null or h.expires_at > now())
  order by h.effective_at desc
  limit 1;

  if coalesce(v_latest_status, '') <> 'elite_verified' then
    return false;
  end if;

  select exists (
    select 1
    from public.operational_controls c
    where c.control_key = 'zoot_black.area_pilot'
      and c.enabled = true
  )
  into v_area_required;

  if coalesce(v_area_required, false) then
    if nullif(trim(coalesce(p_area_key, '')), '') is null then
      return false;
    end if;

    if not exists (
      select 1
      from public.zoot_black_area_pilots a
      where a.area_key = lower(trim(p_area_key))
        and a.status = 'approved'
    ) then
      return false;
    end if;
  end if;

  return exists (
    select 1
    from public.zoot_black_equipment_evidence e
    where e.zooter_id = p_zooter_id
      and e.status = 'approved'
      and (e.expires_at is null or e.expires_at > now())
  );
end;
$$;

comment on function public.is_zoot_black_eligible(uuid, text)
  is 'Service-role eligibility check for Zoot Black. Returns false unless disabled-by-default controls, Elite status, area gates and equipment evidence all pass.';

revoke all on function public.is_zoot_black_eligible(uuid, text) from public;
revoke all on function public.is_zoot_black_eligible(uuid, text) from anon;
revoke all on function public.is_zoot_black_eligible(uuid, text) from authenticated;
grant execute on function public.is_zoot_black_eligible(uuid, text) to service_role;

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
values (
  'zoot_concierge',
  'explain_zoot_black',
  1,
  false,
  'medium',
  true,
  array['explain_approved_public_waitlist_copy', 'route_to_human_interest_capture'],
  array['sell_zoot_black', 'confirm_availability', 'claim_certification', 'preselect_line_item', 'guarantee_equipment', 'create_booking'],
  'May describe only approved public facts after legal review. Must not imply availability, external certification, insurance approval or guaranteed outcomes.',
  'founder-ops-legal'
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
