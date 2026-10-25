> Historical first delivery. The [atomic room follow-up](atomic-in-app-voice.md) and current production checklist supersede this handler-version/migration state.

# In-app communications: reviewed source and disabled staging delivery

Reviewed source `d3e27d7f3412423f0f9329412f8422ce612224c6` was delivered only to staging
`fxmxyabdjqviqbcxmvlp`, in order: TwiML join, token, unavailable Conversations, status signature fix.
Production functions, migrations and operational switches were unchanged. Twilio remains Trial;
no real calls, SMS, number rental, credits or upgrades were requested.

| Handler | Previous version | Current version | Authentication |
| --- | --- | --- | --- |
| twilio-voice-twiml | 20 | 21 | Existing Twilio HMAC signature |
| twilio-token | 21 | 22 | JWT enabled and actual user lookup |
| twilio-conversation | 21 | 22 | JWT enabled and actual user lookup |
| twilio-voice-status | 20 | 21 | Existing Twilio HMAC signature |

All are ACTIVE. All 16 returned runtime files exactly match submitted source, including each
frozen shared-module copy; Supabase does not return deno.json in this readback. The supplied
deno.json has nodeModulesDir=auto. Bundle hashes and file-match results are recorded in
[the delivery record](staging-in-app-communications.json). No credentials or personal data are included.
Missing bearer requests returned 401 for both user endpoints. Unsigned synthetic form requests
returned 403 for both webhooks. Post-delivery SQL shows zero twilio.in_app_voice control rows,
therefore none enabled. The new disabled-control migration remains source only.

The implementation binds actor and booking into the voice identity. Token mint and each signed
join check the separate control and authoritative service-only booking contact-window predicate;
errors, missing/expired eligibility and non-participant roles fail closed. Tokens and calls last
at most 300 seconds and the remaining eligibility window. Conference participation is limited to
two distinct roles, recording is off and setup/join requests are rate limited. These are bounded
eligibility leases; cancellation/control changes do not instantly terminate an ongoing call.

Unsupported Twilio Conversations returns unavailable without broad grants, provider calls,
session writes or outbox work. Existing Supabase E2EE website text remains the current transport.
Native chat/call UI, real provider transport and usage-cost acceptance are not completed by this patch.

The old handlers failed 19 of 20 initial actual-entrypoint synthetic regressions. The corrected
expanded five-suite run passed 68 checks; the final actual-handler subset passed 28 after adding
the published fixed signature vector. Root TypeScript, scoped lint and Deno checks of all four
handlers pass. Independent review identified an inherited locale-order signature mismatch, then
closed it at d3e27d7 and independently reran 28/28. Both validators now use ordinal key/value
ordering, with a separately implemented test signer and the official fixed-vector example.
These checks execute real entrypoints with mocked external transport, not actual authorised JWTs
or a real Twilio call. Primary references: [Twilio request validation](https://www.twilio.com/docs/usage/security)
and [official Node validator implementation](https://github.com/twilio/twilio-node/blob/main/src/webhooks/webhooks.ts).

Before activation: deliver the reviewed migration in the exact safe sequence, validate real
customer/Xooter JWTs and contact-window denials, settle status correlation and POPIA callback
retention, verify account/TwiML callback URLs and private secret presence without exposing keys,
accept provider costs, and test signed native builds on authorised devices. Do not enable the gate
or roll back to the old unbound-token handlers. The current source is not production delivery.
Required GitHub jobs cannot start because account billing/spending restrictions are reported;
the founder requested preserving the current plan and spending limit. No bypass or paid increase.
