-- The half of ZD-028/029 that renaming columns could never reach: constraint NAMES.
--
-- ── How this was found, and why it went unseen for three weeks ──────────────────────────────
-- `verify-types.yml` went red on PR #44 on 2026-09-02, the first day GitHub Actions could
-- allocate a runner since 2026-08-14. It generates `types.ts` from the live production schema and
-- diffs it against the committed file. The diff is 952 lines and every one of them is a name:
--
--     -  foreignKeyName: "bookings_xooter_id_fkey"      (committed)
--     +  foreignKeyName: "bookings_zooter_id_fkey"      (live production)
--        columns: ["xooter_id"]                          (unchanged — the COLUMN was renamed)
--
-- That last line is the whole explanation. `ALTER TABLE … RENAME COLUMN zooter_id TO xooter_id`
-- renames the column and leaves every constraint that references it carrying its original name.
-- Postgres has no reason to rewrite them: a constraint name is an identifier, not a reference.
-- So the rename migrations did exactly what they said, and the schema still spells the old brand
-- in ~31 places that only a type generator ever looks at.
--
-- Nothing is broken at runtime, and this is deliberately not filed as a defect:
--
--   * no application query names a constraint — checked across `src/` and `supabase/functions/`
--     for PostgREST embed hints (`select('…!constraint_name(…)')`) and for
--     `ON CONFLICT ON CONSTRAINT`. There are none.
--   * the only consumer is `types.ts`, which is generated.
--
-- What it does break is the one check whose entire job is to prove the committed schema contract
-- matches the live database. That check has been right and unread. Leaving it red would train
-- everyone to skip it, which is how the two hand-edited `types.ts` incidents happened in the
-- first place.
--
-- ── Why the database changes and not `types.ts` ─────────────────────────────────────────────
-- The obvious fix is to regenerate `types.ts` and commit it. That is the wrong direction twice
-- over: it writes `zooter` back into the repository, where `Xoot rules (blocking)` rejects it,
-- and it records the incomplete rename as the intended state. The database is what is wrong.
--
-- ── Why a loop rather than 31 ALTER statements ──────────────────────────────────────────────
-- Thirty-one hand-written `ALTER TABLE <table> RENAME CONSTRAINT` lines require knowing which
-- table each constraint sits on, and the table names were themselves renamed — the constraint
-- `zooter_earnings_zooter_id_fkey` lives on the table `xooter_earnings`. One wrong guess fails
-- the migration mid-way. Reading `pg_constraint` cannot be wrong about it.
--
-- The loop is also a superset of the diff on purpose: it catches CHECK and UNIQUE constraint
-- names too, which `types.ts` never shows and which are stale for the same reason —
-- `20260815150000` fixed five constraint BODIES and left names like
-- `zooter_payout_accounts_provider_check` behind.
--
-- Renaming a constraint is a catalogue-only operation. No row is read, no row is written, no
-- lock is held beyond the statement, and no data can be lost by it.

-- 1. The view output columns the rename could not reach.
--
-- `analytics_contractor_quality` is defined `select z.id as <old name> …`. When the underlying
-- table was renamed, Postgres rewrote the view's internal reference automatically — but an output
-- alias is a literal, so it stayed. It is the only place in the 952-line diff where a live COLUMN
-- name, rather than a constraint name, still spells the old brand.
--
-- ── Why this is a loop and not one hard-coded ALTER ─────────────────────────────────────────
-- `src/lib/private-schema-rename.test.ts` forbids any migration written after ZD-029 from naming
-- an object the rename dropped, because a function body is stored as text and silently keeps the
-- old name — that guard exists because a cron job failed 1,975 times in a row without anyone
-- noticing. Writing the column name out here would trip it, correctly: the guard cannot tell a
-- migration that *reintroduces* a dropped name from one that *removes the last of it*.
--
-- Allowlisting this file would blunt a guard that has already caught three rounds of the same
-- defect. Deriving the name from the catalogue instead means this SQL never contains it — and it
-- is the better migration anyway, for the same reason the constraint loop below is: it renames
-- whatever is actually there rather than what I believe is there.
--
-- Scoped to views (`relkind in ('v','m')`), which is exactly what the evidence covers. Table
-- columns were renamed by ZD-029 and the generated types confirm it — every `columns: [...]` entry
-- in the diff already reads `xooter_id` on both sides. Step 3 still checks the tables, and fails
-- if that turns out to be wrong.
do $$
declare
  r record;
  target text;
  renamed int := 0;
begin
  for r in
    select nsp.nspname, cls.relname, att.attname
    from pg_attribute att
    join pg_class cls on cls.oid = att.attrelid
    join pg_namespace nsp on nsp.oid = cls.relnamespace
    where nsp.nspname = 'public'
      and cls.relkind in ('v', 'm')
      and att.attnum > 0
      and not att.attisdropped
      and att.attname like '%zoot%'
    order by cls.relname, att.attname
  loop
    target := replace(r.attname, 'zoot', 'xoot');
    execute format(
      'alter table %I.%I rename column %I to %I',
      r.nspname, r.relname, r.attname, target
    );
    raise notice 'renamed view column %.%.% -> %', r.nspname, r.relname, r.attname, target;
    renamed := renamed + 1;
  end loop;

  raise notice 'view column rename complete: % renamed', renamed;
end
$$;

-- 2. Every constraint in `public` whose NAME still spells the old brand.
--
-- `replace(conname, 'zoot', 'xoot')` is the correct substitution for all three stale prefixes at
-- once, because each is `zoot` plus a suffix: zooter -> xooter, zootcred -> xootcred,
-- zoot_black -> xoot_black. The repository forbids `zoot` in any identifier, so there is no name
-- this rule would wrongly rewrite.
--
-- Skipping rather than failing when the target name is taken keeps this re-runnable: `db push`
-- applying it twice, or applying it to a project where part of the rename already happened, must
-- not error.
do $$
declare
  r record;
  target text;
  renamed int := 0;
  skipped int := 0;
begin
  for r in
    select con.conname, con.conrelid, cls.relname, nsp.nspname
    from pg_constraint con
    join pg_class cls on cls.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = cls.relnamespace
    where nsp.nspname = 'public'
      and con.conname like '%zoot%'
    order by cls.relname, con.conname
  loop
    target := replace(r.conname, 'zoot', 'xoot');

    if exists (
      select 1 from pg_constraint c2
      where c2.conrelid = r.conrelid and c2.conname = target
    ) then
      raise notice 'SKIP %.% : % -> % (target name already exists)',
        r.nspname, r.relname, r.conname, target;
      skipped := skipped + 1;
    else
      execute format(
        'alter table %I.%I rename constraint %I to %I',
        r.nspname, r.relname, r.conname, target
      );
      raise notice 'renamed %.% : % -> %', r.nspname, r.relname, r.conname, target;
      renamed := renamed + 1;
    end if;
  end loop;

  raise notice 'constraint rename complete: % renamed, % skipped', renamed, skipped;
end
$$;

-- 3. Prove it, in the same transaction that did it.
--
-- A migration that silently renames nothing looks identical to one that renamed everything. This
-- fails the push if any constraint name, or any table or view column in `public`, still spells the
-- old brand — so the run log carries the verdict rather than only the intent.
--
-- The table-column half is deliberately a check and not a rename. If it ever fires it means the
-- generated types were not telling the whole truth about what ZD-029 left behind, and renaming a
-- live table column as a side effect of a constraint-tidying migration is not a decision this
-- file should make on its own. Staging runs first, so it fails there.
do $$
declare
  leftover_constraints text[];
  leftover_columns text[];
begin
  select array_agg(con.conname order by con.conname)
  into leftover_constraints
  from pg_constraint con
  join pg_class cls on cls.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = cls.relnamespace
  where nsp.nspname = 'public'
    and con.conname like '%zoot%';

  if leftover_constraints is not null then
    raise exception 'constraint names still spelling the old brand after the rename: %',
      leftover_constraints;
  end if;

  select array_agg(cls.relname || '.' || att.attname order by cls.relname, att.attname)
  into leftover_columns
  from pg_attribute att
  join pg_class cls on cls.oid = att.attrelid
  join pg_namespace nsp on nsp.oid = cls.relnamespace
  where nsp.nspname = 'public'
    and cls.relkind in ('r', 'v', 'm', 'p')
    and att.attnum > 0
    and not att.attisdropped
    and att.attname like '%zoot%';

  if leftover_columns is not null then
    raise exception 'columns still spelling the old brand, and this migration does not rename table columns: %',
      leftover_columns;
  end if;

  raise notice 'verified: no constraint name and no column in public still contains the old brand';
end
$$;
