-- Production RLS hardening for high-risk booking, reward, and assignment paths.
-- Browser clients may read their own data, but authoritative mutations should run
-- through Edge Functions or admin-reviewed workflows.

drop policy if exists "delete own bookings" on public.bookings;
drop policy if exists "update own bookings" on public.bookings;
drop policy if exists "zooters update assigned bookings" on public.bookings;

drop policy if exists "admins update bookings" on public.bookings;
create policy "admins update bookings"
  on public.bookings for update
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "admins delete bookings" on public.bookings;
create policy "admins delete bookings"
  on public.bookings for delete
  using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "update own loyalty" on public.loyalty_points;

drop policy if exists "admins manage loyalty points" on public.loyalty_points;
create policy "admins manage loyalty points"
  on public.loyalty_points for update
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "manage own subs" on public.user_subscriptions;

drop policy if exists "users create own pending subscriptions" on public.user_subscriptions;
create policy "users create own pending subscriptions"
  on public.user_subscriptions for insert
  with check (auth.uid() = user_id and status = 'pending_payment');

drop policy if exists "admins manage subscriptions" on public.user_subscriptions;
create policy "admins manage subscriptions"
  on public.user_subscriptions for all
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "admins insert offers" on public.zooter_jobs;

drop policy if exists "admins insert zooter job offers" on public.zooter_jobs;
create policy "admins insert zooter job offers"
  on public.zooter_jobs for insert
  with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "zooter updates own offers" on public.zooter_jobs;

drop policy if exists "zooters update own offer responses" on public.zooter_jobs;
create policy "zooters update own offer responses"
  on public.zooter_jobs for update
  using (
    exists (
      select 1 from public.zooters z
      where z.id = zooter_jobs.zooter_id and z.user_id = auth.uid()
    )
    or public.has_role(auth.uid(), 'admin')
  )
  with check (
    exists (
      select 1 from public.zooters z
      where z.id = zooter_jobs.zooter_id and z.user_id = auth.uid()
    )
    or public.has_role(auth.uid(), 'admin')
  );

drop policy if exists "view by code" on public.referrals;

drop policy if exists "users view own referral codes" on public.referrals;
create policy "users view own referral codes"
  on public.referrals for select
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));
