# RLS And Database Security Review

Reviewed: 2026-07-02

## Current Position

Xoot uses Supabase Postgres, RLS, security-invoker views where needed, and Edge Functions for privileged actions. Supabase MCP remains read-only for inspection. Live writes, migration repair, and Auth config changes require Supabase CLI/dashboard access with locally loaded rotated credentials.

## Critical Tables And Controls

| Area | Tables/functions | Required access model |
| --- | --- | --- |
| Bookings | `bookings`, booking events, job-card RPCs | Client sees own; Xooter sees assigned; admin through audited paths |
| Household access | `household_profiles`, `booking_sensitive_access`, `can_access_sensitive_data` | Owner/admin only; Xooter through active booking window only |
| Payments and credits | `payment_records`, `zootcred_ledger`, invoices | Provider/Edge authoritative; no direct frontend mutation |
| Xooter onboarding | Applications, documents, training progress | Applicant owns own application; admin/trust decisions audited |
| Admin operations | `admin_audit_log`, review queues, operational controls | Admin role and reason for sensitive actions |
| Communications | `integration_outbox`, Twilio events, notifications | Server-owned queueing and provider-signed callbacks |

## Known Safe Patterns

- Use `(select auth.uid())` in policies for performance and clarity.
- Add both `USING` and `WITH CHECK` for update policies.
- Keep sensitive lookup or mutation logic in Edge Functions or carefully scoped RPCs.
- Revoke public access to base sensitive tables; expose only safe views.
- Prefer append-only event tables for audit and provider callbacks.

## Open Review Items

- Repair production migration metadata only through the guarded repair helper after local credentials are loaded.
- Deploy storage-object private read policies requiring the correct storage policy owner role.
- Re-run Supabase advisors after migration repair and storage policy deployment.
- Run role-based booking chat, sensitive access, invoice, payment, and provider callback smoke tests.

## Stop Conditions

- Any `USING (true)` or `WITH CHECK (true)` on sensitive data tables.
- Any public base-table access to ID documents, bank data, access notes, support incidents, payment records, admin audit, or private invoices.
- Any frontend path that can directly mutate payment, payout, admin, outbox, or booking terminal state.
