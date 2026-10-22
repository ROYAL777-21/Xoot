# Website launch overlay removal

Founder instruction, 22 October 2026: remove the floating heart animation at website start/launch while continuing Mapbox work.

Base: approved `release/xoot-production`, `56d7c7386c1195b3bea398bb873a20c10f653176`.

## Runtime change

Exactly two removed lines in `src/App.tsx`: the `AppLaunch` import and its root render. Fresh website visits now enter the existing homepage without the 2.6-second mascot/stars overlay. No replacement startup delay, new dependency, price, authentication rule, route or homepage-section change. The unmounted web renderer and native/Remotion animation sources are retained for their separate consumers and parity guards.

## Verification and review

- `npm run typecheck`: passed.
- Targeted ESLint for `src/App.tsx`: passed.
- `npm run design:check`: approved-homepage structure and keyboard-focus guard passed, including existing negative controls.
- Existing `src/App.notifications-route.test.tsx` and `src/lib/splash-parity.test.ts`: eight tests passed across two files. No new implementation-mirroring test was added.
- Correctness review: only the decorative sibling was removed; route registration and authentication wrappers are untouched, with existing signed-in/pending/signed-out route coverage passing.
- Release review: no environment change is needed; deploy only the exact reviewed release revision, then compare Vercel READY state, aliases and public `build-info.json`. Source checks do not establish publication.

## Mapbox status at preparation

The founder's Production browser Config was verified without printing its value: public `pk.` format, not `sk.`, no surrounding whitespace. Vercel `dpl_38BF3JviceQi7hCfY3SkhycxFsx9` was READY at the base revision with `xoot.co.za` and `xoot.vercel.app`; the public build record matched. Both inspected entry/booking assets include a public-token-shaped literal. The production/preview address-suggestion switch remains `false`.

An HTTP-only read of `/book` returned 200 with `Referrer-Policy: strict-origin-when-cross-origin`; CSP retains Mapbox API/tiles/events and blob-worker support. [Mapbox's official token rules](https://docs.mapbox.com/accounts/guides/tokens/) confirm domain/protocol origin restrictions also match subpaths and reject wildcard characters. No restricted-token request was imitated from a command-line client, and no genuine Mapbox call was made.

Actual tile/style/origin acceptance, real customer/Xooter JWT isolation and MFA dispatch, expiry/lifecycle checks on real fixtures, signed device builds, separately verified worker availability and production migrations remain outstanding. PR #71 (`dcc97d36c63a7a37b6b5af8575cffc6db7fb0b1b`) and PR #81 (`f563ffdbad52c8c29ef36777de28dddb2ca98ad9`) were OPEN and MERGEABLE when checked; neither was merged or enabled. This small website release does not close those gates. No provider call, paid native build or database mutation was performed.
