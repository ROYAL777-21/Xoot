# Geoapify Free private evaluation review — 3 November 2026

This is an implementation/evidence receipt, not the live launch register. Current production
status remains in `production-checklist.md`. Root applied the exact reviewed SQL to staging as
`20261103180614` and deployed the private endpoint from frozen head `10c5ed1e`; actual readback
is recorded below. The trial remains disabled with zero allowance/usage/attempts and zero Geoapify
API requests. Root owns subsequent acceptance; this follow-up changes source bookkeeping only.
The public website, Mapbox maps/Directions/private GPS and both paused Mapbox allowances are
unchanged. This handler never writes saved places, service coverage or worker availability.

## Reviewed provider and fixture sources

The [official Free plan](https://www.geoapify.com/pricing/) lists 3,000 credits/day, up to five
requests/second, commercial use with attribution, and no credit card. Its daily quota is soft;
the application therefore imposes its own hard, nonrenewing ceiling. This trial starts disabled
with zero authorized attempts, permits at most 20 lifetime attempts, and currently has only three
once-only fixture IDs. A timeout or ambiguous outcome consumes that fixture permanently; no
automatic retries, allowance renewal or fallback provider exists.

The [Geocoding API](https://www.geoapify.com/geocoding-api/) permits storing returned data while
retaining required data-source attribution. [Response documentation](https://apidocs.geoapify.com/docs/geocoding/forward-geocoding/)
defines separate overall/city/street/building confidence, country and house-number fields;
`full_match` alone is insufficient. This conservative evaluation requires all quality checks,
and missing building confidence stays missing. The named no-number fixture must also match its
public place name. It reports candidates, never verified addresses,
actual service coverage or available Xooters. Only the documented OpenStreetMap attribution has
been reviewed here; a different/malformed data source remains `unreviewed`, with no invented
licence or arbitrary upstream HTML/link emitted. Both Geoapify and reviewed OSM follow-links are
included in private results; any future public surface must retain them near the information.

Public civic fixture manifest, checked against official sources on 3 November:

| Fixture ID | Fixed public query | Official source |
| --- | --- | --- |
| `gcis_head_office` | 1035 Frances Baard Street, Hatfield, Pretoria, South Africa | [GCIS contact directory](https://www.gcis.gov.za/content/contact-us), including its old Schoeman Street name in the [official relocation notice](https://www.gov.za/news/media-statements/all-media-relocation-gcis-head-office-new-premises-16-may-2013) |
| `state_theatre` | 320 Pretorius Street, Pretoria, South Africa | [State Theatre contact page](https://www.statetheatre.co.za/ticket-loyalties/contact-us/) and [government directory](https://www.gov.za/ss/about-government/contact-directory/soe/south-african-state-theatre-pretoria) |
| `union_buildings` | Union Buildings, Government Avenue, Pretoria, South Africa | [Presidency government contact directory](https://www.gov.za/about-government/contact-directory/presidency/presidency); no house number is asserted |

The trial uses the documented default `api.geoapify.com` endpoint. It makes no EU-only processing
claim. Geoapify distinguishes an [EU-focused endpoint/configuration](https://www.geoapify.com/maps-geocoding-routing-apis-gdpr-compliant-application/)
from its default, and its [privacy policy](https://www.geoapify.com/privacy-policy/) describes
request metadata retention and the DPA process. Provider terms, processor/transfer/retention
arrangements and datasource licences need review before any customer address or GPS is sent.
No private founder address, user ID, cookie, client IP or device coordinate is part of this trial.
Account registration remains the owner's private action; no paid plan, card or custom paid DPA
is authorized by this implementation.

## Boundary, schema and ordering

`20261103180614_geoapify_private_staging_evaluation.sql` creates two private RLS tables, four
public service-only **invoker** RPCs with empty search paths, and one private budget trigger.
The service role can consume but cannot enable/refill/delete receipts; the owner controls
allowance. Used attempts cannot decrease. A claim binds its fixture/nonce to the current budget
revision and 30-second lease. Dispatch rechecks that binding atomically, admits once, and imposes
3.5-second spacing plus a two-second handler dispatch window. Finish binds the same nonce/current
lease/revision and stores constrained enum/boolean/numeric evidence only. Expired/ambiguous
fixtures are never reclaimed. Disabling or changing allowance invalidates pending revisions.

The gateway retains `verify_jwt=true`. The handler rejects browser Origins and production, then
uses the **same presented credential** for a real PostgREST service-role/EXECUTE probe and every
RPC. No decoded claim, notification/scanner probe or runtime privileged fallback is used.
Database transport targets only the exact staging host, rejects redirects and has a deadline.
The one-shot provider transport has an eight-second timeout, a 64KiB response limit, ZA filter,
explicitly disabled IP-country bias, and no redirect, ambient credential, retry or provider fallback.
Keyed URLs, upstream errors and response bodies are never logged or stored. The SDK import is
pinned to repository-lockfile Supabase JS `2.108.1`; old deployed/shared imports are untouched.

Root's actual staging delivery is complete; do not reapply the renamed migration or deploy other
functions. Its body is 100% unchanged from the reviewed original filename; normalized SHA256 is
`057ebf0785b57743d4e351e72c8261e54417cdb8902777fc8925a2b6485ceb54`.
Production types have not been edited: the existing RPC contract currently fails for these four
staging-only functions. Keep the PR draft and that gate intact until a real reviewed schema/type path is
resolved; no exemption, dynamic RPC-name hiding or fictional migration receipt is appropriate.

The trial can be evaluated from an independently reviewed **unmerged draft**. Root has applied
the closed migration and deployed the exact source only to staging, and verified all four actual
function signatures/ACLs plus the private trigger. Capture complete genuine staging-generated
types/evidence before the private acceptance. Keep the production type file and failing production RPC gate intact; this
is not permission to merge or deploy a failing production release. No trial schema is needed in
production merely to compare three public fixture responses. A later releasable integration needs
either a separately reviewed per-project source/type/deploy contract backed by actual staging
types, or actual approved dormant production DDL followed by real production type generation.
Neither route is implemented or authorized by this trial, and no classification/guard exemption
is introduced here.

## Owner secret and pending private acceptance

The actual Free project, visually confirmed by root, is **Xoot Staging Address Trial**, with one
key. The owner created/verified the account privately and saved its key only into **`GEOAPIFY_API_KEY`** in
[Zoot Staging Edge secrets](https://supabase.com/dashboard/project/fxmxyabdjqviqbcxmvlp/functions/secrets).
There is no Vercel/VITE/public key and no production Geoapify secret in this trial. Never copy a
key, Authorization header, keyed provider URL or dashboard screenshot into chat/source/logs.
Root reports the staging key was owner-saved and verified by name only. Its value was not read;
presence alone is not successful provider authentication or an authorized allowance.

## Actual staging receipts — root readback, recorded 4 November

[Schema readback](evidence/2026-11-04/actual-staging-geoapify-schema.json) records actual history
version `20261103180614`, all five function-body hashes, empty search paths/invoker mode,
service-only RPC execute privileges, two private RLS tables, no client read privileges, no service
delete grant, disabled policy revision 1, zero allowance/usage and zero attempts. The source file
was renamed to that real history version without editing its body or inserting a history stamp.

[Runtime proof](evidence/2026-11-04/geoapify-runtime-proof.json) records staging function v1,
JWT verification on, five TypeScript file matches plus the empty import map, and anonymous 401
after [targeted deployment 41690659740](https://github.com/ROYAL777-21/Xoot/actions/runs/41690659740).
Root supplied these redacted receipts after independently reading the deployed source; this
bookkeeping did not redeploy, enable an allowance or call Geoapify.

[Provider metadata](evidence/2026-11-04/geoapify-free-project.json) records the root-observed Free
project name, one-key count and secret name only. Provider key values and keyed URLs are absent.
The earlier real CLI 2.113.0 [staging generation](https://github.com/ROYAL777-21/Xoot/actions/runs/41690666228)
completed but comparison differed from production by 1,752 diff lines. Its 1,200-line log cap was
incomplete. The draft workflow now uploads the complete generated file and diff after a complete
successful export, even on mismatch; comparison still exits nonzero. Actual complete artifact
capture is recorded separately after the one authorized staging dispatch.

After independent review and root coordination, inspect the disabled/zero budget and real RPC
ACLs. The owner may authorize **three** attempts, once, while `used=0`, `enabled=false` and the
allowance is still zero; retain the hard ceiling of 20. Do not refill or touch Mapbox allowances.
Use the private staging Test panel with the existing staging legacy service-role credential
entered privately as `apikey` and `Authorization: Bearer …`, without Origin. Submit each fixed
body once: `{"fixture":"gcis_head_office"}`, then `state_theatre`, then `union_buildings`.
Wait for each receipt before the next; allow at least 3.5 seconds after a dispatch. Record only
normalized receipt IDs, country/number/quality/confidence and attribution. A repeated fixture
must return its cached terminal/held receipt with no extra provider request. Ordinary user and
anonymous credentials must be refused. This remains pending actual authorized credential tests.

Rollback/stop: owner sets `enabled=false` on `private.geoapify_evaluation_budget`, confirms the
revision advanced, and disables/removes only this evaluation endpoint if necessary. Preserve
receipts and counters; never reset `used`, delete ambiguous attempts or restore an allowance.
No Mapbox or production tracking toggle is part of rollback. Removing the separate Geoapify key
can stop future evaluation calls after confirming it belongs only to this staging trial.

## Evidence and limits

40 focused adapter/handler/transport checks pass with synthetic responses and zero HTTP calls.
Targeted Edge TypeScript and scoped ESLint pass. The actual migration and 42 assertion sites
pass in isolated PGlite, including disabled defaults, role/ACL denial, nonce/lease/revision and
replay guards, monotonic consumption, bounded receipts and an unchanged paused Mapbox sentinel.
Removing the country check fails three targeted cases; removing dispatch nonce binding fails
the SQL contract. Both defects were restored before validation. The table/column schema guard
passes; the RPC-name guard has exactly four expected unapplied-schema failures.

The [PostgreSQL 17.6 CI job](https://github.com/ROYAL777-21/Xoot/actions/runs/41636876930/job/125920185308)
passed on head `a19c2c06f015127aedd97749ffac55c88bd8ffd8`: 20 independent connections admitted
one claim, one authorization and one noncached finish; the shared ceiling of two and unchanged
Mapbox sentinel held. This reuses its pinned driver/service; no extra job or provider request is
introduced. CodeQL, security review and actual production type matching passed on that head.
The design suite had four expected Geo RPC-name failures plus a missing `.env.example` secret
entry; that real setup omission is corrected in this follow-up, without changing the RPC guard.
Local Docker's daemon was unavailable, so local PGlite is **not** claimed as concurrency proof.
Fresh required CI for the current head,
independent source review, actual service/user credential checks and the
three provider receipts remain required. This narrow public-fixture trial does not establish
autocomplete coverage, every real address, production readiness, native/device acceptance or
Mapbox replacement suitability.
