-- Phase 4: completed-booking invoices.
-- Invoices are immutable snapshots. Generated PDFs live in a private bucket and
-- delivery is queued through the existing integration_outbox.

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
  is 'Immutable completed-booking invoice snapshots. Clients/admins may read; only backend service-role workers create PDFs and queue delivery.';
comment on column public.booking_invoices.snapshot
  is 'Point-in-time invoice facts captured from bookings and payment_records so later booking edits cannot alter issued invoices.';
comment on column public.booking_invoices.line_items
  is 'Immutable line-item snapshot used to render the private PDF and Brevo email context.';
comment on column public.booking_invoices.pdf_path
  is 'Private storage path in booking-invoices bucket. The path convention is user_id/invoice_id.pdf for owner-scoped access.';

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

drop policy if exists "booking_invoices_owner_or_admin_read" on public.booking_invoices;
create policy "booking_invoices_owner_or_admin_read"
  on public.booking_invoices for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or public.has_role((select auth.uid()), 'admin')
  );

comment on policy "booking_invoices_owner_or_admin_read" on public.booking_invoices
  is 'Clients can read their own completed-booking invoices; admins can read invoices for support and finance reconciliation.';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('booking-invoices', 'booking-invoices', false, 2097152, array['application/pdf'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "booking_invoices_owner_admin_read" on storage.objects;
drop policy if exists "booking_invoices_no_client_write" on storage.objects;

create policy "booking_invoices_owner_admin_read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'booking-invoices'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or public.has_role((select auth.uid()), 'admin')
    )
  );

comment on policy "booking_invoices_owner_admin_read" on storage.objects
  is 'Private invoice PDFs are readable only by the owning user folder or an admin; writes are service-role only.';
