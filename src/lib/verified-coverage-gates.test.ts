import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const sql = read("supabase/migrations/20261019185331_xoot_approved_service_zones.sql");
const edge = read("supabase/functions/check-service-coverage/index.ts");
const verify = read("supabase/functions/_shared/verified-coverage.ts");
const writer = read("supabase/functions/create-booking/index.ts");
const legacyWriter = read("supabase/functions/create-booking-request/index.ts");
const booking = read("src/pages/app/BookingFlow.tsx");
const config = read("supabase/config.toml");

describe("server-controlled Mapbox geofence rollout contract", () => {
  it("stores no invented operating zone; only approved polygons may be active", () => {
    expect(sql).toContain("create table public.xoot_service_zones");
    expect(sql).toContain("geometry jsonb not null");
    expect(sql).toContain("xoot_active_zone_has_authorised_approval");
    expect(sql).toContain("not active or (approved_at is not null and approved_by is not null)");
    expect(sql).toContain("alter table public.xoot_service_zones enable row level security");
    expect(sql).toContain("revoke all on table public.xoot_service_zones from public, anon, authenticated");
    expect(sql).toContain("grant select, insert, update, delete on table public.xoot_service_zones to service_role");
    expect(sql).not.toMatch(/insert into public\.xoot_service_zones/i);
    expect(sql).not.toContain("CREATE EXTENSION postgis");
  });

  it("rate limits billable Permanent Geocoding by authenticated user atomically", () => {
    expect(sql).toContain("create table public.xoot_coverage_query_budget");
    expect(sql).toContain("create or replace function public.xoot_consume_coverage_query");
    expect(sql).toContain("on conflict (user_id) do update");
    expect(sql).toContain("requests < 12");
    expect(sql).toContain("security invoker");
    expect(sql).toContain("revoke all on function public.xoot_consume_coverage_query(uuid) from public, anon, authenticated");
    expect(sql).toContain("grant execute on function public.xoot_consume_coverage_query(uuid) to service_role");
    expect(verify).toContain('db.rpc("xoot_consume_coverage_query"');
    expect(edge).toContain('token: Deno.env.get("MAPBOX_GEOCODING_TOKEN")');
  });

  it("checks the real Mapbox result on the server, not client coordinates or suburb text", () => {
    expect(verify).toContain("https://api.mapbox.com/search/geocode/v6/forward?");
    expect(verify).toContain('permanent: "true"');
    expect(verify).toContain('country: "za"');
    expect(verify).toContain('types: "address"');
    expect(verify).toContain('autocomplete: "false"');
    expect(verify).toContain('context?.country?.country_code');
    expect(verify).toContain('validLngLat(first.geometry?.coordinates)');
    expect(verify).toContain("checkApprovedCoverage(");
    expect(verify).toContain('reason: "address_requires_pin_review"');
    expect(verify).not.toContain("body.latitude");
    expect(verify).not.toContain("body.longitude");
  });

  it("Edge checks JWT and does not log addresses or reveal responses in caches", () => {
    expect(config).toMatch(/\[functions\.check-service-coverage\]\s*verify_jwt = true/);
    expect(edge).toContain("await requireAuth(req, origin)");
    expect(edge).toContain("actorId: auth.user.id");
    expect(edge).not.toContain('body: { address: fullAddress');
    expect(edge).toContain('Cache-Control", "private, no-store"');
    expect(edge).not.toContain("console.log");
    expect(edge).not.toContain("console.warn");
    expect(edge).not.toContain("latitude");
    expect(edge).not.toContain("longitude");
  });

  it("both booking writers recheck location server-side before accepting new bookings", () => {
    for (const source of [writer, legacyWriter]) {
      expect(source).toContain('Deno.env.get("XOOT_STRICT_GEO_COVERAGE") === "true"');
      expect(source).toContain("await assessVerifiedCoverage({");
      expect(source).toContain('token: Deno.env.get("MAPBOX_GEOCODING_TOKEN")');
      expect(source).toContain('state !== "available"');
    }
    expect(legacyWriter).not.toContain("address.toLowerCase().includes(region)");
    expect(legacyWriter).toContain("resolveLaunchRegion(address)");
  });

  it("web booking check is opt-in, per-address keyed and cannot claim Xooter capacity", () => {
    expect(booking).toContain('import.meta.env.VITE_VERIFIED_COVERAGE === "true"');
    expect(booking).toContain('JSON.stringify([fullAddress, actualService])');
    expect(booking).toContain('await supabase.functions.invoke("check-service-coverage"');
    expect(booking).toContain("Xooter availability for your date is confirmed separately");
    expect(booking).toContain("manual area review");
  });
});
