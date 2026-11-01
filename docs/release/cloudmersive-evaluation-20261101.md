# Cloudmersive evaluation delivery — 1 November 2026

2November readback: authority DDL is actual version20261101220212; worker3 is ACTIVE with
verify_jwt=true, bundle89cc5327674a6847248a71346b41c3da31ec9d72204be2445aec5aaa3c42e8ce.
All5runtime files match reviewed source. The owner-entered service transport now authenticates
through the database probe. Genuine provider tests used2/32attempts: the blank PDF returned
incomplete_response and remains quarantined; EICAR was blocked with actual malwareDetectedtrue.
Both have terminal receipt UUIDs and response digests. Complete clean-file acceptance is pending;
never overwrite the failed PDF receipt or turn that result into a contractor clearance.

The v2 response contract is supported by Cloudmersive's
[official Advanced Scan companion](https://www2.cloudmersive.com/article/CSharp-File-Upload-Security-Companion-Code),
whose parser explicitly permits a null virus list. Xoot still requires CleanResult=true, all12
threat flags present/false and a content-verified PDF/image format. Missing/invalid virus lists
and missing threat flags remain errors. A positive malware acceptance requires a structured
finding, not merely any nonempty array. Fixed synthetic diagnostics contain only known type/
boolean/format categories; no raw format strings, virus entries, filenames or ContentInformation.

The new claim entry freezes policyv2. The original API is pinned to v1 for both document and
fixture lookups. Global uniqueness becomes per-policy uniqueness without changing prior rows,
digest/state, maximum32 or consumed counters. Both versions share one lease/dispatch limiter.
Migration refuses an active lease and rolls back, leaving the old API intact. Neither policy
may be supplied by an applicant, and registered-document processing remains separately closed.

Current auth repair is prepared, not yet deployed: the owner entered the existing key privately;
actual gateway metadata identifies service_role on both headers, but version2's exact runtime-key
comparison still rejects it. No key values were read. Replace equality with a read-only,
service-only SECURITY INVOKER probe using the presented credential against actual PostgREST.
Require exact boolean true and reuse that same per-request client for every subsequent operation.
No decoded claims, runtime-admin fallback or client-chosen project is accepted. The database
transport pins the staging HTTPS origin, refuses redirects and has a15s deadline. Gateway JWT
verification, real-document processing OFF, quotas and Storage/activation guards remain.
The new probe's migration must precede worker deployment and actual ACL readback; old applied
scanner SQL is immutable.37unit cases and41actual isolated PostgreSQL assertions pass. These
are local checks, not proof of a real Cloudmersive response. No production promotion yet.

The founder selected Cloudmersive, Free only, and privately saved `CLOUDMERSIVE_API_KEY` in
Zoot Staging (`fxmxyabdjqviqbcxmvlp`). The existing signed-in Edge Free Tier account is reused;
no key was read into chat, no new plan purchased and no production secret installed.

The official [plan table](https://portal.cloudmersive.com/selectplan) describes Free as an
evaluation plan: 600 calls/month, one call/second, maximum 3.5 MB, North American region.
The [FAQ](https://cloudmersive.com/faq) positions Premium for production. The
[DPA](https://cloudmersive.com/data-processing-dpa) requires explicit acceptance to apply.
Production eligibility, processing terms/region and actual applicant consent remain open;
synthetic integration acceptance does not resolve them. No other paid API is enabled.

`scan-xooter-document` is a service-role-only worker, with gateway JWT verification retained.
Its current body refuses production and browser-origin calls. It accepts only a registered
document ID or one of two fixed, non-personal fixtures: a blank PDF and the harmless standard
EICAR antivirus test string. It never accepts arbitrary URLs, file bytes or provider endpoints.
An ordinary applicant/customer cannot invoke the privileged worker or forge its receipts.

The new private tables enforce a non-renewing maximum of 32 attempts, one in flight, one
no faster than one per second and one terminal receipt per immutable input/policy. Each fixed fixture can run
only once. There are no automatic retries/refills. Documents over 3 MB stay quarantined.
The worker re-downloads the sealed private object, verifies size/type/SHA-256, and commits
only if the original object ID/revision/fingerprint is still current. Provider errors, timeout,
redirects, oversized or incomplete responses never produce a clean verdict. Stored provider
evidence is a response digest and safe status fields, not document names or raw responses.
After downloading/hash checks, a second service-only RPC rechecks the current lease and admits
one provider dispatch. A two-second monotonic dispatch window and conservative 3.5-second
reservation prevent ordinary delayed-start overlap; the provider has a 20-second deadline
within a renewed 60-second lease. A delayed/expired admission never calls the provider.

Personal-document processing defaults OFF and cannot be opened by the worker's database
privileges. A reviewed forward change is required after the operator/privacy/licensing checks.
Raw KYC storage remains unreadable to browser roles. Existing authenticity, background,
training, bank, atomic MFA approval and real availability gates remain closed. Clean malware
scanning is not an authenticity or identity-verification decision.

Local evidence: 24 executed adapter/worker cases; Deno typecheck and scoped lint; actual
PostgreSQL execution of 35 scanner assertions on the isolated quarantine fixture. These
include role denial, durable spend/idempotency, private-processing default, one in flight,
changed-object refusal, immutable inputs and retained activation barriers. Hosted deployment
and real provider integration results must be added after they occur.

Hosted staging: actual version20261101155855, worker5664bb22-d362-41f4-8d31-81b9557c5de1/version2,
bundle86b92f3628e60bf35749b21f195605062a64eebaa7e32854ffd58c8fa0b045e3. Four runtime files match
reviewed source. Service API-key validation is independent of the retained gateway check;
ordinary user bearers and public keys fail before quota. The existing CI token cannot reveal
API key secrets (actual official Management API request denied). No access was widened. Fixed
synthetic dashboard tests are prepared for private owner service-key entry. Counters remain0/32,
processingfalse, no receipts; therefore genuine Cloudmersive acceptance is not yet established.
Nine Node transport/redaction checks pass. A CodeQL network-status-to-fixed-artifact report
was resolved by recording only exact-denial boolean evidence and exclusive0600file creation,
without a scanner exception. Full release gates remain required before merge.

Rollback: leave the production/processing gates closed; remove the staging worker deployment
or disable its invocation, retaining private attempts/budget/receipts for audit. Do not delete
receipts, reset used counters, open Storage policies or mark a contractor verified as rollback.
