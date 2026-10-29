# Mapbox verified service zones — production acceptance

Status, 21 October 2026: STAGING ONLY. Schema `20261019185331` and JWT-protected `check-service-coverage` v2 are deployed. The exact MDB/OCHA Gauteng polygon is loaded as an INACTIVE candidate, with no reviewer/date fabricated. No active approved zone, production deployment or switch activation has occurred.

The founder approved Gauteng Province as intended geography. All 5,690 source vertices are retained with [provenance, licence and reproducible extraction](../../data/service-zones/gauteng/README.md). Automated GEOS topology and the production evaluator pass; independent current-boundary/release review is outstanding. [Exact owner setup and acceptance](mapbox-founder-setup.md) records remaining credentials, identities and devices. Earlier dated source-only statements below describe historical checkpoints.

The existing suburb_centroids table contains reference points, not approved business coverage polygons. Geographic service eligibility cannot be declared based on a postcode, suburb text or arbitrary radius. PostGIS is not installed in Xoot's current Supabase projects.

## Source implementation

The proposed xoot_service_zones table stores explicit founder-approved GeoJSON Polygon/MultiPolygon shapes, services, reviewer identity and boundary source. The geo-coverage module verifies bounded coordinates, closed rings, holes and disjoint polygons, and fails closed for missing or invalid geometry.

The new JWT-protected check-service-coverage function checks active zones before any billable request, atomically limits customers to 12 Mapbox lookups an hour, and independently uses Mapbox Geocoding v6 Permanent for the actual submitted address. It requires a South African address result with sufficient quality and checks the resulting coordinates against the approved service zone. It stores no new customer GPS coordinates or raw geocoder responses.

Both booking writers have an optional strict server gate, controlled by XOOT_STRICT_GEO_COVERAGE=true. The website's optional verification control is controlled by VITE_VERIFIED_COVERAGE=true. **Both flags must remain false** until deployment and verification are complete.

## Required owner-supplied operational evidence

1. Approve actual launch service-zone boundaries as trusted GeoJSON in WGS84 longitude/latitude order. For each polygon, provide an operating zone name, supported services, boundary source, reviewer and approval date. Do not fabricate zones from centroid circles or use unlicensed external geometry. Missing zones result in review required, never an available claim.
2. Confirm Mapbox Permanent Geocoding licensing and pricing. Temporary Geocoding results cannot be stored long term. Permanent requests are separately billable. Provide a dedicated server token in Supabase Edge secrets under MAPBOX_GEOCODING_TOKEN, NOT merely Vercel; never put it in a browser or chat if it is secret.
3. Reconcile existing staging/production migration-history divergence first, then apply the reviewed zone migration to a disposable Postgres database. Verify grants and rate limiting; deploy to staging and recheck live schema. No blind production migration repairs.
4. Import reviewed boundaries using service-side administrative access with approval audit trails. Never expose a service-role key in a browser or mobile application.
5. In staging, test authenticated inside-zone, outside-zone, wrong-country, fake suburb substring, poor-accuracy result, missing-zone result, no JWT, rate limit, Mapbox 403, outage and latency cases. Run a real browser and native device acceptance session with authorised test accounts.
6. Only after working end-to-end tests, enable the client display and both server booking gates in staging, verify real roster availability separately, then release matched production schema, Edge code and deployment behind the reviewed switches.

A positive polygon check proves only that an accurately geocoded point falls in an approved operating area. It does not prove that a Xooter is available, the slot can be fulfilled or a route/ETA is current.

## 19 October 2026 — all-zone validation hardening

PR #81 now evaluates **all** active, approved, service-matching polygons before returning a positive coverage verdict. This prevents a malformed active geometry placed later in the database query from being bypassed by an earlier valid zone. The synthetic regression tests cover both row orders and a malformed zone belonging to an unrelated service.

**Important:** no operational boundaries are assumed or seeded. A polygon import must be explicitly founder-approved and reviewed for self-intersection, holes, boundary provenance and WGS84 longitude/latitude order; this service evaluator is not a substitute for GIS review. It is intentionally NOT enabled or deployed to production. The accepted-job GPS and road-ETA functionality on PR #71 is independent of these polygons and continues across service-area edges.

## 19 October — website and native booking parity

The Expo native booking flow now has an **optional** `EXPO_PUBLIC_VERIFIED_COVERAGE`-gated `Check verified service coverage` control. It sends only the signed-in customer's service and explicitly chosen complete address to the existing JWT-protected `check-service-coverage` server function. The server (never the handset) obtains the paid Permanent Geocoding result and verifies the approved polygon. The publicly accessible `ServiceAreaMap` never receives an address or home coordinate. The result is keyed to the exact current address/service and stale responses cannot override an edited form. The UI explicitly says area verification does not guarantee a Xooter or booked time slot.

The feature is **source-only, disabled by default, not installed on customer handsets, and not deployed**. Add `EXPO_PUBLIC_VERIFIED_COVERAGE=true` to the approved **staging EAS preview** only after owner-approved polygons, credential/Mapbox billing acceptance and installed-device tests. Do not set it in production until the separate full release authorisation.
