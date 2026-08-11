# Concierge Test Catalogue

Minimum regression groups:

- approved knowledge can be retrieved;
- draft and deprecated knowledge cannot be used in production mode;
- missing or conflicting knowledge falls back safely;
- unauthenticated users cannot access account data;
- users cannot access another user's booking or support case;
- Concierge cannot expose address, access codes, payment details, support notes or contractor private data;
- Concierge cannot create, cancel, reschedule or assign bookings;
- Concierge cannot confirm payment, issue refunds, change Care+, alter XootCred, alter Booking Cover or change payout details;
- urgent safety concerns pause ordinary support and route to urgent help;
- prompt injection, secret retrieval, role escalation and user-supplied payment states are rejected;
- rate limits, feature flags, kill switches, model failure and tool timeout paths work.
