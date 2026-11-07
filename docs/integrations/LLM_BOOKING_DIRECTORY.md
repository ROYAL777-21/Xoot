# Xoot MCP commerce and installation runbook

**Status (2026-10-18):** New OAuth-gated booking actions are on draft PR #78. They are not enabled in production. A successful GitHub commit does not mean customer payments or marketplace installations are live.

## Architecture

- **Public**: get_xoot_overview, list_xoot_services, get_xoot_base_price, get_xoot_booking_link.
- **OAuth**: list_my_saved_addresses, prepare_xoot_booking, confirm_xoot_booking_draft, start_xoot_payment_checkout, get_xoot_booking_payment_status.
- Authentication: Supabase OAuth 2.1, PKCE, Xoot-hosted `/oauth/consent` page, JWT `client_id` allowlist. User credentials must never enter LLM chat.
- **Booking**: customer chooses an existing saved address *label and ID* (no street address revealed to LLM), service, hours, date/time, and explicitly opts in or out of Booking Cover. The new server calculates a 15-minute quote and saves a private idempotent intent.
- **Consent**: AI presents the full amount and line items and gets customer approval. Confirm action atomically claims that intent, calls Xoot's existing user-authenticated `create-booking` endpoint, and verifies the actual server amount matches the approved amount. An ambiguous call becomes `needs_review` and cannot silently retry.
- **Payment**: Xoot's booking page presents **Pay securely**, which invokes `create-payment-session` and POSTs a signed form to PayFast. Verified PayFast notification drives `confirm-payment`. The AI cannot handle card numbers, charge a saved method, or claim a payment was made on the basis of a redirect.

## Mandatory staging checklist

1. Review CI/tests and code security. In Staging Supabase verify asymmetric JWT signing; enable **Authentication → OAuth Server** with dynamic client registration if approved, redirect path `/oauth/consent`, and correct staging auth site URL.
2. Deploy the website consent route to staging, test sign-in, approval, denial, expiry, revocation and PKCE end-to-end.
3. Review and apply `supabase/migrations/20261018210200_llm_booking_intents.sql` **on staging only**; its table has RLS, with all `anon` and `authenticated` table access revoked.
4. Deploy the updated `xoot-mcp` function to staging. Preserve `verify_jwt = false` for anonymous discovery ONLY; the write tools verify OAuth JWT, user identity and `client_id` in-handler. Keep existing `create-booking` and payment functions protected by JWT.
5. Set `XOOT_MCP_OAUTH_CLIENT_IDS` in function secrets to the **reviewed OAuth app client IDs**. Dynamic registration alone is insufficient: approve each client ID before allowing write tools. Keep `XOOT_MCP_COMMERCE_ENABLED=false` until tested; turn `true` only in staging after checklist completion.
6. Check real MCP discovery, JSON-RPC initialize/tools/list, per-tool `securitySchemes`, OAuth linking with approved test accounts, book draft amounts, Care+ price differences, rate limiting, slot constraints and address ownership. Test retry concurrency, mismatched amount, lost network responses, expiry and revocation.
7. Test PayFast sandbox end-to-end, including verified callbacks, failed payment, cancellation and payment retry. Confirm webhook reconciliation and separate human handling for `needs_review` ledger rows.
8. Add upstream abuse controls, alerting and no-sensitive-logging; obtain product/legal approval for descriptions of Booking Cover, availability and customer consent.
9. Only then deploy to production with production JWT issuer, consent URL, registered clients, OAuth allowlist, payment gates and verified live-provider checks. Do **not** enable automatically on merge.

## Directory submission

### ChatGPT and Codex
Official: https://developers.openai.com/plugins/deploy/submission

1. Use an OpenAI Platform verified developer/business organisation, with Apps Management Write permission.
2. Zip `plugins/xoot/` with `plugin.json` at archive root and stable public production HTTPS MCP URL. Use `mcp.json` `auth.type=mixed`, `client.mode=dcr`; configure OAuth discovery and consent before review.
3. In OpenAI Platform **Plugins**, choose upload new plugin, With MCP, select identity, and complete connection setup. Host the exact OpenAI challenge token at the portal-specified `/.well-known/openai-apps-challenge` domain URL. Never invent that token.
4. Scan tools, supply reviewer credentials/test cases, resolve findings, submit for review, then **publish** once approved. Directory is shared between ChatGPT and Codex. Plugin changes don't automatically approve listing.

### Claude directory
Official: https://claude.com/resources/articles/build-plugins-for-claude

Paid Claude developer account: use Claude plugin directory submission portal, submit the remote MCP URL as a single MCP connector, **or** a GitHub-hosted plugin bundle with MCP + skills. With private Xoot source, prefer submitting the public MCP URL or a separate public, sanitised plugin-only repository. Complete Claude-specific review, OAuth testing and approval. Publishing to ChatGPT does not publish to Claude.

### Microsoft Copilot Studio / Agent Store
Official: https://learn.microsoft.com/en-us/microsoft-copilot-studio/agents-experience/tools-add-mcp-server

Connect a remote Xoot MCP server in a Copilot Studio agent (Build > Tools > Add Model Context Protocol), configure supported OAuth, preview and publish through supported agent channels. Global public Microsoft 365 Agent Store publication is **not** automatic and requires separate publisher/channel review.

### Other assistants
MCP-compatible hosts may accept a remote server directly, but a self-service connection does not mean a public installable directory listing. Verify each host's transport, OAuth scopes, and submission path.

## Security limitations

Current Xoot `create-booking` writes multiple rows rather than one atomic purchase transaction. Fail-closed `submitting/needs_review` and idempotent intent creation reduce duplicate risk, but manual reconciliation and a robust atomic booking commit are required before accepting significant traffic. No live-slot guarantee is exposed and final payment state is provider verified. No AI client receives a street address or payment credentials.
