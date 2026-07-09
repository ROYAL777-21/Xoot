# Phase 6 Zoot Black Foundation

Reviewed: 2026-06-30

## Scope

This phase adds the disabled-by-default data contract for Zoot Black. It does not activate a customer-facing purchase path, does not alter checkout, does not claim live availability, and does not issue certificates automatically.

## Added Artifacts

- Migration: `supabase/migrations/20260630003602_phase6_zoot_black_foundation.sql`
- Shared rules: `src/lib/operations.ts`
- Tests: `src/lib/operations.test.ts`

## Database Contracts

| Table or function | Purpose | Client access |
| --- | --- | --- |
| `public.zoot_black_area_pilots` | Selected-area pilot approval gates. | Admin read only. |
| `public.zoot_black_training_requirements` | Admin-approved Zoot Black training requirements. | Admin read only. |
| `public.zoot_black_status_history` | Append-only Zooter eligibility and status history. | Admin read; Zooter can read own status. |
| `public.zoot_black_equipment_evidence` | Private equipment and supply evidence metadata. | Admin read; Zooter can read own review status. |
| `public.booking_service_line_items` | Backend-owned explicit line items, including `zoot_black_service`. | Booking participants and admins read only. |
| `public.zoot_black_completion_certificates` | Zoot-issued completion certificate records. | Client, assigned Zooter and admin read only. |
| `public.is_zoot_black_eligible(uuid, text)` | Service-role eligibility helper. | Service role only. |

Private certificate PDFs use the `zoot-black-certificates` Supabase Storage bucket. The path convention is `{client_user_id}/{certificate_id}.pdf`; writes remain service-role only.

## Disabled Controls

The migration seeds these controls as disabled:

- `zoot_black.enabled`
- `zoot_black.area_pilot`
- `zoot_black.certificates`

They must stay disabled until founder, operations, supplier and legal approval is recorded.

## Guardrails

- Zoot Black must be explicit and never preselected.
- Eligibility is Elite-only and requires approved evidence, selected-area approval and legal approval.
- The explicit line item must be visible as `zoot_black_service`.
- Completion certificates are Zoot service records only. They must not claim government, insurer, medical or independent certification.
- Public copy must not imply availability before the pilot is approved and supplied.

## Rollout

1. Apply the migration to staging.
2. Run `npm run ops:supabase:verify:live` against staging.
3. Confirm the `zoot_black.*` controls are present and disabled.
4. Complete founder, operations, supplier and legal approvals.
5. Add backend Edge Functions for approved equipment review, line-item insertion and certificate issuance.
6. Smoke-test staging with real admin and Zooter users.
7. Repeat the migration and smoke tests in production.

## Rollback

The migration is additive. If rollback is needed before any functions depend on it, keep all `zoot_black.*` controls disabled and drop the Phase 6 tables, function, bucket and booking columns in a forward-fix migration. After functions depend on it, prefer a forward fix by disabling controls and revoking new function deploys.

## Remaining Work

- Live staging and production deployment.
- Approved Zoot Black commercial terms and line-item amount.
- Approved equipment/supply evidence checklist.
- Approved selected pilot areas.
- Approved legal certificate wording.
- Edge Functions for status decisions, equipment evidence review, explicit line-item creation and certificate issuance.
