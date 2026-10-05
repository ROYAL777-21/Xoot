-- Backend security hardening: explicit client write boundaries and storage constraints.
--
-- This migration is intentionally deny-by-default for tables that have no authenticated
-- row policy for a write operation. Server-side Edge Functions use service_role and are
-- unaffected by these client-role revocations.

-- ---------------------------------------------------------------------------
-- 1. Revoke client writes where the repository's RLS baseline has no policy.
-- ---------------------------------------------------------------------------
revoke insert, update, delete on table public.automation_skills from anon, authenticated;
revoke delete on table public.booking_chat_typing_indicators from anon, authenticated;
revoke insert, update, delete on table public.contractor_screening_questions from anon, authenticated;
revoke insert, update, delete on table public.notification_templates from anon, authenticated;
revoke delete on table public.profiles from anon, authenticated;
revoke insert, update, delete on table public.subscription_plans from anon, authenticated;
revoke insert, update, delete on table public.training_modules from anon, authenticated;
revoke insert, update, delete on table public.xooter_earnings from anon, authenticated;
revoke insert, update, delete on table public.xooter_training_progress from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Review requests must always identify their requester unless an admin
--    creates an operational row. A NULL user_id was an avoidable ambiguity.
-- ---------------------------------------------------------------------------
alter table if exists public.admin_review_queue enable row level security;
drop policy if exists "admin_review_queue_insert_user_or_admin" on public.admin_review_queue;
create policy "admin_review_queue_insert_user_or_admin"
  on public.admin_review_queue for insert
  to authenticated
  with check (
    public.has_role((select auth.uid()), 'admin'::public.app_role)
    or user_id = (select auth.uid())
  );

-- Keep auth lookups stable and avoid repeated auth.uid() evaluation per row.
drop policy if exists "customers view own tips" on public.booking_tips;
create policy "customers view own tips"
  on public.booking_tips for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "customers add tip to own completed booking" on public.booking_tips;
create policy "customers add tip to own completed booking"
  on public.booking_tips for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.bookings b
      where b.id = booking_tips.booking_id
        and b.user_id = (select auth.uid())
        and b.status = 'completed'::public.booking_status
    )
  );

drop policy if exists "customers change own unsettled tip" on public.booking_tips;
create policy "customers change own unsettled tip"
  on public.booking_tips for update
  to authenticated
  using (user_id = (select auth.uid()) and settled_at is null)
  with check (user_id = (select auth.uid()) and settled_at is null);

-- ---------------------------------------------------------------------------
-- 3. Normalize bucket controls. These limits are defense in depth; application
--    validation remains useful for user feedback, while Storage enforces them.
-- ---------------------------------------------------------------------------
update storage.buckets
set public = false,
    file_size_limit = 8 * 1024 * 1024,
    allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
where id = 'kyc-docs';

update storage.buckets
set public = true,
    file_size_limit = 5 * 1024 * 1024,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'xooter-avatars';

update storage.buckets
set public = false,
    file_size_limit = 6 * 1024 * 1024,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'booking-completion-photos';

update storage.buckets
set public = false,
    file_size_limit = 2 * 1024 * 1024,
    allowed_mime_types = array['application/pdf']
where id = 'booking-invoices';

update storage.buckets
set public = false,
    file_size_limit = 8 * 1024 * 1024,
    allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
where id in ('support-attachments', 'kie-prompts', 'kie-outputs');

update storage.buckets
set public = false,
    file_size_limit = 2 * 1024 * 1024,
    allowed_mime_types = array['application/pdf']
where id = 'zoot-black-certificates';

-- ---------------------------------------------------------------------------
-- 4. Replace avatar policies with a two-segment owner path and MIME guard.
--    Public read is intentional because avatars are product-facing profile art.
-- ---------------------------------------------------------------------------
drop policy if exists "xooter_avatars_owner_write" on storage.objects;
drop policy if exists "xooter_avatars_owner_update" on storage.objects;
drop policy if exists "zooter_avatars_owner_write" on storage.objects;
drop policy if exists "zooter_avatars_owner_update" on storage.objects;
create policy "xooter_avatars_owner_write"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'xooter-avatars'
    and (select auth.uid())::text = (storage.foldername(name))[1]
    and coalesce(array_length(storage.foldername(name), 1), 0) = 2
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
  );
create policy "xooter_avatars_owner_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'xooter-avatars'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'xooter-avatars'
    and (select auth.uid())::text = (storage.foldername(name))[1]
    and coalesce(array_length(storage.foldername(name), 1), 0) = 2
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
  );

-- ---------------------------------------------------------------------------
-- 5. KYC: private, owner upload/update/delete, admin read only. Keep the
--    two-segment {user_id}/{document} path used by the current client.
-- ---------------------------------------------------------------------------
drop policy if exists "kyc_docs_owner_insert" on storage.objects;
drop policy if exists "kyc_docs_owner_admin_read" on storage.objects;
drop policy if exists "kyc_docs_owner_update_delete" on storage.objects;
create policy "kyc_docs_owner_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'kyc-docs'
    and (select auth.uid())::text = (storage.foldername(name))[1]
    and coalesce(array_length(storage.foldername(name), 1), 0) = 2
    and lower(storage.extension(name)) in ('pdf', 'jpg', 'jpeg', 'png', 'webp')
  );
create policy "kyc_docs_owner_admin_read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'kyc-docs'
    and (
      (select auth.uid())::text = (storage.foldername(name))[1]
      or public.has_role((select auth.uid()), 'admin'::public.app_role)
    )
  );
create policy "kyc_docs_owner_update_delete"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'kyc-docs'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'kyc-docs'
    and (select auth.uid())::text = (storage.foldername(name))[1]
    and coalesce(array_length(storage.foldername(name), 1), 0) = 2
    and lower(storage.extension(name)) in ('pdf', 'jpg', 'jpeg', 'png', 'webp')
  );
create policy "kyc_docs_owner_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'kyc-docs'
    and (
      (select auth.uid())::text = (storage.foldername(name))[1]
      or public.has_role((select auth.uid()), 'admin'::public.app_role)
    )
  );

-- ---------------------------------------------------------------------------
-- 6. Completion photos: participants may insert and read their booking's
--    photos, but authenticated clients cannot overwrite or delete evidence.
--    Server/admin workflows retain management via service_role/admin paths.
-- ---------------------------------------------------------------------------
drop policy if exists "booking_completion_photos_booking_participant_insert" on storage.objects;
drop policy if exists "booking_completion_photos_booking_participant_read" on storage.objects;
drop policy if exists "booking_completion_photos_booking_participant_update" on storage.objects;
drop policy if exists "booking participants upload completion photos" on storage.objects;
drop policy if exists "booking participants read completion photos" on storage.objects;
drop policy if exists "booking participants update completion photos" on storage.objects;
create policy "booking_completion_photos_booking_participant_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'booking-completion-photos'
    and coalesce(array_length(storage.foldername(name), 1), 0) = 2
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
    and exists (
      select 1
      from public.bookings b
      left join public.xooters x on x.id = b.xooter_id
      where b.id::text = (storage.foldername(name))[1]
        and (b.user_id = (select auth.uid()) or x.user_id = (select auth.uid()))
    )
  );
create policy "booking_completion_photos_booking_participant_read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'booking-completion-photos'
    and exists (
      select 1
      from public.bookings b
      left join public.xooters x on x.id = b.xooter_id
      where b.id::text = (storage.foldername(name))[1]
        and (b.user_id = (select auth.uid()) or x.user_id = (select auth.uid())
             or public.has_role((select auth.uid()), 'admin'::public.app_role))
    )
  );

-- ---------------------------------------------------------------------------
-- 7. Keep every storage-object policy from being callable anonymously.
-- ---------------------------------------------------------------------------
revoke all on table storage.objects from anon;
revoke all on table storage.buckets from anon;

comment on table public.admin_review_queue is
  'Client inserts must identify auth.uid(); admin/service workflows may create operational rows.';
comment on table storage.objects is
  'Private-by-default object access. Bucket limits and owner/path/MIME policies are enforced by migration 20261004160000.';
