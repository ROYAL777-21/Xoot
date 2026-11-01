# Cloudmersive evaluation delivery — 1 November 2026

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
per second and one terminal receipt per immutable input/policy. Each fixed fixture can run
only once. There are no automatic retries/refills. Documents over 3 MB stay quarantined.
The worker re-downloads the sealed private object, verifies size/type/SHA-256, and commits
only if the original object ID/revision/fingerprint is still current. Provider errors, timeout,
redirects, oversized or incomplete responses never produce a clean verdict. Stored provider
evidence is a response digest and safe status fields, not document names or raw responses.

Personal-document processing defaults OFF and cannot be opened by the worker's database
privileges. A reviewed forward change is required after the operator/privacy/licensing checks.
Raw KYC storage remains unreadable to browser roles. Existing authenticity, background,
training, bank, atomic MFA approval and real availability gates remain closed. Clean malware
scanning is not an authenticity or identity-verification decision.

Local evidence: 20 executed adapter/worker cases; Deno typecheck and scoped lint; actual
PostgreSQL execution of 30 scanner assertions on the isolated quarantine fixture. These
include role denial, durable spend/idempotency, private-processing default, one in flight,
changed-object refusal, immutable inputs and retained activation barriers. Hosted deployment
and real provider integration results must be added after they occur.

Rollback: leave the production/processing gates closed; remove the staging worker deployment
or disable its invocation, retaining private attempts/budget/receipts for audit. Do not delete
receipts, reset used counters, open Storage policies or mark a contractor verified as rollback.
