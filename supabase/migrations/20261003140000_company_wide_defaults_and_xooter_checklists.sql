-- Company-wide integrity additions: one default home/address per user and an auditable
-- Xooter job checklist that customers can read while only the assigned Xooter can act through
-- the Edge Function.

-- Repair historical duplicates deterministically before adding the unique indexes.
with ranked as (
  select id, row_number() over (partition by user_id order by updated_at desc nulls last, created_at asc, id) as rn
  from public.household_profiles
  where is_default
)
update public.household_profiles h
set is_default = false, updated_at = now()
from ranked r
where h.id = r.id and r.rn > 1;

with ranked as (
  select id, row_number() over (partition by user_id order by created_at asc, id) as rn
  from public.saved_addresses
  where is_default
)
update public.saved_addresses a
set is_default = false
from ranked r
where a.id = r.id and r.rn > 1;

create unique index if not exists household_profiles_one_default_per_user
  on public.household_profiles(user_id) where is_default;
create unique index if not exists saved_addresses_one_default_per_user
  on public.saved_addresses(user_id) where is_default;

create table if not exists public.xooter_job_checklist (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.xooter_jobs(id) on delete cascade,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  task_key text not null check (task_key in ('confirm_arrival','start_work','final_walkthrough','completion_photos')),
  label text not null,
  position integer not null check (position > 0),
  completed_at timestamptz,
  completed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, task_key)
);
create index if not exists xooter_job_checklist_booking_idx on public.xooter_job_checklist(booking_id, position);
create index if not exists xooter_job_checklist_job_idx on public.xooter_job_checklist(job_id, position);

insert into public.xooter_job_checklist(job_id, booking_id, task_key, label, position)
select j.id, j.booking_id, v.task_key, v.label, v.position
from public.xooter_jobs j
cross join (values
  ('confirm_arrival', 'Confirm arrival plan', 1),
  ('start_work', 'Start the visit', 2),
  ('final_walkthrough', 'Complete the final walkthrough', 3),
  ('completion_photos', 'Add completion photos', 4)
) as v(task_key, label, position)
on conflict (job_id, task_key) do nothing;

create or replace function public.seed_xooter_job_checklist()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.xooter_job_checklist(job_id, booking_id, task_key, label, position)
  values
    (new.id, new.booking_id, 'confirm_arrival', 'Confirm arrival plan', 1),
    (new.id, new.booking_id, 'start_work', 'Start the visit', 2),
    (new.id, new.booking_id, 'final_walkthrough', 'Complete the final walkthrough', 3),
    (new.id, new.booking_id, 'completion_photos', 'Add completion photos', 4)
  on conflict (job_id, task_key) do nothing;
  return new;
end;
$$;
revoke all on function public.seed_xooter_job_checklist() from public, anon, authenticated;
drop trigger if exists seed_xooter_job_checklist_after_insert on public.xooter_jobs;
create trigger seed_xooter_job_checklist_after_insert
after insert on public.xooter_jobs
for each row execute function public.seed_xooter_job_checklist();

alter table public.xooter_job_checklist enable row level security;
drop policy if exists xooter_job_checklist_participants_read on public.xooter_job_checklist;
create policy xooter_job_checklist_participants_read on public.xooter_job_checklist
for select to authenticated using (
  exists (select 1 from public.xooter_jobs j join public.xooters x on x.id = j.xooter_id where j.id = xooter_job_checklist.job_id and x.user_id = auth.uid())
  or exists (select 1 from public.bookings b where b.id = xooter_job_checklist.booking_id and b.user_id = auth.uid())
  or public.has_role(auth.uid(), 'admin')
);
revoke insert, update, delete on public.xooter_job_checklist from anon, authenticated;
grant select on public.xooter_job_checklist to authenticated;

comment on table public.xooter_job_checklist is 'Server-seeded, auditable Xooter job tasks. Mutations go through xooter-job-checklist Edge Function.';
