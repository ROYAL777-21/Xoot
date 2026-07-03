# Concierge Analytics And Privacy

Allowed privacy-safe events include:

- concierge_opened;
- concierge_quick_action_selected;
- concierge_message_submitted;
- concierge_intent_classified;
- concierge_knowledge_answered;
- concierge_safe_tool_requested;
- concierge_safe_tool_succeeded;
- concierge_safe_tool_failed;
- concierge_fallback_used;
- concierge_escalation_offered;
- concierge_escalation_created;
- concierge_route_opened;
- concierge_answer_helpful;
- concierge_answer_not_helpful;
- concierge_knowledge_gap_detected;
- concierge_unsafe_request_blocked;
- concierge_conversation_ended.

Allowed metadata: role_type, intent_category, answer_type, tool_category, escalation_level, feature_flag_state, environment, latency_bucket, message_count_bucket and safe_resolution_status.

Never send raw chat text, names, email, phone, address, booking ID, property ID, payment reference, support-case body, access notes, gate codes, alarm codes, lockbox codes, referral codes, fraud details, internal prompts or personal model responses to analytics.
