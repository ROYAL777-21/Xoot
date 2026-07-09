# Secret Handling And Rotation Runbook

Reviewed: 2026-07-02

## Rules

- Never commit private secrets, service-role keys, database passwords, provider tokens, signing keys, or private API keys.
- Never place private secrets in `VITE_` or `EXPO_PUBLIC_` variables.
- Never paste live secrets into chat, PR comments, screenshots, logs, or support tickets.
- Treat any secret already pasted into chat as compromised until rotated.
- Use public env vars only for public-safe identifiers and publishable keys.

## Approved Storage

| Secret type | Store |
| --- | --- |
| Supabase service role and Edge secrets | Supabase Edge Function secrets or approved password manager |
| Supabase CLI token and DB password | Local ops shell/password manager only |
| EAS signing/download secrets | EAS secret store |
| GitHub public-safe variables | GitHub repository/environment variables |
| GitHub private deploy secrets | GitHub protected environment secrets |
| Provider API keys | Provider dashboard, Supabase Edge secrets, or server secret store |

## Rotation Flow

1. Identify exposed value, provider, environment, blast radius, and last known use.
2. Disable or revoke the old value in the provider dashboard.
3. Generate a new scoped value with least privilege.
4. Store it in the approved secret store only.
5. Redeploy or restart affected services.
6. Run the relevant smoke test.
7. Update `blocker.md` or the provider risk register without printing the value.

## Emergency Rotation Triggers

- Secret appears in git history, chat, screenshot, CI log, public env file, public app bundle, or support ticket.
- Provider reports suspicious use.
- Staff device or account compromise.
- Contractor/client data exposure involving privileged token use.
