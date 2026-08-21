import { describe, expect, it } from "vitest";
import {
  findBrokenTriggers,
  findMissingRelations,
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
