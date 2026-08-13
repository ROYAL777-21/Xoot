-- Zoot → Xoot in the schema itself: tables, columns, views, the role label, and the keys code
-- looks up by value. Founder decision 2026-08-13, after the prose-only pass
-- (`20260813140000`) — "Xoot.* is what I meant".
--
-- ── Why this can be a straight rename with no compatibility layer ───────────────────────────
-- A rename breaks every DEPLOYED Edge Function instantly: a deployed function carries frozen code
-- querying `zooters`, and the table stops existing the moment this runs. 33 functions reference
-- these names, 152 times.
--
-- Measured before writing this, not assumed: **every operational table is empty.**
-- `pg_stat_user_tables` shows rows only in config and seed tables — `operational_controls` (42),
-- `suburb_centroids` (26), `training_modules` (15), `agent_action_contracts` (6),
-- `analytics_event_contracts` (5), `payment_provider_capabilities` (4), one knowledge version and
-- one rate-limit event. `bookings`, `zooters`, `zootcred_ledger`, `zooter_jobs` and every other
-- operational table are at zero.
--
-- So the window between this migration and the redeploy costs nobody anything. With live data it
-- would have needed renamed tables plus updatable views under the old names, the functions
-- redeployed, then the views dropped — three steps and two dispatches. Empty tables buy the
-- simple version, and this is the last moment that is true.
--
-- ⚠️ **DEPLOY ORDER — all 33 functions must be redeployed straight after this.** Until then every
-- one of them errors. That is acceptable only because nothing is live; it is not a rule to reuse.
--
-- ── What is deliberately NOT renamed ────────────────────────────────────────────────────────
-- **Constraint and index names** (~80 of them: `bookings_zooter_id_fkey`,
-- `zootcred_direction_valid`, …). They are internal identifiers that surface only in error
-- messages, never in application code or the PostgREST API. Renaming them is a large amount of
-- DDL for cosmetic value, and each one is a chance to typo a constraint into non-existence.
-- Postgres keeps them working under the old names against renamed tables.
--
-- **Historical migration files.** The 46 earlier migrations still say `zoot`, correctly — they
-- are the record of what was applied at the time. This migration is the forward step; rewriting
-- history would make the ledger lie.

-- ── Tables ─────────────────────────────────────────────────────────────────────────────────
alter table public.zoot_black_area_pilots rename to xoot_black_area_pilots;
alter table public.zoot_black_completion_certificates rename to xoot_black_completion_certificates;
alter table public.zoot_black_equipment_evidence rename to xoot_black_equipment_evidence;
alter table public.zoot_black_status_history rename to xoot_black_status_history;
alter table public.zoot_black_training_requirements rename to xoot_black_training_requirements;
alter table public.zoot_concierge_feedback rename to xoot_concierge_feedback;
alter table public.zoot_concierge_knowledge_versions rename to xoot_concierge_knowledge_versions;
alter table public.zootcred_ledger rename to xootcred_ledger;
alter table public.zooter_applications rename to xooter_applications;
alter table public.zooter_documents rename to xooter_documents;
alter table public.zooter_earnings rename to xooter_earnings;
alter table public.zooter_jobs rename to xooter_jobs;
alter table public.zooter_payout_accounts rename to xooter_payout_accounts;
alter table public.zooter_payout_holds rename to xooter_payout_holds;
alter table public.zooter_reliability_metrics rename to xooter_reliability_metrics;
alter table public.zooter_training_completions rename to xooter_training_completions;
alter table public.zooter_training_progress rename to xooter_training_progress;
alter table public.zooters rename to xooters;

-- ── Columns ────────────────────────────────────────────────────────────────────────────────
-- Ordered after the table renames, so these address the new names.
alter table public.admin_review_queue rename column zooter_id to xooter_id;
alter table public.booking_completion_photos rename column zooter_id to xooter_id;
alter table public.booking_tips rename column zooter_id to xooter_id;
alter table public.bookings rename column original_zooter_id to original_xooter_id;
alter table public.bookings rename column zoot_black_certificate_id to xoot_black_certificate_id;
alter table public.bookings rename column zoot_black_line_item_amount to xoot_black_line_item_amount;
alter table public.bookings rename column zoot_black_requested to xoot_black_requested;
alter table public.bookings rename column zooter_id to xooter_id;
alter table public.favorites rename column zooter_id to xooter_id;
alter table public.payout_change_requests rename column zooter_id to xooter_id;
alter table public.post_job_reviews rename column zooter_id to xooter_id;
alter table public.recurring_schedules rename column zooter_id to xooter_id;
alter table public.sensitive_data_access_log rename column zooter_id to xooter_id;
alter table public.trust_incidents rename column zooter_id to xooter_id;
alter table public.user_subscriptions rename column favourite_zooter_id to favourite_xooter_id;
alter table public.xooter_commission_boosts rename column zooter_id to xooter_id;
alter table public.xoot_black_completion_certificates rename column zooter_id to xooter_id;
alter table public.xoot_black_equipment_evidence rename column zooter_id to xooter_id;
alter table public.xoot_black_status_history rename column zooter_id to xooter_id;
alter table public.xooter_earnings rename column zooter_id to xooter_id;
alter table public.xooter_jobs rename column zooter_id to xooter_id;
alter table public.xooter_payout_accounts rename column zooter_id to xooter_id;
alter table public.xooter_payout_holds rename column zooter_id to xooter_id;
alter table public.xooter_reliability_metrics rename column zooter_id to xooter_id;
alter table public.xooter_training_progress rename column zooter_id to xooter_id;

-- ── Views ──────────────────────────────────────────────────────────────────────────────────
-- Postgres rewrites a view's stored definition when the tables and columns under it are renamed,
-- so these only need their own names changed.
alter view public.booking_zooter_profiles rename to booking_xooter_profiles;
alter view public.zooters_public rename to xooters_public;

-- ── The role label ─────────────────────────────────────────────────────────────────────────
-- Renames in place; every existing `user_roles` row carrying it follows automatically. This is
-- the value `has_role(auth.uid(), 'zooter')` and every RLS policy compares against, so the code
-- change and this must ship together.
alter type public.app_role rename value 'zooter' to 'xooter';

-- ── Check constraints whose BODY names the brand ───────────────────────────────────────────
--
-- ⚠️ ADDED 2026-08-13 AFTER THIS MIGRATION FAILED ON STAGING. Read this before trusting the
-- reasoning above about constraints.
--
-- The note near the top is right that constraint *names* are internal identifiers not worth
-- renaming. That reasoning was then silently extended to constraints as a whole — and a
-- constraint's *body* is not an internal identifier. Three of them spell the brand out, and all
-- three break the moment the renamed code runs:
--
--   1. payment_provider_reference_format_safe   check (… like 'ZOOT-%')
--      The `update` at the bottom of this file writes 'XOOT-…' and the constraint rejects it.
--      This is not hypothetical: it failed the staging apply at statement 55 with SQLSTATE 23514,
--      and rolled the whole migration back.
--
--   2. public.messages.sender_type              check (sender_type in ('user','zooter'))
--      `send-booking-message/index.ts:57` now types this `"user" | "xooter"` and writes "xooter".
--      Every message a Xooter sends would be rejected. Nothing in the deploy would have caught
--      it — the function deploys clean and fails on first use.
--
--   3. xoot_concierge_feedback.role             check (role in ('user', 'zooter'))
--      `report-concierge-answer/index.ts:86` writes "xooter". Same silent shape.
--
-- Dropped and recreated rather than altered, because Postgres has no `alter constraint` for a
-- check body. Names kept identical, so nothing that references them by name has to change and the
-- "don't rename constraints" decision above still holds — it is the bodies that had to move.
-- ⚠️ Dropped BY DEFINITION, not by name.
--
-- `drop constraint if exists <guessed_name>` is the trap here: an inline `check (…)` on a column
-- gets an auto-generated name, and if the guess is wrong the drop silently does nothing while the
-- `add` below succeeds. The table then carries BOTH constraints, the old one still rejects
-- 'xooter', and the migration reports success. Failing that way would be worse than not trying.
--
-- So each block finds every check constraint on the table whose definition actually mentions the
-- old value and drops those, whatever they are called.
do $$
declare c record;
begin
  for c in
    select conrelid::regclass as tbl, conname
    from pg_constraint
    where contype = 'c'
      and connamespace = 'public'::regnamespace
      and conrelid in (
        'public.messages'::regclass,
        'public.xoot_concierge_feedback'::regclass,
        'public.payment_provider_capabilities'::regclass
      )
      and pg_get_constraintdef(oid) ~* '(zooter|ZOOT-)'
  loop
    execute format('alter table %s drop constraint %I', c.tbl, c.conname);
    raise notice 'dropped % on %', c.conname, c.tbl;
  end loop;
end $$;

-- Data first, then the constraint. Adding a validating constraint to a table that still holds the
-- old value would fail on the existing rows — and `not valid` would leave the table permanently
-- carrying an unverified constraint, which is a worse resting state than a moment of care here.
update public.messages set sender_type = 'xooter' where sender_type = 'zooter';
update public.xoot_concierge_feedback set role = 'xooter' where role = 'zooter';
update public.payment_provider_capabilities
set reconciliation_reference_format = replace(reconciliation_reference_format, 'ZOOT', 'XOOT')
where reconciliation_reference_format like '%ZOOT%';

alter table public.messages
  add constraint messages_sender_type_check check (sender_type in ('user', 'xooter'));

alter table public.xoot_concierge_feedback
  add constraint xoot_concierge_feedback_role_check check (role in ('user', 'xooter'));

alter table public.payment_provider_capabilities
  add constraint payment_provider_reference_format_safe
  check (
    reconciliation_reference_format like 'XOOT-%'
    and reconciliation_reference_format not like '%{SECRET}%'
    and reconciliation_reference_format not like '%{CARD}%'
  );

-- ── Keys that code looks up by value ───────────────────────────────────────────────────────
-- The prose pass deliberately left these alone, because renaming a key in the data without the
-- matching code change does not error — the lookup finds nothing and the control reads as OFF,
-- silently disabling the feature it governs. They move here because the code moves in the same
-- change.
-- Named one by one rather than a `replace()` sweep, deliberately: a pattern rename leaves the
-- NEW key names appearing nowhere in the repository's SQL, so neither a reader nor
-- `concierge-governance-readiness.test.ts` can find where `concierge.xootcred_support` comes
-- from. Six keys is a small enough set to spell out, and spelling them out is what makes the
-- rename greppable from both directions.
update public.operational_controls set control_key = 'concierge.xootcred_support' where control_key = 'concierge.zootcred_support';
update public.operational_controls set control_key = 'concierge.xooter_support'   where control_key = 'concierge.zooter_support';
update public.operational_controls set control_key = 'xooter.sensitive_access'    where control_key = 'zooter.sensitive_access';
update public.operational_controls set control_key = 'xoot_black.enabled'         where control_key = 'zoot_black.enabled';
update public.operational_controls set control_key = 'xoot_black.area_pilot'      where control_key = 'zoot_black.area_pilot';
update public.operational_controls set control_key = 'xoot_black.certificates'    where control_key = 'zoot_black.certificates';

update public.agent_action_contracts set agent_key = 'xoot_concierge' where agent_key = 'zoot_concierge';
update public.agent_action_contracts set action_key = 'explain_xoot_black' where action_key = 'explain_zoot_black';

update public.analytics_event_contracts set event_name = 'xooter_training_module_completed' where event_name = 'zooter_training_module_completed';

-- The reconciliation reference format — a finance identifier, what a payment reference LOOKS like,
-- rather than a brand string in prose — moved UP into the constraint section above. It has to run
-- between dropping the old `like 'ZOOT-%'` check and adding the new one, and it was this statement
-- that failed the first staging apply. There are zero payment records, so nothing already issued
-- carries the old shape.
