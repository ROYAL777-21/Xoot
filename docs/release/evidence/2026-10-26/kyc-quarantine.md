# Document containment — 26 October 2026

Status: prepared source only. No production or staging deployment of this containment patch.
This is not a working antivirus, identity service or complete contractor onboarding release.

## Evidence and boundaries

Both actual projects currently have0 document records. Production has1 application and0 active
Xooters; staging has0 applications and1 pre-existing active Xooter. Preserve them all. Production
and staging document note columns differ; the patch does not rename or depend on either.
Both have browser INSERT/DELETE and individual UPDATE grants on application/document tables.
Owner ALL RLS is therefore insufficient to protect status, ownership and file pointers.

The patch revokes table AND column writes, closes raw browser downloads, replacement and deletion,
and atomically registers inspected bytes, owner/application/type, object identity/revision, SHA256,
length/MIME and optional selfie pointer. Server validation requires allowed extension, MIME,
size and signature; it does not parse a PDF/image safely or establish absence of malware.
All acknowledgments remain pending + quarantined. Client-supplied document paths cannot satisfy
application submission, and already-submitted/approved applications cannot be edited via that handler.

Admin UI no longer mints ten-minute signed URLs or offers unscanned document opening. Verification
and activation are locked. DB triggers reject NEW activation, approved applications and Xooter-role
grants even from a service/ops route. Existing active staging records are preserved. The old
multi-request approval implementation is removed, since it could activate before a later guard fails.
There is deliberately no UI/service boolean to declare the missing controls complete.

Raw reads being closed means failed unregistered uploads also cannot be browser-deleted. Such files
remain private until a reviewed privileged orphan/retention worker removes them. Do not claim the
existing client cleanup succeeded. No real files were uploaded, scanned, opened or deleted in this work.

## Checks actually run

- Ten focused helper checks passed, covering real-byte fingerprints, foreign paths, stale/missing
  objects, size/type/signature spoofing, allowed content headers, wrong categories and failed/mismatched
  atomic receipts. These use inert synthetic bytes and database doubles, not a real malware scanner.
- Deno checks passed for submit-xooter-application, approve-xooter and ops-workflow; scoped ESLint passed.
- Exact migration applied to a disposable isolated PostgreSQL17.6 fixture reproducing legacy ALL
  policies and individual-column grants. Actual authenticated/service roles passed the storage,
  registration, rollback and activation contracts; saved output is kyc-quarantine-postgres.txt.
- Removing the raw-read restrictive policy makes the owner privacy assertion fail. Removing the
  contractor activation trigger makes the service activation assertion fail. Both expected failures
  occurred and rolled back. The exact labelled disposable container was then removed; unrelated
  student-lab/payram containers were untouched.
- The first SQL contract exposed that raw-read denial also prevents client orphan deletion. The
  policy/test/runbook now explicitly keep all raw files contained instead of promising that cleanup.

Additional exact-source checks: ten helper + eleven RPC-contract checks passed (21 total), and all three changed handlers passed Deno. SQL also proves stale submitted-application edits cannot undo review, current-receipt retries return without a download, per-owner eight/global32 non-renewing upload/inspection limits and one successful reservation out of two real concurrent connections competing for the last inspection. Both privacy/activation negative controls fail as expected and roll back. The labelled disposable PostgreSQL container was removed after the tests; no live database or real applicant was used.

Independent architecture review identified signed-URL replacement and partial approval hazards.
The reviewer hit its usage limit before patch review; completed cross-review is still required.
Required GitHub jobs also cannot start: owner Billing shows3,000/3,000 included minutes used.

## Required before opening document review or activating contractors

1. Founder selected Cloudmersive Free. Direct HTTPS integration remains to implement; no Cloudmersive SDK is imported. Current primary pricing/portal:600 calls/month shared across APIs,3.5MB maximum,1 request/second,1 simultaneous request and North America. Keep a conservative3,000,000-byte scanner ceiling and a shared non-renewing provider allowance/lease; quota failures, unknown verdicts and oversized files remain quarantined. No key, account entitlement or actual clean/inert-threat acceptance is verified. The founder's login fails with “Unable to verify login” / “Login verification failed”; do not bypass provider verification, upgrade or create a replacement identity. The public API-service terms do not establish an express Free commercial ban; evaluation/premium recommendations are not treated as one. The published SDK EULA is a separate licensing reason to use direct documented HTTPS.
   Before real IDs/selfies/bank statements are sent, obtain effective operator/DPA coverage for Xoot's Free account and an approved POPIA overseas-transfer/applicant-notice basis. Cloudmersive's published DPA says Sales/account acceptance is needed. No private applicant files have been transmitted. A clean malware verdict would still not establish identity/authenticity.
2. Seal exact clean bytes in immutable server-owned storage or use an authenticated per-read proxy
   that verifies current object version, SHA256, current role+AAL2 and audit. Do not revive raw signed URLs.
3. Collect evidence-backed authenticity decisions for each exact document and application revision.
   An authorised human/issuer check must establish identity, address and banking provenance; antivirus
   cannot prove genuine documents. MIE/issuer access is not configured or falsely marked successful.
4. Implement and independently review a single locked transaction that rechecks4 DISTINCT current
   clean/authentic document types, current admin+AAL2, canonical required training, background checks,
   consent and profile prerequisites, then commits application, activation, role and strict audit together.
   Extend guards to every alternate activation path; keep new activation locked until that replaces this interlock.
5. Add privileged orphan/retention cleanup, quotas and real private applicant/admin acceptance. Review
   existing sensitive metadata/admin access and MFA, legacy function aliases and data retention constraints.
6. Review exact immutable patch, migrate staging first, deploy changed handlers/UI in order, prove
   normal authorised JWT paths and adversarial reads/writes, then assess production migration safely.

Rollback: prefer a forward corrective migration while keeping raw reads and activation locked. Do not
re-grant unsafe browser writes, mint old signed URLs, delete retained evidence or open activation to
restore the former flow. No production rollback has been run because this patch is not deployed.

Sources: [OWASP upload guidance](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
and [Supabase private download behaviour](https://supabase.com/docs/guides/storage/serving/downloads).

Provider sources checked26October: [Free limits](https://cloudmersive.com/pricing-small-business), [API](https://api.cloudmersive.com/docs/virus.asp), [DPA](https://cloudmersive.com/data-processing-dpa), [Terms](https://portal.cloudmersive.com/terms-of-service), [SDK EULA](https://api.cloudmersive.com/EULA/client-eula.html). No API calls or paid plan changes.
