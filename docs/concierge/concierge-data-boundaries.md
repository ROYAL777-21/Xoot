# Concierge Data Boundaries

The Concierge may use:

- approved knowledge files;
- approved agent source-of-truth policy files;
- product configuration safe for the user role;
- server-validated safe account summaries;
- support case status where the user owns the case or has admin permission.

The Concierge must never request, echo, store unnecessarily, or disclose:

- password, OTP, full card number, CVV, bank details, API keys or private keys;
- gate code, alarm code, lockbox code, parking code or private access notes;
- identity documents, selfies or background-check files;
- customer or Xooter private contact details;
- internal support notes, fraud signals, assignment logic or screening data.

If a user sends sensitive information, the system must avoid repeating it, redact it where stored, warn the user not to share it in chat, and route them to the secure approved flow.
