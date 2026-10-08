-- Keep owner RLS, read-column updates, push CRUD and primary-key replica identity.
-- Client TRUNCATE bypasses RLS; client TRIGGER is unnecessary for either table.
-- One atomic block fails closed if publication or effective privilege checks fail.
do $notifications_permissions$
declare
  client_role text;
  target_table text;
  forbidden_privilege text;
begin
  if not exists (
    select 1 from pg_catalog.pg_publication where pubname = 'supabase_realtime'
  ) then
    raise exception 'Required publication supabase_realtime is missing; notifications were not enabled'
      using errcode = '55000';
  end if;

  revoke truncate, trigger on table public.notifications, public.push_tokens
    from anon, authenticated, public;

  -- Direct revocations do not remove inherited grants or owner/superuser rights.
  -- Require remediation of that configuration rather than silently retaining them.
  foreach client_role in array array['anon', 'authenticated'] loop
    foreach target_table in array array['public.notifications', 'public.push_tokens'] loop
      foreach forbidden_privilege in array array['TRUNCATE', 'TRIGGER'] loop
        if pg_catalog.has_table_privilege(client_role, target_table, forbidden_privilege) then
          raise exception 'Effective % privilege remains for % on %; remediate inherited or owner grants before retrying',
            forbidden_privilege, client_role, target_table
            using errcode = '42501';
        end if;
      end loop;
    end loop;
  end loop;

  if not exists (
    select 1 from pg_catalog.pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table only public.notifications;
  end if;
end
$notifications_permissions$;
