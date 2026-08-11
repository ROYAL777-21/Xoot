import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MAX_TIP_CENTS, TIP_VISIBLE_TO_XOOTER } from "./tipping";

/**
 * The tip visibility rule is a founder decision enforced in SQL, and SQL is the one
 * layer no other test in this repo executes.
 *
 * These read the migration as text. That cannot prove Postgres behaves as intended —
 * only a database can — but it does catch the failures that actually happen: the tip
 * quietly moving back onto `bookings` where RLS cannot hide it, the settlement gate
 * being dropped from the Xooter's policy, or the client being handed the column that
 * gate depends on.
 */

const read = (file: string) => readFileSync(join(process.cwd(), "supabase/migrations", file), "utf8");

const sql = read("20260730090000_booking_tips.sql");

/**
 * The price guard is a separate migration with an earlier timestamp, deliberately. The
 * tipping schema is gated on ZD-005 and can wait; this one protects money in production
 * today and depends on nothing else, so it must be applicable on its own.
 */
const guardSql = read("20260730083000_booking_price_author_guard.sql");

describe("tip visibility policy", () => {
  it("keeps the tip off the bookings row", () => {
    // The whole reason for a separate table. RLS is row-level, so a tip column on
    // `bookings` is readable by every assigned Xooter through the existing
    // "zooters view assigned bookings" policy, whatever else is written around it.
    expect(sql).toMatch(/create table if not exists public\.booking_tips/);
    expect(sql).not.toMatch(/alter table public\.bookings[\s\S]{0,200}tip_cents/);
  });

  it("gates the Xooter's view on settlement", () => {
    const policy = sql.slice(sql.indexOf('create policy "zooters view settled tips only"'));
    const body = policy.slice(0, policy.indexOf(";"));
    expect(body).toMatch(/settled_at is not null/);
    expect(body).toMatch(/from public\.zooters z/);
    expect(TIP_VISIBLE_TO_XOOTER).toBe("after_settlement");
  });

  it("stops a client session from opening that gate itself", () => {
    // A customer able to set `settled_at` reveals their own tip early; a Xooter able to
    // set it reveals everyone's. Only a server context or an admin may.
    expect(sql).toMatch(/new\.settled_at := old\.settled_at/);
    expect(sql).toMatch(/booking_tip_settlement_guard/);
  });

  it("only accepts a tip on a completed booking the customer owns", () => {
    const policy = sql.slice(sql.indexOf('create policy "customers add tip to own completed booking"'));
    const body = policy.slice(0, policy.indexOf(");\n\n"));
    expect(body).toMatch(/user_id = auth\.uid\(\)/);
    expect(body).toMatch(/b\.status = 'completed'/);
  });

  it("caps the stored amount at the same figure the client does", () => {
    // Two independent limits that must agree. If they drift, the client accepts an
    // amount the database then rejects, and the customer sees a failed tip.
    expect(sql).toMatch(new RegExp(`amount_cents <= ${MAX_TIP_CENTS}`));
  });

  it("gives a tip somewhere to become money", () => {
    expect(sql).toMatch(/payment_records_payment_kind_check/);
    expect(sql).toMatch(/'tip'\s*\n?\s*\)\)/);
  });

  it("stops customers and Xooters rewriting a booking's price", () => {
    // Found while writing the tip guard, not part of tipping: both existing UPDATE
    // policies on `bookings` cover the whole row, so a customer could zero their own
    // price and an assigned Xooter could raise the price of a job they are working.
    expect(guardSql).toMatch(/new\.price := old\.price/);
    expect(guardSql).toMatch(/booking_price_author_guard/);
    // The server path must still be able to price a booking.
    expect(guardSql).toMatch(/auth\.uid\(\) is not null/);
    // And a customer must still be able to cancel.
    expect(guardSql).toMatch(/new\.status = 'cancelled'/);
  });

  it("keeps the price guard independently applicable", () => {
    // It must not have drifted back into the tipping migration, and must not depend on
    // anything that migration creates — otherwise it cannot be applied ahead of a
    // decision that has not been made.
    expect(sql).not.toMatch(/booking_price_author_guard/);
    expect(guardSql).not.toMatch(/booking_tips/);
    // Earlier timestamp, so migration order puts it first.
    expect("20260730083000" < "20260730090000").toBe(true);
  });

  it("can be run twice", () => {
    // A migration that fails on re-run is a migration nobody dares re-run.
    const created = [...sql.matchAll(/create policy "([^"]+)"/g)].map((m) => m[1]);
    expect(created.length).toBeGreaterThan(0);
    for (const name of created) {
      expect(sql).toMatch(new RegExp(`drop policy if exists "${name}"`));
    }
  });
});
