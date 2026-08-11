# Launch-Critical Security Controls

This document turns the security programme into launch work. The goal is to prevent account takeover, data leakage, payment abuse, fake bookings, contractor/client impersonation, off-platform manipulation, and operational disruption.

## Controls Included In This Branch

| Risk | Branch control |
|---|---|
| Data leakage through committed environment files | Removed the tracked `.env`, added `.env.example`, and updated `.gitignore` to keep local environment files out of Git. |
| External builder metadata and gateway exposure | Removed the Vite tagger dependency, tagger usage, gateway environment reference, and stale lockfiles that still contained removed dependency metadata. |
| Unsupported AI support behavior | Replaced the external AI support call with a conservative local support responder that escalates account, payment, cancellation, access-code, safety, damage, no-show, and complaint topics. |
| Unsafe contractor document uploads | Added client-side file-type, MIME, filename, and 8MB size validation for contractor verification uploads. Server and storage policies must still enforce this. |
| Overexposed booking access notes | Updated the Xooter jobs UI to avoid showing client addresses directly in the list and direct Xooters to secure booking details near appointment time. Backend timing/RLS controls are still required. |
| Weak premium action feedback | Added a no-op-safe haptics utility and applied it to premium/support/dashboard actions with feature detection and reduced-motion respect. |

## Launch Must-Haves Before Production

| Area | Required launch gate |
|---|---|
| Authentication | Verified email/phone, strong reset flow, rate limits, session invalidation after password reset, MFA for all admin/internal roles. |
| Authorisation | Backend object-level checks for bookings, addresses, documents, wallets, support tickets, messages, payments, and verification records. |
| Supabase RLS | RLS policies reviewed with role-specific tests for client, Xooter, support, finance, admin, and service roles. |
| Contractor documents | Private bucket, signed short-lived URLs, server-side validation, malware scan path, audit logs for document views, and retention rules. |
| Access notes | Gate codes, lockbox codes, parking, and pet notes revealed only to assigned Xooters close to booking time; never included in push/SMS/email. |
| Payments | Stitch/Ozow checkout confirmed only through verified provider state or signed webhook. Webhooks must be idempotent and replay-resistant. |
| Pricing | Backend calculates service fee, add-ons, Care+ benefits, XootCred, referral credits, and final payable amount. |
| Support | Safety, theft, harassment, damage, legal threats, refunds above threshold, payout changes, and identity issues require human review. |
| Messaging | Messages require a booking relationship, block off-platform contact/payment solicitation, and support moderation workflows. |
| Admin dashboard | MFA, RBAC, IP allowlisting where possible, audit logging, export restrictions, and dual approval for high-risk changes. |
| Monitoring | Alerts for failed login spikes, OTP abuse, webhook failures, payment failures, suspicious booking clusters, upload errors, and admin export events. |
| Incident response | Written runbooks for account takeover, leaked key, payment fraud, fake contractor, malicious upload, support data leak, and production outage. |

## Verification Checklist

- Confirm no tracked secrets or production credentials remain in Git history or current files.
- Rotate any credentials that were ever committed.
- Run secret scanning, dependency scanning, lint, typecheck, tests, and production build before deploy.
- Test one-user-cannot-read-another-user flows across bookings, support tickets, documents, XootCred, messages, and profiles.
- Test payment webhook signature rejection, duplicate webhook idempotency, and frontend payment-success spoofing.
- Test file upload rejection for script files, renamed executables, oversized files, malformed images, and unsupported MIME types.
- Test mobile push/SMS/email previews to ensure no sensitive access details leak outside the app.
