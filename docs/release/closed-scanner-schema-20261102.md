# Closed scanner schema delivery — 2 November 2026

The founder authorises production delivery subject to substantive acceptance. Actual staging
receipts now prove a clean blank PDF, a positive EICAR block and a cached retry under policyv2.
Original v1 receipts remain unchanged, used4/32 and personal processingfalse. See
[redacted acceptance](evidence/2026-11-02/scanner-staging.json).

This delivery updates production's schema and generated types while retaining processing OFF.
It installs no production Cloudmersive key, worker, schedule, provider action or contractor
clearance. Free-plan production eligibility, processing agreement/region, applicant consent and
genuine document/background/training/bank checks remain open. Malware scanning cannot decide
whether an identity document is authentic.

The generated convergence contains only the three reviewed, actually rehearsed source versions:
20261101155855,20261101220212,20261101221814. One DO statement performs their DDL and inserts
canonical history only after each source succeeds in the same atomic statement. The hosting
runner records the convergence wrapper's own actual version. It is not a migration repair.
The [manifest](evidence/2026-11-02/scanner-schema-manifest.json) pins normalized source and executed
SQL SHA-256 values. Staging's actual one-statement history hashes equal those source hashes.

Preflight requires the existing quarantine table, all four restrictive Storage barriers covering
both API roles and all three enabled contractor activation interlocks. Unknown objects, partial
history or mismatched executed SQL fail closed. A legitimate all-applied staging baseline may
skip the sources after exact history checks; it never resets receipts, spend or the maximum.
Postconditions require five service-only invoker RPCs and the closed, nonrenewing32attempt policy.

Independent review found that checking only guard names/roles accepted ineffective replacements.
The corrected wrapper additionally requires Storage RLS enabled, exact policy commands and
USING/WITH CHECK predicates, both helper function bodies pinned to the reviewed historical source,
their definer/invoker/owner/search-path contexts, and trigger function/event/row/WHEN/column-list
bindings. Six real local mutations prove refusal for disabled RLS, a raw policy made true, either
helper replaced by a no-op, a trigger bound to another function or a false WHEN condition. These
are disposable negative controls, not evidence production was weakened. Actual production's
RLS, predicates, helper hashes and trigger event bindings match the reviewed baseline.

Local PostgreSQL rehearsals cover clean delivery with exact executed-history hashes, repeated
delivery after spending an attempt, byte-identical receipt preservation, middle-source failure
rolling back DDL and all history, and refusal to repair-stamp partial history. The original64SQL
scanner assertions and independent source/auth reviews remain applicable. These local tests
do not assert concurrent hosted/device acceptance.

After independent cross-review of corrected commit6a8ede36, the convergence was actually applied
to production as20261101224523_closed_scanner_schema_convergence. Its normalized SQL SHA-256 is
444fe05aa8df5047c4d2beea73f9f8320c4e053b1c39bff405e0feedd6f1a68a.
Readback verifies all three canonical executed-source hashes, five service-only invoker RPCs,
four restrictive Storage barriers and three activation interlocks. Budget remains0/32 with
personal processingfalse, no attempts and no worker deployed. Business counts remain unchanged
(0bookings/0jobs/1payment/0activeworkers). Money controls remain closed.

Pinned actual production CLI2.113.0 run41358867443 generated exactly24added lines for the five
new RPCs. That real diff supplies the committed types; a fresh schema comparison and the full
release suite must pass before merge. See [production readback](evidence/2026-11-02/scanner-production-schema.json).
No production scanner or real-person processing is included. Rollback retains closed tables
and receipts for audit and disables invocation; it never deletes evidence, resets counters or
opens Storage. Applied SQL is immutable; the delivery file uses the actual hosted version.
