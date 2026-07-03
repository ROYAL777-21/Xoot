-- Concierge governance controls.
-- Additive only: registers disabled-by-default capability flags and
-- an audited safe handoff contract. This migration does not activate
-- model answers, provider messages, payments, refunds or production support.

insert into public.operational_controls (
  control_key,
  control_type,
  environment,
  enabled,
  description,
  owner,
  metadata
)
values
  ('concierge.enabled', 'feature_flag', 'all', true, 'Global switch for Zoot Concierge shell and safe static guidance.', 'support-security', '{"requested_name":"concierge_enabled","phase":"concierge_phase_1"}'),
  ('concierge.web.enabled', 'feature_flag', 'all', true, 'Allows Concierge entry points on website and web app surfaces.', 'support-security', '{"requested_name":"concierge_web_enabled","phase":"concierge_phase_1"}'),
  ('concierge.mobile.enabled', 'feature_flag', 'all', true, 'Allows Concierge entry points in the Expo mobile app.', 'support-security', '{"requested_name":"concierge_mobile_enabled","phase":"concierge_phase_1"}'),
  ('concierge.authenticated_account_support', 'feature_flag', 'all', false, 'Allows read-only account support through approved server-side safe tools only.', 'support-security', '{"requested_name":"concierge_authenticated_account_support_enabled","requires_rls_tests":true}'),
  ('concierge.booking_status', 'feature_flag', 'all', false, 'Allows safe booking summary and next-action support after ownership verification.', 'support-security', '{"requested_name":"concierge_booking_status_enabled","requires_rls_tests":true}'),
  ('concierge.care_plus_support', 'feature_flag', 'all', false, 'Allows Care+ support only after approved Care+ policy is live.', 'product', '{"requested_name":"concierge_care_plus_support_enabled","requires_policy_approval":true}'),
  ('concierge.zootcred_support', 'feature_flag', 'all', false, 'Allows read-only ZootCred support through ledger-backed safe tools.', 'finance', '{"requested_name":"concierge_zootcred_support_enabled","requires_finance_approval":true}'),
  ('concierge.referral_support', 'feature_flag', 'all', false, 'Allows read-only referral support without revealing other users or fraud review reasons.', 'growth', '{"requested_name":"concierge_referral_support_enabled","requires_growth_approval":true}'),
  ('concierge.booking_cover_support', 'feature_flag', 'all', false, 'Allows Booking Cover explanation only after provider/legal terms are approved.', 'founder', '{"requested_name":"concierge_booking_cover_support_enabled","requires_legal_approval":true}'),
  ('concierge.support_case_creation', 'feature_flag', 'all', false, 'Allows Concierge to create sanitized support-case drafts or escalation requests.', 'support-security', '{"requested_name":"concierge_support_case_creation_enabled","requires_handoff_tests":true}'),
  ('concierge.partnership_interest', 'feature_flag', 'all', false, 'Allows Concierge to queue partnership interest requests without promising terms.', 'growth', '{"requested_name":"concierge_partnership_interest_enabled","requires_growth_approval":true}'),
  ('concierge.zooter_support', 'feature_flag', 'all', false, 'Allows role-aware Zooter support guidance and safe job-status routing.', 'operations', '{"requested_name":"concierge_zooter_support_enabled","requires_role_tests":true}'),
  ('concierge.human_handoff', 'feature_flag', 'all', false, 'Allows structured human handoff from Concierge after consent and safe context checks.', 'support-security', '{"requested_name":"concierge_human_handoff_enabled","requires_support_owner":true}'),
  ('concierge.model_answers', 'feature_flag', 'all', false, 'Allows model-backed answers only when grounded in approved knowledge and server-side controls.', 'support-security', '{"requested_name":"concierge_model_answers_enabled","requires_openai_secret":true}'),
  ('concierge.safe_static_fallback', 'feature_flag', 'all', true, 'Allows approved static guidance when model or tool layers are unavailable.', 'support-security', '{"requested_name":"concierge_safe_static_fallback_enabled","phase":"concierge_phase_1"}'),
  ('concierge.kill.global', 'kill_switch', 'all', false, 'Emergency kill switch for all Concierge capabilities.', 'support-security', '{"scope":"global"}'),
  ('concierge.kill.model_answers', 'kill_switch', 'all', false, 'Emergency kill switch for model-backed Concierge answers.', 'support-security', '{"scope":"model"}'),
  ('concierge.kill.support_handoff', 'kill_switch', 'all', false, 'Emergency kill switch for Concierge support-case creation and handoff.', 'support-security', '{"scope":"handoff"}'),
  ('concierge.kill.booking_status', 'kill_switch', 'all', false, 'Emergency kill switch for safe booking-status tools.', 'support-security', '{"scope":"booking_status"}')
on conflict (control_key, environment)
do update set
  control_type = excluded.control_type,
  description = excluded.description,
  owner = excluded.owner,
  metadata = public.operational_controls.metadata || excluded.metadata,
  updated_at = now();

insert into public.agent_action_contracts (
  agent_key,
  action_key,
  version,
  active,
  risk_level,
  requires_human_approval,
  allowed_operations,
  prohibited_operations,
  data_boundaries,
  owner
)
values
  (
    'zoot_concierge',
    'safe_human_handoff',
    1,
    true,
    'medium',
    false,
    array['create_sanitized_support_case_draft', 'queue_support_review', 'route_safe_in_app_link'],
    array[
      'refund_payment',
      'confirm_payment',
      'change_booking',
      'assign_zooter',
      'approve_claim',
      'change_care_plus',
      'issue_zootcred',
      'reveal_sensitive_data',
      'admin_action',
      'send_unrestricted_provider_message'
    ],
    'Handoff may include a privacy-safe issue summary, role type, urgency and route. It must exclude gate codes, alarm codes, lockbox codes, raw payment details, OTPs, full addresses, private household notes, internal fraud data and provider payloads.',
    'support-security'
  )
on conflict (agent_key, action_key, version)
do update set
  active = excluded.active,
  risk_level = excluded.risk_level,
  requires_human_approval = excluded.requires_human_approval,
  allowed_operations = excluded.allowed_operations,
  prohibited_operations = excluded.prohibited_operations,
  data_boundaries = excluded.data_boundaries,
  owner = excluded.owner,
  updated_at = now();
