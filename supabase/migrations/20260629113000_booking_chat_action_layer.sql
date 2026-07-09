-- Phase 2 booking-scoped chat hardening.
-- Keeps the existing messages table and moves sends/reports/read receipts behind
-- authenticated Edge Functions. Message bodies remain encrypted client envelopes.

alter table public.messages
  add column if not exists sender_user_id uuid references auth.users(id) on delete set null,
  add column if not exists envelope_version integer not null default 1,
  add column if not exists client_safety_flags text[] not null default '{}'::text[],
  add column if not exists moderation_state text not null default 'clear',
  add column if not exists reported_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'messages_envelope_version_positive'
      and conrelid = 'public.messages'::regclass
  ) then
    alter table public.messages
      add constraint messages_envelope_version_positive check (envelope_version > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'messages_moderation_state_valid'
      and conrelid = 'public.messages'::regclass
  ) then
    alter table public.messages
      add constraint messages_moderation_state_valid
      check (moderation_state in ('clear', 'flagged_client', 'reported', 'reviewed'));
  end if;
end $$;

create index if not exists messages_booking_created_idx
  on public.messages(booking_id, created_at);

create index if not exists messages_sender_user_idx
  on public.messages(sender_user_id);

alter table public.messages enable row level security;
revoke insert, update, delete on table public.messages from authenticated;

drop policy if exists "messages_participants_insert" on public.messages;
comment on table public.messages
  is 'Booking-scoped encrypted chat messages. Browser/mobile clients read by RLS but send only through send-booking-message so participant checks, rate limits and chat controls are enforced.';

do $$
declare
  v_constraint_name text;
begin
  select conname
  into v_constraint_name
  from pg_constraint
  where conrelid = 'public.admin_review_queue'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%queue_type%'
  limit 1;

  if v_constraint_name is not null then
    execute format('alter table public.admin_review_queue drop constraint %I', v_constraint_name);
  end if;

  alter table public.admin_review_queue
    add constraint admin_review_queue_queue_type_check
    check (
      queue_type in (
        'kyc',
        'trust_incident',
        'reliability',
        'payment',
        'support',
        'replacement',
        'b2b_invoice',
        'booking_chat_report'
      )
    );
end $$;

comment on constraint admin_review_queue_queue_type_check
  on public.admin_review_queue
  is 'Allows only known admin review queue categories, including booking chat safety reports created by report-booking-message.';

create table if not exists public.booking_message_reports (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  details text,
  status text not null default 'open'
    check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null
);

comment on table public.booking_message_reports
  is 'Reports for booking-scoped chat messages. Inserts are performed by report-booking-message so participant authorization and admin queue creation happen together.';

create index if not exists booking_message_reports_booking_idx
  on public.booking_message_reports(booking_id, created_at desc);

create index if not exists booking_message_reports_reporter_idx
  on public.booking_message_reports(reporter_id, created_at desc);

alter table public.booking_message_reports enable row level security;
revoke all on table public.booking_message_reports from anon, authenticated;
grant select on table public.booking_message_reports to authenticated;

drop policy if exists "booking_message_reports_select_owner_or_admin"
  on public.booking_message_reports;
create policy "booking_message_reports_select_owner_or_admin"
  on public.booking_message_reports for select
  to authenticated
  using (
    reporter_id = (select auth.uid())
    or private.has_role((select auth.uid()), 'admin'::public.app_role)
  );
comment on policy "booking_message_reports_select_owner_or_admin"
  on public.booking_message_reports
  is 'Reporters can see their own chat reports, and admins can triage all chat reports.';

create table if not exists public.booking_message_read_receipts (
  message_id uuid not null references public.messages(id) on delete cascade,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

comment on table public.booking_message_read_receipts
  is 'Read receipts for booking chat. Writes go through mark-booking-message-read so only booking participants can mark messages read.';

create index if not exists booking_message_read_receipts_booking_idx
  on public.booking_message_read_receipts(booking_id, read_at desc);

alter table public.booking_message_read_receipts enable row level security;
revoke all on table public.booking_message_read_receipts from anon, authenticated;
grant select on table public.booking_message_read_receipts to authenticated;

drop policy if exists "booking_message_read_receipts_participants_select"
  on public.booking_message_read_receipts;
create policy "booking_message_read_receipts_participants_select"
  on public.booking_message_read_receipts for select
  to authenticated
  using (
    exists (
      select 1
      from public.bookings b
      left join public.zooters z on z.id = b.zooter_id
      where b.id = booking_message_read_receipts.booking_id
        and (
          b.user_id = (select auth.uid())
          or z.user_id = (select auth.uid())
          or private.has_role((select auth.uid()), 'admin'::public.app_role)
        )
    )
  );
comment on policy "booking_message_read_receipts_participants_select"
  on public.booking_message_read_receipts
  is 'Booking clients, assigned Zooters, and admins can read receipt state for that booking.';

create table if not exists public.booking_chat_typing_indicators (
  booking_id uuid not null references public.bookings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  is_typing boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (booking_id, user_id)
);

comment on table public.booking_chat_typing_indicators
  is 'Lightweight booking chat typing state. Values are non-sensitive and booking-participant scoped.';

alter table public.booking_chat_typing_indicators enable row level security;
grant select, insert, update on table public.booking_chat_typing_indicators to authenticated;

drop policy if exists "booking_chat_typing_participants_select"
  on public.booking_chat_typing_indicators;
create policy "booking_chat_typing_participants_select"
  on public.booking_chat_typing_indicators for select
  to authenticated
  using (
    exists (
      select 1
      from public.bookings b
      left join public.zooters z on z.id = b.zooter_id
      where b.id = booking_chat_typing_indicators.booking_id
        and (
          b.user_id = (select auth.uid())
          or z.user_id = (select auth.uid())
          or private.has_role((select auth.uid()), 'admin'::public.app_role)
        )
    )
  );
comment on policy "booking_chat_typing_participants_select"
  on public.booking_chat_typing_indicators
  is 'Booking participants and admins can see typing state for that booking.';

drop policy if exists "booking_chat_typing_own_upsert"
  on public.booking_chat_typing_indicators;
create policy "booking_chat_typing_own_upsert"
  on public.booking_chat_typing_indicators for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.bookings b
      left join public.zooters z on z.id = b.zooter_id
      where b.id = booking_chat_typing_indicators.booking_id
        and (
          b.user_id = (select auth.uid())
          or z.user_id = (select auth.uid())
        )
    )
  );
comment on policy "booking_chat_typing_own_upsert"
  on public.booking_chat_typing_indicators
  is 'Booking clients and assigned Zooters can create only their own typing indicator rows.';

drop policy if exists "booking_chat_typing_own_update"
  on public.booking_chat_typing_indicators;
create policy "booking_chat_typing_own_update"
  on public.booking_chat_typing_indicators for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
comment on policy "booking_chat_typing_own_update"
  on public.booking_chat_typing_indicators
  is 'Booking participants can update only their own typing indicator rows.';

insert into public.operational_controls (
  control_key,
  control_type,
  environment,
  enabled,
  description,
  owner,
  approval_required,
  metadata
) values (
  'booking.chat_send',
  'feature_flag',
  'all',
  true,
  'Allows booking participants to send encrypted in-app booking chat messages through the Edge action layer.',
  'operations-security',
  false,
  '{"launch_phase":"phase_2","disable_path":"Set enabled=false to stop new booking chat sends without disabling historical reads."}'::jsonb
) on conflict (control_key, environment) do update
set description = excluded.description,
    metadata = public.operational_controls.metadata || excluded.metadata;

insert into public.analytics_event_contracts (
  event_name,
  destination,
  status,
  owner,
  purpose,
  allowed_properties,
  pii_allowed
) values (
  'booking_chat_message_reported',
  'posthog',
  'draft',
  'trust-safety',
  'Track user-submitted booking chat reports for safety and moderation quality without message body content.',
  array['role', 'reason', 'booking_status'],
  false
) on conflict (event_name) do update
set destination = excluded.destination,
    status = excluded.status,
    owner = excluded.owner,
    purpose = excluded.purpose,
    allowed_properties = excluded.allowed_properties,
    pii_allowed = excluded.pii_allowed,
    updated_at = now();
