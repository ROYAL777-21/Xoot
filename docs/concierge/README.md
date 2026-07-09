# Zoot Concierge Governance

Zoot Concierge is a controlled support and guidance layer, not a general-purpose chatbot. It may answer from approved Zoot knowledge, guide users to protected product flows, summarize safe authenticated status through approved server tools, and create structured human handoff requests where configured.

It must not approve bookings, refunds, payments, Booking Cover claims, Care+ changes, ZootCred changes, payouts, contractor actions, sensitive household access, legal decisions, safety conclusions, or admin decisions.

Production use requires:

- approved knowledge files with frontmatter status `approved`;
- a safe tool registry;
- role-aware access checks;
- feature flags and kill switches;
- human escalation paths;
- privacy-safe analytics and monitoring;
- prompt-injection, privacy, RLS, fallback, rate-limit and escalation tests;
- staging verification and founder/legal/finance/support approval where applicable.

Current Phase 1 status: governance and safety contract only. This does not deploy production or activate provider communications.
