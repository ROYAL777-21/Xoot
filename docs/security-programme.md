# Xoot 60-Point Security Programme

Xoot's security goal is to prevent account takeover, data leakage, payment abuse, fake bookings, contractor/client impersonation, off-platform manipulation, and operational disruption. This programme is grouped by urgency and should be reviewed before every major release.

## Critical Controls

1. Strong authentication and account protection: separate client, contractor, admin, and internal-agent login rules; verify email/phone; use short-lived reset links; require MFA for admins.
2. API authorisation on every request: verify identity, role, and object ownership server-side for bookings, profiles, documents, support cases, wallets, and invoices.
3. Secure storage of sensitive data: encrypt ID documents, selfies, bank details, gate codes, access notes, background checks, and support records; use short-lived signed URLs.
4. Payment security with Stitch and Ozow: never store raw card/bank credentials; trust only verified provider webhooks or direct provider confirmation.
5. Secure contractor document uploads: validate extension and MIME type, enforce size limits, scan for malware, strip metadata where appropriate, and keep uploads private.
6. Input validation and output escaping: validate all server-side inputs and escape user-generated content everywhere it is rendered.
7. SQL injection and query protection: use Supabase clients/parameterised APIs; never build SQL by concatenating user input.
8. Admin dashboard hardening: require MFA, RBAC, audit logs, session timeouts, device/session management, and no public indexing.
9. Session and token security: prefer secure httpOnly same-site cookies where possible; keep JWTs short-lived; rotate/revoke refresh tokens after sensitive changes.
10. Rate limiting and abuse protection: limit login, reset, OTP, referral, booking, payment, support, review, upload, and contractor-application flows.
11. DDoS and bot protection: use CDN/WAF controls, IP reputation, bot filtering, and launch-campaign rate limits while keeping backend validation authoritative.
12. Secure in-app messaging: allow messages only inside valid booking relationships; block off-platform payment/contact attempts and abusive content.
13. Booking fraud controls: require verified phone/payment status, detect suspicious address/account/referral/payment patterns, and add extra checks for unattended access.
14. Contractor fraud and impersonation prevention: verify phone, ID/selfie, bank, address, references, third-party screening, device changes, and payout changes.
15. Client address and home-access protection: reveal access notes only close to assigned booking windows; never put gate codes in email, SMS, push, or WhatsApp.
16. Secure support-case handling: classify severity, restrict visibility, preserve evidence, and escalate safety/legal/theft/harassment/property-damage issues.
17. AI agent permission controls: keep agents least-privilege, log actions, and require human approval for refunds, bans, legal-sensitive replies, deployments, and bulk outreach.
18. Secrets and environment variable protection: keep provider keys, JWT secrets, webhook secrets, and admin tokens out of frontend code, GitHub, screenshots, and chats.
19. Secure webhooks: verify signatures, reject replays, make handlers idempotent, and avoid detailed public errors.
20. Data protection and POPIA compliance: collect only needed data, explain purposes, restrict access, define retention, and prepare breach-response procedures.
21. Logging, monitoring, and alerting: log security events without raw passwords, gate codes, full bank details, full ID numbers, or secrets.
22. Secure deployment and CI/CD: use protected branches, review, environment separation, rollback, lint/type/test/build/dependency/secret scans, SSH keys, firewalls, and backups.
23. Dependency and package security: scan dependencies, pin versions where appropriate, remove abandoned packages, and preserve lockfiles.
24. File, image, and content generation security: treat AI/KIE output as external content; prevent generated assets from overwriting code/config and avoid fake credentials/reviews.
25. Location and route privacy: avoid exposing contractor home/private locations or unnecessary client location history.
26. Mobile app hardening: secure token storage, avoid sensitive logs, enforce HTTPS, prevent debug builds, and review OWASP Mobile Top 10.
27. Backup and disaster recovery: encrypt backups, restrict access, test restores, and back up database, uploads, config, and operational records.
28. Incident response plan: prepare playbooks for ATO, payment fraud, breach, leaked key, contractor safety issue, fake-booking attack, DDoS, malicious upload, and outage.

## High-Priority Controls

29. Security headers: set CSP, HSTS, frame denial/frame-ancestors, nosniff, referrer policy, and secure cookie flags.
30. CSRF protection: protect state-changing cookie-auth routes such as bookings, profile updates, password changes, support messages, payments, and Care+ changes.
31. Email and domain protection: configure SPF, DKIM, and DMARC; separate transactional and marketing sending where possible.
32. Anti-phishing and brand impersonation monitoring: reserve official domains/handles and tell users payments happen only in-app.
33. Referral and XootCred abuse prevention: block self-referrals, disposable identities, duplicate-device abuse, reversals, suspicious clusters, and abnormal spikes.
34. Review and rating integrity: prevent fake reviews, self-reviews, hidden score tampering, and pressure patterns; keep reliability changes auditable.
35. Contractor reliability engine protection: restrict punctuality, cancellation, complaint, completion, and score edits to audited support/admin flows.
36. Coupon and promotional-code controls: validate discounts server-side with expiry, service, suburb, campaign, user, device, and stacking rules.
37. Secure pricing and checkout calculations: calculate final price, fees, cover, high-demand slot pricing, Care+ benefits, XootCred, referral credits, and taxes server-side.
38. Secure cancellation and replacement logic: enforce cancellation windows, refunds, replacement priority, contractor penalties, status, timing, and payment state server-side.
39. Secure notifications: keep sensitive data out of push, SMS, WhatsApp, and email; direct users back into the authenticated app.
40. Secure search and analytics dashboards: aggregate where possible and separate founder, ops, support, marketing, finance, product, contractor, and client views by role.

## Medium-Priority Controls

41. Device and session management: let users see/log out sessions and flag unusual device/location/impossible-travel patterns.
42. Admin approval workflows: require dual approval for large refunds, payout changes, bans, background-check overrides, manual XootCred changes, and data exports.
43. Data export controls: restrict CSV exports, log every export, and mask sensitive fields by default.
44. Secure contractor payout changes: verify bank changes, add waiting periods or review, and alert on suspicious account takeover patterns.
45. Secure customer property access flow: show access notes inside a time window, log every view, and redact after completion unless required for recurring bookings.
46. Bot-resistant waitlists and contractor applications: use bot protection, duplicate detection, IP/device checks, and controls to protect Airtable/Brevo/Twilio costs.
47. Secure third-party integrations: assign owner, purpose, key, permissions, webhook endpoint, shared data, and rotation schedule for every integration.
48. Content moderation: moderate bios, reviews, messages, support attachments, before/after photos, and profile images.
49. Security testing before launch: test access control, uploads, webhooks, payment confirmation, role boundaries, and cross-user object access.
50. Penetration testing: run an external review before storing real ID documents, gate codes, or high payment volume.

## Later Hardening

51. Responsible disclosure page: publish a safe reporting path when Xoot has traction.
52. Security awareness training: train staff against phishing, data exports, API key leaks, and suspicious refund/payout requests.
53. Internal security checklist for every feature: document data involved, access, abuse cases, logs, and failure mode.
54. Privacy-by-design UX: explain why sensitive data is collected in context, especially contractor documents and home access notes.
55. Security status page: publish uptime/incident status when B2B clients, hosts, and offices depend on Xoot.
56. Data minimisation reviews: quarterly review and delete/archive old documents, support attachments, gate codes, and verification files no longer needed.
57. Tabletop incident exercises: practise leaked key, fake contractor, payment webhook abuse, DDoS, support leak, and malicious upload scenarios.
58. Vendor risk review: review each vendor's security, reliability, pricing, data role, and export options.
59. Legal review of claims: review claims like insurance, screening, replacement, safety, and guarantees before publishing.
60. Brand trust monitoring: monitor reviews, social channels, and support tickets for impersonation, off-platform requests, payment scams, no-shows, fake Xooters, and suspicious messages.
