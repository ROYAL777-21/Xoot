# Zoot Staging And Production Checklist

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
- [ ] Supabase Auth Site URL is set per environment.
- [ ] Supabase Redirect URLs include `/auth/callback` and `/auth/reset` per environment.
- [ ] Email confirmation is enabled for production.
- [ ] Email OTP settings use provider-generated randomized OTPs.
- [ ] Leaked-password protection is enabled where available.
- [ ] RLS is enabled on all public tables.
- [ ] Storage buckets exist with correct RLS/storage policies.
- [ ] Edge Function secrets are configured per environment.
- [ ] Supabase advisors and policy smoke tests are reviewed before launch.

## Auth And Account Security

- [ ] Email/password sign-up works in staging.
- [ ] Email OTP sign-in works with randomized provider-generated codes.
- [ ] Password reset works from staging and production domains.
- [ ] Google OAuth works if enabled.
- [ ] Apple OAuth works if enabled.
- [ ] Admin routes require admin role.
- [ ] Zooter routes require Zooter/admin role as appropriate.
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
- [ ] ZootCred is awarded only after completed paid booking rules pass.

## Twilio

- [ ] Production uses API keys for outbound API calls where possible.
- [ ] Auth Token is stored only where request signature validation needs it.
- [ ] Verify Service SID exists if Twilio OTP is enabled.
- [ ] Voice/TwiML app exists if masked calling is enabled.
- [ ] Voice webhook validates Twilio signatures.
- [ ] Status callback validates Twilio signatures.
- [ ] Message webhook validates Twilio signatures if used.
- [ ] Geo-permissions restrict SMS/voice to served countries.
- [ ] Masked calling never exposes real user or Zooter phone numbers in frontend payloads.

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
- [ ] Release version is set from Git SHA or app version.
- [ ] Edge Functions log request IDs and safe error categories.
- [ ] Production incident owner and alerting path are documented.

## Mobile Release

- [ ] Final iOS Bundle ID is confirmed.
- [ ] Final Android application ID is confirmed.
- [ ] `capacitor.config.ts` appId matches final IDs.
- [ ] Apple Team ID and signing profiles are configured.
- [ ] Android signing key or Play App Signing is configured.
- [ ] AASA is generated and deployed with correct Team ID/bundle ID.
- [ ] `assetlinks.json` is generated and deployed with release SHA-256 fingerprint.
- [ ] Push Notifications capability is enabled if native push is shipped.
- [ ] App Store privacy labels match actual data collection.
- [ ] Play Store Data Safety matches actual data collection.
- [ ] Dynamic Island/Live Activity payloads do not expose sensitive home access data.

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
