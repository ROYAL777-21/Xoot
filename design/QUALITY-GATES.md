# Quality Gates

## Gate 0: behavioural safety

- Existing auth, RLS, booking, payment, Care+, ZootCred, referral, Zooter, support, notification, and audit contracts are mapped.
- No design change bypasses an Edge Function or trusts client-supplied role/state.

## Gate 1: design approval

- Figma source is inspectable.
- Three directions were reviewed.
- Target frames are labelled `APPROVED BY OWNER`.
- `approved-frames.json` validates and contains the exact nodes.
- Screen specifications cover all required states.

## Gate 2: implementation

- Shared semantic tokens are used.
- No card nesting, placeholder letters, fake assets, invented claims, or unapproved glass/motion.
- Web and native platform conventions are preserved.
- Required events contain no personal or sensitive data.

## Gate 3: functional proof

- Sign-up, sign-in, session restore, password recovery, auth callback, booking, payment pending/confirmed/failed, status, support handoff, and role boundaries pass against staging.
- No consequential success is inferred by the client.
- Offline, retry, duplicate-tap, and expired-session behaviour pass.

## Gate 4: quality proof

- Lint, typecheck, tests, production builds, config checks, security scans, and artifact scans pass.
- Visual comparison passes for approved viewports.
- Keyboard, VoiceOver, TalkBack, large text, reduced motion, and reduced transparency pass.
- Performance budgets and k6 staging scenarios pass at the approved load profile.

## Gate 5: release proof

- Privacy/legal copy and store declarations are reviewed.
- Apple/Google/EAS credentials and records are valid.
- Android internal preview and iOS TestFlight builds install and pass real-device smoke tests.
- Monitoring, alerting, rollback, kill switches, backups, migrations, and incident runbooks are exercised.
- `blocker.md` contains only current blockers and an accountable next action.

No gate may be satisfied by file presence alone. Record commands, build IDs, environment, timestamp, and evidence links.
