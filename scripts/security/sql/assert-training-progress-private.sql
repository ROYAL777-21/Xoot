-- Fail closed under -v ON_ERROR_STOP=1 if the original anonymous read
-- or cross-worker view, excessive table grants, or missing admin/service path remains.
do $$
begin
  if has_table_privilege('anon','public.xooter_training_progress','SELECT') or
     has_table_privilege('anon','public.xooter_training_progress','TRUNCATE') or
     has_table_privilege('authenticated','public.xooter_training_progress','TRUNCATE') or
     has_table_privilege('authenticated','public.xooter_training_progress','INSERT') or
     has_table_privilege('authenticated','public.xooter_training_progress','UPDATE') or
     has_table_privilege('authenticated','public.xooter_training_progress','DELETE') or
     has_table_privilege('authenticated','public.xooter_training_progress','TRIGGER') or
     has_table_privilege('authenticated','public.xooter_training_progress','REFERENCES')
  then
    raise exception 'unsafe anonymous or client training-progress privilege';
  end if;
  if exists(select 1 from pg_policies where schemaname='public'
    and tablename='xooter_training_progress'
    and (policyname in ('training progress visible', 'training_progress_own',
                        'training_progress_insert_own', 'training_progress_update_own') or
         roles @> array['public']::name[]))
  then
    raise exception 'public training progress SELECT policy remains';
  end if;
  if not exists(select 1 from pg_policies where schemaname='public'
    and tablename='xooter_training_progress'
    and policyname='xooter_training_progress_owner_admin_read'
    and cmd='SELECT' and roles = array['authenticated']::name[])
  then
    raise exception 'owner/admin progress policy missing';
  end if;
end
$$;

-- Two ordinary authenticated Xooters must see exactly their own progress.
begin;
set local role authenticated;
set local request.jwt.claim.sub = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
do $$
begin
  if (select count(*) from public.xooter_training_progress) <> 1 or
     not exists(select 1 from public.xooter_training_progress
       where xooter_id='11111111-1111-4111-8111-111111111111'::uuid)
  then raise exception 'worker B can see another worker or loses own record'; end if;
end
$$;
commit;

begin;
set local role authenticated;
set local request.jwt.claim.sub = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
do $$
begin
  if (select count(*) from public.xooter_training_progress) <> 1 or
     not exists(select 1 from public.xooter_training_progress
       where xooter_id='22222222-2222-4222-8222-222222222222'::uuid)
  then raise exception 'worker C can see another worker or loses own record'; end if;
end
$$;
commit;

-- Authenticated non-worker must see nothing.
begin;
set local role authenticated;
set local request.jwt.claim.sub = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
do $$
begin
  if (select count(*) from public.xooter_training_progress) <> 0
  then raise exception 'unregistered user has worker progress'; end if;
end
$$;
commit;

-- Approved admin and the Edge Function service role retain operational access.
begin;
set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
do $$
begin
  if (select count(*) from public.xooter_training_progress) <> 2
  then raise exception 'approved admin lost read access'; end if;
end
$$;
commit;

begin;
set local role service_role;
do $$
begin
  if (select count(*) from public.xooter_training_progress) <> 2
  then raise exception 'service_role training completion path broken'; end if;
end
$$;
commit;
