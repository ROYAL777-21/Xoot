# Security Rules

This file is the agent-facing security summary for Xoot implementation work. It does not replace the detailed security documents:

- [Launch Critical Controls](./security/launch-critical-controls.md)
- [Xoot Security Programme](./security/zoot-security-programme.md)

Every Codex or Codex harness change must preserve the goal of preventing account takeover, data leakage, payment abuse, fake bookings, contractor/client impersonation, off-platform manipulation, and operational disruption.

## Backend Authority Rules

The backend is the source of truth for:

- user identity and role access
- booking ownership and booking state
- contractor assignment and availability
- pricing, fees, add-ons, booking cover, Care+ benefits, referrals, and XootCred
- payment status and webhook confirmation
- cancellation windows and replacement matching
- access-note visibility windows
- support escalation, refunds, payouts, and trust incidents

The frontend may display estimates and available actions, but must not be trusted to enforce business rules.

## Supabase RLS Requirements

- RLS must be enabled for all tables that contain user, booking, property, support, payment, contractor, verification, messaging, XootCred, referral, or audit data.
- Clients may read and mutate only their own allowed records.
- Xooters may read assigned booking data only, and sensitive home data only inside approved access windows.
- Support, finance, admin, and trust roles must be scoped to the minimum tables and actions required for their function.
- Service role access must never be exposed to client code.
- Any policy touching sensitive household data, payment records, contractor documents, support incidents, or admin actions requires tests or a documented smoke check before merge.

## Authentication Rules

- Require verified email or phone before production booking actions.
- Use strong password rules and safe password reset flows.
- Reset links must be short-lived and should not leak account existence.
- Admin and internal staff accounts require MFA before production access.
- Sessions must be invalidated after password changes and privilege changes.
- Avoid storing sensitive tokens in localStorage where possible.
- OAuth providers require Supabase dashboard credentials and safe redirect allowlists before being considered live.

## Payment Protection

- Stitch and Ozow confirmation must come from provider verification or signed webhooks, never frontend success messages.
- Store provider references and reconciliation metadata only; do not store bank credentials, card details, or payment secrets.
- Payment webhooks must verify authenticity, prevent replay where supported, and be idempotent.
- Backend or edge functions must calculate final pricing before confirmation.
- Refunds above threshold, payout changes, payment disputes, and payment overrides require human review.

## Referral And XootCred Protection

- Referral rewards must be issued only after qualifying completed paid bookings.
- Block self-referrals, repeated device/account abuse, disposable email clusters, payment reversals, and abnormal referral spikes.
- XootCred is closed-loop platform credit and must not be withdrawable as cash.
- XootCred balances, boosts, the welcome add-on credit, and manual adjustments require server-side validation and audit logs.
- The Care+ welcome add-on credit is granted once at activation, expires, applies only with completed bookings, and cannot be withdrawn. It is not a recurring monthly grant.

## Agent Restrictions

- Agents must operate with least privilege.
- No agent may receive raw API keys, service role keys, production secrets, gate codes, ID documents, bank details, or raw verification files unless an approved secure tool path explicitly requires it.
- Human approval is required for refunds above threshold, payout changes, account bans, legal-sensitive responses, public claims, production deployments, bulk outreach, and trust decisions.
- Agents must not invent statuses, guarantees, reviews, credentials, contractor availability, payment outcomes, or verification results.
- Codex harness automations must run only from known source-of-truth triggers.

## Audit Requirements

Audit logs are required for:

- admin and support views of sensitive records
- contractor document views and approvals
- gate code, lockbox code, parking code, and access-note reveals
- role changes and permission changes
- payment records, refunds, payout changes, and XootCred adjustments
- support escalations and trust incidents
- contractor verification decisions
- data exports
- webhook failures and replay rejections

Logs must not contain raw passwords, full secrets, full bank details, full ID documents, or unmasked gate/access codes.

## File Upload Rules

- Use private storage for verification documents and sensitive support attachments.
- Use signed short-lived URLs for viewing protected uploads.
- Validate file extension, MIME type, filename, and size on the server.
- Add malware scanning or a documented review path before production use.
- Do not render uploaded files in admin/support surfaces without safe preview handling.

## Messaging And Off-Platform Risk

- In-app messages must be tied to a valid booking relationship.
- Clients and Xooters may communicate only where the booking context allows it.
- Block or review phone numbers, bank details, external payment requests, off-platform booking requests, abusive content, and moderation bypass attempts.
- WhatsApp and SMS are for OTP, urgent booking, safety, and service-status events only after sender approval, consent, opt-out, and signed webhook verification are complete. Routine rebooking, Care+, XootCred, onboarding nudges, and marketing belong in-app or approved email flows.
- Twilio voice and masked calling are allowed only inside approved booking/support windows and must never expose raw client or Xooter phone numbers in the frontend.

## Production Gate

Before production launch, run or document:

- Supabase security and performance advisor checks.
- RLS smoke tests by role.
- secret scan and dependency audit.
- payment webhook verification smoke test.
- upload validation smoke test.
- sensitive access-note visibility test.
- admin/support audit-log test.
- rate-limit and abuse-control review.
