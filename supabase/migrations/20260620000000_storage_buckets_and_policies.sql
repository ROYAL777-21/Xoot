-- Production storage buckets and access policies for Zoot.
-- Buckets are created idempotently so this migration can run on staging and production.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('kyc-docs', 'kyc-docs', false, 8388608, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('zooter-avatars', 'zooter-avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('booking-completion-photos', 'booking-completion-photos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('support-attachments', 'support-attachments', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('kie-prompts', 'kie-prompts', false, 1048576, array['application/json', 'text/plain', 'text/markdown']),
  ('kie-outputs', 'kie-outputs', false, 26214400, array['image/jpeg', 'image/png', 'image/webp', 'application/json']),
  ('marketing-assets', 'marketing-assets', true, 26214400, array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "kyc_docs_owner_insert" on storage.objects;
drop policy if exists "kyc_docs_owner_admin_read" on storage.objects;
drop policy if exists "kyc_docs_owner_update_delete" on storage.objects;
drop policy if exists "zooter_avatars_public_read" on storage.objects;
drop policy if exists "zooter_avatars_owner_write" on storage.objects;
drop policy if exists "zooter_avatars_owner_update" on storage.objects;
drop policy if exists "booking_completion_photos_booking_participant_insert" on storage.objects;
drop policy if exists "booking_completion_photos_booking_participant_read" on storage.objects;
drop policy if exists "booking_completion_photos_booking_participant_update" on storage.objects;
drop policy if exists "support_attachments_owner_insert" on storage.objects;
drop policy if exists "support_attachments_owner_admin_read" on storage.objects;
drop policy if exists "support_attachments_owner_update" on storage.objects;
drop policy if exists "support_attachments_owner_delete" on storage.objects;
drop policy if exists "kie_private_admin_only" on storage.objects;
drop policy if exists "marketing_assets_public_read" on storage.objects;
drop policy if exists "marketing_assets_admin_write" on storage.objects;

create policy "kyc_docs_owner_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'kyc-docs'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "kyc_docs_owner_admin_read"
  on storage.objects for select
  using (
    bucket_id = 'kyc-docs'
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or public.has_role(auth.uid(), 'admin')
    )
  );

create policy "kyc_docs_owner_update_delete"
  on storage.objects for delete
  using (
    bucket_id = 'kyc-docs'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "zooter_avatars_owner_write"
  on storage.objects for insert
  with check (
    bucket_id = 'zooter-avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "zooter_avatars_owner_update"
  on storage.objects for update
  using (
    bucket_id = 'zooter-avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'zooter-avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "booking_completion_photos_booking_participant_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'booking-completion-photos'
    and exists (
      select 1
      from public.bookings b
      where b.id::text = (storage.foldername(name))[1]
        and (b.user_id = auth.uid() or b.zooter_id = auth.uid())
    )
  );

create policy "booking_completion_photos_booking_participant_read"
  on storage.objects for select
  using (
    bucket_id = 'booking-completion-photos'
    and (
      exists (
        select 1
        from public.bookings b
        where b.id::text = (storage.foldername(name))[1]
          and (b.user_id = auth.uid() or b.zooter_id = auth.uid())
      )
      or public.has_role(auth.uid(), 'admin')
    )
  );

create policy "booking_completion_photos_booking_participant_update"
  on storage.objects for update
  using (
    bucket_id = 'booking-completion-photos'
    and exists (
      select 1
      from public.bookings b
      where b.id::text = (storage.foldername(name))[1]
        and (b.user_id = auth.uid() or b.zooter_id = auth.uid())
    )
  )
  with check (
    bucket_id = 'booking-completion-photos'
    and exists (
      select 1
      from public.bookings b
      where b.id::text = (storage.foldername(name))[1]
        and (b.user_id = auth.uid() or b.zooter_id = auth.uid())
    )
  );

create policy "support_attachments_owner_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'support-attachments'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "support_attachments_owner_admin_read"
  on storage.objects for select
  using (
    bucket_id = 'support-attachments'
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or public.has_role(auth.uid(), 'admin')
    )
  );

create policy "support_attachments_owner_update"
  on storage.objects for update
  using (
    bucket_id = 'support-attachments'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'support-attachments'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "support_attachments_owner_delete"
  on storage.objects for delete
  using (
    bucket_id = 'support-attachments'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "kie_private_admin_only"
  on storage.objects for all
  using (
    bucket_id in ('kie-prompts', 'kie-outputs')
    and public.has_role(auth.uid(), 'admin')
  )
  with check (
    bucket_id in ('kie-prompts', 'kie-outputs')
    and public.has_role(auth.uid(), 'admin')
  );

create policy "marketing_assets_admin_write"
  on storage.objects for insert
  with check (
    bucket_id = 'marketing-assets'
    and public.has_role(auth.uid(), 'admin')
  );
