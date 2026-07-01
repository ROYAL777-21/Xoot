# Manual Configuration Checklist

Reviewed: 2026-07-01 05:35 SAST

These items require provider dashboards, rotated credentials loaded outside chat, hardware, or founder/legal approval.

- Supabase Auth redirect allowlists for local, staging, production, OAuth, and Expo deep links.
- Supabase migration metadata repair with a rotated local token and approved DB URLs.
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
- CodeRabbit CLI/GitHub App authentication if command-line review is required.

