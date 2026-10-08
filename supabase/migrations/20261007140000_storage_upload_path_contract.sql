-- Preserve the October hardening while admitting the existing {owner-or-booking}/{file}
-- upload contract. storage.foldername excludes the filename: this path has ONE folder.
-- A second folder must remain denied. No table grants, read/delete policies, MIME limits,
-- completion-evidence overwrite rules or service-role capabilities change here.
begin;

alter policy "xooter_avatars_owner_write" on storage.objects
with check (
  bucket_id = 'xooter-avatars'
  and (select auth.uid())::text = (storage.foldername(name))[1]
  and coalesce(array_length(storage.foldername(name), 1), 0) = 1
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
);

alter policy "xooter_avatars_owner_update" on storage.objects
with check (
  bucket_id = 'xooter-avatars'
  and (select auth.uid())::text = (storage.foldername(name))[1]
  and coalesce(array_length(storage.foldername(name), 1), 0) = 1
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
);

alter policy "kyc_docs_owner_insert" on storage.objects
with check (
  bucket_id = 'kyc-docs'
  and (select auth.uid())::text = (storage.foldername(name))[1]
  and coalesce(array_length(storage.foldername(name), 1), 0) = 1
  and lower(storage.extension(name)) in ('pdf', 'jpg', 'jpeg', 'png', 'webp')
);

alter policy "kyc_docs_owner_update_delete" on storage.objects
with check (
  bucket_id = 'kyc-docs'
  and (select auth.uid())::text = (storage.foldername(name))[1]
  and coalesce(array_length(storage.foldername(name), 1), 0) = 1
  and lower(storage.extension(name)) in ('pdf', 'jpg', 'jpeg', 'png', 'webp')
);

alter policy "booking_completion_photos_booking_participant_insert" on storage.objects
with check (
  bucket_id = 'booking-completion-photos'
  and coalesce(array_length(storage.foldername(name), 1), 0) = 1
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
  and exists (
    select 1 from public.bookings b
    left join public.xooters x on x.id = b.xooter_id
    where b.id::text = (storage.foldername(name))[1]
      and (b.user_id = (select auth.uid()) or x.user_id = (select auth.uid()))
  )
);

commit;
