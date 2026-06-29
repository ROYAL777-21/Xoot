# Zoot Admin Access

Reviewed: 2026-06-29

Zoot does not have universal admin sign-in credentials in the website, app, repository, or env templates. Admin access is role-based:

1. A person signs in through the normal Supabase Auth flow.
2. The account must have an `admin` role in `public.user_roles`.
3. Protected admin routes such as `/admin/ops` and `/admin/kyc` check that role before rendering.
4. Sensitive admin actions must go through audited Edge Functions and require a reason where the action is sensitive.

Do not create or share a single company-wide admin password. Do not paste admin passwords into chat. Do not commit admin credentials.

## Staging Admin Smoke Account

Staging smoke accounts are created only from local environment variables. They are intended for role-bound smoke tests, not for real operations.

Set these values in a local shell, password manager injection, or CI secret context:

```powershell
$env:ZOOT_ALLOW_STAGING_SMOKE = "true"
$env:ZOOT_STAGING_SUPABASE_URL = "https://fxmxyabdjqviqbcxmvlp.supabase.co"
$env:ZOOT_STAGING_SUPABASE_PUBLISHABLE_KEY = "<staging publishable key>"
$env:ZOOT_STAGING_SERVICE_ROLE_KEY = "<staging service-role key>"

$env:ZOOT_SMOKE_ADMIN_EMAIL = "admin-smoke@<staging-test-domain>"
$env:ZOOT_SMOKE_ADMIN_PASSWORD = "<strong staging-only password>"
```

Then run the full staging smoke setup/test:

```powershell
npm run ops:smoke:staging -- --all
```

The script refuses to run unless the URL host is the known staging project and `ZOOT_ALLOW_STAGING_SMOKE=true`.

## Production Admin Account

Production admin access must be created through a secure ops process:

1. Create a named human Supabase Auth user for each admin.
2. Confirm email/identity in Supabase Auth.
3. Assign `admin` in `public.user_roles` using an audited admin function or a secure service-role ops shell.
4. Enable MFA for the admin account before using production admin tools.
5. Record the action in the admin audit trail.

The production admin password is not stored in this repo and should not be known by Codex. If an initial founder admin needs to be created, use a local secure shell or dashboard session with secrets supplied from the password manager, not chat.

