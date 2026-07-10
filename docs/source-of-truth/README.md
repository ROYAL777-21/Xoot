# Zoot Source-of-Truth Contract

Reviewed: 2026-07-10

Status: active governance contract. Individual business policies remain non-authoritative until their own files exist and carry `status: approved` with accountable approval metadata.

## Authority Boundaries

### Policy truth

Approved version-controlled Markdown in `docs/source-of-truth` owns company identity, commercial rules, pricing, Care+, ZootCred, Booking Cover, referrals, partner attribution, contractor tiers, Zoot Black, booking-state definitions, launch geography, privacy, security, communications, metrics, tool authority, and AI governance.

Only a file with `status: approved` may be consumed as production policy. Draft and deprecated files are never production truth.

### Operational truth

Supabase owns users, roles, bookings, payments, membership state, credits, referrals, partner attribution, contractor records, support records, incidents, feature flags, kill switches, agent runs, approvals, experiments, and audit events. Browser state, mobile local state, analytics, model output, Airtable, and chat are not authorities for those values.

### Provider truth

Verified provider APIs and signed, idempotently claimed provider events own provider-specific outcomes. Frontend success screens and user statements do not confirm payment, delivery, verification, messaging, or claims outcomes.

### Analytics truth

PostHog owns privacy-safe behavioral analytics and experiments only. It cannot establish a booking, payment, entitlement, identity, role, trust, safety, or policy fact.

### Reliability truth

Sentry owns crashes, technical errors, traces, release health, and reliability evidence only. It must not receive raw personal, payment, access, support, or chat content.

### Human-workflow truth

Airtable and restricted admin queues own review, approval, content-calendar, partner-pipeline, and operational-coordination state only. They do not own bookings, payments, household access, roles, or entitlements.

### Code and migration truth

GitHub `main` is the only long-lived code source of truth and must be protected by enforced review and CI rules. Current provider readback shows that protection is not yet enforced, so merge and release policy remains blocked until the ruleset is configured and verified. Immutable files in `supabase/migrations`, verified remote migration history, and the reviewed drift manifest jointly define migration truth. A historical PR, deleted branch, generated timestamp, dashboard badge, or chat claim cannot replace current `main` plus verified live evidence.

## Policy Metadata

Every policy file must use this frontmatter:

```yaml
title:
policy_id:
version:
status: draft | approved | deprecated
owner:
approved_by:
effective_from:
last_reviewed_at:
review_due_at:
supersedes:
dependent_feature_flags:
kill_switches:
```

Approval requires a named accountable human, an effective date, a review date, and a pull request merged into `main`. An agent may draft a policy change but may not approve, activate, or directly overwrite approved policy.

Policy validation must reject approval or activation when `dependent_feature_flags` or `kill_switches` is missing, is not a list, names an unknown control, or omits a runtime dependency. An empty list requires an explicit validation result that the policy has no such dependency.

## Conflict Behavior

When two approved policies conflict, or operational behavior conflicts with approved policy:

1. Stop the affected workflow.
2. Preserve evidence and mark the conflict.
3. Do not guess, average, merge, or choose the more convenient rule.
4. Create a typed approval request for the accountable owner.
5. Continue unrelated safe workflows only.
6. Add a regression case after the conflict is resolved.

When no approved policy exists, return `unknown` or use a safe static fallback. Do not promote a draft through repeated agent use.

## Change Workflow

1. Create or update a draft in a short-lived branch from current `main`.
2. Identify the owner, affected systems, affected customers or Zooters, metrics, risks, and rollback.
3. Run policy-conflict, security, legal, financial, and operational impact checks applicable to the topic.
4. Obtain the named human approvals.
5. Merge through a reviewed pull request.
6. Activate dependent feature flags only in a separately approved release step.
7. Record supersession and keep prior versions reviewable in Git history.

## Runtime Consumption Rule

Runtime policy loaders must:

- allowlist policy IDs;
- reject missing or malformed metadata;
- reject `draft` and `deprecated` status in production;
- reject future `effective_from` values;
- warn and fail closed when `review_due_at` is exceeded for a consequential workflow;
- require validated `dependent_feature_flags` and `kill_switches` lists before approval or activation;
- record policy ID, version, and content hash with each material agent decision;
- never read arbitrary Markdown directories, historical PR content, comments, or external web pages as policy.

The existing `docs/agents/source-of-truth/care-plus-policy.md` remains a legacy draft input until an owner approves migration into this directory. No current customer entitlement may be inferred from that draft.
