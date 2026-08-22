import { describe, expect, it } from "vitest";
import {
  findBrokenTriggers,
  findMissingRelations,
  relationsGuardedIn,
  relationsReferencedBy,
} from "../../scripts/ops/lib/schema-drift.mjs";

/**
 * The fixtures here are **the real defect**, copied from what production actually contained on
 * 2026-08-15, not an invented example.
 *
 * `check_xootcred_balance` was renamed by ZD-029 with `alter function ... rename to`, which changes
 * the name and nothing else, so its body kept reading `from public.zootcred_ledger` after that table
 * became `xootcred_ledger`. Every XootCred debit failed with SQLSTATE 42P01, and because
 * `create-booking` writes a debit for a redemption, a customer applying credit lost the booking too.
 *
 * A guard whose fixture is a toy proves the toy works. These bodies are verbatim enough that if this
 * test passes, the checker would have caught the live outage.
 */

/** Verbatim from production, trimmed to the branch that mattered. */
const BROKEN_XOOTCRED = `
begin
  if new.direction = 'debit' or new.amount < 0 then
    v_debit := abs(new.amount);
    select coalesce(sum(case when direction = 'debit' then -abs(amount) else abs(amount) end), 0)
      into v_balance
      from public.zootcred_ledger
     where user_id = new.user_id;
    if v_balance - v_debit < 0 then
      raise exception 'XootCred balance cannot go negative. Available: %', v_balance;
    end if;
  end if;
  return new;
end;
`;

/** The same function after 20260815160000 — one identifier different. */
const FIXED_XOOTCRED = BROKEN_XOOTCRED.replace("public.zootcred_ledger", "public.xootcred_ledger");

/**
 * Verbatim from `private.can_create_masked_call`. Contains the string
 * `'booking_has_no_assigned_zooter'`, which this repo deliberately keeps — it is a reason code
 * returned to callers, so renaming it is an API change rather than a cleanup.
 */
const DELIBERATE_KEEP = `
  if v_booking.xooter_id is null then
    return query select false, 'booking_has_no_assigned_zooter', v_actor_role, null::timestamptz;
  end if;
  select b.id from public.bookings b left join public.xooters x on x.id = b.xooter_id;
`;

/** Verbatim shape from `enqueue_sensitive_access_notifications` — CTEs referenced unqualified. */
const CTE_HEAVY = `
  with due as (
    select b.id booking_id from public.bookings b join public.xooters x on x.id = b.xooter_id
  ),
  marked as (
    update public.bookings b set sensitive_access_available_notified_at = now()
      from due d where b.id = d.booking_id returning b.id
  )
  select count(*) from marked;
`;

/**
 * Verbatim from `public.enforce_booking_price_author`. `IS DISTINCT FROM` contains the word `from`,
 * and `OLD`/`NEW` are PL/pgSQL record variables rather than schemas — so the first version of this
 * checker reported `old.price` and `old.status` as missing relations.
 */
const TRIGGER_PSEUDO_RECORD = `
begin
  if new.price is distinct from old.price
     and auth.uid() is not null then
    raise exception 'price is server-authored';
  end if;
  return new;
end;
`;

/**
 * Verbatim from `public.can_create_masked_call`. A set-returning function called in `FROM` is not a
 * relation, so `to_regclass` correctly finds nothing — and the first version called that drift.
 */
const SET_RETURNING_CALL = `
  select * from private.can_create_masked_call(p_booking_id, p_actor_id);
`;

const CATALOGUE = new Set([
  "public.xootcred_ledger",
  "public.bookings",
  "public.xooters",
  "public.notifications",
]);

describe("relationsReferencedBy", () => {
  it("finds schema-qualified relations after from/join/into/update", () => {
    expect(relationsReferencedBy("select 1 from public.a join public.b on true")).toEqual(
      new Set(["public.a", "public.b"]),
    );
    expect(relationsReferencedBy("insert into public.c values (1)")).toEqual(new Set(["public.c"]));
    expect(relationsReferencedBy("update public.d set x = 1")).toEqual(new Set(["public.d"]));
  });

  it("ignores CTE names and aliases, which are unqualified", () => {
    // The first version of this checker reported every CTE as a missing table.
    const found = relationsReferencedBy(CTE_HEAVY);
    expect(found.has("public.bookings")).toBe(true);
    expect([...found].some((r) => r.endsWith(".due") || r.endsWith(".marked"))).toBe(false);
  });

  it("ignores string literals — the deliberate keeps must never be reported", () => {
    // 'booking_has_no_assigned_zooter' is a reason code, not an identifier.
    const found = relationsReferencedBy(DELIBERATE_KEEP);
    expect([...found].some((r) => r.includes("zooter"))).toBe(false);
    expect(found.has("public.xooters")).toBe(true);
  });
});

describe("findMissingRelations — against the real XootCred outage", () => {
  it("catches the defect that broke every XootCred redemption", () => {
    const missing = findMissingRelations({
      routines: [{ schema: "public", name: "check_xootcred_balance", body: BROKEN_XOOTCRED }],
      existing: CATALOGUE,
    });
    expect(missing).toEqual([
      { routine: "public.check_xootcred_balance", missing: "public.zootcred_ledger" },
    ]);
  });

  it("is silent once the migration is applied", () => {
    expect(
      findMissingRelations({
        routines: [{ schema: "public", name: "check_xootcred_balance", body: FIXED_XOOTCRED }],
        existing: CATALOGUE,
      }),
    ).toEqual([]);
  });

  it("does not flag the two deliberate keeps", () => {
    expect(
      findMissingRelations({
        routines: [
          { schema: "private", name: "can_create_masked_call", body: DELIBERATE_KEEP },
          { schema: "private", name: "enqueue_sensitive_access_notifications", body: CTE_HEAVY },
        ],
        existing: CATALOGUE,
      }),
    ).toEqual([]);
  });

  it("leaves Supabase's own schemas alone", () => {
    // `auth.users` is correct and always will be; reporting it would bury the real findings.
    expect(
      findMissingRelations({
        routines: [{ schema: "public", name: "handle_new_user", body: "select from auth.users" }],
        existing: CATALOGUE,
      }),
    ).toEqual([]);
  });

  it("catches a rename that has nothing to do with the brand", () => {
    // The point of asking "does this exist" rather than grepping for `zoot`.
    expect(
      findMissingRelations({
        routines: [{ schema: "public", name: "f", body: "select from public.old_invoices" }],
        existing: CATALOGUE,
      }),
    ).toEqual([{ routine: "public.f", missing: "public.old_invoices" }]);
  });
});

describe("findBrokenTriggers", () => {
  it("reports a trigger whose table is gone, and one whose function is gone", () => {
    const broken = findBrokenTriggers({
      triggers: [
        { name: "t_missing_table", table: "public.gone", function: "public.f" },
        { name: "t_missing_fn", table: "public.bookings", function: "public.vanished" },
        { name: "t_fine", table: "public.bookings", function: "public.f" },
      ],
      existing: CATALOGUE,
      routineNames: new Set(["public.f"]),
    });
    expect(broken.map((b) => b.trigger)).toEqual(["t_missing_table", "t_missing_fn"]);
  });
});

/**
 * ── What running it against production taught it ───────────────────────────────────────────────
 *
 * The first live run produced **nineteen findings against zero real defects** — the cry-wolf state
 * the lib's own header warns about, and a checker in that state gets ignored and then deleted.
 * Neither cause was visible by reading the code. Both fixtures below are verbatim from production.
 */
describe("false positives found by running it, not by reading it", () => {
  it("does not treat OLD/NEW as schemas", () => {
    // `is distinct from old.price` — the word `from` is there, the schema is not.
    expect(relationsReferencedBy(TRIGGER_PSEUDO_RECORD).size).toBe(0);
    expect(
      findMissingRelations({
        routines: [{ schema: "public", name: "enforce_booking_price_author", body: TRIGGER_PSEUDO_RECORD }],
        existing: CATALOGUE,
      }),
    ).toEqual([]);
  });

  it("does not treat a function call in FROM as a relation", () => {
    expect(relationsReferencedBy(SET_RETURNING_CALL).size).toBe(0);
    expect(
      findMissingRelations({
        routines: [{ schema: "public", name: "can_create_masked_call", body: SET_RETURNING_CALL }],
        existing: CATALOGUE,
      }),
    ).toEqual([]);
  });

  it("still catches the real defect — the fix must not blind it", () => {
    /*
     * The regression that would actually matter. Both exclusions above narrow what the checker
     * looks at, and narrowing is exactly how a guard gets quietly disarmed. `public.zootcred_ledger`
     * is a bare relation reference, so neither exclusion may touch it.
     */
    expect(
      findMissingRelations({
        routines: [{ schema: "public", name: "check_xootcred_balance", body: BROKEN_XOOTCRED }],
        existing: CATALOGUE,
      }),
    ).toEqual([{ routine: "public.check_xootcred_balance", missing: "public.zootcred_ledger" }]);
  });
});

describe("a write to a dropped table is not invisible", () => {
  /*
   * ── The blind spot, found 2026-08-22 by measuring rather than reasoning ──────────────────────
   *
   * The function-call exclusion (`a name followed by "(" is a function`) was applied to `into` and
   * `update` as well as `from` and `join`. But `insert into public.notifications (user_id, kind)`
   * is *also* followed by `(` — a column list — so **every INSERT that names its columns was
   * skipped entirely.**
   *
   * That is not hypothetical: `private.enqueue_sensitive_access_notifications` on both live
   * projects writes exactly this shape, so had `notifications` been renamed out from under it, the
   * checker built specifically to catch renamed-table references would have reported nothing.
   *
   * Found while checking whether the restored signup trigger would produce a FALSE positive. It
   * did not — and the reason it did not was this bug, silently swallowing the reference.
   */
  const INSERT_WITH_COLUMNS = `
    begin
      insert into public.notifications (user_id, kind, title, body, link)
      values (new.id, 'welcome', 'Welcome', 'hi', '/app');
      return new;
    end;
  `;

  const UPDATE_WITH_ALIAS = `
    begin
      update public.zootcred_wallets w set balance = 0 where w.user_id = new.id;
      return new;
    end;
  `;

  it("sees an insert target even when the column list follows", () => {
    expect(relationsReferencedBy(INSERT_WITH_COLUMNS)).toContain("public.notifications");
  });

  it("reports an insert into a table that no longer exists", () => {
    expect(
      findMissingRelations({
        routines: [{ schema: "public", name: "handle_new_user", body: INSERT_WITH_COLUMNS }],
        existing: new Set(["public.profiles"]),
      }),
    ).toEqual([{ routine: "public.handle_new_user", missing: "public.notifications" }]);
  });

  it("reports an update against a table that no longer exists", () => {
    expect(
      findMissingRelations({
        routines: [{ schema: "public", name: "some_trigger", body: UPDATE_WITH_ALIAS }],
        existing: new Set(["public.xootcred_wallets"]),
      }),
    ).toEqual([{ routine: "public.some_trigger", missing: "public.zootcred_wallets" }]);
  });

  it("still does not mistake a set-returning call after from/join for a relation", () => {
    // The narrowing above must not undo the exclusion that read paths still need.
    expect(relationsReferencedBy(SET_RETURNING_CALL).size).toBe(0);
  });
});

describe("a reference the code guards with to_regclass is handled, not broken", () => {
  /*
   * Production and staging genuinely do not have the same tables: `referrals`,
   * `zootcred_wallets` and `user_reassignment_state` exist only on staging. `handle_new_user` has
   * to run on both, so it guards those three and writes the shared four plainly.
   *
   * Without this exclusion the checker reported all three as broken on production and exited 1 —
   * measured, not imagined. Every one was a false positive: the guard is the code stating the
   * table may be absent, so absence is the handled case.
   *
   * The exclusion is deliberately narrow. It keys on the *specific* relation named inside
   * `to_regclass('...')`, so guarding one table does not excuse an unguarded reference to another
   * in the same body — which is the assertion below that actually protects the checker.
   */
  const GUARDED = `
    begin
      insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
      if to_regclass('public.referrals') is not null then
        execute 'insert into public.referrals (user_id) values ($1)' using new.id;
      end if;
      return new;
    end;
  `;

  const GUARDED_ONE_BUT_NOT_THE_OTHER = `
    begin
      if to_regclass('public.referrals') is not null then
        execute 'insert into public.referrals (user_id) values ($1)' using new.id;
      end if;
      insert into public.zootcred_wallets (user_id) values (new.id);
      return new;
    end;
  `;

  it("extracts the guarded relation names", () => {
    expect([...relationsGuardedIn(GUARDED)]).toEqual(["public.referrals"]);
  });

  it("does not report a guarded relation that is absent", () => {
    expect(
      findMissingRelations({
        routines: [{ schema: "public", name: "handle_new_user", body: GUARDED }],
        existing: new Set(["public.profiles"]),
      }),
    ).toEqual([]);
  });

  it("still reports an UNGUARDED absent relation in the same body", () => {
    // The regression that would matter: one guard must not blanket-excuse the whole function.
    expect(
      findMissingRelations({
        routines: [{ schema: "public", name: "handle_new_user", body: GUARDED_ONE_BUT_NOT_THE_OTHER }],
        existing: new Set(["public.profiles"]),
      }),
    ).toEqual([
      { routine: "public.handle_new_user", missing: "public.zootcred_wallets" },
    ]);
  });

  it("still catches the original XootCred defect", () => {
    // The guard-awareness must not blind the checker to the outage it was built for.
    expect(
      findMissingRelations({
        routines: [{ schema: "public", name: "check_xootcred_balance", body: BROKEN_XOOTCRED }],
        existing: CATALOGUE,
      }),
    ).toEqual([{ routine: "public.check_xootcred_balance", missing: "public.zootcred_ledger" }]);
  });
});
