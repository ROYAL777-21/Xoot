-- The last five CHECK constraints whose BODY still spells the old brand.
--
-- ── Why this exists after ZD-029 said the rename was done ───────────────────────────────────
-- `founder-todo.md` §5 recorded this exact pattern and concluded there were three:
-- `payment_provider_reference_format_safe`, `messages.sender_type` and
-- `xoot_concierge_feedback.role`. **There were eight.** `20260813200000` fixed a sixth
-- (`payment_records.provider`, which broke booking creation for two days). These are the
-- remaining five, read off the live production database on 2026-08-15 rather than inferred from
-- the repo:
--
--     safety_sos_alerts_raiser_role_check          CHECK (raiser_role IN ('customer','zooter'))
--     support_handoff_contexts_role_type_check     CHECK (role_type IN ('user','zooter','admin'))
--     visit_recordings_recorder_role_check         CHECK (recorder_role IN ('customer','zooter'))
--     payment_reconciliation_checks_provider_check CHECK (provider IN ('stitch','ozow'))
--     zooter_payout_accounts_provider_check        CHECK (provider IN ('manual_bank','stitch','ozow'))
--
-- ── Two of these are breaking a live feature right now ──────────────────────────────────────
-- The rename moved the code to `xooter` and left the constraint bodies behind, so the two writers
-- that name a role are sending a value their own column forbids:
--
--     raise-sos-alert/index.ts:71          const raiserRole = xooter?.id ? "xooter" : "customer";
--     create-concierge-handoff/index.ts:85 return xooter?.id ? "xooter" : "user";
--
-- **A Xooter cannot raise an SOS alert, and cannot open a Concierge handoff.** Both fail with
-- SQLSTATE 23514 at the insert. The first is a safety feature, which is why this is not filed as
-- tidy-up. `visit_recordings` has no writer yet and would have broken on the day recording shipped.
--
-- ── The two payment ones are mine, from the same sweep that broke bookings ───────────────────
-- `20260813180000` retired Stitch and Ozow across the payment surface but reached only
-- `payment_records` and `payment_provider_capabilities`. `payment_reconciliation_checks` and
-- `xooter_payout_accounts` still only accept the two providers that were removed, so a PayFast
-- reconciliation row could never be written. Neither has a writer in the repo today, so unlike the
-- role constraints these are latent rather than live — recorded as such rather than overstated.
--
-- ── Found by definition, never by name ──────────────────────────────────────────────────────
-- An inline `check (...)` gets an auto-generated name, and `drop constraint if exists <guess>`
-- silently does nothing while the `add` succeeds — leaving the old constraint in force, the new one
-- beside it, and the migration reporting success. Note `zooter_payout_accounts_provider_check`
-- above: the table was renamed to `xooter_payout_accounts` and the constraint NAME was not, which
-- is exactly the guess that would have failed. A `DO` block over `pg_constraint` cannot.
--
-- Constraint names are left as they are. They are internal identifiers, never referenced by
-- application code — the same reasoning ZD-029 applied, which was right about names and wrong only
-- about bodies.
--
-- ── Safety ──────────────────────────────────────────────────────────────────────────────────
-- All five tables held **0 rows** on both projects when this was written, so nothing is rewritten
-- and nothing can fail validation. Re-added validating rather than `not valid`: there is nothing to
-- scan, and a table permanently carrying an unverified constraint is a worse resting state.
--
-- `src/lib/constraint-writer-parity.test.ts` now reads every value-list CHECK in this directory
-- against every literal the code writes to that column, so a seventh instance cannot ship quietly.

-- ── Step 1: drop the old bodies, found by DEFINITION ────────────────────────────────────────
-- Dynamic because the names cannot be trusted: `zooter_payout_accounts_provider_check` still
-- carries the old brand even though its table is now `xooter_payout_accounts`, so any
-- `drop constraint if exists <guess>` would silently do nothing while the `add` succeeded.
do $$
declare
  target record;
  c record;
begin
  for target in
    select *
    from (values
      ('public.safety_sos_alerts'::text,       'raiser_role'::text),
      ('public.support_handoff_contexts',      'role_type'),
      ('public.visit_recordings',              'recorder_role'),
      ('public.payment_reconciliation_checks', 'provider'),
      ('public.xooter_payout_accounts',        'provider')
    ) as t(tbl, col)
  loop
    if to_regclass(target.tbl) is null then
      raise notice 'skipping %, table not present', target.tbl;
      continue;
    end if;

    for c in
      select conname
      from pg_constraint
      where contype = 'c'
        and conrelid = to_regclass(target.tbl)
        -- The column must appear as a WORD, so `provider` does not also match
        -- `provider_reference`, whose length check is unrelated and must survive.
        and pg_get_constraintdef(oid) ~ ('\m' || target.col || '\M')
        and pg_get_constraintdef(oid) !~* 'char_length'
    loop
      execute format('alter table %s drop constraint %I', target.tbl, c.conname);
      raise notice 'dropped % on %', c.conname, target.tbl;
    end loop;
  end loop;
end $$;

-- ── Step 2: re-add them as plain, readable statements ───────────────────────────────────────
-- Deliberately NOT generated inside the block above, even though that would be shorter.
--
-- `src/lib/constraint-writer-parity.test.ts` reads these files to learn what each column allows,
-- and so does anyone reviewing a migration. A constraint assembled from a `values` list inside a
-- `DO` block is invisible to both — the guard read this file and still believed `raiser_role`
-- allowed `zooter`, which is exactly the blindness that let six of these ship. **If the final
-- state is not greppable, it is not reviewable.**
alter table public.safety_sos_alerts
  add constraint safety_sos_alerts_raiser_role_check
  check (raiser_role in ('customer', 'xooter'));

alter table public.support_handoff_contexts
  add constraint support_handoff_contexts_role_type_check
  check (role_type in ('user', 'xooter', 'admin'));

alter table public.visit_recordings
  add constraint visit_recordings_recorder_role_check
  check (recorder_role in ('customer', 'xooter'));

alter table public.payment_reconciliation_checks
  add constraint payment_reconciliation_checks_provider_check
  check (provider in ('payfast'));

alter table public.xooter_payout_accounts
  add constraint xooter_payout_accounts_provider_check
  check (provider in ('manual_bank', 'payfast'));

comment on column public.safety_sos_alerts.raiser_role is
  'Who raised the alert: customer or xooter. Renamed from ''zooter'' on 2026-08-15 — the ZD-029 rename moved raise-sos-alert to ''xooter'' and left this constraint body behind, so a Xooter could not raise an SOS alert at all.';

comment on column public.support_handoff_contexts.role_type is
  'Who the handoff is for: user, xooter or admin. Renamed from ''zooter'' on 2026-08-15 for the same reason as safety_sos_alerts.raiser_role.';

comment on column public.payment_reconciliation_checks.provider is
  'PayFast is the only payment provider. Stitch and Ozow were retired by 20260813180000, which reached payment_records but not this table.';
