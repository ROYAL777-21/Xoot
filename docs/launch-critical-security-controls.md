# Launch-Critical Security Controls

This checklist covers the highest-risk launch failures for Xoot: account takeover, data leakage, payment abuse, fake bookings, contractor/client impersonation, off-platform manipulation, and operational disruption.

## 1. Account Takeover

Required before launch:

- Email and phone verification for new accounts.
- Generic auth errors so attackers cannot enumerate accounts.
- Forgot-password and reset-password flows with short-lived links.
- Session invalidation after password changes and suspicious activity.
- MFA for admin/internal staff.
- Rate limits on login, reset, OTP, and OAuth callback attempts.
- Audit logs for password reset, role changes, admin access, and sensitive data views.

## 2. Data Leakage

Required before launch:

- RLS enabled and tested on every public Supabase table.
- Object ownership checks for bookings, profiles, documents, support cases, XootCred, invoices, and messages.
- Gate codes, alarm codes, lockbox details, access notes, ID documents, selfies, and bank details encrypted or stored privately.
- Signed URLs for private uploads with short expiry.
- Sensitive fields omitted from notifications, logs, analytics exports, and support dashboards unless role-approved.
- Contractor access to sensitive client data revoked immediately on cancellation and after the allowed booking window.

## 3. Payment Abuse

Required before launch:

- Final pricing calculated server-side.
- Booking cover, XootCred, referral credits, Care+ benefits, taxes/fees, and high-demand slot pricing enforced server-side.
- Stitch/Ozow webhooks verified with signatures/secrets.
- Payment handlers idempotent to prevent duplicate confirmations or duplicate credits.
- Frontend success states treated as display only, never as confirmation of payment.
- Refunds above threshold require human approval and audit logging.

## 4. Fake Bookings

Required before launch:

- Verified phone number before dispatch.
- Verified payment state before confirming assigned contractor.
- Suspicious booking detection for repeated cancellations, invalid addresses, multiple accounts, failed payments, and referral abuse.
- Additional verification for unattended access, lockbox use, Airbnb turnovers, and landlord properties.
- Same-day and high-risk bookings flagged for operations review where needed.

## 5. Contractor/Client Impersonation

Required before launch:

- Contractor ID/selfie verification, phone verification, address confirmation, references, bank verification, and third-party screening before going live.
- Device and payout-account change monitoring for contractors.
- Periodic checks for suspicious contractor account sharing.
- Client and contractor profiles expose only operationally needed information.
- Masked Twilio voice calls only during active booking windows.
- No direct personal phone numbers in booking messages or notifications.

## 6. Off-Platform Manipulation

Required before launch:

- In-app messaging tied to valid booking relationships only.
- Detection and moderation for phone numbers, bank details, external payment requests, and off-platform language.
- Terms prohibit direct payment arrangements introduced through Xoot.
- Suspicious simultaneous inactivity by matched client/contractor flagged for review.
- Contractor benefits and client Home Memory make staying on-platform materially useful.

## 7. Operational Disruption

Required before launch:

- CDN/WAF and bot controls in front of website and APIs.
- Rate limits for expensive flows: uploads, support, bookings, payments, referrals, and auth.
- Backups encrypted and restore-tested.
- Rollback path for frontend and edge functions.
- Sentry or equivalent error monitoring.
- Weekly operational review of bookings completed, cancellations, support tickets, contractor flags, and Care+ count.
- Incident playbooks for leaked keys, DDoS, malicious upload, payment webhook abuse, fake contractor, support data leak, and outage.

## Merge Gate

Do not merge a release branch until:

- `npm run lint`, `npm run test`, `npm run build`, and `npm run security:scan` pass.
- Supabase security and performance advisors are reviewed.
- RLS smoke tests prove cross-user object access is blocked.
- OAuth and reset redirect allow-lists are configured for the target domain.
- Payment and webhook code paths have non-production smoke tests.
- Credential-blocked features have safe unavailable states rather than broken buttons.
