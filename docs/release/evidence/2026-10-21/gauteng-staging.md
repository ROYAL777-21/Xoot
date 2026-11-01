# Gauteng exact source and staging evidence

Evidence recorded 19 October 2026; resumed and rechecked 21 October 2026. PR #81 targets `release/xoot-production`. This is not production launch approval.

## Source and licence

The [South Africa COD-AB dataset](https://data.humdata.org/dataset/cod-ab-zaf) identifies the South African Municipal Demarcation Board as source, distributed by UN OCHA ROSEA/FISS/HDX under [CC BY 3.0 IGO](https://creativecommons.org/licenses/by/3.0/igo/). Attribution, licence link, change notice and no-endorsement requirements are documented beside the data. This licence permits commercial reuse with those conditions; it does not certify legal border currency.

- Feature: Gauteng, ZA7; one polygon, one closed ring, **5,690 vertices**.
- CRS: declared upstream OGC CRS84, WGS84 longitude/latitude.
- Source archive SHA-256: `bc5670db834f1a517fd11da10fcb25214b5f0a827853fe43ef648caa40bd54d4`.
- Extracted GeoJSON SHA-256: `02f3064e60cc35a2a5ea9649947fabcacbfd4d64283555d852f89cea324aa3a6`.
- Shapely 2.1.2 / GEOS: **Valid Geometry**. No simplification, coordinate rounding, repair, buffer or redraw.
- Source/edit date 2018-12-27, valid-on 2020-11-09, HDX review 2025-01-28, resource update 2026-01-26. Those dates must not be advertised as a new 2026 legal survey.
- [Pinned data, manifest and reproduction](../../../../data/service-zones/gauteng/README.md).

The runtime ring limit was too small for this actual provincial boundary. It now accepts up to 10,000 ring / 20,000 geometry vertices, with a 200,000-vertex combined request limit. All matching approved geometries are still validated before a positive verdict. Independent topology/current-boundary review is a separate release requirement.

## Staging state

Project `fxmxyabdjqviqbcxmvlp`:

- Applied only the isolated service-zone schema, recorded as `20261019185331_xoot_approved_service_zones`. The repository filename matches the actual ledger entry; no migration was repair-stamped.
- RLS enabled on both zone/budget tables; anon/authenticated direct privileges absent; budget RPC service-only.
- Imported **Gauteng Province (MDB / OCHA COD-AB v01)**, **active=false**, `approved_by=NULL`, `approved_at=NULL`. No reviewer identity/date fabricated.
- Database readback confirmed exact geometry JSON equality and all 5,690 vertices. Service vocabulary regular/express/airbnb/office/moving is a candidate requiring review before activation.
- `check-service-coverage` **v2**, ACTIVE, `verify_jwt=true`; every returned deployed source file matches the local source after line-ending normalisation. The API returns five bundled files; the uploaded Deno config is not returned and is not claimed as a sixth readback match.
- No active zone, strict booking switch, website/mobile coverage switch or production Mapbox rollout was enabled. Both booking writers still require separate staged end-to-end strict-gate acceptance.
- Missing JWT and malformed JWT probes return HTTP 401 without coordinates. This does not prove authorised account behaviour.
- The owner saved both Mapbox server secrets after the protected form was prepared. Dashboard readback confirmed both names and matching digests, without opening values. Mapbox shows a default unexpired payment method. Provider success and actual user-JWT acceptance are still separate requirements.

Production `mvlrkelahhsyjrwgsxaf` has no GPS/zone tables at inspection. Ledger drift is seven staging-only entries versus the production-only safety-PIN entry `20261008011821` (staging 88 / production 82 total). Preserve the production patch and reconcile actual schemas/dependencies before an ordered backup-backed migration. No bulk push/repair was run.

## Automated checks

- Full Vitest on 21 October: **160 files passed; 1,622 tests passed, seven skipped**. Earlier failures exposed missing schema/template entries and an invalid “triangle” fixture; those were fixed. Unrelated UI/browser timeouts passed focused reruns and the complete suite with two workers.
- Geometry tests exercise Johannesburg, Pretoria, Soweto and Vereeniging, the exact boundary, neighbouring provinces, reversed axes and bounding-box false positives.
- Offline provider tests cover missing zones/token/budget, Permanent ZA address requests, incorrect/coarse/outside results, HTTP 403, malformed JSON and network failure. These are explicit doubles and make no real-provider success claim.
- Disposable PostgreSQL 17.6: RLS/client grants, exact polygon round-trip, inactive default and approval constraint passed. **Exactly 12 of 20 concurrent budget requests succeeded**, then expired-budget reset passed.
- Website and mobile TypeScript, lint, native map source checks, development-mode web build, and approved homepage source/rendered smoke at 390px and 1440px passed. Missing platform association signing inputs remain a real release gate; a development build is not a signed production artifact.
- Local Windows live-header negative-control subprocess crashes on exit with code 3221226505 rather than the expected 1. The checker detects the intentionally deceptive headers. The same unchanged three tests then passed in an isolated Linux Node 24.16.0 container (network disabled, repository read-only); no assertion was weakened. Exact PR CI remains a separate requirement.
- Planted the former 1,000-vertex runtime limit: four Gauteng tests failed as expected. Restored the reviewed limit: all five passed. No defect was committed or deployed.
- Secret, frontend privileged-write, unsafe DOM and static-host scans passed separately. The independent Claude security workflow failed because provider credits were insufficient; no security-clean result was produced.

## Still required

Actual Mapbox entitlement and successful authorised API requests; four distinct staging identities with real user sessions and two approved Xooters; MFA admin; independent POPIA/security and boundary review; physical expiry/STOP/offline/cancellation tests; signed installed iPhone/Android builds and device evidence; production migration reconciliation, website deployed revision, final release decision. Roster skills/capacity/time-slot availability remain independently verified by booking/operations.

[Exact protected credential setup and acceptance sequence](../../mapbox-founder-setup.md).
