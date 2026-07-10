---
title: Policy title
policy_id: stable-kebab-case-policy-id
version: 0.1.0
status: draft
owner: Accountable role
approved_by: []
effective_from: null
last_reviewed_at: null
review_due_at: null
supersedes: null
dependent_feature_flags: []
kill_switches: []
---

# Policy Title

## Purpose

State the decision this policy owns and why one authoritative rule is required.

## Scope

List the products, roles, environments, workflows, and data covered. Explicitly list exclusions.

## Definitions

Define every domain term that could alter behavior, entitlement, money, safety, or legal meaning.

## Authoritative Rules

State deterministic rules. Separate customer-facing policy from internal operational procedure.

## Prohibited Interpretations

List conclusions that agents, clients, providers, and operators must not infer.

## Data and Tool Boundaries

Identify the operational source, permitted tools, prohibited data, authentication, authorization, retention, and audit requirements.

## Approval and Exceptions

Define who may approve the policy, who may approve a bounded exception, required evidence, duration, and rollback. Agents may propose but may not approve exceptions.

Every policy must list all dependent feature flags and kill switches in frontmatter. An approved policy with an empty dependency list must state and validate that no runtime control depends on it; absence of review is not equivalent to no dependency.

## Metrics and Guardrails

Define the primary metric, guardrail metrics, freshness threshold, failure threshold, and owner.

## Failure and Conflict Behavior

Define the safe fallback, kill switch, escalation owner, and user-facing behavior when data is missing, stale, conflicting, or unavailable.

## Verification

List exact tests, staging evidence, live readback, security review, legal review, financial review, and release gates required before approval.

## Change History

Record version, date, pull request, approvers, decision summary, and superseded version. Git history is supporting evidence, not a replacement for this record.
