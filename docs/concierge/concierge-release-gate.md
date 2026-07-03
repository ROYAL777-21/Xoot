# Concierge Release Gate

Concierge is not production ready until:

- approved knowledge files exist;
- policy conflicts are resolved or safely escalated;
- roles and RLS are enforced;
- no sensitive household data can be exposed;
- no payment, booking, payout, Care+, ZootCred or Booking Cover action can be performed by chat;
- human escalation and urgent support routing are tested;
- fallback works when tools or models fail;
- feature flags and kill switches are available;
- privacy, prompt-injection, rate-limit and grounding tests pass;
- PostHog and Sentry are scrubbed;
- staging verification is complete;
- founder, legal, finance, support and trust approvals are recorded where required.
