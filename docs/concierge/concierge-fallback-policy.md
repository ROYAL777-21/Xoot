# Concierge Fallback Policy

Fallback order:

1. Approved deterministic knowledge answer.
2. Safe authenticated server tool result.
3. Model answer only when enabled and grounded in approved context.
4. Human escalation or safe route.
5. Static fallback guidance.

If the model, tool, knowledge source or rate limiter fails, the Concierge must not guess. It should explain that automatic help is unavailable and offer the safest support route.

When `concierge.model_answers` is disabled, show quick actions, approved static guidance and human handoff. Do not present the user with a dead end.
