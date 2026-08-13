# Manual Configuration Checklist

> ⚠️ **Superseded for anything current — see [`founder-todo.md`](./founder-todo.md).** This file was
> last reviewed 2026-07-01 and several rows have since been done. Kept for the history.

Reviewed: 2026-07-01 17:53 SAST

These items require provider dashboards, rotated credentials loaded outside chat, hardware, or founder/legal approval.

- Supabase Auth redirect allowlists for local, staging, production, OAuth, and Expo deep links.
- Supabase migration metadata repair with a rotated local token plus either approved DB URLs or the guarded password-prompt mode in `npm run ops:supabase:repair-migrations -- -Environment <env> -PromptDatabasePassword`.
- Supabase leaked-password protection decision or explicit launch risk acceptance.
- Android real-device install and smoke test with `adb` or EAS install link.
- EAS iOS internal-distribution credentials for physical-device preview builds.
- App Store Connect app record, Apple Team ID, APNs, Sign in with Apple, privacy nutrition labels, and reviewer account.
- Google Play app record, signing fingerprints, Data Safety, internal testing, and service account.
- Production domain registration and DNS.
- Cloudflare zone, WAF, rate limits, Turnstile, TLS, and DNS.
- Restricted Mapbox browser/native/download tokens.
- Twilio production number, WhatsApp sender, regulatory approvals, transactional Messaging Service, and webhooks.
- Payment provider credentials and callback smoke tests.
- CodeRabbit GitHub App only if inline PR review is required beyond the authenticated local CLI review path.
