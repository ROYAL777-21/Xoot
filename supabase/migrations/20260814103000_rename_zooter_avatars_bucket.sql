-- ZD-029, sixth surface: the storage bucket the rename never reached.
--
-- `src/pages/xooter/Profile.tsx:65` uploads to `xooter-avatars`. That bucket has never existed.
-- The bucket is `zooter-avatars`, created by `20260422031848` and re-affirmed by `20260620000000`,
-- and **no migration ever renamed it** — `20260813160000` renamed tables, columns, views and an enum
-- label; `20260813140000` renamed data values (control keys, agent keys, event names). Neither
-- touched `storage.buckets`, which is neither schema nor ordinary data.
--
-- So a Xooter who picks a profile photo gets `Bucket not found` from `.upload()` and the toast shows
-- it. It fails visibly and closed — nothing is written anywhere wrong — but **no Xooter can set a
-- profile photo**, and `photo_url` is what the client sees next to the person entering their home.
--
-- Measured before writing this, on BOTH projects:
--   zooter-avatars  public=true  objects=0        xooter-avatars: does not exist
-- So there is nothing to migrate. The move-objects step below is still written, because "0 rows
-- today" is not "0 rows when this is applied".
--
-- ⚠️ THE POLICIES ARE THE POINT. Two policies carry `bucket_id = 'zooter-avatars'` inside their
-- bodies, read live from `pg_policies` rather than guessed from the three migrations that have
-- touched this bucket:
--
--   zooter_avatars_owner_update  UPDATE  qual + with_check
--   zooter_avatars_owner_write   INSERT  with_check
--
-- A policy body is stored as text. Renaming the bucket does not rewrite it — the same reason ZD-029
-- left eight function bodies pointing at dropped columns. Renaming the bucket WITHOUT this step
-- would leave both policies matching a bucket id that no longer exists, so uploads would fail a
-- second way and look like the same bug.
--
-- ⚠️ Cross-role: `supabase/migrations/**` is Release's path. Written by Correctness & Safety because
-- ZD-029 is mine and this is its sixth casualty. Flagged in the worklog.
--
-- Ordering: migration BEFORE any web deploy. The repo already says `xooter-avatars`, so applying
-- this can only fix the feature; the reverse order leaves it exactly as broken as it is now.

-- 1. The new bucket, settings copied from the live row rather than from the oldest migration.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('xooter-avatars', 'xooter-avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- 2. Carry over anything uploaded between the measurement above and this being applied.
update storage.objects set bucket_id = 'xooter-avatars' where bucket_id = 'zooter-avatars';

-- 3. Recreate the two policies against the new id. Dropped by their real names; `if exists` so this
--    is safe on a project where a previous attempt got part-way.
drop policy if exists "zooter_avatars_owner_write" on storage.objects;
drop policy if exists "zooter_avatars_owner_update" on storage.objects;

create policy "xooter_avatars_owner_write"
  on storage.objects for insert
  with check (
    bucket_id = 'xooter-avatars'
    and (auth.uid())::text = (storage.foldername(name))[1]
  );

create policy "xooter_avatars_owner_update"
  on storage.objects for update
  using (
    bucket_id = 'xooter-avatars'
    and (auth.uid())::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'xooter-avatars'
    and (auth.uid())::text = (storage.foldername(name))[1]
  );

-- 4. Only once it is empty. Fails loudly rather than orphaning objects if step 2 somehow did not run.
delete from storage.buckets
where id = 'zooter-avatars'
  and not exists (select 1 from storage.objects where bucket_id = 'zooter-avatars');
