-- Zoot full operating layer from the master document and addendum.
-- External vendors are represented by queued operational records until provider credentials exist.

do $$
begin
  alter type public.subscription_status add value if not exists 'pending_payment';
exception
  when duplicate_object then null;
end $$;

update public.subscription_plans
set
  name = 'HomeCare+',
  perks = array[
    'Priority support',
    'Favourite contractor continuity',
    'Reduced service fees',
    'Recurring schedule lock',
    'Emergency booking priority',
    'Flexible cancellation windows',
    'Loyalty rewards',
    'Birthday perks',
    'Seasonal home-care tips'
  ]
where lower(name) = 'care+';

alter table public.zooter_applications
  add column if not exists suburb text,
  add column if not exists years_experience integer,
  add column if not exists transport text,
  add column if not exists supplies_owned text[] not null default '{}',
  add column if not exists pet_comfort text,
  add column if not exists availability jsonb not null default '{}'::jsonb,
  add column if not exists selfie_storage_path text,
  add column if not exists behavioural_screening jsonb not null default '{}'::jsonb,
  add column if not exists third_party_verification_status text not null default 'pending',
  add column if not exists activation_locked_reason text;

alter table public.bookings
  add column if not exists launch_region text,
  add column if not exists property_account_id uuid,
  add column if not exists high_demand_premium numeric not null default 0,
  add column if not exists service_fee numeric not null default 0,
  add column if not exists booking_cover_amount numeric not null default 0,
  add column if not exists payment_status text not null default 'pending',
  add column if not exists at_risk boolean not null default false,
  add column if not exists replacement_status text;

create table if not exists public.payment_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete set null,
  amount numeric(10,2) not null check (amount >= 0),
  currency text not null default 'ZAR',
  payment_kind text not null check (payment_kind in ('booking', 'homecare_membership', 'gift_clean', 'b2b_invoice', 'booking_cover', 'placement_admin_fee')),
  provider text not null default 'manual_pending',
  provider_reference text,
  status text not null default 'pending' check (status in ('pending', 'admin_confirmed', 'paid', 'failed', 'cancelled', 'refunded')),
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.integration_outbox (
  id uuid primary key default gen_random_uuid(),
  source_table text,
  source_id uuid,
  event_type text not null,
  channel text not null check (channel in ('in_app', 'brevo_email', 'whatsapp_urgent', 'twilio_voice', 'payment_provider', 'mie_screening', 'airtable_ops')),
  owner text not null,
  stack_tool text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check (status in ('queued', 'needs_approval', 'processing', 'completed', 'failed', 'cancelled')),
  failure_mode text,
  approval_required boolean not null default false,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  scheduled_at timestamptz,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_review_queue (
  id uuid primary key default gen_random_uuid(),
  queue_type text not null check (queue_type in ('kyc', 'trust_incident', 'reliability', 'payment', 'support', 'replacement', 'b2b_invoice')),
  subject_table text not null,
  subject_id uuid,
  user_id uuid references auth.users(id) on delete set null,
  zooter_id uuid references public.zooters(id) on delete set null,
  booking_id uuid references public.bookings(id) on delete set null,
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  status text not null default 'open' check (status in ('open', 'in_review', 'resolved', 'closed')),
  summary text not null,
  assigned_to uuid references auth.users(id) on delete set null,
  resolution_notes text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.zootcred_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete set null,
  amount numeric(10,2) not null check (amount >= 0),
  direction text not null check (direction in ('credit', 'debit')),
  reason text not null check (reason in ('referral', 'no_show_compensation', 'gift_credit', 'loyalty_reward', 'admin_adjustment', 'redemption')),
  status text not null default 'available' check (status in ('pending', 'available', 'redeemed', 'expired', 'cancelled')),
  expires_at timestamptz,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.gift_clean_orders (
  id uuid primary key default gen_random_uuid(),
  purchaser_user_id uuid not null references auth.users(id) on delete cascade,
  recipient_name text not null,
  recipient_email text,
  recipient_phone text,
  occasion text,
  message text,
  service_type text not null default 'residential',
  amount numeric(10,2) not null,
  status text not null default 'pending_payment' check (status in ('pending_payment', 'paid', 'sent', 'redeemed', 'cancelled')),
  payment_record_id uuid references public.payment_records(id) on delete set null,
  created_at timestamptz not null default now(),
  redeemed_at timestamptz
);

create table if not exists public.property_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_type text not null check (account_type in ('airbnb_host', 'landlord', 'property_manager', 'office_estate')),
  name text not null,
  billing_email text,
  default_service_type text not null default 'airbnb',
  monthly_invoice boolean not null default true,
  preferred_days text[] not null default '{}',
  notes text,
  status text not null default 'active' check (status in ('active', 'paused', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'bookings_property_account_id_fkey'
      and conrelid = 'public.bookings'::regclass
  ) then
    alter table public.bookings
      add constraint bookings_property_account_id_fkey
      foreign key (property_account_id) references public.property_accounts(id) on delete set null;
  end if;
end $$;

create table if not exists public.support_followups (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid references public.support_tickets(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  trigger_type text not null check (trigger_type in ('low_rating', 'incident', 'refund_review', 'replacement_needed', 'support_resolution', 'manual')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  due_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.sensitive_access_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  booking_id uuid references public.bookings(id) on delete cascade,
  access_granted boolean not null,
  reason text not null,
  requested_fields text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.contractor_screening_questions (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  category text not null check (category in ('etiquette', 'premium_home', 'pet_handling', 'fragile_items', 'punctuality', 'trust_safety')),
  expected_signal text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.automation_skills (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  trigger_event text not null,
  action text not null,
  owner text not null,
  stack_tool text not null,
  data_used text not null,
  failure_mode text not null,
  approval_gate text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.masked_call_sessions (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  caller_id uuid not null references auth.users(id) on delete cascade,
  callee_role text not null check (callee_role in ('client', 'contractor')),
  provider text not null default 'twilio_voice',
  status text not null default 'queued' check (status in ('queued', 'active', 'completed', 'failed', 'cancelled')),
  recording_consent boolean not null default false,
  failure_reason text,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_payment_records_user on public.payment_records(user_id, created_at desc);
create index if not exists idx_payment_records_booking on public.payment_records(booking_id);
create index if not exists idx_integration_outbox_status on public.integration_outbox(status, channel, created_at);
create index if not exists idx_admin_review_queue_status on public.admin_review_queue(status, priority, created_at);
create index if not exists idx_zootcred_ledger_user on public.zootcred_ledger(user_id, created_at desc);
create index if not exists idx_property_accounts_user on public.property_accounts(user_id, status);
create index if not exists idx_sensitive_access_logs_booking on public.sensitive_access_logs(booking_id, created_at desc);

alter table public.payment_records enable row level security;
alter table public.integration_outbox enable row level security;
alter table public.admin_review_queue enable row level security;
alter table public.zootcred_ledger enable row level security;
alter table public.gift_clean_orders enable row level security;
alter table public.property_accounts enable row level security;
alter table public.support_followups enable row level security;
alter table public.sensitive_access_logs enable row level security;
alter table public.contractor_screening_questions enable row level security;
alter table public.automation_skills enable row level security;
alter table public.masked_call_sessions enable row level security;

grant select, insert, update on table public.payment_records to authenticated;
grant select, insert, update on table public.integration_outbox to authenticated;
grant select, insert, update on table public.admin_review_queue to authenticated;
grant select, insert on table public.zootcred_ledger to authenticated;
grant select, insert, update on table public.gift_clean_orders to authenticated;
grant select, insert, update on table public.property_accounts to authenticated;
grant select, insert, update on table public.support_followups to authenticated;
grant select, insert on table public.sensitive_access_logs to authenticated;
grant select on table public.contractor_screening_questions to authenticated;
grant select on table public.automation_skills to authenticated;
grant select, insert, update on table public.masked_call_sessions to authenticated;

drop policy if exists "users view own payment records" on public.payment_records;
create policy "users view own payment records"
  on public.payment_records for select
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

drop policy if exists "users create own pending payment records" on public.payment_records;
create policy "users create own pending payment records"
  on public.payment_records for insert
  with check (auth.uid() = user_id and status = 'pending');

drop policy if exists "admins update payment records" on public.payment_records;
create policy "admins update payment records"
  on public.payment_records for update
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "users view relevant outbox" on public.integration_outbox;
create policy "users view relevant outbox"
  on public.integration_outbox for select
  using (created_by = auth.uid() or public.has_role(auth.uid(), 'admin'));

drop policy if exists "authenticated create provider outbox rows" on public.integration_outbox;
create policy "authenticated create provider outbox rows"
  on public.integration_outbox for insert
  with check (created_by = auth.uid() or public.has_role(auth.uid(), 'admin'));

drop policy if exists "admins manage provider outbox rows" on public.integration_outbox;
create policy "admins manage provider outbox rows"
  on public.integration_outbox for update
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "admins manage review queue" on public.admin_review_queue;
create policy "admins manage review queue"
  on public.admin_review_queue for all
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "users create review requests" on public.admin_review_queue;
create policy "users create review requests"
  on public.admin_review_queue for insert
  with check (auth.uid() = user_id or user_id is null or public.has_role(auth.uid(), 'admin'));

drop policy if exists "users view own zootcred" on public.zootcred_ledger;
create policy "users view own zootcred"
  on public.zootcred_ledger for select
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

drop policy if exists "users create own zootcred ledger rows" on public.zootcred_ledger;
create policy "users create own zootcred ledger rows"
  on public.zootcred_ledger for insert
  with check ((auth.uid() = user_id and direction = 'debit') or public.has_role(auth.uid(), 'admin'));

drop policy if exists "users manage own gift orders" on public.gift_clean_orders;
create policy "users manage own gift orders"
  on public.gift_clean_orders for all
  using (auth.uid() = purchaser_user_id or public.has_role(auth.uid(), 'admin'))
  with check (auth.uid() = purchaser_user_id or public.has_role(auth.uid(), 'admin'));

drop policy if exists "users manage own property accounts" on public.property_accounts;
create policy "users manage own property accounts"
  on public.property_accounts for all
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'))
  with check (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

drop policy if exists "users view own support followups" on public.support_followups;
create policy "users view own support followups"
  on public.support_followups for select
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

drop policy if exists "users create own support followups" on public.support_followups;
create policy "users create own support followups"
  on public.support_followups for insert
  with check (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

drop policy if exists "admins update support followups" on public.support_followups;
create policy "admins update support followups"
  on public.support_followups for update
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "participants view sensitive access logs" on public.sensitive_access_logs;
create policy "participants view sensitive access logs"
  on public.sensitive_access_logs for select
  using (
    actor_id = auth.uid()
    or exists (
      select 1 from public.bookings b
      where b.id = sensitive_access_logs.booking_id and b.user_id = auth.uid()
    )
    or public.has_role(auth.uid(), 'admin')
  );

drop policy if exists "authenticated create sensitive access logs" on public.sensitive_access_logs;
create policy "authenticated create sensitive access logs"
  on public.sensitive_access_logs for insert
  with check (actor_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

drop policy if exists "anyone views active screening questions" on public.contractor_screening_questions;
create policy "anyone views active screening questions"
  on public.contractor_screening_questions for select
  using (active = true or public.has_role(auth.uid(), 'admin'));

drop policy if exists "anyone views active automation skills" on public.automation_skills;
create policy "anyone views active automation skills"
  on public.automation_skills for select
  using (active = true or public.has_role(auth.uid(), 'admin'));

drop policy if exists "booking participants manage masked calls" on public.masked_call_sessions;
create policy "booking participants manage masked calls"
  on public.masked_call_sessions for all
  using (
    caller_id = auth.uid()
    or exists (
      select 1
      from public.bookings b
      left join public.zooters z on z.id = b.zooter_id
      where b.id = masked_call_sessions.booking_id
        and (b.user_id = auth.uid() or z.user_id = auth.uid())
    )
    or public.has_role(auth.uid(), 'admin')
  )
  with check (
    caller_id = auth.uid()
    and exists (
      select 1
      from public.bookings b
      left join public.zooters z on z.id = b.zooter_id
      where b.id = masked_call_sessions.booking_id
        and (b.user_id = auth.uid() or z.user_id = auth.uid())
    )
  );

create or replace function public.can_access_sensitive_data(p_booking_id uuid, p_actor_id uuid default auth.uid())
returns boolean
language plpgsql
set search_path = public
as $$
declare
  booking_row record;
  allowed boolean := false;
  reason text := 'denied';
begin
  select b.*, z.user_id as zooter_user_id
    into booking_row
  from public.bookings b
  left join public.zooters z on z.id = b.zooter_id
  where b.id = p_booking_id;

  if not found then
    return false;
  end if;

  if booking_row.user_id = p_actor_id then
    allowed := true;
    reason := 'client_owner';
  elsif booking_row.zooter_user_id = p_actor_id then
    if booking_row.status::text = 'cancelled' or booking_row.cancelled_at is not null then
      allowed := false;
      reason := 'booking_cancelled';
    elsif now() < booking_row.scheduled_at - interval '45 minutes' then
      allowed := false;
      reason := 'before_access_window';
    elsif booking_row.status::text = 'completed' then
      allowed := now() <= coalesce(booking_row.job_completed_at, booking_row.updated_at, now()) + interval '30 minutes';
      reason := case when allowed then 'completion_wind_down' else 'after_completion_wind_down' end;
    else
      allowed := booking_row.status::text in ('pending', 'confirmed', 'enroute', 'arrived', 'in_progress');
      reason := case when allowed then 'active_booking_window' else 'inactive_status' end;
    end if;
  else
    reason := 'not_booking_participant';
  end if;

  insert into public.sensitive_access_logs (actor_id, booking_id, access_granted, reason)
  values (p_actor_id, p_booking_id, allowed, reason);

  return allowed;
end;
$$;

grant execute on function public.can_access_sensitive_data(uuid, uuid) to authenticated;

create or replace view public.analytics_booking_summary
with (security_invoker = true)
as
select
  date_trunc('day', scheduled_at) as day,
  coalesce(launch_region, 'unknown') as launch_region,
  service,
  coalesce(service_type, 'residential') as service_type,
  count(*) as booking_count,
  sum(price + service_fee + booking_cover_amount + high_demand_premium) as gross_revenue,
  count(*) filter (where frequency = 'repeat') as recurring_count,
  count(*) filter (where status::text = 'cancelled') as cancellation_count
from public.bookings
group by 1, 2, 3, 4;

create or replace view public.analytics_contractor_quality
with (security_invoker = true)
as
select
  z.id as zooter_id,
  z.name,
  z.reliability_score,
  z.job_completion_rate,
  z.repeat_client_count,
  z.rating,
  count(ti.id) as open_incident_count
from public.zooters z
left join public.trust_incidents ti on ti.zooter_id = z.id and ti.status = 'open'
group by z.id, z.name, z.reliability_score, z.job_completion_rate, z.repeat_client_count, z.rating;

grant select on public.analytics_booking_summary to authenticated;
grant select on public.analytics_contractor_quality to authenticated;

insert into public.contractor_screening_questions (question, category, expected_signal)
values
  ('A client has fragile glassware on the counter. What do you do before cleaning that area?', 'fragile_items', 'Asks permission, cleans around fragile items, reports risk.'),
  ('You are running 15 minutes late because of traffic. What happens next?', 'punctuality', 'Communicates immediately through the app and keeps the client updated.'),
  ('A dog is anxious when you arrive. How do you proceed?', 'pet_handling', 'Keeps distance, follows pet notes, contacts client if needed.'),
  ('A premium-home client gives a correction during the visit. How do you respond?', 'premium_home', 'Acknowledges calmly, corrects professionally, avoids defensiveness.'),
  ('A client asks to pay you privately next time. What do you do?', 'trust_safety', 'Keeps the booking on-platform and reports off-platform payment risk.')
on conflict do nothing;

insert into public.automation_skills (name, trigger_event, action, owner, stack_tool, data_used, failure_mode, approval_gate)
values
  ('Booking confirmation notification', 'booking_confirmed', 'Send in-app confirmation and queue email confirmation.', 'Product Strategist', 'App native + Brevo', 'booking_id, user_id, zooter_id, scheduled_at', 'Create admin review row if notification queue fails.', 'None'),
  ('Contractor on the way urgent update', 'contractor_on_the_way', 'Send in-app update and queue urgent WhatsApp.', 'Operations Strategist', 'App native + WhatsApp urgent', 'booking_id, status, scheduled_at', 'Fallback to in-app only and flag operations.', 'None'),
  ('Booking end sensitive access revocation', 'booking_completed_or_cancelled', 'Revoke contractor sensitive household access and log attempts.', 'Trust Strategist', 'App + API', 'booking_id, status, completed_at, cancelled_at', 'Flag repeated denied access attempts for trust review.', 'None'),
  ('Low rating support follow-up', 'post_job_rating_below_three', 'Create support follow-up and admin review queue item.', 'Customer Support Agent', 'App native + Airtable ops', 'booking_id, rating, notes', 'Escalate to support queue if admin queue insert fails.', 'Human support required'),
  ('Care membership renewed', 'homecare_membership_renewed', 'Send in-app confirmation and queue email summary.', 'Retention & Loyalty Agent', 'App native + Brevo', 'user_id, plan_id, payment_record_id', 'Create payment review item if renewal status is unclear.', 'Payment confirmation required')
on conflict (name) do nothing;
