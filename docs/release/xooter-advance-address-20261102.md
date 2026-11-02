# Accepted-job destination release — 2 November 2026

The founder requires Xooters to know where they are going well in advance. The job-card RPC
already permits immediate destination access after acceptance, without a visit-day cutoff.
The web Jobs screen discarded its real `{success:true,data:{jobs}}` envelope and displayed no
jobs. This release corrects that boundary and makes the accepted address a prominent handoff
card. The existing separate household-code release window remains unchanged.

The SQL replacement preserves the RPC ABI and service-only execution, uses invoker authority,
and denies stale assignments, inactive workers, terminal bookings and revoked access. A
historical commission roster is not sufficient after replacement: nonprimary access requires
a complete original crew, the original primary still assigned, `was_reassigned=false` and
`replacement_count=0`. After any replacement, nonprimary crew destinations fail closed until a
separately reviewed current-roster binding exists. The current accepted primary retains access.
No roster, earnings history, verification evidence or active availability is changed.

The web screen isolates owner changes, cancels obsolete/hung requests, reports errors with a
retry control and clears cancelled/revoked destinations. The Edge response is `private, no-store`
and logs no database diagnostic. Address and household codes are not copied into external email
or push previews. No new provider calls, tracking switch, spending allowance or price is added.

Validation before hosted delivery: 32 scoped TypeScript/rendered cases and 38 actual isolated
PostgreSQL assertions. Tests prove a destination is available 30 days ahead, reject other owners,
exercise replacement into an existing crew member with an unchanged historical roster, and
preserve service-only invoker grants. Both the original stale-primary defect and the unbounded
historical-crew fallback are reproduced as negative controls. These use synthetic identities and
public-venue text; they do not substitute for actual authorised JWT/device acceptance.

Delivery order: independent immutable review; schema/hash/privilege preflight; apply the exact
reviewed SQL on staging; read back its body/grants and actual history version; deploy the one
changed staging Edge handler and read back frozen source; run release gates. Only then apply
the same reviewed forward change on production and merge the web change into the approved
`release/xoot-production` source. Existing money, verified-supply and native gates stay closed.
Do not restore the old permissive function as rollback: fail closed and use a forward repair.

Current status is recorded only in `production-checklist.md`. No hosted migration was applied at
the time this implementation note was written.
