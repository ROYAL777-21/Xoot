# Website hardening review — 2026-10-04

## Scope

React/Vite public website and authenticated browser app, including authentication callbacks, fare-split sharing, uploads, service worker, static hosting headers, public environment configuration, and browser-to-Supabase calls.

This is a defensive engineering review, **not a substitute for an external penetration test** and not proof that the live deployment has adopted the current commit.

## Threat model

| Threat | Browser-side control | Server/live control still required |
|---|---|---|
| XSS through user content | Unsafe DOM API scan; React escaping; sanitized plain-text helpers | Review every rich-text renderer and keep CSP active in production |
| Clickjacking | `frame-src 'none'`, `frame-ancestors 'none'`, `X-Frame-Options: DENY` | Verify headers on the real domain |
| Open redirects | Auth redirect allowlist rejects external origins, backslashes, sensitive query keys, and `/auth` paths | Verify Supabase Auth redirect allowlist contains only approved domains |
| Malicious fare-split link | Invite origin limited to HTTP(S); credentials, query, fragment, control characters, and unsafe schemes rejected | Validate invite token, recipient identity, expiry, and booking privacy in Edge Functions |
| Mail header injection | Recipient syntax and control characters rejected before `mailto:` construction | Server-side email validation remains authoritative |
| Upload abuse | KYC, completion-photo, and avatar MIME/size checks; safe filenames; unique non-overwriting keys | Enforce bucket MIME/size/path policies; scan or quarantine uploaded files where available |
| Private response caching | Service worker caches only allowlisted static assets and now only successful responses; app navigations are network-first | Verify CDN does not cache `/app`, `/auth`, `/admin`, or private API responses |
| Secret exposure | Secret scan, public-env assertions, no frontend service-role writes | Rotate any previously exposed secrets and verify CI logs/artifacts |
| Client-side privilege escalation | Frontend admin/payment write scan; authz and server-authority regression tests | Run live Supabase ACL/RLS/advisor checks in staging and production |
| Dependency exploit | Lockfile refreshed for DOMPurify and React Router 6.30.6 | Resolve remaining advisories through an explicit React Router major-version migration or accepted risk |

## Implemented in this pass

- Added `frame-src 'none'` to both static hosting policies.
- Hardened invite-origin and mail-recipient construction.
- Added shared avatar upload validation: approved image MIME types and a 3 MB limit.
- Added validation to booking completion-photo uploads: approved image MIME types and a 6 MB limit.
- Normalized uploaded object names and switched the two flows to unique, non-overwriting keys.
- Prevented the service worker from caching failed static responses.
- Refreshed `dompurify` to `3.4.16` and `react-router-dom` to `6.30.6` in `package.json` and `package-lock.json`.
- Added regression coverage for unsafe invite origins, malformed mail recipients, and avatar size limits.

## Verification run

- Website TypeScript check: passed.
- Production Vite build: passed.
- Existing static security scan: passed.
- Targeted security tests: passed.
- Upload, URL, safe-fetch, and security helper tests: passed.

## Residual dependency risk

The npm audit still reports transitive or major-version issues:

- React Router advisory remains on the 6.x line; `npm audit fix --force` proposes React Router 7, which is a breaking change.
- Browserslist and `baseline-browser-mapping` advisories are primarily build/tooling exposure but still need a lockfile refresh.
- `fflate` and nested `brace-expansion` advisories remain in transitive dependency paths.

The correct next step is a dedicated dependency migration branch with a clean `npm ci`, full type/build/test verification, and an explicit React Router 7 compatibility review. Do not force that major upgrade in the production branch without that pass.

## Live verification required

From a founder-controlled environment with provider credentials:

1. Deploy the current `main` commit.
2. Confirm `https://xoot.co.za` serves the current build stamp.
3. Run `curl -I https://xoot.co.za/` and confirm CSP, HSTS, `X-Content-Type-Options`, `X-Frame-Options`, Referrer-Policy, and Permissions-Policy.
4. Confirm `/app`, `/auth`, `/admin`, and `/xooter/*` responses are `private, no-store` and `noindex`.
5. Run Supabase live authorization and advisor checks.
6. Verify storage bucket policies reject public reads for KYC, invoices, access data, and completion evidence.
7. Test uploads with an executable renamed to `.png`, an oversized file, a path-traversal filename, and a valid image.
8. Test auth with external `next`, backslash, `javascript:`, and token-bearing redirect values.
9. Test service-worker upgrade from the previous cache version and confirm no private route is present in Cache Storage.
10. Run an external penetration test before storing meaningful live identity, access-code, or payment volume.

## Stop conditions

Do not claim the website is penetration-tested or fully production-secure if any of these remain true:

- Production headers are absent or differ from source configuration.
- Supabase live ACL/RLS checks have not been run after the latest migrations.
- A private storage bucket is publicly readable.
- The production domain still serves an older build.
- The production auth redirect allowlist includes wildcard or unowned origins.
- Payment, payout, admin, or sensitive-access state can be changed directly by a browser client.
- The remaining dependency advisories have not been migrated or explicitly risk-accepted.
