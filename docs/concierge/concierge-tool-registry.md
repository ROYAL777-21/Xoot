# Concierge Tool Registry

Every Concierge tool must define:

- tool_name;
- purpose;
- read_or_write;
- permitted_roles;
- approved_data_scope;
- prohibited_data_scope;
- required_authentication;
- required_authorisation;
- input_schema;
- output_schema;
- rate_limit;
- cost_limit;
- audit_event;
- feature_flag;
- kill_switch;
- fallback_behaviour;
- owner.

Initial safe tools:

| tool_name | purpose | read_or_write | permitted_roles | feature_flag | owner |
| --- | --- | --- | --- | --- | --- |
| get_safe_auth_context | Resolve signed-in state and role from the server session | read | user, zooter, admin | concierge.authenticated_account_support | platform |
| get_safe_booking_summary | Return only safe booking status and next action | read | owning user, assigned zooter, admin | concierge.booking_status | platform |
| get_safe_booking_next_action | Return the approved route for a booking state | read | owning user, assigned zooter, admin | concierge.booking_status | product |
| get_safe_care_plus_summary | Return safe membership state labels only | read | owning user, admin | concierge.care_plus_support | product |
| get_safe_referral_summary | Return public-safe referral guidance and own status | read | owning user, admin | concierge.referral_support | growth |
| get_safe_zootcred_summary | Return safe credit visibility, not mutation | read | owning user, admin | concierge.zootcred_support | finance |
| get_safe_invoice_navigation | Return approved invoice route, not payment details | read | owning user, admin | concierge.invoice_navigation | finance |
| get_safe_service_area_guidance | Return public launch-area guidance | read | guest, user, zooter | concierge.safe_static_fallback | product |
| get_safe_support_case_status | Return owned support case status | read | owning user, admin | concierge.human_handoff | support |
| create_support_case_draft | Prepare a sanitized case draft | write | user, zooter, admin | concierge.support_case_creation | support |
| create_support_escalation_request | Queue structured escalation after rules/consent | write | user, zooter, admin | concierge.human_handoff | support |
| create_partnership_interest_request | Queue safe partnership interest | write | guest, user, admin | concierge.partnership_interest | growth |
| open_safe_in_app_route | Return a safe app/web route | read | guest, user, zooter, admin | concierge.safe_static_fallback | product |
| retrieve_approved_knowledge_answer | Return an answer from approved knowledge only | read | guest, user, zooter, admin | concierge.safe_static_fallback | product |

Implemented local tool:

| tool_name | backend surface | status | safeguards |
| --- | --- | --- | --- |
| create_support_escalation_request | `create-concierge-handoff` Edge Function plus `support_handoff_contexts` | staged locally, disabled by default | JWT required, rate-limited, role resolved server-side, booking participation checked, sensitive text redacted, in-app/admin-review outbox only |

Prohibited direct tools:

- create_booking;
- cancel_booking;
- reschedule_booking;
- assign_zooter;
- confirm_payment;
- fail_payment;
- issue_refund;
- issue_zootcred;
- redeem_zootcred;
- change_care_plus;
- activate_booking_cover;
- submit_claim;
- approve_claim;
- change_payout_details;
- suspend_account;
- approve_contractor;
- send_unrestricted_email;
- send_unrestricted_sms;
- send_unrestricted_whatsapp;
- send_unrestricted_voice_call.
