# Xoot Staging And Production Checklist

Reviewed: 2026-06-08

Use this checklist before merging, deploying, submitting mobile builds, or enabling live payments/comms. Do not mark production ready while any required item is unknown.

## Branch And CI

- [ ] Branch is up to date with `main` or merge conflicts are resolved.
- [ ] GitHub Actions `Web preview build` passes.
- [ ] `npm run config:check` passes.
- [ ] `npm run lint` passes.
- [ ] `npm run test` passes.
- [ ] `npm run build` passes.
- [ ] `npm run security:scan` passes.
- [ ] Security scan confirms no frontend `admin_review_queue` or `integration_outbox` mutations.
- [ ] Root `package-lock.json` is included when `package.json` changes.
- [ ] `mobile/package-lock.json` is included with the `/mobile` Expo app when mobile dependencies change.
- [ ] No live credentials are present in commits, docs, screenshots, logs, or PR text.
- [ ] CodeRabbit or another review pass is complete if required by the PR process.

## Public Environment Guard

- [ ] `VITE_APP_ENV=staging` in staging builds.
- [ ] `VITE_APP_ENV=production` in production builds.
- [ ] `VITE_ENABLE_DEMO_MODE` is false or unset in staging and production.
- [ ] `VITE_SUPABASE_URL` points to the correct environment project.
- [ ] `VITE_SUPABASE_PUBLISHABLE_KEY` points to the correct environment project.
- [ ] No secret-like values appear in `VITE_` variables.
- [ ] Production build does not use preview Supabase URLs or preview anon keys.

## Supabase

- [ ] Separate staging and production projects exist.
- [ ] Staging schema migrations are deployed using `docs/STAGING_BACKEND_DEPLOYMENT.md`.
- [ ] Staging Edge Functions are deployed after schema and secrets exist.
- [ ] Supabase Auth Site URL is set per environment.
- [ ] Supabase Redirect URLs include `/auth/callback` and `/auth/reset` per environment.
- [ ] Email confirmation is enabled for production.
- [ ] Email OTP settings use provider-generated randomized OTPs.
- [ ] Leaked-password protection is enabled where available.
- [ ] RLS is enabled on all public tables.
- [ ] Storage buckets exist with correct RLS/storage policies.
- [ ] Edge Function secrets are configured per environment.
- [ ] Supabase advisors and policy smoke tests are reviewed before launch.
- [x] Helper-function hardening migration `20260621000000_helper_function_hardening.sql` is applied to staging; `has_role`, `lookup_referral_code`, and `can_access_sensitive_data` no longer produce staging security lints.

## Auth And Account Security

- [ ] Email/password sign-up works in staging.
- [ ] Email OTP sign-in works with randomized provider-generated codes.
- [ ] Password reset works from staging and production domains.
- [ ] Google OAuth works if enabled.
- [ ] Apple OAuth works if enabled.
- [ ] Admin routes require admin role.
- [ ] Xooter routes require Xooter/admin role as appropriate.
- [ ] Generic auth errors do not reveal whether an email exists.
- [ ] No OTP, password, card PIN, bank login, gate code, lockbox code, or private key is requested in support chat.

## Payments

- [ ] Stitch sandbox credentials configured in staging only.
- [ ] Stitch production credentials configured in production only.
- [ ] Ozow sandbox credentials configured in staging only.
- [ ] Ozow production credentials configured in production only.
- [ ] Payment create endpoints use backend-calculated quotes.
- [ ] Provider webhooks verify signatures/secrets/hashes where supported.
- [ ] Provider events are idempotent.
- [ ] Provider reference maps to one internal payment record.
- [ ] Paid amount and currency match backend invoice.
- [ ] Frontend success/cancel/error URLs do not mutate booking state.
- [ ] Care+ activates only after verified payment.
- [ ] XootCred is awarded only after completed paid booking rules pass.

## Twilio

- [ ] Production uses API keys for outbound API calls where possible.
- [ ] Auth Token is stored only where request signature validation needs it.
- [ ] Verify Service SID exists if Twilio OTP is enabled.
- [ ] Voice/TwiML app exists if masked calling is enabled.
- [x] Migration `20260621001000_twilio_webhook_events.sql` is deployed in staging and production.
- [x] `twilio-message-webhook`, `twilio-whatsapp-webhook`, `twilio-voice-webhook`, `twilio-status-callback`, and `twilio-verify-webhook` are deployed in staging and production.
- [x] `TWILIO_WEBHOOK_BASE_URL` and `TWILIO_WEBHOOK_HASH_SALT` are set per environment.
- [x] Voice webhook validates Twilio signatures.
- [x] Status callback validates Twilio signatures.
- [x] Message and WhatsApp webhooks validate Twilio signatures.
- [x] Twilio webhook events store only redacted metadata, salted phone hashes, and last-four references.
- [ ] Geo-permissions restrict SMS/voice to served countries.
- [ ] Masked calling never exposes real user or Xooter phone numbers in frontend payloads.
- [ ] Any Twilio credentials pasted into chat, issues, logs, or screenshots have been rotated before production launch.

## Brevo

- [ ] Sender email and domain are verified.
- [ ] DNS records are configured and checked.
- [ ] Transactional templates are approved and tested in staging.
- [ ] Marketing list IDs are separate for staging and production.
- [ ] Brevo webhooks validate a webhook key or signature where supported.
- [ ] Unsubscribe and consent flows are documented.

## OpenAI Support Bot

- [ ] `OPENAI_API_KEY` is stored only as an Edge Function secret.
- [ ] `OPENAI_SUPPORT_MODEL` is set per environment.
- [ ] Support prompt forbids refunds, payment/admin actions, passwords, OTPs, and access codes.
- [ ] Human escalation rules cover refund, payment, damage, unsafe, cancellation, replacement, access-code, and bug cases.
- [ ] Rate limits exist before large-scale support traffic.
- [ ] Logs do not store sensitive support content unnecessarily.

## KIE And Content

- [ ] `KIE_API_KEY` is server-side only.
- [ ] Prompt and output storage paths are private by default.
- [ ] Generated content is reviewed by a human before publishing.
- [ ] No fake reviews, fake testimonials, fake scarcity, or competitor attack content is published.
- [ ] SEO pages and blog posts use accurate service-area claims.

## Monitoring

- [ ] Frontend monitoring is configured or explicitly deferred.
- [ ] `VITE_SENTRY_DSN` is environment-specific if Sentry is enabled.
- [ ] `SENTRY_AUTH_TOKEN` is CI-only if source maps are uploaded.
- [ ] `VITE_POSTHOG_PROJECT_TOKEN` and `VITE_POSTHOG_HOST` are set per environment only if privacy-approved analytics is enabled.
- [ ] `EXPO_PUBLIC_POSTHOG_PROJECT_TOKEN` and `EXPO_PUBLIC_POSTHOG_HOST` are set per EAS environment only if mobile analytics is enabled.
- [ ] No PostHog private `phx_` API key appears in `VITE_`, `EXPO_PUBLIC_`, committed files, screenshots, logs, or PR text.
- [ ] PostHog autocapture and session replay remain disabled until privacy/legal approval explicitly allows them.
- [ ] PostHog events match the approved low-risk analytics event contract and do not include names, phone numbers, addresses, access notes, payments, support message bodies, or free-form text.
- [ ] Release version is set from Git SHA or app version.
- [ ] Edge Functions log request IDs and safe error categories.
- [ ] Production incident owner and alerting path are documented.

## Mobile Release

- [ ] Final iOS Bundle ID is confirmed.
- [ ] Final Android application ID is confirmed.
- [ ] `mobile/app.config.ts` iOS bundle ID and Android package match final store IDs.
- [ ] Apple Team ID and signing profiles are configured.
- [ ] Android signing key or Play App Signing is configured.
- [ ] AASA is generated and deployed with correct Team ID/bundle ID.
- [ ] `assetlinks.json` is generated and deployed with release SHA-256 fingerprint.
- [ ] Push Notifications capability is enabled if native push is shipped.
- [ ] App Store privacy labels match actual data collection.
- [ ] Play Store Data Safety matches actual data collection.
- [ ] App Store and Play disclosures include PostHog analytics if enabled in mobile builds.
- [ ] Dynamic Island/Live Activity payloads do not expose sensitive home access data.
- [ ] Native Mapbox builds use EAS/dev-client builds, not Expo Go, and private Mapbox downloads token is stored only in EAS/CI secrets.
- [ ] Siri/App Intents and Android shortcuts open safe routes only and never expose addresses, access notes, payment details, or support incident content.

## Hostinger / Production Hosting

- [ ] Production env variables are configured in the build/deploy system.
- [ ] Static build output uploads `dist` exactly.
- [ ] SPA fallback works for `/app/*`, `/auth/*`, `/blog/*`, and legal routes.
- [ ] Security headers from `_headers` or `.htaccess` are active.
- [ ] `.well-known` files are served with JSON content type.
- [ ] Canonical domain redirects are correct.
- [ ] HTTPS is forced.

## SEO Launch Checklist

- [ ] Launch blog post is published.
- [ ] Local service-area post is published.
- [ ] Sitemap includes current static routes and blog routes.
- [ ] Robots file points to sitemap.
- [ ] Google Business Profile is prepared for launch areas.
- [ ] Search Console is connected after domain verification.
- [ ] Daily/weekly blog cadence is assigned to an owner.
- [ ] Semrush keyword validation is run once plan access is available.

## Questions To Confirm Before Production

Do not paste secret values. Confirm only the non-secret decisions:

- What are the exact staging and production domains?
- What final iOS Bundle ID and Android application ID should be used?
- Which launch areas are live on day one: Sandton, Bryanston, Rosebank, Midrand, Fourways, or another set?
- Will Stitch, Ozow, or both be live at launch?
- Will OTP remain email-only through Supabase Auth, or will Twilio Verify SMS/WhatsApp OTP be added?
- Which monitoring provider is final: Sentry or another tool?
- Which hosting path is final for production: Hostinger only, or Hostinger plus a preview provider?
