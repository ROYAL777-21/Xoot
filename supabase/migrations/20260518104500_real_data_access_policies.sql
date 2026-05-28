-- Real-data access policies for trust, safety, retention, and contractor workflows.
-- This removes reliance on preview/mock-only paths by making the Supabase-backed flows usable.

-- New trust/retention tables are in the exposed public schema, so RLS must be explicit.
alter table public.zooter_reliability_metrics enable row level security;
alter table public.trust_incidents enable row level security;
alter table public.booking_status_events enable row level security;
alter table public.post_job_reviews enable row level security;
alter table public.booking_completion_photos enable row level security;
alter table public.household_profiles enable row level security;
alter table public.recurring_schedules enable row level security;

grant select, insert, update, delete on table public.zooter_reliability_metrics to authenticated;
grant select, insert, update, delete on table public.trust_incidents to authenticated;
grant select, insert, update, delete on table public.booking_status_events to authenticated;
grant select, insert, update, delete on table public.post_job_reviews to authenticated;
grant select, insert, update, delete on table public.booking_completion_photos to authenticated;
grant select, insert, update, delete on table public.household_profiles to authenticated;
grant select, insert, update, delete on table public.recurring_schedules to authenticated;

-- Existing flows also need these explicit grants on newer Supabase projects where raw-SQL
-- tables are not automatically exposed to the Data API.
grant select, insert, update on table public.zooter_training_completions to authenticated;
grant select, update on table public.zooters to authenticated;
grant select on table public.zooters to anon;
grant select, update on table public.bookings to authenticated;
grant select, insert on table public.messages to authenticated;

-- Customers manage their own household memory.
create policy "users manage own household profiles"
  on public.household_profiles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Customers manage their own recurring schedules. Admins can support them.
create policy "users manage own recurring schedules"
  on public.recurring_schedules for all
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'))
  with check (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

-- Booking status timeline is visible to the customer, assigned Zooter, or admin.
create policy "booking participants view status events"
  on public.booking_status_events for select
  using (
    exists (
      select 1
      from public.bookings b
      left join public.zooters z on z.id = b.zooter_id
      where b.id = booking_status_events.booking_id
        and (b.user_id = auth.uid() or z.user_id = auth.uid())
    )
    or public.has_role(auth.uid(), 'admin')
  );

create policy "booking participants create status events"
  on public.booking_status_events for insert
  with check (
    exists (
      select 1
      from public.bookings b
      left join public.zooters z on z.id = b.zooter_id
      where b.id = booking_status_events.booking_id
        and (b.user_id = auth.uid() or z.user_id = auth.uid())
    )
    or public.has_role(auth.uid(), 'admin')
  );

-- Completion photos are private to booking participants.
create policy "booking participants view completion photos"
  on public.booking_completion_photos for select
  using (
    exists (
      select 1
      from public.bookings b
      left join public.zooters z on z.id = b.zooter_id
      where b.id = booking_completion_photos.booking_id
        and (b.user_id = auth.uid() or z.user_id = auth.uid())
    )
    or public.has_role(auth.uid(), 'admin')
  );

create policy "booking participants add completion photos"
  on public.booking_completion_photos for insert
  with check (
    exists (
      select 1
      from public.bookings b
      left join public.zooters z on z.id = b.zooter_id
      where b.id = booking_completion_photos.booking_id
        and (b.user_id = auth.uid() or z.user_id = auth.uid())
    )
    or public.has_role(auth.uid(), 'admin')
  );

-- Post-job reviews are created by the customer on their booking.
create policy "users view own post job reviews"
  on public.post_job_reviews for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.zooters z
      where z.id = post_job_reviews.zooter_id and z.user_id = auth.uid()
    )
    or public.has_role(auth.uid(), 'admin')
  );

create policy "users create own post job reviews"
  on public.post_job_reviews for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.bookings b
      where b.id = post_job_reviews.booking_id
        and b.user_id = auth.uid()
        and b.zooter_id = post_job_reviews.zooter_id
    )
  );

-- Trust incidents are visible to admins; customers may create incidents on their own bookings.
create policy "admins view trust incidents"
  on public.trust_incidents for select
  using (public.has_role(auth.uid(), 'admin'));

create policy "users create trust incidents for own bookings"
  on public.trust_incidents for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.bookings b
      where b.id = trust_incidents.booking_id and b.user_id = auth.uid()
    )
  );

create policy "admins manage trust incidents"
  on public.trust_incidents for update
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Reliability metrics affect matching. Customers see the derived score on zooters,
-- while detailed metric rows stay limited to the contractor and admin.
create policy "zooters and admins view reliability metrics"
  on public.zooter_reliability_metrics for select
  using (
    exists (
      select 1 from public.zooters z
      where z.id = zooter_reliability_metrics.zooter_id and z.user_id = auth.uid()
    )
    or public.has_role(auth.uid(), 'admin')
  );

create policy "admins manage reliability metrics"
  on public.zooter_reliability_metrics for all
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Zooters can maintain profile proof fields after activation.
create policy "zooters update own profile"
  on public.zooters for update
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'))
  with check (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

-- Assigned Zooters need to see and update their own bookings and message customers.
create policy "zooters view assigned bookings"
  on public.bookings for select
  using (
    exists (
      select 1 from public.zooters z
      where z.id = bookings.zooter_id and z.user_id = auth.uid()
    )
    or public.has_role(auth.uid(), 'admin')
  );

create policy "zooters update assigned bookings"
  on public.bookings for update
  using (
    exists (
      select 1 from public.zooters z
      where z.id = bookings.zooter_id and z.user_id = auth.uid()
    )
    or public.has_role(auth.uid(), 'admin')
  )
  with check (
    exists (
      select 1 from public.zooters z
      where z.id = bookings.zooter_id and z.user_id = auth.uid()
    )
    or public.has_role(auth.uid(), 'admin')
  );

create policy "zooters view messages on assigned bookings"
  on public.messages for select
  using (
    exists (
      select 1
      from public.bookings b
      left join public.zooters z on z.id = b.zooter_id
      where b.id = messages.booking_id
        and (b.user_id = auth.uid() or z.user_id = auth.uid())
    )
  );

create policy "zooters send messages on assigned bookings"
  on public.messages for insert
  with check (
    exists (
      select 1
      from public.bookings b
      left join public.zooters z on z.id = b.zooter_id
      where b.id = messages.booking_id
        and (b.user_id = auth.uid() or z.user_id = auth.uid())
    )
  );

-- Training retakes use upsert, which needs UPDATE under RLS.
create policy "user updates own completions"
  on public.zooter_training_completions for update
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'))
  with check (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

-- Storage policies for private completion photos. Path format: {booking_id}/{filename}.
create policy "booking participants upload completion photos"
  on storage.objects for insert
  with check (
    bucket_id = 'booking-completion-photos'
    and exists (
      select 1
      from public.bookings b
      left join public.zooters z on z.id = b.zooter_id
      where b.id::text = (storage.foldername(name))[1]
        and (b.user_id = auth.uid() or z.user_id = auth.uid())
    )
  );

create policy "booking participants read completion photos"
  on storage.objects for select
  using (
    bucket_id = 'booking-completion-photos'
    and (
      exists (
        select 1
        from public.bookings b
        left join public.zooters z on z.id = b.zooter_id
        where b.id::text = (storage.foldername(name))[1]
          and (b.user_id = auth.uid() or z.user_id = auth.uid())
      )
      or public.has_role(auth.uid(), 'admin')
    )
  );

create policy "booking participants update completion photos"
  on storage.objects for update
  using (
    bucket_id = 'booking-completion-photos'
    and exists (
      select 1
      from public.bookings b
      left join public.zooters z on z.id = b.zooter_id
      where b.id::text = (storage.foldername(name))[1]
        and (b.user_id = auth.uid() or z.user_id = auth.uid())
    )
  )
  with check (
    bucket_id = 'booking-completion-photos'
    and exists (
      select 1
      from public.bookings b
      left join public.zooters z on z.id = b.zooter_id
      where b.id::text = (storage.foldername(name))[1]
        and (b.user_id = auth.uid() or z.user_id = auth.uid())
    )
  );

-- KYC uploads use upsert for document replacement.
create policy "users update own kyc"
  on storage.objects for update
  using (bucket_id = 'kyc-docs' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'kyc-docs' and auth.uid()::text = (storage.foldername(name))[1]);

-- Remove initial placeholder contractor supply from production datasets.
-- Real Zooters are created through the admin-reviewed onboarding flow.
update public.zooters
set active = false
where user_id is null
  and photo_url in (
    '/src/assets/worker-1.jpg',
    '/src/assets/worker-2.jpg',
    '/src/assets/worker-3.jpg',
    '/src/assets/worker-4.jpg'
  );
