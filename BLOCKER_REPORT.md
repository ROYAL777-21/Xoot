# Xoot Production Blockers

Reviewed: 2026-08-02

Canonical blocker file: `blocker.md`.

This report intentionally delegates blocker detail to `blocker.md` so there is one
unresolved-only ledger. Resolved implementation history lives in git commits and phase
reports; items closed at a review are listed once under "Closed at review" in `blocker.md`,
then dropped.

Read the top section of `blocker.md` first. It holds the live security holes, and one of
them is exploitable in production today with a single API call.

Before closing the production-readiness goal, re-run:

```powershell
npm run ops:readiness -- -IncludeExternal -RequireLive
```
