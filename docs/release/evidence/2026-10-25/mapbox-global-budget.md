# Mapbox Permanent Geocoding — zero-budget staging guard

Reviewed SQL source: d4d64e24ccad1e8ecb1e896f3f8979460fbf4127.
Staging fxmxyabdjqviqbcxmvlp applied migration 20261025195100_mapbox_geocoding_global_budget.
Source and remote SHA256:
b5d83f923763fb55423a7783bb23941b6c357d7a4b0a7d6a226fcfc627960956.
The CLI-created file was renamed to the actual remote version without changing SQL or repairing history.
[Structured readback](mapbox-global-budget.json) contains no credentials or customer data.

The service-only total allowance starts at zero, consumed zero, never renews automatically.
The shared row lock serializes platform-wide use before the existing 12/hour/user check.
Denied per-user requests do not consume the total; each permitted provider attempt does, even on
provider failure. Missing/zero/exhausted allowance denies before a paid provider fetch.

Readback confirms RLS, zero policies, all seven anon/authenticated table privileges denied and
client RPC execution denied. service_role has SELECT/UPDATE plus RPC execution; RPC is invoker.
A transaction-local service-role zero-budget check denied. Approved active zones remain zero.

Real disposable PostgreSQL tests proved three of 20 distinct-user concurrent attempts with a
three-query allowance; 12 of 20 same-user attempts with a larger total; no automatic allowance renewal;
and preserved monotonic consumption. Restoring the old per-user-only RPC failed the zero-budget
assertion. Independent review cleared the zero-default staging DDL. New advisor information is only
intentional service-table RLS/no-policy; the two existing warning categories did not change.

This is only the backend Permanent Geocoding coverage route's request allowance, not a universal
Mapbox invoice cap. Browser map loads, Directions and other direct routes are separate.
[Mapbox pricing](https://www.mapbox.com/pricing) currently lists USD5/1,000 first-tier Permanent
Geocoding queries; 20 attempts are approximately USD0.10 before tax. No paid allowance has yet
been approved or enabled. [Provider storage rules](https://docs.mapbox.com/api/search/geocoding/#storing-geocoding-results)
forbid caching Temporary results; this implementation does not use them as a storage workaround.

No provider request, production budget migration, geography activation or worker approval occurred
in this budget-delivery step. Prior GPS/ETA provider checks are separate. Exact licensed Gauteng
source remains pinned from [MDB/OCHA via HDX](https://data.humdata.org/dataset/cod-ab-zaf).
Follow the [production checklist](../../production-checklist.md) before activation.
