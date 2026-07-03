# Concierge Human Handoff Policy

Handoff records should include:

- support_case_id;
- user_id where authenticated;
- booking_id_safe_reference where allowed;
- role_type;
- intent_category;
- urgency_level;
- summary;
- customer_stated_issue;
- safe_context;
- recommended_queue;
- recommended_owner;
- requested_action;
- consent_to_share_context;
- correlation_id;
- status and timestamps.

Handoff records must exclude access codes, alarm codes, lockbox codes, raw payment details, bank details, OTPs, secrets, full sensitive household notes, raw fraud scores, internal investigation notes and raw provider webhooks.

Tell the user what happens next without promising response times unless an approved service-level policy exists.
