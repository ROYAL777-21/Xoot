# Cumulative website release candidate — 26 October 2026

This is a preparation and read-only audit record. The candidate is based on
`10c17e01f69dcf9007bcff1c5a20ea2d7c6182bc` (PR97), which includes PR92 and PR95.
The 39-file cumulative comparison is 20 commits ahead of approved release
`e0c021e9fde328098f33fb216b1efa720eadf2f1`, with no commits behind.

## Candidate scope

The existing source carries signed-in handoff branding, booking flowers, account navigation,
referrals/review empty states and upcoming-visit cards (PR92); signup confirmation (PR95);
and owner-bound Xooter saves, application/review handoff and flowers (PR97).
This continuation changes release documentation only. It preserves those 39 source paths,
all original PR branches and the existing release workflows. The cumulative source comparison
contains no database migration, native-client or workflow change.

PR91's booking headers, PR96's chat policy, PR71/81's GPS/coverage, PR93's calls, PR94's native
auth, the unfinished KYC quarantine branch and PR98's Journal articles are separate.
This candidate does not integrate, deploy or certify them.

## Fresh connected-service observations

- Vercel resolves `xoot.co.za` to READY production deployment
  `dpl_ASWQX8BSgase9gUDTAZLxiF5GwDn`, with Git SHA `e0c021e9fde328098f33fb216b1efa720eadf2f1`.
- The PR97 source has READY preview `dpl_H7uywemQp7BDrMFLkW76KPAiqvYG`
  at exactly `10c17e01f69dcf9007bcff1c5a20ea2d7c6182bc`. A READY preview is not a production release.
- Both named Supabase projects report ACTIVE_HEALTHY.
- A production SELECT aggregate finds 2 registered accounts, 2 confirmed emails, 2 matching
  owner profiles, 0 missing profiles, 2 populated names and 0 populated phone fields.
  No email, phone, name, credential, OTP or JWT values were retrieved by this audit.
  These counts do not prove a new signup, successful phone save, every future profile write
  or a real applicant's document upload.
- The PR97 `security-review` job `121511695126`, workflow run `40304961508`,
  is completed/failure with zero steps. No security execution or successful test is inferred.
  The source worklog records the owner's earlier billing observation: 3,000/3,000 Actions
  minutes used, reset in six days at that observation. Billing was not reopened here.

## Select the actual release checks

`.github/workflows/verify-xoot-redesign.yml` selects pull requests whose **base** is
`release/xoot-production`; `tests.yml` selects PRs to `main`.
PR97 targets `fix/signup-confirmation-20261025`, so its stacked PR does not select the
release design-and-security/PostgreSQL workflow. Its observed check list contains Vercel,
Supabase Preview and security-review only.

The isolated `release/website-handoff-candidate-20261026` branch carries the cumulative source
to a draft PR against `release/xoot-production`. This uses the existing workflow selection;
it changes no checks, required gates, paid plans or spending limits. Capture the new candidate's
own results after opening the PR. Quota failures are blockers, never passes, and require no
repeated reruns while the quota is exhausted.

## Current backend inventory

Metadata only; function bodies were not downloaded during this continuation.

| Function | Production version | Staging version |
| --- | ---: | ---: |
| submit-xooter-application | 3 | 18 |
| xoot-job-location | Absent from inventory | 11 |
| check-service-coverage | Absent from inventory | 8 |
| twilio-token | 17 | 23 |
| twilio-voice-twiml | 15 | 22 |
| twilio-in-app-voice-status | Absent from inventory | 1 |

User-facing application, location, coverage and token endpoints present in that inventory
retain JWT verification. Twilio webhooks have JWT verification off for their distinct webhook
authentication; this metadata audit does not test HMAC validation or provider acceptance.
Version differences identify delivery skew; they do not establish source equality.
Compare exact deployed source/config and dependencies before any approved production delivery.
In particular, do not describe the new application-save acknowledgment as live solely because
the website source exists.

The migration ledgers contain 82 production entries and 91 staging entries. Staging-only entries:

| Version | Name |
| --- | --- |
| 20260903120000 | zd035_crew_and_zd036_referrals |
| 20261003140000 | company_wide_defaults_and_xooter_checklists |
| 20261015102137 | referral_client_grants_least_privilege |
| 20261015155437 | checklist_active_job_mutation |
| 20261016234838 | xoot_job_live_positions_private |
| 20261018182829 | llm_booking_intents |
| 20261019185331 | xoot_approved_service_zones |
| 20261025191835 | in_app_voice_ephemeral_sessions |
| 20261025195100 | mapbox_geocoding_global_budget |
| 20261026024032 | booking_chat_nonrecursive_read |

Production-only entry: `20261008011821_live_security_advisor_safety_pin_hardening`.
Preserve it. This is a ledger comparison, not a schema/body equivalence check, a validated
migration plan or permission to apply all ten staging entries. Unrelated LLM/crew work must
not be swept into a website release.

## Acceptance and execution limits

Historical unit/build/visual passes remain documented in their original evidence at the
revisions actually tested. This continuation ran no local test, lint, typecheck, build,
browser acceptance, provider call or signed-device test.

Requested Codex Chrome control repeatedly exits before connecting:
`trusted Node process exited unexpectedly; kernel reset, rerun your request`.
The command runner rejects even Get-Location before process creation:
`invalid sandbox permission path URI: 'file:///workspace' is invalid on 'windows'`.
An explicit Windows working directory and non-login PowerShell did not change the rejection.
Do not change browser families, weaken sandboxing, read credentials or claim tests ran.

Before release: obtain the candidate's exact-head release/security/PostgreSQL results;
complete hosted browser and real new-account code/link acceptance; compare and accept the
application backend delivery; and finish required privacy/KYC checks for any activated path.
GPS/coverage, admin MFA, real applicant uploads, device GPS/background behaviour, real calls,
native Apple, laundry and annual-gift fulfilment retain their separate outstanding gates.

No merge, production promotion, migration, backend deployment, worker/admin grant,
tracking/calling activation, paid plan change or spending-limit increase was performed.
