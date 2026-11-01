-- Supabase defaults may grant TRUNCATE, REFERENCES and TRIGGER as well as DML.
-- RLS only filters row operations; it cannot protect TRUNCATE. Keep participant
-- reads and the existing service-only mutation RPC; remove all client writes.
begin;
revoke all privileges on table public.xooter_job_checklist from public, anon, authenticated;
grant select on table public.xooter_job_checklist to authenticated;

do $checklist_acl$
begin
  if not has_table_privilege('authenticated', 'public.xooter_job_checklist', 'SELECT')
    or has_table_privilege('anon', 'public.xooter_job_checklist', 'SELECT')
    or exists (
      select from unnest(array['anon','authenticated']) r(role_name)
      cross join unnest(array['INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) p(privilege_name)
      where has_table_privilege(r.role_name, 'public.xooter_job_checklist', p.privilege_name)
    ) then
    raise exception 'Checklist client privileges must be participant SELECT only';
  end if;
end;
$checklist_acl$;
commit;
