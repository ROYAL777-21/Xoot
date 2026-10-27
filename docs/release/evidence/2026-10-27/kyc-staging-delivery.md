# Private Xooter document containment — 27 October 2026

Current status: reviewed source and staging preflight complete; migration/handler delivery pending.
Production remains unchanged. Containment does not establish malware clearance or authentic identity.

## Reconciliation and checks

PR100 was rebased onto PR97 source01eb875 without reverting calendar or account work. Conflicts
were limited to the worklog history and adjacent generated RPC declarations. Both histories and
all three calendar/inspection/registration declarations are preserved. The13 quarantine files
outside the worklog/types were initially byte-identical to the prior reviewed patch; the saved
PostgreSQL output subsequently had trailing whitespace normalised without changing its content.
No migration, handler, activation or receipt behaviour changed during this reconciliation.

Independent final security review of01eb875..cb3442f found no blocking source issue and cleared
staging-only quarantine delivery after remaining checks. Root passed61 tests in six suites:
document persistence, RPC names, function configuration, calendar rendering, subscription handler
and private-link UI. TypeScript, scoped ESLint and all three changed Edge-handler Deno checks pass.
The first fork-based run passed42 tests but lost one worker to Windows spawn UNKNOWN; it is not
counted as a passing run. The complete retry used one threads worker and passed61/61 without errors.
Earlier isolated PostgreSQL17.6 role/quota/concurrency and deliberate negative-control evidence
remains applicable because the migration SQL and security logic are unchanged; it was not rerun
or represented as a new hosted acceptance.

## Actual staging preflight

Projectfxmxyabdjqviqbcxmvlp reports PostgreSQL17.6. It has0 applications,0 document rows and0
kyc-docs objects;1 pre-existing active Xooter must be preserved. The bucket is private,8MiB max,
with PDF/JPEG/PNG/WebP MIME allowlist. No target private tables, triggers or new restrictive policies
already exist. Actual public columns satisfy the reviewed migration's dependencies. The migration
ledger contains the current calendar and address allowance migrations and no quarantine migration.

Before delivery: submit-xooter-application v18, approve-xooter v17 and ops-workflow v33 are ACTIVE
with JWT verification enabled. Stage migration precedes exact handler delivery; no blanket backend
redeploy or production change is authorised by this record.

Security advisors before delivery:11 informational RLS/no-policy entries on existing service-only
tables; two existing warning categories are set_safety_pin's authenticated SECURITY DEFINER RPC and
disabled leaked-password protection. These are recorded baselines, not claimed resolved or new
quarantine defects. No key, identity, object path, private document or calendar capability is saved.

## Still required

Cloudmersive Free account access/key, applicable operator/DPA and overseas-transfer clearance,
bounded actual scanner integration, clean/threat/error acceptance, immutable safe review, evidence-
backed authenticity and atomic MFA approval remain pending. Normal authorised account/device
acceptance and production migration checks remain separate. Failed uploads stay private orphans
until reviewed privileged cleanup. Previously issued signed URLs need expiry/invalidation where
applicable; this staging bucket currently has no objects. Never reopen unsafe grants as rollback.
