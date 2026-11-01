-- Final postcondition after all historical and quarantine migrations.
-- Restrictive KYC barriers MUST still cover anon, even though no permissive
-- Storage policy admits that role. Removing anon from a restrictive policy
-- would weaken the barrier if a future permissive policy is added.
do $final_storage$
declare p record;
begin
  -- Staging's older equivalent policy history also needs these supported role
  -- restrictions. Never narrow a RESTRICTIVE quarantine barrier's API roles.
  for p in select policyname from pg_policies where schemaname='storage' and tablename='objects'
    and permissive='PERMISSIVE' loop
    if p.policyname not in ('booking_completion_photos_booking_participant_insert','booking_completion_photos_booking_participant_read',
      'kie_private_admin_only','kyc_docs_owner_admin_read','kyc_docs_owner_insert','kyc_docs_owner_update_delete','kyc_docs_owner_delete',
      'marketing_assets_admin_write','support_attachments_owner_admin_read','support_attachments_owner_delete','support_attachments_owner_insert',
      'support_attachments_owner_update','xooter_avatars_owner_update','xooter_avatars_owner_write') then
      raise exception 'Unexpected Storage permissive policy requires review: %',p.policyname;
    end if;
    execute format('alter policy %I on storage.objects to authenticated',p.policyname);
  end loop;
  if exists (select from pg_class where oid in ('storage.objects'::regclass,'storage.buckets'::regclass)
    and not relrowsecurity) then raise exception 'Managed Storage RLS must remain enabled'; end if;
  if exists (select from pg_policies where schemaname='storage' and permissive='PERMISSIVE'
    and ('anon'=any(roles) or 'public'=any(roles))) then
    raise exception 'Anonymous Storage permissive policy requires review';
  end if;
  if (select count(*) from pg_policies where schemaname='storage' and tablename='objects'
    and policyname in ('kyc_raw_deletes_closed','kyc_raw_reads_closed','kyc_raw_updates_closed','kyc_registered_paths_no_reuse')
    and permissive='RESTRICTIVE' and 'anon'=any(roles) and 'authenticated'=any(roles)) <> 4 then
    raise exception 'All four restrictive KYC quarantine barriers must cover both API roles';
  end if;
  if exists (select from unnest(array['anon','authenticated']) r(role_name)
    cross join unnest(array['storage.objects','storage.buckets']) t(table_name)
    where has_table_privilege(r.role_name,t.table_name,'TRUNCATE') or has_table_privilege(r.role_name,t.table_name,'TRIGGER')) then
    raise exception 'Managed Storage API roles must not hold bulk or trigger privileges';
  end if;
end;
$final_storage$;
