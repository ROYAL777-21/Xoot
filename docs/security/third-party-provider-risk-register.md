# Third-Party Provider Risk Register

Reviewed: 2026-07-02

| Provider | Purpose | Primary risk | Current status | Required mitigation |
| --- | --- | --- | --- | --- |
| Supabase | Database, Auth, Storage, Edge Functions | RLS drift, Auth redirect mistakes, secret exposure | Active; migration metadata blocker remains | Read-only MCP for inspection; CLI live writes only with local credentials |
| Expo/EAS | Native builds and credentials | Signing/key leakage, stale builds | Preview builds exist; iOS internal credentials missing | EAS secret stores, real-device smokes |
| GitHub | Source, PRs, CI | Leaked vars, failed workflows, branch protection gaps | CLI authenticated; current checks green | Protected branches, cache/retry installs, secret scan |
| CodeRabbit | Code review | Overbroad code exposure, slow local reviews | GitHub App green; CLI authenticated | Use PR app for large reviews; keep tokens secret |
| Cloudflare | DNS, WAF, Turnstile | Missing zone, token misuse, overblocking SEO | Blocked pending domain/zone | Least-privilege token, staged WAF rules |
| Mapbox | Maps, routing, native SDK downloads | Public use of secret token | Restricted tokens missing | Separate browser/native/download/server tokens |
| Stitch/Ozow | Payments | Fake success, forged callbacks | Disabled pending setup | Signed callbacks, idempotency, finance approval |
| Twilio | Verify, SMS, WhatsApp, voice | Spam, trial limits, forged webhooks | Disabled pending production setup | Transactional classification, sender approvals, signed smokes |
| Brevo | Transactional email | Sender spoofing, delivery failure, template mistakes | Setup pending | SPF/DKIM/DMARC, outbox retries |
| KIE | Generated media/content | Unsafe output, fake proof | Disabled/pending | Human review, private storage, no fake claims |
| OpenAI | Concierge fallback | Hallucinations, prompt injection, data leakage | Optional Edge-only fallback | Redaction, no tools, escalation |
| PostHog | Analytics | PII/session replay leakage | Public vars supported | Event allowlist and data minimisation |
| Sentry | Error monitoring | Sensitive logs | Scrubber exists | Verify DSN/env and scrubbing in production |
| Airtable | Ops/editorial workflows | Data export and token leakage | Optional/pending | Server-side token only, review before sync |
| Hostinger/Netlify | Hosting | Misconfigured headers, env drift | Verification pending | Readback headers/env and fallback routing |
| WordPress | SEO editorial CMS | Plugin risk, draft leaks, fake content | Not provisioned | Draft-first, hardened roles, read-only public API |

## Review Cadence

- Before enabling any disabled provider path.
- After credential rotation.
- After any new webhook endpoint or public token is added.
- Quarterly after launch.
