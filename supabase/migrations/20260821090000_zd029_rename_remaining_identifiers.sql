-- ZD-029's last surface: 180 identifiers a table rename never touches.
--
-- ── What a rename does and does not do ──────────────────────────────────────────
-- `alter table … rename` rewrites everything that REFERENCES the table, because policy and view
-- expressions are stored as parsed trees. It does not touch anything that merely CONTAINS the old
-- word as a stored identifier. Measured on production 2026-08-21:
--
--     113  constraints          (renaming a PK/UNIQUE constraint renames its index too — 27 of them)
--      37  standalone indexes
--      27  policies             (bodies already correct; only the names are wrong)
--       3  triggers
--     ---
--     180  total, and 0 tables, views or columns — those were done.
--
-- ── The rule is `zoot` -> `xoot`, and nothing narrower ──────────────────────────
-- A first attempt at this used a prefix list — `zooter`->`xooter`, `zootcred`->`xootcred`,
-- `zoot_black`->`xoot_black`. It silently left **15 identifiers** behind, all of them
-- `zoot_concierge_*`, because that prefix was not on the list. The tables are `xoot_concierge_*`;
-- only their constraints, indexes and policies still said `zoot`.
--
-- That is ZD-029's own failure mode repeating one level down: a sweep whose pattern list is shorter
-- than reality. Every case here is the same four letters, so the rule is those four letters and
-- there is no list to be incomplete. Verified before writing: applying `replace(name,'zoot','xoot')`
-- to all 180 leaves **0** names still containing `zoot`, and produces **0** colliding targets.
--
-- ── Why a catalogue loop and not 180 literal statements ─────────────────────────
-- Three reasons, each learned here:
--
--   1. `20260820140000` already drops and recreates `booking_tips`' policy under the new name. A
--      literal `alter policy "zooters view settled tips only"` would then fail on a missing object
--      and take the whole migration down. This skips whatever is already correct.
--   2. Migrations in this repo wait days for a `db-push`. Literals captured today can be stale by
--      then; a loop renames what is actually there when it runs.
--   3. It is re-runnable after a partial apply — the lesson from `20260814103000`.
--
-- ── Nothing reads these names ───────────────────────────────────────────────────
-- Grepped before writing: no source file matches a constraint name. `types.ts` DOES carry
-- `foreignKeyName` values, and it already holds the **target** names — zero `zoot`-named, 284
-- `xooter`-named, because it was regenerated optimistically during ZD-029. So this migration makes
-- production match the committed types rather than the other way round, and it is what finally lets
-- *Types match the live schema* pass. `src/lib/zd029-identifier-sweep.test.ts` pins that link.

do $$
declare
  r record;
  n_constraint int := 0;
  n_index      int := 0;
  n_policy     int := 0;
  n_trigger    int := 0;
  leftover     int;
begin
  -- 1. Constraints first. This also renames the index backing any PK or UNIQUE constraint, which is
  --    why step 2 re-reads the catalogue instead of trusting a count taken now.
  for r in
    select c.conrelid::regclass::text as tbl, c.conname as old, replace(c.conname,'zoot','xoot') as new
    from pg_constraint c
    where c.conname like '%zoot%'
      and c.connamespace in ('public'::regnamespace, 'private'::regnamespace)
    order by 1, 2
  loop
    execute format('alter table %s rename constraint %I to %I', r.tbl, r.old, r.new);
    n_constraint := n_constraint + 1;
  end loop;

  -- 2. Indexes that do not back a constraint.
  for r in
    select i.schemaname as sch, i.indexname as old, replace(i.indexname,'zoot','xoot') as new
    from pg_indexes i
    where i.schemaname in ('public','private')
      and i.indexname like '%zoot%'
      and not exists (
        select 1 from pg_constraint c
        where c.conname = i.indexname
          and c.connamespace in ('public'::regnamespace, 'private'::regnamespace)
      )
    order by 1, 2
  loop
    execute format('alter index %I.%I rename to %I', r.sch, r.old, r.new);
    n_index := n_index + 1;
  end loop;

  -- 3. Policies. Bodies were rewritten automatically by the original rename; only names are wrong.
  --    Skips `booking_tips`, which 20260820140000 has already recreated under the new name.
  for r in
    select p.schemaname as sch, p.tablename as tbl, p.policyname as old,
           replace(p.policyname,'zoot','xoot') as new
    from pg_policies p
    where p.schemaname in ('public','private') and p.policyname like '%zoot%'
    order by 1, 2, 3
  loop
    execute format('alter policy %I on %I.%I rename to %I', r.old, r.sch, r.tbl, r.new);
    n_policy := n_policy + 1;
  end loop;

  -- 4. Triggers.
  for r in
    select t.tgrelid::regclass::text as tbl, t.tgname as old, replace(t.tgname,'zoot','xoot') as new
    from pg_trigger t
    where not t.tgisinternal and t.tgname like '%zoot%'
    order by 1, 2
  loop
    execute format('alter trigger %I on %s rename to %I', r.old, r.tbl, r.new);
    n_trigger := n_trigger + 1;
  end loop;

  raise notice 'ZD-029 sweep: % constraints, % indexes, % policies, % triggers',
    n_constraint, n_index, n_policy, n_trigger;

  -- 5. Fail loudly rather than report a partial success. This repo has shipped enough green results
  --    that did nothing.
  select
    (select count(*) from pg_constraint
      where conname like '%zoot%'
        and connamespace in ('public'::regnamespace,'private'::regnamespace))
  + (select count(*) from pg_indexes
      where schemaname in ('public','private') and indexname like '%zoot%')
  + (select count(*) from pg_policies
      where schemaname in ('public','private') and policyname like '%zoot%')
  + (select count(*) from pg_trigger where not tgisinternal and tgname like '%zoot%')
  into leftover;

  if leftover > 0 then
    raise exception 'ZD-029 sweep incomplete: % identifiers still contain zoot', leftover;
  end if;
end $$;
