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
-- Measured on BOTH projects before writing this:
--   zooter-avatars  public=true  objects=0   |   xooter-avatars: does not exist
--   public.xooters: 0 rows with photo_url set, on either project
-- So nothing anywhere references the old bucket.
--
-- ⚠️ THE OLD BUCKET IS NOT DELETED HERE, AND CANNOT BE. The first version of this migration ended
-- with `delete from storage.buckets where id = 'zooter-avatars'`. Supabase rejected it:
--
--     ERROR: Direct deletion from storage tables is not allowed. Use the Storage API instead.
--     (SQLSTATE 42501)  At statement: 6
--
-- Caught by the Supabase preview branch on push, which is why this was never applied by hand. The
-- failure is also informative: it failed at the LAST statement, so everything before it is
-- permitted — inserting a bucket, and dropping and creating policies on `storage.objects`.
--
-- Retiring the empty `zooter-avatars` bucket is therefore an ops action through the Storage API or
-- the dashboard, not a migration. It is cosmetic: after this runs the bucket has no policies, no
-- objects, and nothing in the product ever names it. Left for Release, noted in the worklog.
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

-- 2. Refuse to run if anything is in the old bucket.
--
--    Deliberately NOT `update storage.objects set bucket_id = …`. That statement did execute in the
--    rejected version, but against zero rows, which proves nothing about whether the same trigger
--    that blocks deletion would block a real per-row move. Rather than ship a statement whose
--    behaviour under load I cannot vouch for, this fails loudly and hands the move to the Storage
--    API — the same interface Supabase's own error message points at.
--
--    The product cannot put anything here: it only ever names `xooter-avatars`. The only way this
--    fires is a manual dashboard upload, which is exactly the case that deserves a human.
do $$
begin
  if exists (select 1 from storage.objects where bucket_id = 'zooter-avatars') then
    raise exception
      'zooter-avatars is not empty. Move its objects to xooter-avatars through the Storage API, then re-run.';
  end if;
end
$$;

-- 3. Recreate the two policies against the new id.
--
--    ⚠️ This is the step that makes the rename real. Both policies carry `bucket_id =
--    'zooter-avatars'` INSIDE their bodies — read live from `pg_policies`, not guessed from the
--    three migrations that have touched this bucket. A policy body is stored as text, so pointing
--    the app at a new bucket without this leaves every upload failing a second way that looks
--    identical to the first. It is the same mechanism that left eight function bodies pointing at
--    dropped columns after ZD-029.
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
