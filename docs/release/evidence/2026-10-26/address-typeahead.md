# Address suggestions and bounded provider requests — 26 October 2026

Prepared source: typing pauses for650ms before a lookup, minimum six characters. Selecting an address preserves keyboard focus and does not open a map. Saved-place loads do not spend a request, repeated Enter presses do not duplicate a pending lookup, and stale results are discarded after editing or selecting a saved home. Suggestions include South African addresses outside the old launch-suburb list; they are not worker availability or booking confirmation.

Temporary options stay only in component memory. Only a separately confirmed Permanent result is passed into the booking/place draft. The browser no longer calls Mapbox directly, so confirmation cannot bypass the server allowance. The public search-addresses function reads no customer, booking, Xooter or GPS data. It enforces allowed origins, POST, bounded input/provider response, fixed HTTPS endpoint, no redirects, eight-second timeout and no automatic retry. Permanent confirmation requires exact selected Mapbox ID, ZA address, precise location and high/exact street-number/street agreement. No coordinates or raw provider response are returned to the browser.

The CLI-created migration starts both suggestion and confirmation allowances at zero, never renews them and allows only the service role to consume them. Confirmation also consumes the SAME existing global Permanent allowance as authenticated coverage checks. Finite attempts are not a universal Mapbox invoice or denial-of-service guarantee; other Mapbox products/paths remain separate. Production prices checked26October: Temporary Geocoding has100,000 free requests/month, Permanent Geocoding has no free tier and starts atUSD5/1,000. No new provider request or spend allowance was authorised here. [Mapbox pricing](https://www.mapbox.com/pricing), [storage distinction](https://docs.mapbox.com/help/dive-deeper/understand-temporary-vs-permanent-geocoding/).

Validation:28 focused checks passed (ten UI, seven provider-contract, eleven RPC-name/type checks); Deno passed. Actual isolated PostgreSQL17.6 roles prove zero defaults, client denial, both routes sharing the same Permanent ceiling and two concurrent service connections returning exactly one success for the last suggestion allowance. Granting anonymous RPC execution makes the negative assertion fail. The labelled disposable database/container was removed; no live allowance or provider call was made by these synthetic tests.

Remaining: exact staging delivery/readback, actual permitted provider acceptance, owner-approved finite operating allowances, independent review/release checks and normal booking fulfilment. The legacy writers and reviewed-crew atomic creation still require reconciliation; do not present a lead or quote as a confirmed/paid booking. Province borders and real verified-worker capacity remain separate. Production is unchanged.

Staging delivery: the exact zero-default allowance SQL was applied using apply_migration. The control plane generated version20261026153738; renamed only this new, previously undelivered source migration to match its actual staging ledger. SQL is unchanged; no historical migration or ledger repair. Readback confirms service execution true, anon/customer execution false and SECURITY INVOKER. Founder explicitly approved a capped staging test of200 suggestions and20 Permanent attempts, no renewal, at listed maximumUSD0.25 before tax; this does not authorise production or other account usage.

Actual subsequent delivery: search-addresses v1 is ACTIVE on staging with its own public lookup
authorization, per the founder's explicit approval. All5returned runtime files match source91fbc96;
bundleSHA256`a2bdadd884fb5f4199d1949b5c0b6f3c171fe703c07675a46b7199d28f1db218`.
The allowance SQL SHA256 is`d937656c8ce57105d34c8240e4c1fd742dfff47d88748152c155cfc2fa5c2e3c`.
Before grant, the actual endpoint returned429at zero allowance with exact allowed CORS/no-store.
Guarded staging-only grants set suggest200, confirm20and the shared global Permanent20, without
renewal. Permanent coverage consumes that same pool; neither path can silently refill it.

Actual provider checks used public non-personal test addresses: Fredman Drive returned5suggestions
and a successful Permanent confirmation; a Paul Kruger Street query returned3suggestions but its
Permanent match failed the quality gate; a Madiba Street query returned0options. Temporary result
payloads were not logged or saved. A real hosted design-branch phone-width lookup/selection then
succeeded, retained input focus, dismissed its suggestions and opened no map. No horizontal overflow
at measured387px viewport (390px override with scrollbar); override reset. Source component and tests
were ported to PR97; its Preview points to staging, with the founder-approved lookup flag on.
Counters at readback:4/200suggestions,3/20confirmations,3/20sharedPermanent. Remaining196/17is finite,
not a universal Mapbox invoice cap. No production allowance, tracking or verified worker activation.

The general ALLOWED_ORIGINS digest matches the repo-derived old staging list and does not include
the new owned design-preview alias. This new search handler admits that exact alias only when the
backend is staging. Existing other hosted-preview endpoints may still fail CORS; no unknown list was
overwritten. Normal booking writers/crew fulfilment and real provider/device/release gates remain.

27 October follow-up supersedes the old counters: final staging lookup v4 exactly matches the
reviewed ten-result/Gauteng-biased free-text source aa354fa (restored by4ede72e). Bundle SHA256
a905952df037a5111e2d9a15c42ddab0d66261b7925a630698fff113f3526a1c; all5returned files match.
26root provider/handler/UI checks, independent22, lint/Deno and an actual failing five-result
negative control pass. No retry/quality/budget relaxation. Public Sunninghillcollege/CapeTown
cases succeed, but the founder's private example and a second public Sunninghillcase still miss.
A bounded structured experiment did not resolve the correct area and was removed, not promoted.
Root used12Temporary attempts only; latest total53/200suggestions,4/20confirmation/sharedPermanent.
No refill or production activation. Safe missing-address resolution and normal booking/verified
worker fulfilment remain. See PR97's current checklist and27October map/calendar/rewards evidence.
