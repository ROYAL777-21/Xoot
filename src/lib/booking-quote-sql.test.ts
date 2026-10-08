import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { BOOKING_ADD_ONS, type BookingQuote, type BookingQuoteInput, type BookingService } from "../../supabase/functions/_shared/booking-contract";
import { fingerprintBookingQuote, parseBookingQuoteInput, quoteBooking, type BookingQuoteFacts } from "../../supabase/functions/_shared/booking-quote";
import { crewCapFor, LADDERS } from "../../supabase/functions/_shared/pricing";

// Same isolated tooling arrangement as scripts/ops/verify-gift-order-contract.mjs.
// No application dependency or live database is needed. The SQL CI job must set this
// to its pinned @electric-sql/pglite@0.5.8 dist/index.js; missing tooling is an explicit
// skip in the ordinary app suite, never claimed as evidence of SQL execution.
const toolingModule = process.env.XOOT_PGLITE_MODULE;
const migration = readFileSync(resolve("supabase/migrations/20260928003000_booking_quote_calculator.sql"), "utf8");
const NOW = Date.parse("2026-09-28T08:00:00+02:00");
const baseInput = (patch: Partial<BookingQuoteInput> = {}): BookingQuoteInput => ({
  contractVersion: 1, service: "airbnb", propertyType: "airbnb", homeSize: "small",
  hours: 5.5, crewSize: 2, addOns: [], linen: "replace", date: "2026-10-01",
  time: "07:00", frequency: "once", repeatDays: [], referralCode: "",
  requestedCreditCents: 0, coverRequested: false, ...patch,
});
const facts = (patch: Partial<BookingQuoteFacts> = {}): BookingQuoteFacts => ({
  buyerId: "buyer-1", carePlusMember: false, availableCreditCents: 0,
  referralRecord: null, completedBookingCount: 0, hasPriorRedemption: false,
  coverAvailable: false, ...patch,
});
type Case = { id: string; input: BookingQuoteInput; facts: BookingQuoteFacts };
const cases: Case[] = [];
function addCase(id: string, patch: Partial<BookingQuoteInput> = {}, benefitPatch: Partial<BookingQuoteFacts> = {}) {
  cases.push({ id, input: parseBookingQuoteInput(baseInput(patch), NOW), facts: facts(benefitPatch) });
}

addCase("approved-airbnb-two");
for (const service of Object.keys(LADDERS) as BookingService[]) {
  for (const hours of Object.keys(LADDERS[service].ladder).map(Number)) {
    for (const homeSize of ["small", "medium", "large"] as const) {
      for (let crewSize = 1; crewSize <= crewCapFor(service, homeSize); crewSize++) {
        const patch: Partial<BookingQuoteInput> = {
          service, propertyType: service === "airbnb" ? "airbnb" : service === "office" ? "office" : service === "moving" ? "empty" : "house",
          hours, homeSize, crewSize, linen: service === "airbnb" ? "none" : null,
        };
        addCase(`ladder/${service}/${hours}/${homeSize}/${crewSize}`, patch);
        addCase(`benefits/${service}/${hours}/${homeSize}/${crewSize}`, {
          ...patch, referralCode: "FRIEND", requestedCreditCents: 12345,
        }, { carePlusMember: true, referralRecord: { code: "FRIEND", userId: "referrer-private-id" }, availableCreditCents: 9876 });
      }
    }
  }
}
for (const [addon, definition] of Object.entries(BOOKING_ADD_ONS)) {
  for (const service of definition.services) {
    const propertyType = service === "airbnb" ? "airbnb" : service === "moving" ? "empty" : "flat";
    addCase(`extra/${service}/${addon}`, {
      service, propertyType, hours: service === "express" ? 1 : service === "moving" ? 4.5 : 5,
      linen: service === "airbnb" ? "none" : null,
      addOns: [addon as keyof typeof BOOKING_ADD_ONS],
    }, { carePlusMember: true });
  }
}
addCase("extras-sorted", { addOns: ["restock_toiletries", "clean_appliances", "restock_supplies"] });
for (const linen of ["none", "replace", "wash_hang", "wash_dry_repack"] as const) {
  addCase(`linen/${linen}`, { linen, addOns: ["clean_appliances"], hours: 5 });
}
for (const service of ["regular", "express", "airbnb", "office", "moving"] as const) {
  for (const propertyType of ["office", "airbnb", "empty"] as const) {
    if (service === (propertyType === "empty" ? "moving" : propertyType)) continue;
    addCase(`correction/${service}/${propertyType}`, { service, propertyType, hours: 1, linen: propertyType === "airbnb" ? "replace" : null });
  }
}
for (const frequency of ["weekly", "fortnightly"] as const) {
  addCase(`repeat/${frequency}`, { frequency, repeatDays: [6, 4, 1] });
}
const shortExpress: Partial<BookingQuoteInput> = { service: "express", propertyType: "flat", linen: null, hours: 1, crewSize: 1 };
for (const time of ["15:30", "16:00"] as const) {
  addCase(`premium/${time}`, { ...shortExpress, time }, { carePlusMember: true });
}
addCase("half-hour-duration-floor", { ...shortExpress, crewSize: 3 });
addCase("solo-hour-no-duration-floor", shortExpress);
addCase("finish-at-17", { time: "14:00" });
addCase("cover-available-not-requested", {}, { coverAvailable: true });
addCase("cover-requested", { coverRequested: true }, { coverAvailable: true });
addCase("all-benefits-credit-floor", {
  service: "regular", propertyType: "flat", hours: 4, linen: null, addOns: ["inside_fridge"],
  referralCode: "FRIEND", coverRequested: true, requestedCreditCents: 999999,
}, { carePlusMember: true, coverAvailable: true, availableCreditCents: 20000, referralRecord: { code: "FRIEND", userId: "friend" } });
for (const [name, patch] of Object.entries({
  unknown: {}, mismatch: { referralRecord: { code: "OTHER", userId: "friend" } },
  own: { referralRecord: { code: "FRIEND", userId: "buyer-1" }, hasPriorRedemption: true, completedBookingCount: 2 },
  used: { referralRecord: { code: "FRIEND", userId: "friend" }, hasPriorRedemption: true, completedBookingCount: 2 },
  completed: { referralRecord: { code: "FRIEND", userId: "friend" }, completedBookingCount: 2 },
  eligible: { referralRecord: { code: "FRIEND", userId: "friend" } },
})) addCase(`referral/${name}`, { referralCode: " friend " }, patch);
for (const [name, request, balance] of [["request", 101, 10000], ["balance", 10000, 101], ["zero", 10000, 0], ["safe-integer", 100000000, Number.MAX_SAFE_INTEGER]] as const) {
  addCase(`credit/${name}`, { requestedCreditCents: request }, { availableCreditCents: balance });
}

const invalid: { id: string; input: unknown; facts: unknown }[] = [];
function badInput(id: string, patch: Record<string, unknown>) { invalid.push({ id, input: { ...baseInput(), ...patch }, facts: facts() }); }
for (const [id, patch] of Object.entries({
  missing: { time: undefined }, unknown_field: { amountCents: 1 }, old_contract: { contractVersion: 0 },
  string_hours: { hours: "5.5" }, missing_hours: { hours: null }, off_ladder: { hours: 5.25 },
  negative_hours: { hours: -1 }, invalid_service: { service: "laundry" }, invalid_property: { propertyType: "castle" },
  incompatible_property: { propertyType: "flat" }, invalid_size: { homeSize: "huge" },
  fractional_crew: { crewSize: 1.5 }, zero_crew: { crewSize: 0 }, large_crew: { crewSize: 5 }, size_cap: { crewSize: 4 },
  duplicate_extras: { addOns: ["restock_supplies", "restock_supplies"] }, unsorted_extras: { addOns: ["restock_toiletries", "clean_appliances"] },
  unknown_extra: { addOns: ["unknown"] }, wrong_service_extra: { addOns: ["inside_fridge"] }, wrong_extra_type: { addOns: [3] },
  wrong_extra_collection: { addOns: {} }, invalid_linen: { linen: null }, early_linen: { linen: "wash_dry_repack", hours: 4 },
  correction_hours: { service: "express", propertyType: "office", linen: null, hours: 1 },
  invalid_date: { date: "2026-02-30" }, invalid_year: { date: "2101-01-01" }, non_iso_date: { date: "2026-1-01" },
  invalid_time: { time: "07:15" }, late_airbnb: { time: "14:30" }, late_finish: { time: "14:00", addOns: ["restock_supplies"] },
  late_extra: { ...shortExpress, time: "16:00", addOns: ["inside_fridge"] },
  invalid_frequency: { frequency: "repeat" }, recurring_without_days: { frequency: "weekly", repeatDays: [] },
  repeated_day: { frequency: "weekly", repeatDays: [4, 4] }, unsorted_days: { frequency: "weekly", repeatDays: [6, 4] },
  wrong_day: { frequency: "weekly", repeatDays: [3] }, fractional_day: { frequency: "weekly", repeatDays: [4, 4.5] },
  invalid_day: { frequency: "weekly", repeatDays: [4, 7] }, wrong_day_type: { frequency: "weekly", repeatDays: ["4"] },
  once_with_repeat: { repeatDays: [4] }, lowercase_referral: { referralCode: "friend" },
  invalid_credit: { requestedCreditCents: -1 }, fractional_credit: { requestedCreditCents: 0.5 }, huge_credit: { requestedCreditCents: 100000001 },
  wrong_cover_type: { coverRequested: "true" }, unavailable_cover: { coverRequested: true },
})) badInput(id, patch);
for (const [id, patch] of Object.entries({
  missing_buyer: { buyerId: "" }, wrong_buyer_type: { buyerId: 123 }, null_membership: { carePlusMember: null },
  wrong_membership: { carePlusMember: "true" }, missing_cover: { coverAvailable: undefined },
  wrong_redemption: { hasPriorRedemption: 0 }, negative_credit: { availableCreditCents: -1 },
  fractional_credit: { availableCreditCents: 1.5 }, unsafe_credit: { availableCreditCents: Number.MAX_SAFE_INTEGER + 1 },
  missing_credit: { availableCreditCents: undefined }, negative_completed: { completedBookingCount: -1 },
  fractional_completed: { completedBookingCount: 1.5 }, malformed_referral: { referralRecord: {} },
  missing_referral: { referralRecord: undefined }, invalid_referrer: { referralRecord: { code: "FRIEND", userId: null } },
})) invalid.push({ id: `facts/${id}`, input: baseInput(), facts: { ...facts(), ...patch } });
for (const value of [null, [], "invalid"]) {
  invalid.push({ id: `body/${JSON.stringify(value)}`, input: value, facts: facts() });
  invalid.push({ id: `facts-body/${JSON.stringify(value)}`, input: baseInput(), facts: value });
}

// Run PGlite in a real Node subprocess: the app test harness intentionally uses jsdom.
// All SQL calls use parameters; the fixture data never becomes executable SQL text.
const runner = String.raw`
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const payload = JSON.parse(readFileSync(0, 'utf8'));
const { PGlite } = await import(pathToFileURL(resolve(process.env.XOOT_PGLITE_MODULE)).href);
const db = new PGlite();
try {
  await db.exec('create role anon; create role authenticated; create role service_role; create role untrusted_probe; create schema private; grant usage on schema private to anon, authenticated, untrusted_probe;');
  await db.exec(payload.migration);
  const metadata = (await db.query("select p.provolatile, p.prosecdef, p.proconfig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname='calculate_booking_quote_v1'")).rows;
  const tables = (await db.query("select count(*)::integer as count from pg_tables where schemaname in ('private','public')")).rows[0].count;
  const call = async (input, facts) => (await db.query('select private.calculate_booking_quote_v1($1::jsonb,$2::jsonb) as quote', [JSON.stringify(input), JSON.stringify(facts)])).rows[0].quote;
  await db.exec('set role service_role');
  const quotes = {};
  for (const c of payload.cases) quotes[c.id] = await call(c.input, c.facts);
  const errors = {};
  for (const c of payload.invalid) {
    try { await call(c.input, c.facts); errors[c.id] = null; }
    catch (error) { errors[c.id] = { code: error.code, message: error.message }; }
  }
  const denied = {};
  for (const role of ['anon','authenticated','untrusted_probe']) {
    await db.exec('reset role; set role ' + role);
    try { await call(payload.cases[0].input, payload.cases[0].facts); denied[role] = null; }
    catch (error) { denied[role] = error.code; }
  }
  await db.exec('reset role; set role service_role; begin read only');
  const readOnlyQuote = await call(payload.cases[0].input, payload.cases[0].facts);
  await db.exec('rollback');
  // Plant the old two-person multiplier in this disposable database only. The
  // differential oracle must detect it; the repository migration is never edited.
  await db.exec('reset role');
  const mutant = payload.migration.replace('create function private.', 'create or replace function private.')
    .replace('array[1,1.15,1.25,1.4]', 'array[1,2,1.25,1.4]');
  if (mutant === payload.migration) throw new Error('Price mutation was not applied');
  await db.exec(mutant);
  await db.exec('set role service_role');
  const oldPriceMutation = await call(payload.cases[0].input, payload.cases[0].facts);
  process.stdout.write(JSON.stringify({ quotes, errors, denied, metadata, tables, readOnlyQuote, oldPriceMutation }));
} catch (error) {
  process.stderr.write(JSON.stringify({ code: error.code, message: error.message, position: error.position, where: error.where }));
  process.exitCode = 1;
} finally { await db.close(); }
`;

describe("booking SQL calculator source boundary", () => {
  it("keeps the calculator private and does not enable a booking writer", () => {
    expect(migration).toMatch(/create function private\.calculate_booking_quote_v1\(p_input jsonb, p_facts jsonb\)/);
    expect(migration).toMatch(/revoke all on function private\.calculate_booking_quote_v1\(jsonb,jsonb\) from public, anon, authenticated/);
    expect(migration).not.toMatch(/\b(?:insert into|update public\.|delete from|create function public\.)/i);
  });
});

describe.skipIf(!toolingModule)("booking SQL calculator (isolated PostgreSQL differential execution)", () => {
  let result: {
    quotes: Record<string, BookingQuote>;
    errors: Record<string, { code: string; message: string } | null>;
    denied: Record<string, string | null>;
    metadata: { provolatile: string; prosecdef: boolean; proconfig: string[] }[];
    tables: number;
    readOnlyQuote: BookingQuote;
    oldPriceMutation: BookingQuote;
  };
  beforeAll(() => {
    result = JSON.parse(execFileSync(process.execPath, ["--input-type=module", "-e", runner], {
      encoding: "utf8", input: JSON.stringify({ migration, cases, invalid }),
      env: process.env, timeout: 60000, maxBuffer: 16 * 1024 * 1024,
    }));
  }, 65000);

  it(`matches ${cases.length} complete TS quotes across all ladders, permitted crews, sizes and benefits`, () => {
    expect(cases.filter(c => c.id.startsWith("ladder/")).length).toBeGreaterThan(400);
    for (const c of cases) {
      // JSON is the API boundary: normalize JS -0 discount lines to JSON's 0.
      const expected = JSON.parse(JSON.stringify(quoteBooking(c.input, c.facts)));
      expect(result.quotes[c.id], c.id).toEqual(expected);
      expect(result.quotes[c.id].lines.reduce((sum, line) => sum + line.amountCents, 0), c.id).toBe(expected.totalCents);
    }
  });

  it("pins the approved R393 crew example, exact itemization, duration and credit floor", () => {
    expect(result.quotes["approved-airbnb-two"]).toMatchObject({ baseCents: 39300, bookingFeeCents: 3900, totalCents: 43200, estimatedDurationHours: 3 });
    expect(result.quotes["all-benefits-credit-floor"]).toMatchObject({ bookingFeeCents: 0, carePlusDiscountCents: 3200, referralDiscountCents: 10000, coverCents: 2200, creditUsedCents: 15800, totalCents: 5000 });
    expect(result.quotes["half-hour-duration-floor"].estimatedDurationHours).toBe(1.5);
    expect(result.quotes["solo-hour-no-duration-floor"].estimatedDurationHours).toBe(1);
  });

  it("preserves correction, referral refusal precedence and canonical arrays without exposing private facts", () => {
    expect(result.quotes["correction/express/office"]).toMatchObject({ service: "office", requestedService: "express", input: { hours: 5 }, serviceCorrection: { from: "express", to: "office" } });
    for (const [id, status] of Object.entries({ unknown: "unknown_code", mismatch: "unknown_code", own: "own_code", used: "already_used", completed: "not_a_first_booking", eligible: "eligible" })) {
      expect(result.quotes[`referral/${id}`].referral).toEqual({ code: "FRIEND", status });
    }
    expect(result.quotes["extras-sorted"].input.addOns).toEqual(["clean_appliances", "restock_supplies", "restock_toiletries"]);
    expect(result.quotes["repeat/weekly"].input.repeatDays).toEqual([1, 4, 6]);
    expect(JSON.stringify(result.quotes)).not.toContain("referrer-private-id");
    expect(JSON.stringify(result.quotes)).not.toContain("buyer-1");
  });

  it("produces the same accepted-quote fingerprint and distinguishes equal-total recurrence changes", async () => {
    for (const id of ["approved-airbnb-two", "extras-sorted", "correction/express/office", "all-benefits-credit-floor"]) {
      const c = cases.find(candidate => candidate.id === id)!;
      expect(await fingerprintBookingQuote(result.quotes[id], c.facts.buyerId)).toBe(await fingerprintBookingQuote(quoteBooking(c.input, c.facts), c.facts.buyerId));
    }
    expect(result.quotes["repeat/weekly"].totalCents).toBe(result.quotes["repeat/fortnightly"].totalCents);
    expect(await fingerprintBookingQuote(result.quotes["repeat/weekly"], "buyer-1"))
      .not.toBe(await fingerprintBookingQuote(result.quotes["repeat/fortnightly"], "buyer-1"));
  });

  it(`rejects ${invalid.length} malformed or noncanonical inputs/facts instead of coercing/defaulting a price`, () => {
    for (const c of invalid) {
      expect(result.errors[c.id], c.id).not.toBeNull();
      expect(result.errors[c.id]?.code, c.id).toMatch(/^22/);
    }
  });

  it("denies direct client/PUBLIC execution and performs no table writes even as service role", () => {
    expect(result.denied).toEqual({ anon: "42501", authenticated: "42501", untrusted_probe: "42501" });
    expect(result.metadata).toEqual([{ provolatile: "i", prosecdef: false, proconfig: ['search_path=""'] }]);
    expect(result.tables).toBe(0);
    expect(result.readOnlyQuote).toEqual(result.quotes["approved-airbnb-two"]);
  });

  it("detects the superseded R684 per-head model planted only in a disposable SQL function", () => {
    expect(result.oldPriceMutation.baseCents).toBe(68400);
    expect(result.oldPriceMutation).not.toEqual(result.quotes["approved-airbnb-two"]);
    expect(result.oldPriceMutation).not.toEqual(JSON.parse(JSON.stringify(quoteBooking(cases[0].input, cases[0].facts))));
  });
});
