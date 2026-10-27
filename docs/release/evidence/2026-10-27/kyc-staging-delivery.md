# Private Xooter document containment — 27 October 2026

Current status: reviewed containment migration, two canonical handlers and the reviewed narrow
operations-handler patch are delivered and read back on staging. No production delivery.
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

The exact reviewed LF migration SQL SHA256 is
30f621f73b1a2d78290c0494a459515728962d76b7197ed87bfec6000762f904. Hosted migration
20261027032349_kyc_private_quarantine_interlock applied successfully; only this newly delivered
file is renamed to match the actual staging ledger. No historical migration is renamed or repaired.
Readback confirms four private RLS tables, four restrictive Storage policies and five enabled
triggers; browser table AND column writes and public registration/inspection execution are denied.
Service registration remains allowed. Both non-renewing global allowances are0/32. Existing
Xooter and role row fingerprints are unchanged; no application, file or document row was created.

submit-xooter-application v19 is ACTIVE with JWT verification, bundle SHA256
42c5d0748f1b01da298cd477c76fe0ba3dd60b334d3d7ea63bac6a6ef3eb3cc2.
approve-xooter v18 is ACTIVE with JWT verification, bundle SHA256
a782770f08dec60d3985af29c1a8238bf5f6cc03dc5d6c9b6962ea4e53a421a1.
All returned runtime files exactly match the intended payloads: four submit files, three approval
files and four narrow operations files. The readback matcher first used the local supabase/ prefix,
whereas the returned names start functions/; resolving that documented path prefix establishes
exact byte equality without normalising code or redeploying. No content mismatch was found.

Hosted no-bearer POST returns401 and allowed localhost5173 OPTIONS returns204 with the exact
origin for all three functions. These prove gateway denial/preflight, not authorised owner/admin
acceptance. After delivery security advisors retain the same two warning categories; informational
RLS/no-policy entries increase11→15 because the four new private service-only tables deny browser
access without client policies. No new warning category is introduced or claimed fixed.

## Preserve the existing staging gift contract

The canonical operations handler also includes unrelated gift changes whose RPC is absent on
staging. Replacing the whole handler would silently introduce that unready dependency. Instead,
the staging-only artifact replaces just v33's admin_set_kyc_verification mutating body with the
canonical409/kyc_clearance_pending response, retaining its authentication/admin check and all
other entrypoint/dependency bytes. The full canonical implementation remains in PR100 for later
integration with the gift stack. No pricing, payment or gift behaviour is changed by this artifact.

Independent exact artifact review found no blocker. Deno passes. The fresh deployed v33 source,
bundle57de94f1d8cc7f16897533e18c2e6343ecaf61b9c5419120fbaafaca54ceb94e and all frozen
files match the captured baseline immediately before delivery. The committed zero-context patch
ops-workflow-staging-containment.patch reproduces the exact target; apply checks require
--unidiff-zero. Its SHA256 is17291bc3703f93cacc24dd90a888d92848f5522554ea58ae9d4d1035a46876be.
Patched entrypoint SHA256 is83948a94b4885ae305914ff1524af102c15ea4449c7e2b5af01f1e0894fb5e49;
frozen booking/governance module hashes are1c32d6611c52f7705070a929c452b2a6702c5ea0167bd7e7212dfc5d1ac743c7
and5cd6deb014608c7c89f050147f0b755f7673fab3b1ea057d50288649604dc981. Local frozen copies
are ignored review artifacts; the patch and source hashes provide reproducible public evidence.

Narrow ops-workflow v34 is ACTIVE, JWT verified, bundle SHA256
9b9bae974d4d3f085c2fde67c0176a466022689cd050105c1af235ab4f6ac72d. The deployed entrypoint
and both frozen shared modules plus Deno configuration are byte-identical to the reviewed artifact.
No paid call, gift request, approval, document upload or scanner transfer was made.

## Contact schema audit correction

An apparent omission in the broad inventory prompted a provisional six-column repair claim.
Targeted checks show all six emergency-contact/reference text columns already exist (staging
attribute positions24–29); both projects have no missing contact column and a user_id unique key.
No convergence migration or source edit was created. Production's one application was read only
as a count; its contents were not retrieved or altered. Catalog parity is not real onboarding proof.

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
