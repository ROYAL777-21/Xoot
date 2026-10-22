# Monochrome maps and cost containment — 22 October 2026

## Release scope

Founder requested an Uber-inspired black/white map UI, authorised the visual production release without another acceptance cycle, and then requested the lowest feasible operating cost. This release changes presentation in the existing optional web/native booking maps and defaults the address suggestion flow off. No new map package, paid plan, mobile build, realtime GPS release, production database operation or service-zone activation is included. The approved homepage SVG and page design are unchanged.

The web/native style documents use Mapbox Standard's supported monochrome theme, day lighting, flat camera and no 3D objects/POI/transit labels. Black markers have white borders; controls, loading/error states and fallback text use neutral colours. Mapbox attribution/logo and public reference-only suburb pins remain. See [Mapbox Standard configuration](https://docs.mapbox.com/mapbox-gl-js/guides/styles/style-imports/).

## Cost controls delivered

- `VITE_MAPBOX_ADDRESS_SUGGESTIONS_ENABLED` must equal `true` before web suggestions or selected-address Permanent confirmation can run. Missing/false values keep manual entry. Vercel project `xoot` (`prj_tz7Ai5SwguPd645qBnnDn4wxu3Jw`), team `team_6F9pqloHAzzLi3mjeapR4Whg`, has this plain, non-secret switch saved as **false**, targets production and preview, setting ID `AjVfb0qViU8URP7o`.
- Native uses the same default-off decision through `EXPO_PUBLIC_MAPBOX_ADDRESS_SUGGESTIONS_ENABLED`; it takes effect only in a future signed build. No currently installed binary was updated.
- Interactive maps already mount only after the customer opens them. No automatic map on every page view was added. The public homepage SVG needs no Mapbox request.
- Existing GPS/coverage production switches remain closed, so this release does not introduce recurring Directions or backend Geocoding traffic. Existing controls/limits on the separate feature PRs do not cap direct public-token requests.
- No new real Mapbox requests, paid EAS builds, premium build machine, plan upgrade, paid review credits, or new recurring automation was started for this release.

## Billing findings and scaling

The founder confirms a Mapbox USD 6 invoice. The connected account's 21 October usage notification names **Permanent Geocoding API**. It contains no item quantity, USD total or tax, so the exact USD 6 arithmetic and origin of all calls are **not established**. Do not infer that six requests cost six dollars, or claim a refund/payment was performed.

Official public rates inspected 22 October 2026 (USD, account terms/taxes may differ):

| Service | Published monthly free tier | First paid rate |
| --- | --- | --- |
| Mapbox GL JS map loads | 50,000 loads | USD 5 / 1,000 loads |
| Temporary Geocoding | 100,000 requests | USD 0.75 / 1,000 requests |
| Directions API | 100,000 requests | USD 2 / 1,000 requests |
| Permanent Geocoding | **None** | USD 5 / 1,000 requests |

[Mapbox pricing](https://www.mapbox.com/pricing), [Permanent Geocoding explanation](https://www.mapbox.com/geocoding), [billing and spending limits](https://docs.mapbox.com/accounts/guides/invoices/).

For illustration, one Permanent confirmation per new selected address is USD 0.005 at the first tier: 1,000 confirmations = USD 5, 10,000 = USD 50 before tax/other usage. Retyping, repeated confirmation and multiple clients can add calls. Manual entry in this release makes **zero address-search/confirmation requests from these components**. That is not a promise of a zero total Mapbox invoice: map loads, already installed clients, shared token use and other integrations are separate.

Mapbox documents usage notifications but **no configurable account spending cap**. A public client flag, debounce or token permission scope cannot enforce a global monetary cap. Before restoring paid suggestions, route paid work through authenticated server code with an atomic account-wide quota, choose/approve a realistic budget, restrict separate browser tokens by exact allowed origins, and review actual usage. Do not convert Permanent calls to Temporary while saving provider-derived results; the storage rights differ. No provider was replaced with a public community geocoder or tile server whose policy may forbid production load.

Supabase organization `hzukufhmigekeyntznal` reports `plan=free`, `tier_free` through the connected API. No plan changed. Vercel billing-charge API returned `404 costs_not_found`; this does not prove a zero invoice or identify the plan. [Vercel Hobby](https://vercel.com/docs/plans/hobby) permits personal/non-commercial usage; do not move a commercial marketplace there merely to eliminate a bill.

## Review and verification evidence

- Source review: diff limited to map theme/components/styles, default-off suggestions/env templates, one obsolete basemap source assertion and release documentation. No pricing/charge/auth/RLS/migration changes. Native and safety-owned assertion edits are explicitly recorded in the worklog.
- `npm run typecheck`: success after cost-control edits.
- `npm --prefix mobile run typecheck`: success after cost-control edits.
- Earlier monochrome implementation `npm run build:dev`: success; final production environment compilation is delegated to the normal Vercel deployment, not reported here as already successful.
- Founder waived further acceptance tests. No new live-provider/device/real-JWT tests were run. Existing automatic repository checks were not weakened or disabled.
- Founder reports saving the prepared three-public-read-scope `pk.` replacement into both staging Edge secret names. Current browser connection cannot read the saved metadata; **replacement not independently verified**. No key value was retrieved into this evidence, no old admin token was revoked, and provider operation is unproven. Edge secrets are not Supabase Vault rows.

Record the final production deployment ID, merged commit and public build stamp in the delivery report. Do not treat a preview, source commit or a `READY` state without the intended alias/revision as proof of the public website.
