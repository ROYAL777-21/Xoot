# Founder website, authentication and brand refinements

## Scope and delivery boundary

Prepared on `feature/founder-website-refinements-20261022` from approved website release `805c02d`. The founder requested first-visit sign-up, working sign-in/out, temporary Concierge removal, the supplied Journal/Trust design, consistent Xoot/Care+ marks, administrator access and Laundry & Ironing. This change prepares the website/authentication work. It does not turn on private GPS, service-zone fulfilment, payments, calling or standalone Laundry & Ironing.

The website defaults `/auth` to the existing sign-up copy. Both guest navbar Sign in links now use that default, so first-time visitors reach account creation. Returning users can select email code/password sign-in, and a successful sign-out still opens the returning-user form. Navbar Sign in hover and keyboard focus use the handoff's purple action token. Sign-out uses the real Supabase local session and reports failures; account changes clear private query caches. Role checks bind their results to both the account and session. Every admin route checks verified AAL2 before mounting. The MFA page supports genuine Supabase TOTP enrolment and verification, with no automatic enrolment, private QR capture or credential storage.

The prepared `20261022153000_admin_roles_require_aal2.sql` independently requires AAL2 in the existing database role predicate. It refuses an unknown predecessor and preserves non-admin semantics, owner and grants. Its exact SQL, PostgreSQL fixture and CI step are preserved at `9b23875` / `feature/admin-aal2-prepared-20261023` for a separate backend PR, and removed from the website release. **It is not deployed, and no founder admin role has been granted.** A browser guard alone is insufficient administrator protection. Deliver the isolated migration in reviewed order, and audit the separate elevated Edge admin checks, before provisioning the selected founder and accepting real MFA access.

Concierge's root provider, floating bot and website entry points are removed. Human support remains. The dormant implementation and legal history are retained for later refinement. The Journal homepage, article index and reader use the supplied card/reader hierarchy with the existing 29 articles, canonical `/articles` links and retained SEO/content. The Trust section follows the source layout and labels its access window as an illustration; calling and SOS remain unaccepted/off. Other homepage sections are preserved.

Xoot uses the handoff's Caveat 600 letterforms. Care+ uses the shared heart/plus geometry on web and in native source. Website SVG/PNG/ICO/PWA icons replace the legacy Z; the old icon URL remains compatible. Native launcher assets and signing are unchanged. Native source parity is not proof of an installed binary.

## Actual hosted changes and provider evidence

- The production Mapbox reference map genuinely rendered at `/book` in Codex with roads, suburbs, controls and attribution, and no logged warnings/errors. Evidence: `mapbox-production-live-reference.jpg`. One map view, no entered address, paid Geocoding or submitted booking. This is basemap/origin evidence, not private GPS, Directions or coverage acceptance.
- In production Supabase `mvlrkelahhsyjrwgsxaf`, the Magic link or OTP email now uses `supabase/templates/magic-link.html` and subject **Your Xoot sign-in code**. A dashboard reload verified persistence. The previous default link did not match the six-digit-code UI. No actual user OTP or login link was read or stored. Fresh delivered-code/sign-in acceptance is still required.
- Brevo Free was verified in its Account usage screen: **300 daily emails available**, no trial, upgrade or purchase. Removing its provider footer is paid and was not selected.
- `xoot.co.za` had only five existing Vercel-managed DNS records. Four additive Brevo ownership/DKIM/initial DMARC records were saved; all five existing CAA/ALIAS records remain intact. Authoritative DNS readback and the provider confirmed matching values. Brevo then reported **Your domain has been authenticated**.
- Sender **Xoot <no-reply@xoot.co.za>** is verified in Brevo, with DKIM domain and configured DMARC. This creates an outbound sender, not an inbound mailbox. Supabase's custom SMTP draft uses the actual provider login, host `smtp-relay.brevo.com`, port `587`, and sender Xoot. No incomplete SMTP form was saved.
- The founder generated and privately entered a dedicated standard 64-character SMTP key, then saved production Supabase SMTP. A dashboard reload confirms enabled status and sender/host; the protected password is not returned or read. The founder explicitly approved SMTP key authentication without an IP allowlist; only SMTP IP checking was disabled, and API IP checking remains active. No purchase occurred. Delivery is not yet accepted.
- The founder reported another OTP failure. Live Email-provider inspection found `MAILER_OTP_LENGTH=8`; the old client removed the last two digits. Source now preserves all digits and validates the documented 6–10 range, with a behavioral test asserting that an eight-digit token reaches `verifyOtp` unchanged. The template now says complete code and fits longer codes. The provider's stronger eight-digit setting is unchanged.

Screenshots are kept in the task's `outputs` directory; they contain no SMTP key, password, user OTP or private authenticator QR.

## Verification at preparation

- Web/native TypeScript and scoped lint passed. A production-environment build passed, including design negative controls and SEO validation for 29 articles. Final CI must run on the exact committed revision.
- Meaningful auth/context/role/MFA tests passed before final session-binding refinement. Negative controls detected removed cache clearing, incorrect default auth mode, former-account role rendering and missing AAL2 verification. The latest focused tests and exact-head CI are recorded separately after completion.
- A real disposable PostgreSQL 17.6 fixture passed nine migration checks: old-predicate negative control, AAL1/missing-assurance denial, AAL2 membership, customer denial, non-admin preservation, preserved owner/ACL, safe repeated application and refusal of an unknown body. The fixture was removed after use. This is not a genuine-user JWT test.
- The full local suite reported 1,611 passed, four failed and seven skipped tests. Failures were timeouts in existing booking/support tests; a follow-up reproduced further five-second timing failures while the Windows host had about 74 MB free memory. No test deadline or assertion was weakened. This local run is **not** a clean full-suite pass; use mandatory CI on an adequately provisioned runner and investigate any reproduced functional failure.
- Actual browser checks at 1280 and 390 pixels show the article index/reader and Trust section without horizontal overflow; the desktop reader is 720 pixels wide. The existing first-visit sign-up copy is visible. Latest screenshots were visually compared with the supplied handoff and generated icons inspected.

## Remaining acceptance and follow-on work

SMTP credential entry, saved configuration and the approved SMTP network choice are complete. On 23 October, after the founder privately created and entered the Google credential, production's provider list reports **Google Enabled**. A provider badge is configuration evidence; real email-code and Google account acceptance remain separate. The selected founder still needs genuine authenticator enrolment and audited role provisioning after database protection is delivered. Do not disclose or invent an administrator password. Native account source still expects an email-link flow; its complete-code UI/PKCE handoff and a signed-device acceptance remain follow-up work before any native release.

Personalisation is planning only. The founder selected their home and a clear first-booking step as the initial signed-in experience. No dashboard, additional customer-data collection or recommendation logic is implemented by this change.

## 23 October release review

The main website/design/security and PostgreSQL CI passed at `9b23875`. An independent auth/MFA/session review covered 19 changed source files; the parent reviewed the remaining 27 compact-inventory items and 14 documentation/artwork/renderer files. Codex Security scan `77ca4650-11e3-472c-bb42-501bc799d2a1` completed its exact `805c02d` → `9b23875` static review with no introduced exploitable candidates. The external Claude review still failed for exhausted provider credits and is not a clean review; CodeRabbit skipped this base branch. No credit purchase or gate disabling occurred.

Review found two functional compatibility issues. The email template now keeps the full website code and a secondary documented `ConfirmationURL` link for native consumers; production save/reload/preview confirmed both placeholders. Password-reset completion and its return action now explicitly open password sign-in. These and the later purple navbar/signup correction receive targeted review and final-head CI; they are outside the immutable scan range.

The live-schema check exposes pre-existing missing referral/gift/checklist schema and generator differences. No type file was rewritten to hide that mismatch and no migration was applied. Moving the unused admin DDL/fixture/CI step to its backend review keeps this frontend release from implying database convergence. Private GPS/ETA, address validation, actual availability, standalone laundry, annual gift fulfilment and financial/voice activation remain unfinished and disabled where gated.

Standalone Laundry & Ironing remains separate unfinished work. The founder directs use of repository information. Master brief section 4.8 is canonical; its degraded independent-selector inference must not be treated as an arbitrary combination formula. Implement only explicit bundles with the existing long-job floor, full client/Edge/SQL/writer parity and staging acceptance before advertising active fulfilment. Existing R30 add-ons remain available.

PRs #71 and #81 remain unmerged. Real authorised customer/Xooter JWT isolation, MFA dispatch, physical signed-device builds, privacy/licensing review, separately verified worker availability and exact production migration reconciliation are still open. A licensed Gauteng boundary is not evidence of an available worker. No production tracking switch, payment/voice flag, native paid build, `main` or unrelated PR was changed.

## Reproducing website icons

Use an isolated tools directory containing `fontkit@2.0.4` and `@resvg/resvg-js@2.6.2`, set `XOOT_WEB_BRAND_TOOLING_DIR` to it, then run `node scripts/build/render-website-brand.mjs`. No dependency was added to the application lockfiles. Source font SHA-256: `0bdb6b660482d31531b3945849fba5916b3ef8695da7024a9e6b9ee3c4157988`.

Official setup references: [Supabase email templates](https://supabase.com/docs/guides/auth/auth-email-templates), [Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [Brevo Supabase integration](https://developers.brevo.com/docs/supabase-smtp-integration), [Brevo IP security](https://help.brevo.com/hc/en-us/articles/5740111683858-Authorize-and-block-IP-addresses-for-API-and-SMTP-security).
