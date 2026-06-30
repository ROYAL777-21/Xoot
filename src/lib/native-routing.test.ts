import { describe, expect, it } from "vitest";

import { resolveNativeRoute } from "./native-routing";

describe("resolveNativeRoute", () => {
  it("keeps supported app paths and strips query data", () => {
    expect(resolveNativeRoute("https://zoot.co.za/app/bookings/booking-123?gate_code=1234#details")).toBe(
      "/app/bookings/booking-123",
    );
    expect(resolveNativeRoute("/app/support/case-789?private_note=hidden")).toBe("/app/support");
  });

  it("maps zoot URL scheme shortcuts onto existing app routes", () => {
    expect(resolveNativeRoute("zoot://app/bookings/booking_456")).toBe("/app/bookings/booking_456");
    expect(resolveNativeRoute("zoot://bookings?id=booking-456")).toBe("/app/bookings/booking-456");
    expect(resolveNativeRoute("zoot://care-plus/apply")).toBe("/care-plus/apply");
    expect(resolveNativeRoute("zoot://office-dashboard")).toBe("/app/properties/office");
  });

  it("maps structured push payloads to authenticated surfaces", () => {
    expect(resolveNativeRoute({ type: "booking_update", bookingId: "booking-789" })).toBe(
      "/app/bookings/booking-789",
    );
    expect(resolveNativeRoute({ data: { screen: "host_dashboard" } })).toBe("/app/properties/airbnb");
    expect(resolveNativeRoute({ payload: { event_type: "zoot_cred" } })).toBe("/app/loyalty");
  });

  it("only treats source_id as a booking id for booking-source payloads", () => {
    expect(resolveNativeRoute({ source_table: "bookings", source_id: "booking-abc" })).toBe(
      "/app/bookings/booking-abc",
    );
    expect(resolveNativeRoute({ source_table: "trust_incidents", source_id: "incident-abc" })).toBeNull();
  });

  it("rejects unknown routes and unsafe path segments", () => {
    expect(resolveNativeRoute("/admin/ops")).toBeNull();
    expect(resolveNativeRoute("zoot://app/bookings/../../support")).toBeNull();
    expect(resolveNativeRoute({ bookingId: "booking/with/slash" })).toBeNull();
  });
});

describe("resolveNativeRoute – null/non-string inputs", () => {
  it("returns null for null, undefined, numbers, booleans, and arrays", () => {
    expect(resolveNativeRoute(null)).toBeNull();
    expect(resolveNativeRoute(undefined)).toBeNull();
    expect(resolveNativeRoute(42)).toBeNull();
    expect(resolveNativeRoute(true)).toBeNull();
    expect(resolveNativeRoute([])).toBeNull();
    expect(resolveNativeRoute(["zoot://bookings"])).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(resolveNativeRoute("")).toBeNull();
    expect(resolveNativeRoute("   ")).toBeNull();
  });

  it("returns null for an empty record", () => {
    expect(resolveNativeRoute({})).toBeNull();
  });
});

describe("resolveNativeRoute – static routes", () => {
  it("returns each static route unchanged", () => {
    const staticPaths = [
      "/app",
      "/app/bookings",
      "/app/favorites",
      "/app/gifts",
      "/app/insurance",
      "/app/loyalty",
      "/app/plans",
      "/app/profile",
      "/app/properties",
      "/app/properties/airbnb",
      "/app/properties/office",
      "/app/support",
      "/app/training",
      "/care-plus",
      "/care-plus/apply",
      "/legal/privacy",
      "/legal/terms",
      "/legal/trust-safety",
      "/zooter",
      "/zooter/earnings",
      "/zooter/jobs",
      "/zooter/kyc",
      "/zooter/profile",
      "/zooter/training",
    ];
    for (const route of staticPaths) {
      expect(resolveNativeRoute(route), `expected ${route} to resolve to itself`).toBe(route);
    }
  });

  it("maps bare '/' to /app", () => {
    expect(resolveNativeRoute("/")).toBe("/app");
  });
});

describe("resolveNativeRoute – HTTP/HTTPS URL handling", () => {
  it("handles http:// URLs the same as https://", () => {
    expect(resolveNativeRoute("http://example.com/app/loyalty")).toBe("/app/loyalty");
    expect(resolveNativeRoute("https://zoot.co.za/app/profile")).toBe("/app/profile");
  });

  it("strips query strings and fragments from https URLs", () => {
    expect(resolveNativeRoute("https://zoot.co.za/app/gifts?promo=SUMMER&utm_source=email")).toBe("/app/gifts");
    expect(resolveNativeRoute("https://zoot.co.za/care-plus/apply#form")).toBe("/care-plus/apply");
  });

  it("collapses recognized sub-paths from https URLs", () => {
    expect(resolveNativeRoute("https://zoot.co.za/app/favorites/zooter-99")).toBe("/app/favorites");
    expect(resolveNativeRoute("https://zoot.co.za/zooter/jobs/job-abc")).toBe("/zooter/jobs");
  });

  it("returns null for unrecognized https paths", () => {
    expect(resolveNativeRoute("https://zoot.co.za/unknown-page")).toBeNull();
    expect(resolveNativeRoute("https://zoot.co.za/admin/panel")).toBeNull();
  });
});

describe("resolveNativeRoute – zoot:// URL scheme", () => {
  it("resolves zoot://booking/<id> with a pathname segment", () => {
    expect(resolveNativeRoute("zoot://booking/booking-123")).toBe("/app/bookings/booking-123");
    expect(resolveNativeRoute("zoot://bookings/booking-456")).toBe("/app/bookings/booking-456");
  });

  it("prefers bookingId query param over id for zoot://bookings", () => {
    expect(resolveNativeRoute("zoot://bookings?bookingId=bk-999")).toBe("/app/bookings/bk-999");
    expect(resolveNativeRoute("zoot://bookings?booking_id=bk-888")).toBe("/app/bookings/bk-888");
  });

  it("resolves zoot:// screen aliases", () => {
    expect(resolveNativeRoute("zoot://favorites")).toBe("/app/favorites");
    expect(resolveNativeRoute("zoot://favourites")).toBe("/app/favorites");
    expect(resolveNativeRoute("zoot://favorite_zooter")).toBe("/app/favorites");
    expect(resolveNativeRoute("zoot://favourite_zooter")).toBe("/app/favorites");
    expect(resolveNativeRoute("zoot://loyalty")).toBe("/app/loyalty");
    expect(resolveNativeRoute("zoot://zootcred")).toBe("/app/loyalty");
    expect(resolveNativeRoute("zoot://host")).toBe("/app/properties/airbnb");
    expect(resolveNativeRoute("zoot://host_dashboard")).toBe("/app/properties/airbnb");
    expect(resolveNativeRoute("zoot://support")).toBe("/app/support");
    expect(resolveNativeRoute("zoot://support_case")).toBe("/app/support");
    expect(resolveNativeRoute("zoot://trust_policy")).toBe("/app/insurance");
    expect(resolveNativeRoute("zoot://insurance")).toBe("/app/insurance");
    expect(resolveNativeRoute("zoot://care")).toBe("/app/plans");
    expect(resolveNativeRoute("zoot://care_plus_apply")).toBe("/care-plus/apply");
    expect(resolveNativeRoute("zoot://zooter")).toBe("/zooter");
    expect(resolveNativeRoute("zoot://zooter_jobs")).toBe("/zooter/jobs");
  });

  it("resolves zoot://app/* paths using toSafeRoute", () => {
    expect(resolveNativeRoute("zoot://app/loyalty")).toBe("/app/loyalty");
    expect(resolveNativeRoute("zoot://app/zooter")).toBeNull();
  });

  it("resolves zoot://zooter/* paths using toSafeRoute", () => {
    expect(resolveNativeRoute("zoot://zooter/jobs")).toBe("/zooter/jobs");
    expect(resolveNativeRoute("zoot://zooter/kyc")).toBe("/zooter/kyc");
  });

  it("resolves zoot://care-plus/* paths using toSafeRoute", () => {
    expect(resolveNativeRoute("zoot://care-plus/apply")).toBe("/care-plus/apply");
    // zoot://care-plus (no pathname) hits the screenRoutes mapping for "care_plus" → /app/plans
    expect(resolveNativeRoute("zoot://care-plus")).toBe("/app/plans");
  });

  it("returns null for unrecognized zoot:// hosts", () => {
    expect(resolveNativeRoute("zoot://unknown-screen")).toBeNull();
    expect(resolveNativeRoute("zoot://admin")).toBeNull();
  });

  it("rejects path traversal in zoot:// URLs", () => {
    expect(resolveNativeRoute("zoot://app/support/../../admin")).toBeNull();
    expect(resolveNativeRoute("zoot://bookings/%2e%2e/admin")).toBeNull();
  });
});

describe("resolveNativeRoute – path collapsing for sub-routes", () => {
  it("collapses deep favorites paths to /app/favorites", () => {
    expect(resolveNativeRoute("/app/favorites/zooter-42")).toBe("/app/favorites");
    expect(resolveNativeRoute("/app/favorites/anything")).toBe("/app/favorites");
  });

  it("collapses deep support paths to /app/support", () => {
    expect(resolveNativeRoute("/app/support/case-001")).toBe("/app/support");
    expect(resolveNativeRoute("/app/support/escalation-99")).toBe("/app/support");
  });

  it("collapses deep zooter/jobs paths to /zooter/jobs", () => {
    expect(resolveNativeRoute("/zooter/jobs/job-555")).toBe("/zooter/jobs");
  });

  it("preserves booking IDs in /app/bookings/<id>", () => {
    expect(resolveNativeRoute("/app/bookings/booking-XYZ")).toBe("/app/bookings/booking-XYZ");
  });
});

describe("resolveNativeRoute – booking ID validation", () => {
  it("accepts alphanumeric, hyphens, and underscores up to 80 chars", () => {
    const longButValid = "a".repeat(80);
    expect(resolveNativeRoute(`/app/bookings/${longButValid}`)).toBe(`/app/bookings/${longButValid}`);
  });

  it("rejects booking IDs longer than 80 characters", () => {
    const tooLong = "a".repeat(81);
    expect(resolveNativeRoute(`/app/bookings/${tooLong}`)).toBeNull();
  });

  it("rejects booking IDs with special characters", () => {
    expect(resolveNativeRoute("/app/bookings/booking@123")).toBeNull();
    expect(resolveNativeRoute("/app/bookings/booking 123")).toBeNull();
    expect(resolveNativeRoute("/app/bookings/book.ing")).toBeNull();
  });

  it("rejects empty booking ID segment", () => {
    expect(resolveNativeRoute("/app/bookings/")).toBe("/app/bookings");
  });
});

describe("resolveNativeRoute – path traversal protection", () => {
  it("rejects URL-encoded traversal sequences", () => {
    expect(resolveNativeRoute("/app/bookings/%2e%2e/support")).toBeNull();
    expect(resolveNativeRoute("/app/%2E%2E/admin")).toBeNull();
  });

  it("rejects literal '..' traversal sequences", () => {
    expect(resolveNativeRoute("/app/../admin")).toBeNull();
    expect(resolveNativeRoute("/../etc/passwd")).toBeNull();
  });

  it("deflects protocol-relative double-slash paths to /app (safe fallback)", () => {
    // "//admin" is parsed as a protocol-relative URL; the pathname resolves to "/"
    // which cleanPath normalizes, and toSafeRoute maps "/" → "/app"
    expect(resolveNativeRoute("//admin")).toBe("/app");
  });
});

describe("resolveNativeRoute – record with explicit route fields", () => {
  it("resolves via url field", () => {
    expect(resolveNativeRoute({ url: "https://zoot.co.za/app/loyalty" })).toBe("/app/loyalty");
    expect(resolveNativeRoute({ url: "/app/plans" })).toBe("/app/plans");
  });

  it("resolves via deepLink field (camelCase)", () => {
    expect(resolveNativeRoute({ deepLink: "https://zoot.co.za/app/profile" })).toBe("/app/profile");
  });

  it("resolves via deeplink field (lowercase)", () => {
    expect(resolveNativeRoute({ deeplink: "/app/gifts" })).toBe("/app/gifts");
  });

  it("resolves via path field", () => {
    expect(resolveNativeRoute({ path: "/zooter/earnings" })).toBe("/zooter/earnings");
  });

  it("resolves via route field", () => {
    expect(resolveNativeRoute({ route: "/app/insurance" })).toBe("/app/insurance");
  });

  it("falls through to next lookup when url field is unrecognized", () => {
    // url field resolves to null, falls through to bookingId
    expect(resolveNativeRoute({ url: "/unknown/path", bookingId: "bk-fallback" })).toBe(
      "/app/bookings/bk-fallback",
    );
  });
});

describe("resolveNativeRoute – record with booking ID fields", () => {
  it("resolves via bookingId field (camelCase)", () => {
    expect(resolveNativeRoute({ bookingId: "bk-111" })).toBe("/app/bookings/bk-111");
  });

  it("resolves via booking_id field (snake_case)", () => {
    expect(resolveNativeRoute({ booking_id: "bk-222" })).toBe("/app/bookings/bk-222");
  });

  it("prefers bookingId over booking_id when both present", () => {
    expect(resolveNativeRoute({ bookingId: "bk-first", booking_id: "bk-second" })).toBe(
      "/app/bookings/bk-first",
    );
  });

  it("resolves sourceId (camelCase) with source_table=bookings", () => {
    expect(resolveNativeRoute({ source_table: "bookings", sourceId: "bk-camel" })).toBe(
      "/app/bookings/bk-camel",
    );
  });

  it("resolves sourceTable (camelCase) with source_id", () => {
    expect(resolveNativeRoute({ sourceTable: "bookings", source_id: "bk-snake" })).toBe(
      "/app/bookings/bk-snake",
    );
  });
});

describe("resolveNativeRoute – record screen/type/category keys", () => {
  it("maps screen key to route", () => {
    expect(resolveNativeRoute({ screen: "care_plus" })).toBe("/app/plans");
    expect(resolveNativeRoute({ screen: "loyalty" })).toBe("/app/loyalty");
    expect(resolveNativeRoute({ screen: "booking_status" })).toBe("/app/bookings");
    expect(resolveNativeRoute({ screen: "booking_live_activity" })).toBe("/app/bookings");
    expect(resolveNativeRoute({ screen: "profile" })).toBe("/app/profile");
    expect(resolveNativeRoute({ screen: "home_memory" })).toBe("/app/properties");
    expect(resolveNativeRoute({ screen: "gift" })).toBe("/app/gifts");
    expect(resolveNativeRoute({ screen: "zooter_jobs" })).toBe("/zooter/jobs");
  });

  it("maps type key to route", () => {
    expect(resolveNativeRoute({ type: "booking_status" })).toBe("/app/bookings");
    expect(resolveNativeRoute({ type: "care_plus_apply" })).toBe("/care-plus/apply");
    expect(resolveNativeRoute({ type: "zootcred" })).toBe("/app/loyalty");
  });

  it("maps event_type key to route", () => {
    expect(resolveNativeRoute({ event_type: "booking_update" })).toBe("/app/bookings");
    expect(resolveNativeRoute({ event_type: "favourite_zooter" })).toBe("/app/favorites");
  });

  it("maps eventType (camelCase) key to route", () => {
    expect(resolveNativeRoute({ eventType: "office_dashboard" })).toBe("/app/properties/office");
  });

  it("maps category key to route", () => {
    expect(resolveNativeRoute({ category: "support_case" })).toBe("/app/support");
    expect(resolveNativeRoute({ category: "trust_policy" })).toBe("/app/insurance");
  });

  it("returns null for unknown screen/type values", () => {
    expect(resolveNativeRoute({ screen: "unknown_screen" })).toBeNull();
    expect(resolveNativeRoute({ type: "not_a_real_type" })).toBeNull();
  });
});

describe("resolveNativeRoute – nested record resolution", () => {
  it("resolves via nested data field", () => {
    expect(resolveNativeRoute({ data: { bookingId: "bk-nested" } })).toBe("/app/bookings/bk-nested");
    expect(resolveNativeRoute({ data: { screen: "loyalty" } })).toBe("/app/loyalty");
  });

  it("resolves via nested payload field", () => {
    expect(resolveNativeRoute({ payload: { screen: "bookings" } })).toBe("/app/bookings");
    expect(resolveNativeRoute({ payload: { bookingId: "bk-payload" } })).toBe("/app/bookings/bk-payload");
  });

  it("resolves via nested notification field", () => {
    expect(resolveNativeRoute({ notification: { data: { screen: "profile" } } })).toBe("/app/profile");
    expect(resolveNativeRoute({ notification: { screen: "gifts" } })).toBe("/app/gifts");
  });

  it("resolves via nested detail field", () => {
    expect(resolveNativeRoute({ detail: { type: "care_plus" } })).toBe("/app/plans");
  });

  it("resolves data nested within data (two levels)", () => {
    expect(resolveNativeRoute({ data: { data: { screen: "insurance" } } })).toBe("/app/insurance");
  });

  it("returns null when nesting exceeds three levels", () => {
    // 4 levels deep: depth limit stops recursion
    expect(
      resolveNativeRoute({
        data: { data: { data: { data: { screen: "loyalty" } } } },
      }),
    ).toBeNull();
  });

  it("returns null when nested data is also unrecognized", () => {
    expect(resolveNativeRoute({ data: { unrelated: "value" } })).toBeNull();
  });
});

describe("resolveNativeRoute – push notification payload shapes", () => {
  it("handles Capacitor pushNotificationActionPerformed notification.data shape", () => {
    expect(
      resolveNativeRoute({
        notification: { data: { type: "booking_update", bookingId: "bk-push" } },
      }),
    ).toBe("/app/bookings/bk-push");
  });

  it("handles flat notification object (notification.data absent)", () => {
    expect(resolveNativeRoute({ notification: { screen: "support_case" } })).toBe("/app/support");
  });

  it("handles Supabase realtime-style source_table payload", () => {
    expect(resolveNativeRoute({ source_table: "bookings", source_id: "booking-realtime-1" })).toBe(
      "/app/bookings/booking-realtime-1",
    );
  });

  it("returns null for source_table other than bookings", () => {
    expect(resolveNativeRoute({ source_table: "payments", source_id: "pay-001" })).toBeNull();
    expect(resolveNativeRoute({ source_table: "users", source_id: "user-001" })).toBeNull();
  });
});
