# Worker email allowlist hardening — 4 November 2026

A claimed worker email could remain authorized after its recipient was removed from a
replacement allowlist containing NULL. PostgreSQL evaluates `NOT(user_id = ANY(array))` as
NULL in that case; the authorization function's rejection branch did not run. Claim selection
already requires a true match. This defect concerns final authorization after a claim.

The policy is owner-managed and ordinary API roles cannot call the delivery functions or
change it. The independent 3 November catalog readback found sending disabled in both projects,
production0/20 and staging1/20, with no NULL entries. That observation does not replace fresh
operator preflight before delivery. No email or hosted change is part of this source patch.

The forward migration is
`20261103223222_xooter_email_allowlist_null_hardening.sql`. Applied migrations remain intact.
It first takes the policy's final ACCESS EXCLUSIVE DDL lock, then the event-table EXCLUSIVE
lock, with a five-second lock timeout. Dispatcher transactions take policy before events.
Taking the final policy lock first avoids upgrading it after holding the event table.

Delivery requires one paused policy, no claimed mail and no unfinished dispatched mail. It
pins the existing authorization body to normalized prosrcSHA
`4a94e45ce0dd6ff3892b6788356e0dc0bd48124133af86872b28d425ec55b9e3`, plus its postgres owner,
PL/pgSQL/definer/empty-search-path context and service-only execution boundary. Unknown state
refuses delivery. A validated CHECK rejects NULL allowlist elements; existing bad configuration
rolls back instead of being cleaned or reset. The replacement body changes only the final
membership rejection to `IS NOT TRUE`. CREATE OR REPLACE preserves the OID, owner, ABI and ACL.
There is no enablement, sender/schedule change, receipt rewrite, counter reset, budget refill
or generated-type change.

`scripts/ops/verify-xooter-email-allowlist.mjs` uses the existing isolated PostgreSQL runtime.
Its eleven cases cover the immutable predecessor's leak, NULL-only/mixed-NULL revocation,
empty/different-user revocation, schema rejection, valid one-time authorization, receipt and
authority preservation, paused-policy prerequisites, active/unfinished mail, unknown source,
and complete rollback on invalid existing data. A disposable case drops only its local CHECK
to prove that the function itself remains null-safe. It never calls SMTP or a hosted database.
The new denial regression failed against the predecessor before implementation. Both existing
CI SQL jobs run the validator with their already pinned PGlite runtime.

Local verification: all eleven scenarios and the original89SQL assertions/negative controls
pass, along with web typecheck, scoped lint, script syntax and diff checks. The full local
Vitest attempt was stopped at the parent's request after failures in unchanged notification,
profile, calling, readiness, booking, Today, host-configuration and kit-token tests; several
exceeded the default deadline. No test deadline or unrelated implementation was changed.
The required isolated GitHub suite remains the release gate. This is a draft for independent
review, not a full local-suite or hosted/concurrent/SMTP acceptance claim.

Root owns independent review and any later hosted delivery. Before applying, read actual
source/ACL, paused policy and outstanding mail state. After applying, verify the validated
CHECK, replacement body, unchanged ABI/owner/ACL, exact policy/quota rows and existing receipt
contents. Stop on mismatch or lock timeout; do not repair-stamp history, clear claims, remove
recipients or refill attempts. Operator reconciliation of any outstanding mail is a separate
reviewed action. This patch does not authorize sender activation.
