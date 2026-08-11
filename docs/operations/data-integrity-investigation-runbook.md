# Data Integrity Investigation Runbook

Reviewed: 2026-07-02

Use this when bookings, payments, XootCred, Care+, invoices, payouts, sensitive access, admin actions, or provider events appear inconsistent.

## Investigation Steps

1. Define the invariant that appears broken.
2. Capture affected IDs: user, booking, zooter, payment, invoice, provider event, outbox row.
3. Check immutable events before mutable tables.
4. Compare provider records with Xoot records.
5. Check admin audit log and operational control changes.
6. Check Edge Function logs and idempotency claims.
7. Identify whether the issue is runtime schema, migration metadata, provider callback, frontend display, or manual action.

## Invariants

| Area | Must hold |
| --- | --- |
| Booking | State transitions follow the booking state machine |
| Payment | Paid state requires provider confirmation or audited admin action |
| Invoice | Completed paid booking has at most one immutable invoice snapshot |
| XootCred | Available balance cannot go negative |
| Sensitive access | Xooter access requires assignment, active window, and no revocation |
| Admin | Sensitive admin action has actor, reason, target, changes, and timestamp |
| Provider events | Event ID is processed once and replay is safe |

## Correction Rules

- Prefer typed repair functions or audited admin actions.
- Never patch critical state from the browser.
- Never silently delete audit or provider events.
- If correction affects money, trust, or legal posture, require human approval and record the decision.
