-- Follow-up for Supabase performance advisors that are safe to resolve without
-- changing product behaviour: auth-initplan RLS predicates, duplicated
-- permissive policies on non-targeted tables, and missing FK-covering indexes.

-- ---------------------------------------------------------------------------
-- RLS auth-initplan cleanup and permissive-policy consolidation.
-- ---------------------------------------------------------------------------

alter table if exists public.admin_audit_log enable row level security;
drop policy if exists "audit_log_admin_read" on public.admin_audit_log;
create policy "audit_log_admin_read"
  on public.admin_audit_log for select
  to authenticated
  using (private.has_role((select auth.uid()), 'admin'::public.app_role));
comment on policy "audit_log_admin_read" on public.admin_audit_log
  is 'Admins can read immutable admin audit entries; auth.uid is evaluated once per query for performance.';

alter table if exists public.push_tokens enable row level security;
drop policy if exists "push_tokens_own" on public.push_tokens;
create policy "push_tokens_select_own"
  on public.push_tokens for select
  to authenticated
  using (user_id = (select auth.uid()));
comment on policy "push_tokens_select_own" on public.push_tokens
  is 'Users can read only their own push-token registrations.';

create policy "push_tokens_insert_own"
  on public.push_tokens for insert
  to authenticated
  with check (user_id = (select auth.uid()));
comment on policy "push_tokens_insert_own" on public.push_tokens
  is 'Users can register push tokens only for their own account.';

create policy "push_tokens_update_own"
  on public.push_tokens for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
comment on policy "push_tokens_update_own" on public.push_tokens
  is 'Users can refresh only their own push-token metadata.';

create policy "push_tokens_delete_own"
  on public.push_tokens for delete
  to authenticated
  using (user_id = (select auth.uid()));
comment on policy "push_tokens_delete_own" on public.push_tokens
  is 'Users can remove only their own push-token registrations.';

alter table if exists public.twilio_webhook_events enable row level security;
drop policy if exists "twilio_events_admin_read" on public.twilio_webhook_events;
create policy "twilio_events_admin_read"
  on public.twilio_webhook_events for select
  to authenticated
  using (private.has_role((select auth.uid()), 'admin'::public.app_role));
comment on policy "twilio_events_admin_read" on public.twilio_webhook_events
  is 'Only admins can read Twilio webhook audit events; auth.uid is evaluated once per query for performance.';

alter table if exists public.admin_review_queue enable row level security;
drop policy if exists "admins manage review queue" on public.admin_review_queue;
drop policy if exists "users create review requests" on public.admin_review_queue;
drop policy if exists "review queue admin select" on public.admin_review_queue;
drop policy if exists "review queue admin update" on public.admin_review_queue;
drop policy if exists "review queue insert own" on public.admin_review_queue;
drop policy if exists "admin_review_queue_select_admin" on public.admin_review_queue;
drop policy if exists "admin_review_queue_insert_user_or_admin" on public.admin_review_queue;
drop policy if exists "admin_review_queue_update_admin" on public.admin_review_queue;
drop policy if exists "admin_review_queue_delete_admin" on public.admin_review_queue;

create policy "admin_review_queue_select_admin"
  on public.admin_review_queue for select
  to authenticated
  using (private.has_role((select auth.uid()), 'admin'::public.app_role));
comment on policy "admin_review_queue_select_admin" on public.admin_review_queue
  is 'Only admins can read review queue rows.';

create policy "admin_review_queue_insert_user_or_admin"
  on public.admin_review_queue for insert
  to authenticated
  with check (
    private.has_role((select auth.uid()), 'admin'::public.app_role)
    or user_id = (select auth.uid())
    or user_id is null
  );
comment on policy "admin_review_queue_insert_user_or_admin" on public.admin_review_queue
  is 'Signed-in users can request review for themselves; admins can create operational review rows.';

create policy "admin_review_queue_update_admin"
  on public.admin_review_queue for update
  to authenticated
  using (private.has_role((select auth.uid()), 'admin'::public.app_role))
  with check (private.has_role((select auth.uid()), 'admin'::public.app_role));
comment on policy "admin_review_queue_update_admin" on public.admin_review_queue
  is 'Only admins can update review queue rows.';

create policy "admin_review_queue_delete_admin"
  on public.admin_review_queue for delete
  to authenticated
  using (private.has_role((select auth.uid()), 'admin'::public.app_role));
comment on policy "admin_review_queue_delete_admin" on public.admin_review_queue
  is 'Only admins can delete review queue rows when retention policy permits.';

alter table if exists public.favorites enable row level security;
drop policy if exists "manage own favorites" on public.favorites;
drop policy if exists "view own favorites" on public.favorites;
drop policy if exists "own favorites" on public.favorites;
drop policy if exists "favorites_select_own" on public.favorites;
drop policy if exists "favorites_insert_own" on public.favorites;
drop policy if exists "favorites_update_own" on public.favorites;
drop policy if exists "favorites_delete_own" on public.favorites;

create policy "favorites_select_own"
  on public.favorites for select
  to authenticated
  using (user_id = (select auth.uid()));
comment on policy "favorites_select_own" on public.favorites
  is 'Users can read only their own favourite Zooter rows.';

create policy "favorites_insert_own"
  on public.favorites for insert
  to authenticated
  with check (user_id = (select auth.uid()));
comment on policy "favorites_insert_own" on public.favorites
  is 'Users can favourite Zooters only for their own account.';

create policy "favorites_update_own"
  on public.favorites for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
comment on policy "favorites_update_own" on public.favorites
  is 'Users can update only their own favourite rows.';

create policy "favorites_delete_own"
  on public.favorites for delete
  to authenticated
  using (user_id = (select auth.uid()));
comment on policy "favorites_delete_own" on public.favorites
  is 'Users can remove only their own favourite rows.';

alter table if exists public.messages enable row level security;
drop policy if exists "send messages on own booking" on public.messages;
drop policy if exists "view messages on own booking" on public.messages;
drop policy if exists "zooters send messages on assigned bookings" on public.messages;
drop policy if exists "zooters view messages on assigned bookings" on public.messages;
drop policy if exists "messages participants insert" on public.messages;
drop policy if exists "messages participants select" on public.messages;
drop policy if exists "messages_participants_select" on public.messages;
drop policy if exists "messages_participants_insert" on public.messages;

create policy "messages_participants_select"
  on public.messages for select
  to authenticated
  using (
    exists (
      select 1
      from public.bookings b
      left join public.zooters z on z.id = b.zooter_id
      where b.id = messages.booking_id
        and (
          b.user_id = (select auth.uid())
          or z.user_id = (select auth.uid())
          or private.has_role((select auth.uid()), 'admin'::public.app_role)
        )
    )
  );
comment on policy "messages_participants_select" on public.messages
  is 'Booking clients, assigned Zooters, and admins can read booking chat messages.';

create policy "messages_participants_insert"
  on public.messages for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.bookings b
      left join public.zooters z on z.id = b.zooter_id
      where b.id = messages.booking_id
        and (
          b.user_id = (select auth.uid())
          or z.user_id = (select auth.uid())
        )
    )
  );
comment on policy "messages_participants_insert" on public.messages
  is 'Booking clients and assigned Zooters can send chat messages inside their booking.';

do $$
begin
  if to_regclass('public.referrals') is not null then
    alter table public.referrals enable row level security;

    drop policy if exists "referral_codes_own" on public.referrals;
    drop policy if exists "users view own referral codes" on public.referrals;
    drop policy if exists "referrals_select_owner_or_admin" on public.referrals;

    create policy "referrals_select_owner_or_admin"
      on public.referrals for select
      to authenticated
      using (
        user_id = (select auth.uid())
        or private.has_role((select auth.uid()), 'admin'::public.app_role)
      );

    comment on policy "referrals_select_owner_or_admin" on public.referrals
      is 'Users can read their own referral record; admins can audit referral records.';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- FK-covering indexes. The dynamic guard checks for an existing valid covering
-- index before creating one, so this migration avoids duplicate index groups.
-- ---------------------------------------------------------------------------

do $$
declare
  v_spec record;
  v_table regclass;
  v_attnums int2[];
  v_index_columns text;
begin
  for v_spec in
    select *
    from (values
      ('admin_review_queue', 'admin_review_queue_assigned_to_fk_idx', array['assigned_to']),
      ('admin_review_queue', 'admin_review_queue_booking_id_fk_idx', array['booking_id']),
      ('admin_review_queue', 'admin_review_queue_user_id_fk_idx', array['user_id']),
      ('admin_review_queue', 'admin_review_queue_zooter_id_fk_idx', array['zooter_id']),
      ('booking_completion_photos', 'booking_completion_photos_zooter_id_fk_idx', array['zooter_id']),
      ('booking_status_events', 'booking_status_events_actor_id_fk_idx', array['actor_id']),
      ('favorites', 'favorites_zooter_id_fk_idx', array['zooter_id']),
      ('gift_clean_orders', 'gift_clean_orders_payment_record_id_fk_idx', array['payment_record_id']),
      ('gift_clean_orders', 'gift_clean_orders_purchaser_user_id_fk_idx', array['purchaser_user_id']),
      ('masked_call_sessions', 'masked_call_sessions_booking_id_fk_idx', array['booking_id']),
      ('masked_call_sessions', 'masked_call_sessions_caller_id_fk_idx', array['caller_id']),
      ('messages', 'messages_booking_id_fk_idx', array['booking_id']),
      ('post_job_reviews', 'post_job_reviews_booking_id_fk_idx', array['booking_id']),
      ('post_job_reviews', 'post_job_reviews_user_id_fk_idx', array['user_id']),
      ('post_job_reviews', 'post_job_reviews_zooter_id_fk_idx', array['zooter_id']),
      ('recurring_schedules', 'recurring_schedules_household_profile_id_fk_idx', array['household_profile_id']),
      ('recurring_schedules', 'recurring_schedules_zooter_id_fk_idx', array['zooter_id']),
      ('sensitive_access_logs', 'sensitive_access_logs_actor_id_fk_idx', array['actor_id']),
      ('support_followups', 'support_followups_booking_id_fk_idx', array['booking_id']),
      ('support_followups', 'support_followups_ticket_id_fk_idx', array['ticket_id']),
      ('support_followups', 'support_followups_user_id_fk_idx', array['user_id']),
      ('support_tickets', 'support_tickets_user_id_fk_idx', array['user_id']),
      ('trust_incidents', 'trust_incidents_booking_id_fk_idx', array['booking_id']),
      ('trust_incidents', 'trust_incidents_user_id_fk_idx', array['user_id']),
      ('user_subscriptions', 'user_subscriptions_plan_id_fk_idx', array['plan_id']),
      ('user_subscriptions', 'user_subscriptions_user_id_fk_idx', array['user_id']),
      ('zootcred_ledger', 'zootcred_ledger_booking_id_fk_idx', array['booking_id']),
      ('zooter_documents', 'zooter_documents_application_id_fk_idx', array['application_id']),
      ('zooter_training_completions', 'zooter_training_completions_module_id_fk_idx', array['module_id']),
      ('zooter_training_progress', 'zooter_training_progress_module_id_fk_idx', array['module_id'])
    ) as specs(table_name, index_name, column_names)
  loop
    v_table := to_regclass(format('public.%I', v_spec.table_name));
    if v_table is null then
      continue;
    end if;

    select array_agg(a.attnum::int2 order by c.ord),
           string_agg(format('%I', a.attname), ', ' order by c.ord)
      into v_attnums, v_index_columns
    from unnest(v_spec.column_names) with ordinality c(column_name, ord)
    join pg_attribute a
      on a.attrelid = v_table
     and a.attname = c.column_name
     and not a.attisdropped;

    if array_length(v_attnums, 1) is distinct from array_length(v_spec.column_names, 1) then
      continue;
    end if;

    if exists (
      select 1
      from pg_index i
      where i.indrelid = v_table
        and i.indisvalid
        and i.indpred is null
        and (i.indkey::int2[])[0:array_length(v_attnums, 1) - 1] = v_attnums
    ) then
      continue;
    end if;

    execute format(
      'create index if not exists %I on public.%I (%s)',
      v_spec.index_name,
      v_spec.table_name,
      v_index_columns
    );
  end loop;
end;
$$;
