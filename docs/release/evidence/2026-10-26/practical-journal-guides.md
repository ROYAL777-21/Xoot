# Two practical Journal guides

The founder authorised verified publication on 26 October and an ongoing two-article daily cadence. PR [#98](https://github.com/ROYAL777-21/xoot-your-local-helpers/pull/98) targets the current production branch, `release/xoot-production`, from `content/useful-home-guides-20261026`. Current production was verified as `e0c021e9fde328098f33fb216b1efa720eadf2f1` through the live build stamp. Website publication is separate from the held media questionnaire and conditional post-production partnership work.

## Scope

- `/articles/after-clean-checklist-johannesburg`: a fair end-of-visit walkthrough, a copyable handover note and practical language for reviewing a concern.
- `/articles/weekly-or-fortnightly-cleaning-johannesburg`: a conditional cadence comparison, repeat brief and household review questions.

Both are original, useful customer education filtered through the current brand Markdown. Relevant passages of the founder's Hooks and Retention playbooks and timestamped ask-hormozi material informed audience recognition, manageable effort and repeat value; no transcript/book copy, imported business figures or claimed endorsement is published. Exact private provenance remains in the task's `outputs/articles/2026-10-26/source-and-brand-notes.md`.

New structured list/table data renders as escaped React text, with a table caption, column/row headings and a bounded informational CTA. The existing 36 posts and six featured handoff stories remain intact. New FAQs match visible answers. Both routes are in the sitemap and public render inventory. Prelaunch and anticipated January/early February 2027 wording follows the founder's confirmation; no appointments, worker availability or commercial result is promised.

No backend, auth, provider, payment, pricing or operational activation is included. PRs #78 and #91 and the older private correction pack remain separate.

## Verified application revision

Application commit: `af6d1b81e9926acc586b687ef06f7dac302dcf4b`.

TypeScript, 11 focused editorial/rendering checks and SEO validation of 38 source articles passed. Replacing semantic lists with generic divs makes the new tests fail; restoring the renderer passes. Independent read-only source review found no issues and gave a technical merge verdict of yes, without asserting CI/deployment or production readiness.

Vercel preview `dpl_2xatqnPCZ2bSDwA8fcNHtQyRCCg6` is READY and its build stamp matches that application commit. Both pages return readable initial article HTML, one H1, the expected canonical/title/description, matching BlogPosting and three FAQ entries, index links and sitemap entries. Chromium at 390px and 1440px verified no page overflow or runtime errors, the practical tools and keyboard CTA navigation. The mobile comparison table and handover note were visually inspected. Hosted preview access used Vercel's authorised temporary-share mechanism; no credentials or browser storage were inspected and no hosting protection was weakened.

Full local verification status must be read with the dated private logs and final worklog entry. The initial missing locked native test dependencies were restored with `bun install --frozen-lockfile` without changing a lockfile. The full 165-file application run passed 1,695 tests with seven existing skips and built 52 public pages. A later combined run after the verifier extension recorded 1,697 passing tests, two browser-fixture timeouts and seven skips; it is not a green combined run. The complete 43-case browser suite subsequently passed in isolation, including the review fix described below. Current TypeScript, scoped lint, the real-directory artifact smoke using the same production origin as release CI, approved design at 390px/1440px, artifact scan and source/security scan pass individually. No timeout was increased and no check was skipped to obtain these results.

The standalone browser gate previously assumed OTP-first entry, while the approved production UI starts at account creation. Its bounded correction validates the signup fields/action, follows the existing returning-user switch, rechecks the email input and retains code/password/deep-link/roster/runtime assertions. No application Auth or backend code is changed. Independent review found that the first version failed to recheck the email after switching modes; the final recheck and a returning-user-email negative fixture address that reproduced gap. The signup-first positive fails against the old verifier, while all five signup-first controls and all 43 expanded regressions pass after correction. Do not treat this UI smoke as OTP delivery, successful authentication, worker verification or production acceptance.

## Release blocker and resume

The [required release workflow](https://github.com/ROYAL777-21/xoot-your-local-helpers/actions/runs/40308612728) did not start its jobs. GitHub's annotation reports failed account payments or a spending-limit restriction. The security/public-directory/PostgreSQL jobs are also non-green; the successful Vercel preview-comment check is not their replacement. No account billing setting, paid plan or check bypass was used.

This is a verified preview, **not a production publication**. After the account restriction is resolved, rerun all required checks for the final PR head, reverify its hosted preview and current production source, then merge the bounded change through the existing release pipeline. Refresh the candidate publication dates if release occurs after 26 October. Confirm the production deployment/build stamp and both actual live article URLs before reporting them published. Website publication is already authorised; another draft-approval round is unnecessary.
