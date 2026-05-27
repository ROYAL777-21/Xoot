# Zoot Security Programme

Zoot's security goal is to prevent account takeover, data leakage, payment abuse, fake bookings, contractor/client impersonation, off-platform manipulation, and operational disruption. This checklist is grouped by launch urgency and should be reviewed before every major release.

## Critical Controls

| # | Control | Required Zoot outcome |
|---|---|---|
| 1 | Strong authentication and account protection | Separate client, Zooter, admin, support, finance, and agent access. Require verified email/phone, strong password reset flows, rate limits, and MFA for staff/admins. |
| 2 | API authorisation on every request | Every endpoint checks identity, role, and object ownership. Clients only see their own bookings; Zooters only see assigned work; support/finance/admin access is role-scoped. |
| 3 | Secure storage of sensitive data | Encrypt data in transit and at rest. Restrict ID documents, selfies, bank details, gate codes, access notes, support incidents, and verification records. |
| 4 | Payment security with Stitch/Ozow | Store only provider references and reconciliation metadata. Confirm payment only through provider confirmation or verified webhooks, never frontend success states. |
| 5 | Contractor document upload flow | Accept only approved file types, validate MIME and extension, enforce size limits, strip risky names, scan where possible, and use private storage with expiring access. |
| 6 | Input validation and output escaping | Validate all user input server-side and escape user-generated content wherever displayed, especially notes, messages, reviews, bios, filenames, and support text. |
| 7 | Query and injection protection | Use parameterised queries or safe ORM calls. Do not build SQL, command, template, or search queries from raw user input. |
| 8 | Admin dashboard hardening | Require MFA, RBAC, no public indexing, audit logs, session timeouts, and backend permission checks for every admin route. |
| 9 | Session and token security | Prefer secure HTTP-only same-site cookies. Keep tokens short-lived, rotate refresh tokens, revoke after password changes, and avoid localStorage for sensitive tokens. |
| 10 | Rate limiting and abuse protection | Rate-limit login, password reset, OTP, referral, booking, payment, support, review, upload, and contractor application flows. |
| 11 | DDoS and bot protection | Put website and APIs behind a CDN/WAF layer. Keep backend validation and authorisation strong even when WAF rules exist. |
| 12 | Secure in-app messaging | Messages must be tied to a valid booking relationship. Block phone numbers, payment details, off-platform booking requests, abuse, and moderation bypasses. |
| 13 | Booking fraud controls | Require verified phone/payment status, flag suspicious cancellations and payment failures, and review high-risk Airbnb/landlord bookings with unattended access. |
| 14 | Contractor fraud and impersonation prevention | Verify phone, ID/selfie, bank account, address, references, and screening status. Review device, phone, bank, and location-pattern changes. |
| 15 | Client address and home-access protection | Treat addresses, gate codes, lockbox codes, parking, pets, and access notes as sensitive. Reveal only to assigned Zooters near booking time. |
| 16 | Secure support-case handling | Classify support severity, restrict visibility, require escalation for safety/theft/harassment/damage/legal issues, and human-approve large refunds. |
| 17 | AI agent permission controls | Give each agent least-privilege tools and data. Require human approval for payments, refunds, bans, legal-sensitive replies, public claims, production deploys, and bulk outreach. |
| 18 | Secrets and environment protection | Keep API keys in environment variables or a secrets manager. Never commit keys, prompts with keys, screenshots, frontend code, or chat messages containing secrets. |
| 19 | Secure webhooks | Verify signatures/secrets, reject replay where supported, make handlers idempotent, and avoid detailed public errors. |
| 20 | POPIA data protection | Collect only needed data, explain purpose, limit access, honour correction/deletion where appropriate, and define retention periods for sensitive records. |
| 21 | Logging, monitoring, and alerting | Log failed logins, resets, OTPs, role changes, document views, payout changes, refunds, booking anomalies, webhook failures, and support escalations. Exclude secrets and gate codes. |
| 22 | Secure deployment and CI/CD | Use protected branches, review, environment separation, rollback, lint, type checks, tests, dependency scanning, and secret scanning before production deploys. |
| 23 | Dependency and package security | Keep lockfiles fresh, pin where useful, scan dependencies, remove abandoned packages, and minimise supply-chain exposure. |
| 24 | File, image, and generated-content security | Treat generated assets as external content. Store in controlled folders and block fake reviews, fake credentials, fake stories, and unsupported guarantees. |
| 25 | Location and routing privacy | Use approximate operational zones where possible. Never expose contractor home locations or unnecessary client location history. |
| 26 | Mobile app hardening | Use secure storage, protect tokens, validate TLS, avoid sensitive logs, and prevent debug builds from reaching production. |
| 27 | Backup and disaster recovery | Encrypt backups, restrict access, test restore, and cover database, documents, configuration, and operational records. |
| 28 | Incident response plan | Define owners, shutdown steps, evidence preservation, communications, and legal/regulatory triggers for account takeover, fraud, leaked keys, fake contractors, DDoS, upload abuse, and outages. |

## High Priority Controls

| # | Control | Required Zoot outcome |
|---|---|---|
| 29 | Security headers | Set CSP, HSTS, frame-ancestors or X-Frame-Options, X-Content-Type-Options, Referrer-Policy, and secure cookie flags. |
| 30 | CSRF protection | Protect state-changing cookie-authenticated actions, including bookings, profile updates, password changes, support, payment initiation, and Care+ changes. |
| 31 | Email and domain protection | Configure SPF, DKIM, and DMARC. Use trustworthy transactional email for booking, payment, and security notices. |
| 32 | Anti-phishing and brand impersonation monitoring | Reserve domains/handles where possible and tell users payments, OTPs, and passwords are never requested outside official channels. |
| 33 | Referral and ZootCred abuse prevention | Block self-referrals, duplicate-device abuse, payment reversals, disposable email clusters, and abnormal referral spikes. Issue meaningful credits only after completed paid bookings. |
| 34 | Review and rating integrity | Prevent fake reviews, self-reviews, coerced ratings, hidden score edits, and unaudited contractor-score changes. |
| 35 | Contractor reliability engine protection | Make punctuality, cancellation, complaint, and completion records tamper-resistant and auditable. |
| 36 | Coupon and promotional controls | Validate discounts server-side, cap stacking, enforce expiry and eligibility, and prevent frontend price manipulation. |
| 37 | Secure pricing and checkout calculations | Calculate final price, add-ons, Care+ benefits, ZootCred redemption, referrals, surge/peak fees, and taxes/fees on the backend. |
| 38 | Secure cancellation and replacement logic | Enforce cancellation windows, refunds, replacement eligibility, and contractor penalties on the backend. Do not promise guaranteed replacement without backend support. |
| 39 | Secure notifications | Do not include gate codes, full addresses, ID details, payment references, or private complaint details in push, SMS, or email. |
| 40 | Secure search and analytics dashboards | Use aggregated data where possible and role-specific dashboards for executive, operations, support, marketing, finance, contractor success, and trust/safety teams. |

## Medium Priority Controls

| # | Control | Required Zoot outcome |
|---|---|---|
| 41 | Device and session management | Let users view active sessions and log out devices. Flag unusual logins, impossible travel, and rapid account changes. |
| 42 | Admin approval workflows | Require dual approval for large refunds, payout changes, account bans, screening overrides, manual ZootCred changes, and data exports. |
| 43 | Data export controls | Restrict CSV exports, log every export, mask sensitive fields, and require explicit permission for raw exports. |
| 44 | Contractor payout changes | Verify bank-account changes, add waiting periods or manual review, and notify the contractor of changes. |
| 45 | Customer property access flow | Reveal access notes only within an approved time window and track when assigned Zooters view them. |
| 46 | Bot-resistant waitlist and applications | Add CAPTCHA or invisible bot protection to high-abuse forms and deduplicate by phone, email, device, and IP. |
| 47 | Third-party integration register | Track owner, purpose, key, permissions, data shared, webhook endpoint, and rotation schedule for every integration. |
| 48 | Content moderation | Moderate bios, reviews, messages, attachments, before/after photos, and profile images for abuse, personal-data leakage, and off-platform solicitation. |
| 49 | Security testing before launch | Test access control, uploads, payment webhooks, role-based views, dependency scans, secret scans, and whether users can access another user's records. |
| 50 | Penetration testing | Commission an external review before storing real ID documents, gate codes, or meaningful payment volume at scale. Focus on auth, payments, admin, uploads, APIs, and webhooks. |

## Later Hardening

| # | Control | Required Zoot outcome |
|---|---|---|
| 51 | Responsible disclosure | Publish a clear path for researchers to safely report vulnerabilities once Zoot has public traction. |
| 52 | Security awareness training | Train staff not to click suspicious links, expose API keys, export data casually, or approve suspicious refund/payout requests. |
| 53 | Feature security checklist | Every feature answers what data is involved, who can access it, how it can be abused, what logs are needed, and what failure looks like. |
| 54 | Privacy-by-design UX | Explain why sensitive data is collected, especially contractor verification and property access notes. |
| 55 | Security status page | Add a public status page when Zoot has B2B clients, hosts, offices, or higher operational dependency. |
| 56 | Data minimisation reviews | Quarterly review old documents, support attachments, gate codes, and verification files; delete or archive what is no longer needed. |
| 57 | Tabletop incident exercises | Practise leaked API key, fake contractor, payment webhook abuse, DDoS, support data leak, and production outage scenarios. |
| 58 | Vendor risk review | Review vendor security posture, data processing role, reliability, pricing, and export options as Zoot grows. |
| 59 | Legal review of claims | Avoid claims like fully insured, guaranteed safe, guaranteed replacement, or named screening providers unless accurate and approved. |
| 60 | Brand trust monitoring | Monitor reviews, social media, support complaints, impersonation, payment scams, fake Zooters, and suspicious off-platform messages. |
