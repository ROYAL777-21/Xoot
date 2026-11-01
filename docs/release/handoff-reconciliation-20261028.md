# 28 October handoff reconciliation

Current launch authority remains [production-checklist.md](production-checklist.md).
This records the received delivery and measured differences; it is not a production clearance.

## Received source

- Founder archive: `xoot-codex-handoff-20261028.zip`, SHA256
  `D01AB16D7C6356FC59903572CD49D9CA33F2EC59A408CB7053CED78A0B1BC7BE`.
- Thin bundle verifies against the existing repository and contains
  `e29270295a22664b221cf83184f06e3034f8d26e`. Imported only as
  `refs/remotes/handoff-20261028/main`; common base with this integration is `93fe439`.
- The archive's runbook and nine-page report were read. Their local test claims belong to
  that tree, not the deployed backend or the current integration. The report explicitly says
  its SQL contract and real PayFast/SOS acceptance had not run.
- Preserve both histories. Do not overwrite main/release, close unrelated PRs, stamp missing
  migration history or copy bundled credentials into another environment. Existing founder-saved
  staging credentials remain private. No paid service or spending increase is authorised.

## Findings that block importing the delivery wholesale

| Area | Measured defect or conflict | Required integration behaviour |
| --- | --- | --- |
| Payment/payout gates | Bundled migration enables three controls for environment `all` and marks staging signature/callback/reconciliation evidence true before any real provider test. | Exclude these writes. Record actual evidence separately; keep all current controls/flags false. |
| Admin membership settlement | Bundle branches from before `3a208e2`; its membership SQL checks a role/reason without the verified bearer and matching live AAL2 session. | Preserve current admin assurance and extend the same session binding to membership. |
| Membership checkout | The payment SELECT omits `meta`, then checks `payment.meta` for linkage. | Read and validate the actual owner, exact subscription and plan before checkout; test the actual route. |
| Legacy activation | `client_reconcile` treats an already-paid flag without a receipt as verification. | No receipt may be inferred from status. Require explicit legacy reconciliation evidence. |
| Subscription states | A linked cancelled subscription can fall through to a paid receipt without activation. | Refuse cancelled/ambiguous linkage before checkout; late real money needs reconciliation. |
| Provider retries | Membership replay does not bind the first genuine late transaction after admin settlement or reject subsequent different charge IDs. | Preserve the reviewed one-time transaction binding and different-charge refusal. |
| R30 credit | Bundle grants credit per activation; the locked facts require one welcome credit, excluding onboarding-trial entrants. | Enforce the existing commercial rules and once-only identity at transaction level; do not introduce renewal credit. |
| Schema | Actual staging `user_subscriptions` has no `created_at`; actual earnings require `commission_rate` and have no `platform_fee` column. | Use inspected schema and reviewed additive changes, not assumed generated types. |
| Earnings uniqueness | Partial booking index is paired with `ON CONFLICT (booking_id)` without its predicate. | Prove real SQL insertion/replay; never count a conditionally skipped earnings assertion. |
| Completion retry | `ops-workflow` catches earnings failure after committing completion and returns 200; completed-to-completed retry is not allowed. | Completion must have an atomic/recoverable ledger contract and truthful failure handling. |
| Earnings money | Struck rate, payment receipt, canonical solo/crew model, rounding, fee exclusions and eligible worker are financial facts. | Prove the recorded ledger and counter together against those facts; do not fabricate worker approval. Payout execution remains off. |
| Theme | Bundle forces public pages and first app visits light, conflicting with the founder's device-default dark-mode instruction. | Preserve the current working system/light/dark implementation and handoff token values. |
| SOS readiness | Bundle sets `live`, enabling SOS/recording claims before a device/operations drill. | Retain closed readiness and truthful public copy; source authorisation is not completed acceptance. |
| SOS access | Existing handler reads any supplied booking with service role and copies its address to the caller's readable alert. | Validate actual booking participation before attaching private booking details; test owner/assigned worker/outsider access. |
| SOS operations | Only a self-notification is implemented; no paging/acknowledgment/resolution consumer was found. | Build and prove the durable operations path and named acknowledgment before any response promise. |
| SOS PIN/outcomes | Missing PIN can accept any value; same-session reset bypasses the intended separate secret. Dialer navigation is described as a connected call. | Repair enrollment/reset and honest dialer/location/alert states. A handset check must not place an actual emergency call. |

The bundle's recurring billing, gift fulfilment, crew payment, native camera/SOS and physical
voice acceptance remain separate work. A source file, configured provider or passing unit suite
does not establish those operational outcomes.

## Current cancellation delivery — completed on staging

Reviewed source: `3cb368e0`, following `049cd68`. New migration actually recorded as
`20261028125915_atomic_booking_cancellation.sql`; only the newly authored file was renamed
to the provider's ledger timestamp, with SQL unchanged. The applied historical payment migration
was not rewritten.

- One service-only cancellation transaction retains the original refund-review receipt,
  preserves settled money, revokes booking access, cancels valid queued assignment work,
  and commits notifications/history/audit/refund review together. It issues no refund.
- Both settlement and cancellation pre-acquire a complete sorted account set when the existing
  guard foundation is installed, then lock payment and booking rows and revalidate owners.
  Partial foundation fails closed; actual staging/production currently have no foundation.
- Whole-transaction deadlock/serialization retry is bounded to three attempts. UUID input is
  canonicalised before receipt comparison. Admin decisions require fresh role and live AAL2.
- Staging handlers: `confirm-payment`38 (signed webhook, JWT verification off),
  `admin-confirm-payment`37, `cancel-booking`36, `create-payment-session`15 (JWT verification on).
  Exact ledger SQL, four DB function bodies and all27 returned runtime/import-map files match
  reviewed source. Provider readback omits each supplied `deno.json`, as previously observed.

### Verification evidence

- Four original route regressions fail against the old handler, then pass after repair.
  Five additional UUID/retry regressions likewise fail before their fixes.
- 92 cancellation +42 existing payment SQL assertions pass on the actual absent-foundation
  staging profile, with the full guard foundation temporarily installed inside rollback, and
  against the deployed functions. A partial-foundation check returns55000 without a write.
- Independent browser-SQL and MCP sessions exercise settlement-first, cancellation-first and
  simultaneous cancellation. Reverse/duplicate attempts wait13.39/13.54 seconds server-side;
  paid accounting/refund review and once-only receipt/notification/audit assertions pass.
  The first settlement-first check observes the other session sleeping while it holds locks;
  server timing was not captured for that case.
- Negative control reproduces the old stale snapshot overwrite and missing refund after a
  12.84-second lock wait; the counterfactual cancellation is rolled back. An earlier two-MCP
  attempt did not expose an overlap barrier and is explicitly excluded from acceptance.
- All five clearly marked fixtures and their payments, provider rows, receipts, reviews,
  notifications, outbox and audit rows were removed. Actual founder identities and unrelated
  calendar/account data remain. No worker approval, provider charge or recurring job was created.
- Eight real HTTP boundaries pass, including anonymous cancellation/settlement RPC denial,
  user-authentication requirements and unsigned callback refusal.
- Final local suite:194 files,1990 passing tests,7 existing skips.43 focused route/adapter/RPC
  regressions, four Deno checks, web types, lint, lockfiles, four header checks and the four
  source/security checks pass. The earlier full run's sole missing RPC declaration was fixed
  from actual generated staging types, then the whole suite reran successfully.
- Security advisors retain the existing safety-PIN SECURITY DEFINER and disabled leaked-password
  warnings; private receipts are deliberately service-only. This is not an all-clear on SOS.

These are synthetic staging SQL events, not genuine PayFast, authenticated-JWT, MFA, approved
worker or physical-device acceptance. Late real money after an unpaid cancellation still needs
an explicit reconciliation workflow. Post-start reversals and other legacy lifecycle writers
remain outside this limited clearance.

## Release state and next sequence

1. Repair the identified Care+/earnings source contracts and exercise actual SQL failure/replay
   paths before applying any replacement for the bundled migration. Preserve existing pricing,
   trial/welcome-credit facts and signed callback checks.
2. Keep production checkout/payout/tracking/calling/SOS activation closed. Genuine provider,
   authorised JWT/MFA, eligible-worker, privacy, device and safe migration gates still apply.
3. GitHub Actions are running again. At PR101 head049cd68, design tests report the now-repaired
   missing cancellation RPC declaration. Production-schema comparison still correctly detects
   staging-only rollout differences. External Claude security review fails with
   `Credit balance is too low`; that is not a clean review and no credits were purchased.
4. Keep PR101 draft, preserve the approved production homepage and unrelated PRs, and record
   successful exact-revision CI/deployment/readback before promotion. Do not turn a required
   check into success or silently replace its security policy.
