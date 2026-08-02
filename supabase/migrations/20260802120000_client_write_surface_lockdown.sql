-- Make the server the only author of facts the business decides.
--
-- The pattern this fixes is everywhere in the schema: `FOR ALL USING (user_id = auth.uid())`
-- was written to mean "this row belongs to you", but Postgres reads it as "you may write
-- anything in this row". RLS is row-level; it has no opinion about columns. So the same
-- policy that lets an applicant edit their own phone number also lets them set their own
-- `background_check_status`, and the one that lets a user see their loyalty balance lets
-- them set it.
--
-- The fix is column-level GRANTs. Unlike RLS, GRANT *is* column-aware, and it is checked
-- before any policy runs. A client keeps write access to the fields it authors and loses it
-- on the fields that represent a decision made about it. PostgREST fails closed: an UPDATE
-- touching a column the role does not hold is rejected outright.
--
-- Nothing here touches `service_role`, so every Edge Function keeps working unchanged. That
-- is the point — the write paths move to the server rather than disappearing.
--
-- Written as deny-lists resolved against the live catalogue rather than as literal column
-- lists. Production and staging schemas have diverged (ZD-005) and a hardcoded list fails on
-- whichever one it was not written against — this migration was in fact rejected by staging
-- for naming a column only production has. Deny-lists also express the actual rule: these
-- specific columns are decisions, everything else on the row belongs to the user. Any column
-- added after this runs is ungranted by default, which is the right way round.

begin;

-- ---------------------------------------------------------------------------
-- 0. The tool this migration is built from.
-- ---------------------------------------------------------------------------
-- Revokes UPDATE on a table, then grants it back on every column except the ones named.
-- Skips silently if the table does not exist in this environment, so the same migration
-- applies to both projects while their schemas are still converging.
create or replace function private.grant_update_except(
  target_table text,
  decision_columns text[]
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  allowed text;
begin
  if to_regclass('public.' || quote_ident(target_table)) is null then
    raise notice 'skipping %, not present in this environment', target_table;
    return;
  end if;

  select string_agg(quote_ident(column_name), ', ' order by ordinal_position)
    into allowed
  from information_schema.columns
  where table_schema = 'public'
    and table_name = target_table
    and not (column_name = any(decision_columns));

  execute format('revoke update on public.%I from authenticated', target_table);

  -- A table made entirely of decision columns grants nothing back, which is intended.
  if allowed is not null then
    execute format('grant update (%s) on public.%I to authenticated', allowed, target_table);
  end if;
end;
$$;

revoke all on function private.grant_update_except(text, text[]) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 1. `anon` has no business writing anything.
-- ---------------------------------------------------------------------------
-- The anon key ships inside the web bundle and the app binary. It is public by design, so
-- every write grant it holds is surface an attacker starts with. Today RLS saves us —
-- `auth.uid()` is null for anon, so the ownership predicates fail — but that is one
-- permissive policy away from being wrong, and the grants exist on tables like
-- `zooter_applications`, `loyalty_points` and `sensitive_access_logs` where being wrong once
-- is unrecoverable.
--
-- `analytics_events` is the deliberate exception: anonymous funnel events are inserted before
-- sign-in, and its policy already refuses metadata containing credential or access-code keys.
do $$
declare
  target record;
begin
  for target in
    select table_name
    from information_schema.role_table_grants
    where table_schema = 'public'
      and grantee = 'anon'
      and privilege_type in ('INSERT', 'UPDATE', 'DELETE')
      and table_name <> 'analytics_events'
    group by table_name
  loop
    execute format('revoke insert, update, delete on public.%I from anon', target.table_name);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Vetting is decided by Xoot, never claimed by the applicant.
-- ---------------------------------------------------------------------------
-- This is the one that matters most for a company that sends people into homes. Every
-- `*_verification_status` column, the overall `status`, and the reviewer audit fields were
-- writable by the applicant. `reviewed_by` especially: an applicant could approve themselves
-- and stamp an admin's UUID on the approval, so the audit trail would agree with them.
--
-- `behavioural_screening` is withheld on purpose even though an applicant answers the
-- questions: the stored value is the assessment, and an applicant who can rewrite their own
-- screening result has not been screened.
select private.grant_update_except('zooter_applications', array[
  'id', 'user_id', 'created_at',
  'status', 'id_verification_status', 'selfie_verification_status',
  'address_verification_status', 'banking_verification_status',
  'reference_verification_status', 'background_check_status',
  'third_party_verification_status', 'behavioural_screening',
  'reviewer_notes', 'activation_locked_reason', 'reviewed_by', 'reviewed_at',
  'verification_notes'
]);

-- An applicant uploads a document; Xoot decides whether it passes.
select private.grant_update_except('zooter_documents', array[
  'id', 'user_id', 'application_id', 'created_at', 'status', 'reviewer_notes'
]);

-- ---------------------------------------------------------------------------
-- 3. Training cannot be self-certified.
-- ---------------------------------------------------------------------------
-- `passed` and `score` were client-writable, so "completed the safety module" meant only
-- that someone sent a row saying so. There is no subset of these columns a client may author
-- — the grader is the server — so the whole write surface goes.
--
-- FOLLOW-UP REQUIRED: the training flow must submit answers to an Edge Function that grades
-- and writes with the service role. Until that exists the client submit path fails closed,
-- which is the correct failure: no record beats a false record.
revoke insert, update, delete on public.zooter_training_completions from authenticated;

-- ---------------------------------------------------------------------------
-- 4. Balances are minted by the server or they are not balances.
-- ---------------------------------------------------------------------------
-- `loyalty_points.points` and `.free_credits` were directly writable by their owner, and
-- ZootCred redeems against real services through `redeem-zootcred`. That is a mint.
revoke insert, update, delete on public.loyalty_points from authenticated;

-- Care+ approval and the admin fee are Xoot's call, not the applicant's.
select private.grant_update_except('care_plus_applications', array[
  'id', 'user_id', 'created_at', 'status', 'admin_fee_paid', 'reviewed_at', 'reviewer_notes'
]);

-- A purchaser writes who the gift is for. Money and fulfilment state are the server's.
select private.grant_update_except('gift_clean_orders', array[
  'id', 'purchaser_user_id', 'created_at',
  'amount', 'status', 'payment_record_id', 'redeemed_at'
]);

-- Progress flags unlock rewards, so the server sets them.
revoke insert, update, delete on public.gamification_progress from authenticated;

-- ---------------------------------------------------------------------------
-- 5. Evidence and audit trails are append-only.
-- ---------------------------------------------------------------------------
-- A record the people it describes can edit or delete is not evidence. Each of these was
-- fully writable by a booking participant, which means the trail you would use to
-- investigate an incident could be rewritten by whoever the investigation is about.
revoke update, delete on public.booking_status_events from authenticated;
revoke update, delete on public.booking_completion_photos from authenticated;
revoke update, delete on public.trust_incidents from authenticated;
revoke delete on public.post_job_reviews from authenticated;

-- A review's subject and the booking it belongs to are fixed at creation; only the opinion
-- can be revised.
select private.grant_update_except('post_job_reviews', array[
  'id', 'booking_id', 'user_id', 'zooter_id', 'created_at'
]);

-- The audit log stays append-only even though no policy currently admits an update. The
-- grant existing at all is the hazard: one added policy silently makes the log editable by
-- the people it audits.
revoke update, delete on public.sensitive_access_logs from anon, authenticated;

-- Attribution cannot be forged. A client may still append a status event, but only as
-- itself — `actor_id` is overwritten with the caller rather than trusted from the payload.
-- Server sessions (auth.uid() is null) are left alone so Edge Functions can attribute events
-- to whoever they acted for.
create or replace function public.enforce_status_event_actor()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null then
    new.actor_id := (select auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_status_event_actor on public.booking_status_events;
create trigger enforce_status_event_actor
  before insert on public.booking_status_events
  for each row execute function public.enforce_status_event_actor();

-- ---------------------------------------------------------------------------
-- 6. Job state is a workflow, not a field.
-- ---------------------------------------------------------------------------
-- `zooter_jobs.state` drives dispatch. A Xooter could set it directly, which means accepting
-- a job they were never offered or un-declining one they declined.
--
-- FOLLOW-UP REQUIRED: offer/accept/decline must go through an Edge Function. `ops-workflow`
-- and `get-zooter-job-cards` already exist server-side; this removes the client write path.
revoke insert, update, delete on public.zooter_jobs from authenticated;

commit;
