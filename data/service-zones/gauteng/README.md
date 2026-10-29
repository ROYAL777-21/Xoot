# Gauteng provincial source boundary

This is the **unmodified Gauteng (ZA7) feature**, with all 5,690 vertices, from
[South Africa – Subnational Administrative Boundaries (COD-AB)](https://data.humdata.org/dataset/cod-ab-zaf).
Source: **South African Municipal Demarcation Board**; contributed by **UN OCHA ROSEA**,
quality assured and published by **OCHA FISS / HDX**. Licensed under
[Creative Commons Attribution 3.0 IGO](https://creativecommons.org/licenses/by/3.0/igo/legalcode).
Credit these sources when redistributing or displaying this boundary. No endorsement is implied.
This data licence is separate from the application's licence; do not apply proprietary restrictions to the boundary.

The upstream metadata records source creation/edit on 27 December 2018, validity from
9 November 2020, a completeness/accuracy review on 28 January 2025, and resource update
on 26 January 2026. These are distinct dates. This is not a claim that a new 2026 legal
boundary was surveyed or that a surveyor has certified it for Xoot.

`gauteng.geojson` uses WGS84 **[longitude, latitude]**, OGC CRS84 / RFC 7946.
Only the Gauteng feature was selected and the obsolete collection-level `crs` member removed.
Coordinates were not rounded, simplified, repaired, buffered, redrawn or derived from centroids.
`provenance.json` records source links, dates, SHA-256 checksums, bounds and automated GEOS
validity. The source ZIP is deliberately not vendored; its exact digest is pinned.

Reproduce with `scripts/ops/prepare-gauteng-boundary.py <downloaded-source-zip>` and
`shapely==2.1.2`. Run `npx vitest run src/lib/gauteng-boundary.test.ts` to verify the
checked-in data and exercise the production point-in-polygon evaluator.

The founder approved **Gauteng Province as intended geography** on 19 October 2026.
The integration creates only an **inactive** staging candidate, with no fabricated reviewer
identity or approval timestamp. An identified operator must review the exact checksum,
source currency and service list before activation. Independent GIS/release review remains open.
Province membership does **not** verify Xooter skills, availability, capacity, slot or assignment.
Those remain independent booking/roster checks. GPS/ETA for accepted jobs is not zone-gated.

Generate an auditable, staging-only import with:

```sh
node scripts/ops/prepare-gauteng-zone-import.mjs --project-ref fxmxyabdjqviqbcxmvlp --output /secure/review/gauteng-staging.sql
```

This does not connect to a database. Review the generated transaction, then apply only to
the named staging project after the zone schema is tested. It refuses production and refuses
to overwrite any existing row with the same name. No active zone or worker is created.
