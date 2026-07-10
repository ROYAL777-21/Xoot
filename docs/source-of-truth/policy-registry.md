# Zoot Policy Registry

Reviewed: 2026-07-10

This registry defines the required policy inventory and accountable owner. A registry row does not make a policy approved. A policy is authoritative only when its file exists, follows `policy-template.md`, and carries `status: approved` with named human approval.

| Policy ID | Required file | Accountable owner | Current state | Activation requirement |
| --- | --- | --- | --- | --- |
| company-identity-policy | `company-identity.md` | Founder | Not instantiated | Founder approval and brand review |
| commercial-policy | `commercial-policy.md` | Founder | Not instantiated | Founder, finance, and legal review |
| pricing-policy | `pricing-policy.md` | Founder and Finance | Not instantiated | Founder and finance approval |
| care-plus-policy | `care-plus-policy.md` | Founder and Product | Legacy draft exists outside this directory | Resolve conflicts and approve migrated policy |
| zootcred-policy | `zootcred-policy.md` | Finance and Product | Not instantiated | Finance, fraud, and legal review |
| booking-cover-policy | `booking-cover-policy.md` | Founder and Legal | Not instantiated | Provider, legal, and finance approval |
| referral-policy | `referral-policy.md` | Growth and Finance | Not instantiated | Fraud, finance, and legal review |
| partner-attribution-policy | `partner-attribution-policy.md` | Growth and Partnerships | Not instantiated | Commercial and privacy approval |
| contractor-tier-policy | `contractor-tier-policy.md` | Operations and Trust | Not instantiated | Trust, legal, and operations approval |
| zoot-black-policy | `zoot-black-policy.md` | Founder and Operations | Not instantiated | Evidence standard and legal approval |
| booking-state-machine | `booking-state-machine.md` | Product and Engineering | Existing code/migrations require policy extraction | State-transition and rollback review |
| launch-geography-policy | `launch-geography.md` | Founder and Marketplace | Not instantiated | Capacity and service-area approval |
| privacy-policy-internal | `privacy-policy-internal.md` | Information Officer and Legal | Not instantiated | POPIA and provider-data review |
| security-policy | `security-policy.md` | Security and Engineering | Existing security docs require policy extraction | Security owner and founder risk approval |
| communications-policy | `communications-policy.md` | Customer Continuity and Legal | Not instantiated | Consent, channel, and provider review |
| metric-definitions | `metric-definitions.md` | Finance and Decision Intelligence | Not instantiated | Owner-per-metric approval |
| tool-authority-policy | `tool-authority-policy.md` | Security and Engineering | Prompt contract exists; policy not instantiated | Tool inventory and approval matrix review |
| ai-governance-policy | `ai-governance-policy.md` | Founder, Security, and Product | Prompt contract exists; policy not instantiated | Eval, cost, privacy, and autonomy approval |

## Registry Rules

- "Not instantiated" is an explicit blocked state, not permission to infer a rule.
- A draft policy may be reviewed and tested but must not be loaded by production systems.
- Every activated policy must identify all dependent feature flags and kill switches.
- Policy approval and activation checks must validate the mandatory `dependent_feature_flags` and `kill_switches` frontmatter lists against the operational-control registry. An empty list must be an explicit reviewed result.
- Removing or renaming a policy ID requires a migration plan for stored decision evidence.
- The weekly policy review must flag overdue review dates, missing owners, conflicting approved versions, and runtime references to non-approved policies.
