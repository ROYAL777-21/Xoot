# Visit review and support-routing concurrency

10 October 2026, 13:06 UTC. The two unchanged migrations from the locally reviewed
Visit/Rate commit `89d6fe31e010b26fdb54fa306f5d0c671a37b9e8` passed an additional
test using four independent PostgreSQL 17.11 connections.

**12 scenarios passed, with nine observed database lock barriers.** A barrier required
an active waiting session, a `Lock` wait event and the expected blocker reported by
`pg_blocking_pids`; elapsed time alone was not accepted as evidence.

- Competing review requests return one immutable saved opinion. A rolled-back first
  request leaves the waiting request free to create its own single review.
- A review waiting for a booking lock rechecks committed cancellation, ownership and
  assigned-helper changes. Unrelated bookings can proceed independently.
- Competing low-rating follow-ups create one support row and one admin queue row.
  Rollback leaves no partial pair. Retrying settled work preserves its closed/resolved
  status and original identifiers.
- Follow-up routing rechecks review ownership after waiting. Anonymous and authenticated
  client roles cannot execute either service-only function or insert/update opinions.

The [machine-readable result](evidence.json) includes migration SHA-256 hashes and
the observed barriers. The [command log](command.log) records exit code 0.
The harness used the minimal schema from `scripts/ops/verify-visit-review-contract.mjs`
and executed the actual two migration files without changes.

The command was `node ../../outputs/test-visit-review-concurrency-20261010.mjs`,
run from the repository with explicit local test intent, literal loopback host,
port 55432, the existing isolated `pg` driver and a password-file path. No password
value was printed. The unique synthetic database and only the roles created by the
harness were removed; existing role attributes/memberships were unchanged. The owned
local server was stopped afterward.

An earlier launcher waited for PostgreSQL's whole process tree rather than only the
startup command. That launcher was identified and stopped before running the harness;
it is not counted as a test result. No product source changed during this verification.

This closes the local independent-session evidence gap in the
[reviewed correction](../../2026-10-09/visit-rate-fix1/README.md). It does **not** prove
the complete hosted schema, live actor/RLS integration, provider delivery, crew reviews
or native devices. Migration/function delivery remains pending in the
[production checklist](../../../production-checklist.md).
