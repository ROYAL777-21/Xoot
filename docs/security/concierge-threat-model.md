# Concierge Threat Model

Primary risks:

- prompt injection;
- cross-account data access;
- sensitive household access disclosure;
- raw payment, identity or support data leakage;
- unsupported refund/payment/booking actions;
- hallucinated policy or commercial promises;
- analytics and monitoring leakage;
- escalation spoofing;
- tool overreach;
- unsafe model fallback.

Controls:

- approved knowledge only;
- read-only safe server tools;
- RLS and server-side ownership checks;
- rate limits and abuse controls;
- operational controls and kill switches;
- redaction before storage, analytics and monitoring;
- explicit human escalation for high-risk categories;
- regression tests for every incident class.
