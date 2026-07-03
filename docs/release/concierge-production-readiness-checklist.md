# Concierge Production Readiness Checklist

- [ ] Approved knowledge files exist.
- [ ] Draft and deprecated knowledge are blocked in production mode.
- [ ] Safe tool registry is reviewed.
- [ ] Feature flags and kill switches exist.
- [ ] RLS and role tests pass.
- [ ] Sensitive household access is not exposed.
- [ ] No booking, payment, refund, Care+, ZootCred, Booking Cover or payout action is possible through chat.
- [ ] Human handoff is tested.
- [ ] Urgent support routing is tested.
- [ ] Fallback paths work.
- [ ] PostHog and Sentry scrubbing are verified.
- [ ] Prompt-injection and abuse tests pass.
- [ ] Staging smoke tests pass.
- [ ] Founder, legal, finance, support and trust approvals are recorded.
- [ ] No production deployment or real customer communication has been performed from local testing.
