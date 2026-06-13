-- Audit log for sensitive admin actions.
-- Writes should be performed by trusted Edge Functions/service-role workflows.

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references auth.users(id),
  action text not null,
  target_table text not null,
  target_id uuid,
  changes jsonb,
  reason text,
  ip_address text,
  created_at timestamptz not null default now()
);

alter table public.admin_audit_log enable row level security;

revoke insert, update, delete on table public.admin_audit_log from anon, authenticated;
grant select on table public.admin_audit_log to authenticated;

drop policy if exists "audit_log_admin_read" on public.admin_audit_log;
create policy "audit_log_admin_read"
  on public.admin_audit_log for select
  using (public.has_role(auth.uid(), 'admin'));
comment on policy "audit_log_admin_read" on public.admin_audit_log
  is 'Admins can read the immutable audit trail for sensitive admin actions; writes are service-role only.';

comment on table public.admin_audit_log
  is 'Append-only audit log for sensitive admin actions such as payment confirmation, queue resolution, Zooter activation, and trust operations.';
