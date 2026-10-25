import { checkApprovedCoverage, type CoverageResult, validLngLat } from "./geo-coverage.ts";

/**
 * Authenticated, rate-limited SERVER geocoder. Never accept a client-asserted pin,
 * cached temporary geocode, or substring as proof of operational service coverage.
 *
 * Verified coordinates remain ephemeral in this request. We store neither raw
 * Mapbox results nor a new copy of customer coordinates.
 */
// Narrow structural contract keeps this provider logic testable without importing
// the Deno runtime or constructing a privileged client in a test/browser bundle.
type Database = {
  from(table: "xoot_service_zones"): {
    select(columns: string): {
      eq(column: string, value: boolean): {
        limit(count: number): PromiseLike<{ data: unknown[] | null; error: unknown }>;
      };
    };
  };
  rpc(name: "xoot_consume_coverage_query", args: { p_user_id: string }):
    PromiseLike<{ data: unknown; error: unknown }>;
};
export type VerifiedCoverageState =
  | { state: "available"; zoneId: string; zoneName: string }
  | { state: "review"; reason: string }
  | { state: "unavailable"; reason: string }
  | { state: "rate_limited"; reason: string };

const services = new Set(["regular", "residential", "express", "airbnb", "office", "moving", "deep"]);
const normalService = (value: string) => value === "residential" || value === "deep" ? "regular" : value;

export async function assessVerifiedCoverage({
  address, service, actorId, db, token,
}: { address: string; service: string; actorId: string; db: Database; token: string }): Promise<VerifiedCoverageState> {
  const trimmed = address.trim().replace(/\s+/g, " ");
  if (!services.has(service) || trimmed.length < 7 || trimmed.length > 200 ||
    trimmed.split(" ").length > 20 || /[;\n\r]/.test(trimmed)) {
    return { state: "review", reason: "invalid_address" };
  }

  // No approved zones => no valid basis for claiming any booking is covered.
  // Check before a billable Permanent Geocoding request.
  const { data: zones, error: zonesError } = await db.from("xoot_service_zones")
    .select("id,name,geometry,active,approved_at,service_types")
    .eq("active", true).limit(101);
  if (zonesError) return { state: "unavailable", reason: "coverage_data_unavailable" };
  if (!zones || zones.length === 0) return { state: "review", reason: "no_approved_zone" };
  if (zones.length > 100) return { state: "unavailable", reason: "too_many_zones" };

  if (!token || !/^(pk|sk)\.[A-Za-z0-9._-]{10,}$/.test(token)) {
    return { state: "unavailable", reason: "geocoding_not_configured" };
  }

  const { data: allowed, error: budgetError } = await db.rpc("xoot_consume_coverage_query", {
    p_user_id: actorId,
  });
  if (budgetError) return { state: "unavailable", reason: "coverage_budget_unavailable" };
  if (allowed !== true) return { state: "rate_limited", reason: "coverage_check_limit" };

  const params = new URLSearchParams({
    q: trimmed, country: "za", limit: "1", language: "en",
    types: "address", autocomplete: "false", permanent: "true", access_token: token,
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  let response: Response;
  try {
    response = await fetch("https://api.mapbox.com/search/geocode/v6/forward?" + params, {
      signal: controller.signal, cache: "no-store",
    });
  } catch {
    return { state: "unavailable", reason: "geocoder_unavailable" };
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) return { state: "unavailable", reason: "geocoder_unavailable" };
  let body: unknown;
  try { body = await response.json(); } catch {
    return { state: "unavailable", reason: "geocoder_bad_response" };
  }
  if (!body || typeof body !== "object" || !("features" in body) ||
      !Array.isArray(body.features) || !body.features.length) {
    return { state: "review", reason: "address_not_verified" };
  }
  const first = body.features[0] as { geometry?: { coordinates?: unknown }; properties?: {
    feature_type?: unknown; context?: { country?: { country_code?: unknown } };
    coordinates?: { accuracy?: unknown };
    match_code?: unknown;
  } } | undefined;
  if (!first || first.properties?.feature_type !== "address" ||
      String(first.properties?.context?.country?.country_code ?? "").toUpperCase() !== "ZA" ||
      !validLngLat(first.geometry?.coordinates)) {
    return { state: "review", reason: "address_not_verified" };
  }

  // South African rooftop precision is uneven: lower-confidence addresses
  // require review instead of a false guaranteed booking.
  const quality = first.properties?.coordinates?.accuracy;
  if (quality !== "rooftop" && quality !== "parcel" && quality !== "point") {
    return { state: "review", reason: "address_requires_pin_review" };
  }

  // A rooftop point describes the returned address, not its agreement with
  // the customer's query. Smart Address Match must also confirm the number
  // and street; a corrected/guessed address is never a positive booking check.
  const match = first.properties?.match_code;
  if (!match || typeof match !== "object" || Array.isArray(match) ||
      !("confidence" in match) || !["exact", "high"].includes(String(match.confidence)) ||
      !("address_number" in match) || match.address_number !== "matched" ||
      !("street" in match) || match.street !== "matched") {
    return { state: "review", reason: "address_match_requires_review" };
  }

  const verdict: CoverageResult = checkApprovedCoverage(
    first.geometry.coordinates, normalService(service), zones);
  return verdict.state === "available"
    ? { state: "available", zoneId: verdict.zoneId, zoneName: verdict.zoneName }
    : { state: "review", reason: verdict.reason };
}
