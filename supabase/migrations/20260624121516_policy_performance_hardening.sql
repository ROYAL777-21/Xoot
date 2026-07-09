-- Optimize the Phase 1 convergence policies without weakening their scope.
-- A single SELECT policy per table avoids repeated permissive-policy checks.

drop policy if exists "bookings_client_own" on public.bookings;
drop policy if exists "bookings_zooter_assigned" on public.bookings;
drop policy if exists "bookings_admin" on public.bookings;
create policy "bookings_participant_read"
  on public.bookings for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    or exists (
      select 1
      from public.zooters z
      where z.id = bookings.zooter_id
        and z.user_id = (select auth.uid())
    )
    or public.has_role((select auth.uid()), 'admin'::public.app_role)
  );
comment on policy "bookings_participant_read" on public.bookings
  is 'Clients read their own bookings, assigned Zooters read assigned bookings, and admins can audit all bookings.';

drop policy if exists "payment_records_own" on public.payment_records;
drop policy if exists "payment_records_admin" on public.payment_records;
create policy "payment_records_owner_or_admin_read"
  on public.payment_records for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    or public.has_role((select auth.uid()), 'admin'::public.app_role)
  );
comment on policy "payment_records_owner_or_admin_read" on public.payment_records
  is 'Payment rows are readable by their owner or an admin; all writes remain service-role only.';

drop policy if exists "user_subscriptions_own" on public.user_subscriptions;
drop policy if exists "user_subscriptions_admin" on public.user_subscriptions;
create policy "user_subscriptions_owner_or_admin_read"
  on public.user_subscriptions for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    or public.has_role((select auth.uid()), 'admin'::public.app_role)
  );
comment on policy "user_subscriptions_owner_or_admin_read" on public.user_subscriptions
  is 'Care+ membership state is readable by its owner or an admin; writes remain service-side.';

drop policy if exists "zootcred_own" on public.zootcred_ledger;
drop policy if exists "zootcred_admin" on public.zootcred_ledger;
create policy "zootcred_owner_or_admin_read"
  on public.zootcred_ledger for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    or public.has_role((select auth.uid()), 'admin'::public.app_role)
  );
comment on policy "zootcred_owner_or_admin_read" on public.zootcred_ledger
  is 'ZootCred entries are readable by their owner or an admin; ledger writes remain service-role only.';

drop policy if exists "integration_outbox_admin_read" on public.integration_outbox;
create policy "integration_outbox_admin_read"
  on public.integration_outbox for select
  to authenticated
  using (public.has_role((select auth.uid()), 'admin'::public.app_role));
comment on policy "integration_outbox_admin_read" on public.integration_outbox
  is 'Only admins can inspect provider delivery jobs; writes remain service-role only.';

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
  on public.notifications for select
  to authenticated
  using ((select auth.uid()) = user_id);
comment on policy "notifications_select_own" on public.notifications
  is 'Users can read only notifications addressed to their account.';

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
  on public.notifications for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
comment on policy "notifications_update_own" on public.notifications
  is 'Users can update only the read flag on their own notifications; column grants prevent content changes.';

drop policy if exists "users view own native push subscriptions"
  on public.native_push_subscriptions;
create policy "users view own native push subscriptions"
  on public.native_push_subscriptions for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "users create own native push subscriptions"
  on public.native_push_subscriptions;
create policy "users create own native push subscriptions"
  on public.native_push_subscriptions for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "users update own native push subscriptions"
  on public.native_push_subscriptions;
create policy "users update own native push subscriptions"
  on public.native_push_subscriptions for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "users delete own native push subscriptions"
  on public.native_push_subscriptions;
create policy "users delete own native push subscriptions"
  on public.native_push_subscriptions for delete
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "users manage own encryption keys"
  on public.user_encryption_keys;
create policy "users manage own encryption keys"
  on public.user_encryption_keys for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
comment on policy "users manage own encryption keys"
  on public.user_encryption_keys
  is 'Users manage only their own device public keys; counterpart lookup remains an authenticated Edge Function action.';

drop policy if exists "refund_requests_own_read" on public.refund_requests;
create policy "refund_requests_own_read"
  on public.refund_requests for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    or public.has_role((select auth.uid()), 'admin'::public.app_role)
  );
comment on policy "refund_requests_own_read" on public.refund_requests
  is 'Clients can read their own refund requests and admins can audit all requests; writes remain service-role only.';

drop policy if exists "sensitive_data_access_log_admin_read"
  on public.sensitive_data_access_log;
create policy "sensitive_data_access_log_admin_read"
  on public.sensitive_data_access_log for select
  to authenticated
  using (public.has_role((select auth.uid()), 'admin'::public.app_role));
comment on policy "sensitive_data_access_log_admin_read"
  on public.sensitive_data_access_log
  is 'Only admins can inspect the service-written sensitive data reveal audit trail.';

create index if not exists idx_admin_audit_log_admin
  on public.admin_audit_log(admin_id);
create index if not exists idx_bookings_user
  on public.bookings(user_id);
create index if not exists idx_bookings_zooter
  on public.bookings(zooter_id);
create index if not exists idx_bookings_original_zooter
  on public.bookings(original_zooter_id);
create index if not exists idx_bookings_property_account
  on public.bookings(property_account_id);
create index if not exists idx_integration_outbox_approved_by
  on public.integration_outbox(approved_by);
create index if not exists idx_integration_outbox_created_by
  on public.integration_outbox(created_by);
create index if not exists idx_refund_requests_payment_record
  on public.refund_requests(payment_record_id);
create index if not exists idx_refund_requests_requested_by
  on public.refund_requests(requested_by);
create index if not exists idx_refund_requests_user
  on public.refund_requests(user_id);
create index if not exists idx_user_subscriptions_favourite_zooter
  on public.user_subscriptions(favourite_zooter_id);
