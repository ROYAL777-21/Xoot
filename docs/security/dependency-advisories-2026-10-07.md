# Dependency advisory disposition — 7 October inventory, repaired 8 October 2026

Scope: compatible dependency repairs on integrated base `8aca3d88fe87db77c8b9fc6cc3706c5434ac198c`. Refreshed npm audits: web **3 → 0**, mobile **29 → 26** (23 high, 3 moderate, zero critical). Bun reports zero web advisories and the three underlying mobile advisories below; npm also counts their parent-package attributions. This is not production approval.

## Applied repairs

| Package | Locked repair | Actual use and rationale |
| --- | --- | --- |
| `postcss-selector-parser` | Web 6.0.10 / nested 7.1.4 → 7.1.6 | Typography and Remotion CSS modules build tooling. The single-package override crosses typography's pinned v6 range after examining its `astSync`, `selector`, AST traversal/removal/prepend APIs. Default typography components/variants, pseudo-element behavior, and CSS-module output pass; generated outputs match the prepatch baseline. No app runtime selector parsing was found. [Maintainer advisory](https://github.com/advisories/GHSA-rj75-hqrm-r3gf) distinguishes trusted build sources from untrusted request selectors. |
| `source-map-js` | Web/mobile 1.2.1 → 1.2.2 | PostCSS/Tailwind and Expo Metro CSS tooling. Same-series patch; normal source-map round trips and application CSS compilation pass. No application source-map ingestion path was found. [Advisory and maintainer release](https://github.com/advisories/GHSA-68fv-2mgg-jv7q). |
| `compression` | Mobile 1.8.1 → 1.8.2 | Expo CLI Metro development-server bundle responses. CommonJS middleware API remains compatible; actual caller loads and `/status` pass-through passes without starting a server. Added `destroy@1.2.0` dependency was already present in both locks. [Maintainer advisory](https://github.com/advisories/GHSA-vc2v-76pw-4v95). |
| `shell-quote` | Mobile 1.10.0 → 1.12.0 | React Native `react-devtools-core` tooling dependency; within its `^1.6.1` range. Ordinary quoting/parsing round trips pass without executing shell text. No direct application shell-command path was found. Fixed since 1.11.0; [maintainer advisory](https://github.com/advisories/GHSA-pqg4-j6r4-53mv). |

Both manifests use exact repair overrides; npm and Bun generated their own locks without deleting them. No unrelated version upgrade occurred. React18 web, React19 mobile, Expo56/RN0.85, existing router versions, DOMPurify3.4.16, native identity and the R393 crew quote plus separate R39 fee remain unchanged. The [Expo56 reference](https://docs.expo.dev/versions/v56.0.0/) was read before edits.

## Remaining mobile advisories and release gates

| Underlying advisory | Reachability | Mitigation / owner gate |
| --- | --- | --- |
| `braces@3.0.3`, high — [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) | `micromatch` through Metro / Expo file watchers; caller processes configured build globs and local filesystem paths. No direct app runtime glob input was found. Registry latest is 3.0.3; advisory lists no patch. | Keep build glob configuration trusted and Metro/development services private. Security/release owner must disposition tooling exposure before native production; adopt a supported upstream patch when available. No dependency replacement or claim of remediation. |
| `node-forge@1.4.0`, high — [GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv) | Expo CLI certificate/key tooling and `expo-updates` → `@expo/code-signing-certificates`; JS tooling calls certificate/signature verification. App config declares an EAS updates URL but does not declare a code-signing certificate. No direct app import; native OTA-verifier vulnerability/exclusion is not established by this JS audit. Registry latest is 1.4.0; no patch. | Security/release owner must review certificate provenance, signing and update trust paths before native release or accepting any audit exception. Do not treat untrusted certificates/signatures as trusted using this package. Await a supported upstream repair; do not downgrade Expo updates. |
| `decode-uri-component@0.2.2`, moderate — [GHSA-vcc3-ghjq-m6fr](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr) | Expo Router 56.2.21 → `query-string@7.1.3`; router `getStateFromPath` parses query data with it. External deep links can reach parsing before screen/business validation. Fixed 0.5.0 is ESM with a default export; current CommonJS caller requires a callable export and declares `^0.2.2`. | **Unsupported decoder upgrade gate:** require an Expo56-compatible router/caller fix, or separately reviewed interop change with Metro/native routing proof. Current work does not establish a safe bound before router parsing. Security/release owner must resolve or explicitly disposition this reachable availability risk before native external-link rollout. No blanket ESM override or Router58 upgrade. |

No automatic framework downgrades, audit-force, library vendoring, application workaround, native/Expo server, device test, hosted write, backend/payment write or deployment occurred. Residual advisories remain in the audit; unrelated source ports can proceed. Release approval remains separate.

## Evidence

Commands ran from the repository root with Node24.16.0, npm11.13.0 and Bun1.3.14 on 8 October. Exact local checks and outcomes:

- `npm run typecheck` and `npm run mobile:typecheck`: exit 0.
- `npm run test -- src/lib/pricing-parity.test.ts src/lib/booking-quote.test.ts src/lib/theme-consumes-audited-palette.test.ts src/lib/security.test.ts`: 4 files /53 tests passed, zero skips.
- `npm --prefix mobile run test:booking`: 7 tests passed, zero skips.
- `npm run lockfiles:check`: web/mobile manifest and lock consistency passed.
- `npm ci --dry-run --ignore-scripts --no-audit --no-fund` and `npm --prefix mobile ci --dry-run --ignore-scripts --no-audit --no-fund`: exit 0.
- `bun install --frozen-lockfile --lockfile-only --ignore-scripts` and `bun install --cwd mobile --frozen-lockfile --lockfile-only --ignore-scripts`: exit 0.
- PowerShell `$env:VITE_APP_ENV='development'; npm run build`: exit 0; 3342 modules, 29 SEO articles validated. Unset environment initially triggered the required-env guard; no validation was weakened. Platform association files were skipped pending signing identifiers, and the existing large-chunk warning remains.
- `npm audit --json`: zero findings; `npm --prefix mobile audit --json`: 26 package findings, exit 1. `bun audit --json`: empty object, exit 0; `bun audit --cwd mobile --json`: three underlying advisories, exit 1. Expected nonzero audit exits remain explicitly unresolved.

Eight additional local behavioral compatibility groups passed: typography defaults/pseudos, CSS modules, application stylesheet compilation, ordinary web/mobile source-map lookup, shell quoting without command execution, Expo compression pass-through without server startup, and before/after output equality. Compiled main CSS was byte-identical at 160862 bytes/SHA256 `700020f09574ddca327ec047662b3ba895d37a141d8adda4c7a9385df5d38ab1`. Raw logs and the worker report remain local in the deliberately ignored plan workspace.

These checks do not prove a native build/device, real services, hosted behavior or payments. Parent owns browser/aggregate/CI checkpoints and independent review. Native production retains the three named security gates.
