# Xoot for LLMs — public MCP integration

**Status:** code ready for staging deployment and review; **not automatically live** just because the pull request exists.

This is a read-only Model Context Protocol (MCP) interface for ChatGPT, Codex, Claude and other MCP-compatible LLM hosts. It lets an assistant explain Xoot, discover services, retrieve a server-authoritative **base** price for an exact duration, and hand off to the real Xoot booking flow.

## Tools

| Name | Function | Writes data? |
| --- | --- | --- |
| `get_xoot_overview` | Explain Xoot's premium-but-accessible approach and service boundaries | No |
| `list_xoot_services` | Public service categories, without inventing availability | No |
| `get_xoot_base_price` | Current base price from `_shared/pricing.ts`; not a quote | No |
| `get_xoot_booking_link` | Official sign-in/booking hand-off link | No |

No customer data, Xooter private information, home addresses, access codes, authentication tokens, booking status or payment methods are exposed. No booking/charge/refund mutation is supported. Always explain that final totals, service coverage and slots must be verified inside the authenticated booking flow.

## Deployment

1. Review and merge this PR only after tests and content approval.
2. Deploy to **staging first** using your normal Supabase Edge Function process, including `supabase functions deploy xoot-mcp --project-ref <STAGING_PROJECT_REF>`.
3. Confirm `[functions.xoot-mcp] verify_jwt = false` is effective. It is public deliberately because all tools are read-only.
4. Apply rate limiting/abuse protection at the API edge before public promotion. Configure `XOOT_MCP_ALLOWED_ORIGINS` with any approved additional HTTPS web app origins if necessary. Do **not** put a service-role or secret key in a client.
5. Test the HTTPS URL `https://<STAGING_PROJECT_REF>.supabase.co/functions/v1/xoot-mcp` with a POST JSON-RPC `initialize`, `tools/list`, and each `tools/call`. Send `Accept: application/json, text/event-stream` and `Content-Type: application/json`.
6. Verify a user can open the official booking link; **do not** interpret the MCP tool result as a completed booking. Repeat in production using the approved project/ref.
7. Add the production HTTPS MCP URL as a custom MCP plugin/server in supported LLM hosts, then complete any required app review or directory submission separately. A code deploy does not publish a directory plugin.

**Transport:** Streamable HTTP via POST, JSON-RPC 2.0. Returns JSON (rather than SSE), which the transport permits. `GET` is intentionally not a supported streaming endpoint under the newer MCP protocol. Requests with an unexpected `Origin` are rejected. Supported initialize protocol versions are `2026-07-28`, `2025-06-18` and `2025-03-26` for client compatibility.

### Example smoke request

```bash
curl -X POST "https://<STAGING_PROJECT_REF>.supabase.co/functions/v1/xoot-mcp" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

### Release checks

- [ ] `npm run test` includes `src/lib/xoot-mcp-core.test.ts`
- [ ] Staging and production `initialize`, `tools/list` and price tool tested with HTTP client
- [ ] No public tool creates bookings or accesses user data
- [ ] Rate limits, monitoring and 4xx/5xx thresholds configured
- [ ] Schema and terms reviewed for ChatGPT plugin submission
- [ ] Prices verified against the deployed booking backend; no client treats the base price as final
- [ ] Article approved and sitemap validated before publication

## Editorial note

The article `/articles/premium-cleaning-doesnt-mean-expensive` is proposed in the same PR, with brand-specific phrasing and no unverified discounts, testimonials or fixed evergreen prices. Existing editorial policy requires human approval before publication.
