# Connected-Service Delivery — 2026-10-08

## Completed in this session

### Vercel / website

- Created a production deployment for project `xoot` from GitHub `main`.
- Commit deployed: `5400b89a4aa5ea93b882baa2b7d5f0b2fee955dd` (`Refresh production handoff status`).
- Deployment: `dpl_EY7CZmpLP4dUqgriJFHgeC9W91KM`.
- Deployment state: `READY`.
- Production alias verified: `xoot.co.za`.
- The previous blocked main deployment was superseded by the new READY deployment.
- The deployment retains the hardened Vercel security headers from `vercel.json`.

### Supabase production

Project: `mvlrkelahhsyjrwgsxaf` (`Zoot`, eu-west-1).

Applied migration: `live_security_advisor_safety_pin_hardening`.

Controls applied:

- `public.user_safety_pins` remains RLS-enabled.
- Added an owner-scoped authenticated read policy (`user_id = auth.uid()`).
- Revoked direct `anon` and `authenticated` execution of `public.set_safety_pin(text)`.
- Granted that setter only to `service_role`.

Verification:

- Supabase advisor no longer reports `rls_enabled_no_policy`.
- Supabase advisor no longer reports authenticated execution of the security-definer function.
- Metadata query confirmed `user_safety_pins` has RLS enabled and one policy.

### Twilio / backend state

- Production Supabase currently reports the Twilio Edge Function family as active, including:
  `twilio-token`, `twilio-conversation`, `twilio-voice-status`, `twilio-voice-twiml`,
  `twilio-message-webhook`, `twilio-whatsapp-webhook`, `twilio-status-callback`,
  `twilio-voice-webhook`, `twilio-verify-webhook`, and `twilio-selftest`.
- Webhook functions are configured with gateway JWT verification disabled where Twilio calls them directly; authenticated application functions remain JWT-protected.
- The hardened Twilio request-signature, idempotency, redaction, and review-queue logic is present in the repository and the production function inventory is active.

## Remaining blockers that cannot be completed by the currently exposed connectors

1. **Supabase Auth leaked-password protection**
   - The Supabase security advisor reports this as the only remaining security warning.
   - Enable the Have I Been Pwned password check in Supabase Dashboard → Authentication → Password Security.
   - This is a project Auth setting; the connected Supabase MCP exposes database and function operations but not this Auth toggle.

2. **GitHub Actions production migration workflow**
   - The repository workflow still needs the GitHub Actions secret `SUPABASE_DB_PASSWORD_PRODUCTION`.
   - The live production migration ledger is historically divergent, so a broad `db push` must not be run until the documented reconciliation plan is followed.
   - The connected Supabase MCP does not expose the project’s Postgres password, and the password must never be copied into chat or source control.

3. **Twilio account-console verification**
   - Twilio is available here as documentation/search tooling, not as an authenticated Twilio account-management connector.
   - The remaining proof is to run the existing admin-only `twilio-selftest` endpoint with the configured service key and confirm the TwiML App URLs, API key, Conversations service, and webhook URLs.
   - Do not enable masked voice or outbound messaging until the self-test is green and a two-party real-device smoke test succeeds.

4. **GoDaddy Website Builder / DNS**
   - The GoDaddy connector exposed domain search only; it did not expose Website Builder unpublish or DNS mutation tools.
   - Vercel already reports `xoot.co.za` verified and aliased to the READY production deployment, so no additional DNS cutover was required for this release.
   - If an old GoDaddy Website Builder site is still active at another hostname, unpublish it manually in GoDaddy without deleting the domain or DNS records.

## Current production status

- **Website:** live on Vercel at `https://xoot.co.za`, deployed from `main`.
- **Supabase production:** active and security-hardened for the safety-pin advisor findings.
- **Twilio backend functions:** active; account-level configuration still needs the self-test and real-device verification.
- **Payments:** remain gated until signed webhook verification and sandbox tests are complete.
- **Mobile:** still requires Android and iOS real-device smoke tests and store credentials before public release.

## Safe next order

1. Enable Supabase leaked-password protection.
2. Add `SUPABASE_DB_PASSWORD_PRODUCTION` directly in GitHub Actions Secrets.
3. Run the migration workflow in dry-run mode; review the plan and only then apply it.
4. Run the Twilio self-test and repair any Twilio Console URL mismatch.
5. Run authenticated web smoke tests against `xoot.co.za`.
6. Run Android and iOS real-device tests.
7. Run PayFast sandbox tests and verify signed callbacks.
8. Enable payment operations only after the signed-webhook gate is green.
9. Record rollback ownership and complete the final launch checklist.
