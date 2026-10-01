# Notifications and rendered-check checkpoint

This checkpoint adds the [source Notifications feed and comparisons](notifications/README.md)
and repairs the deployment smoke check's delayed-directory false pass. It does not complete
the production plan or certify native/device delivery.

## Verification

- Full web/shared suite: **147 files, 1,514 tests passed; seven existing SQL-runtime skips**.
  The separate required CI SQL jobs supply the isolated PostgreSQL runtime; skips are not proof.
- Web typecheck, full lint, lockfile consistency, secret/security guards and build-artifact scan passed.
- Website production dependency audit: zero reported vulnerabilities.
- Notifications: 77 focused tests, final seven-size browser comparison and independent review passed.
- Rendered-check repair: 42 focused tests and independent review passed. Restoring the old verifier
  makes both delayed HTTP 404/503 regressions fail because it falsely returns success.
- Rebuilt staging artifact: real directory response, zero approved Xooters, settled roster,
  homepage, sign-in controls/navigation and direct auth reload passed at the configured stable origin.
- Rebuilt production artifact: compilation passed; the browser check **failed HTTP 404** on
  `public-xooter-directory` before leaving home, as required. No backend responses were replaced.

The normal suite deliberately exercises invalid configuration in child builds; their expected
rejection messages are not test failures. Both artifact builds reported the existing large-chunk
warning. Native association files remain ungenerated without Apple team/signing identities and
Android certificate fingerprints. Those native distribution prerequisites remain open.

The updated verifier requires a complete valid response from the exact configured directory
endpoint and the corresponding visible count before moving to sign-in. Only explicitly
unconfigured development can omit that request, with a diagnostic saying it was not checked.
The product change is nonvisual readiness attributes on the existing roster; typography,
artwork, layout and the original logo are unchanged.

These local builds include the reviewed working-tree changes on base `0ee9cb2`; the old build
stamp alone does not identify their uncommitted contents. Hosted checkpoint verification must
identify the resulting published commit separately. The [previous actual hosted captures](../2026-10-01/hosted-profile/README.md)
remain correctly attributed to `0ee9cb2`.

## Remaining release gates

Production lacks the directory and quote endpoints. The fresh [staging database preflight](https://github.com/ROYAL777-21/xoot-your-local-helpers/actions/runs/36932028355)
failed access-token authorization before database password validation; no migration was applied.
Notification realtime publication and excess destructive grants require reviewed database work.
The production schema check and external Claude review remain failed, with the latter affected
by insufficient API credit and GitHub's 300-file diff retrieval limit.

All remaining handoff screens, crew/payment/referral fulfilment, real authenticated journeys,
commercial hosting, operational staffing and mobile/device/store requirements remain in the
[production checklist](../../production-checklist.md) and [screen inventory](../../../implementation/app-handoff-coverage.md).
