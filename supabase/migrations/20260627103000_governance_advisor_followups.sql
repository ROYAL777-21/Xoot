-- Follow up on Supabase performance advisor findings introduced by the
-- Phase 1 governance controls.
--
-- This keeps the governance model unchanged while adding FK indexes and
-- preventing per-row auth function re-evaluation in admin-only policies.

create index if not exists operational_controls_approved_by_idx
  on public.operational_controls(approved_by);

create index if not exists approval_requests_requested_by_idx
  on public.approval_requests(requested_by);

create index if not exists approval_requests_decided_by_idx
  on public.approval_requests(decided_by);

create index if not exists experiment_registry_approval_request_id_idx
  on public.experiment_registry(approval_request_id);

create index if not exists agent_action_contracts_approval_request_id_idx
  on public.agent_action_contracts(approval_request_id);

create index if not exists analytics_event_contracts_approval_request_id_idx
  on public.analytics_event_contracts(approval_request_id);

drop policy if exists "operational_controls_admin_read" on public.operational_controls;
create policy "operational_controls_admin_read"
  on public.operational_controls for select
  to authenticated
  using (public.has_role((select auth.uid()), 'admin'::public.app_role));
comment on policy "operational_controls_admin_read" on public.operational_controls
  is 'Admins can inspect feature flags and kill switches; writes remain service-role or approved admin tooling only.';

drop policy if exists "approval_requests_admin_read" on public.approval_requests;
create policy "approval_requests_admin_read"
  on public.approval_requests for select
  to authenticated
  using (public.has_role((select auth.uid()), 'admin'::public.app_role));
comment on policy "approval_requests_admin_read" on public.approval_requests
  is 'Admins can inspect pending and historical approvals; creation and decisions are performed by audited server actions.';

drop policy if exists "provider_events_admin_read" on public.provider_events;
create policy "provider_events_admin_read"
  on public.provider_events for select
  to authenticated
  using (public.has_role((select auth.uid()), 'admin'::public.app_role));
comment on policy "provider_events_admin_read" on public.provider_events
  is 'Admins can audit provider event processing without gaining write access to replay side effects.';

drop policy if exists "rate_limit_events_admin_read" on public.rate_limit_events;
create policy "rate_limit_events_admin_read"
  on public.rate_limit_events for select
  to authenticated
  using (public.has_role((select auth.uid()), 'admin'::public.app_role));
comment on policy "rate_limit_events_admin_read" on public.rate_limit_events
  is 'Admins can audit rate-limit pressure; clients cannot write or enumerate raw actor identifiers.';

drop policy if exists "experiment_registry_admin_read" on public.experiment_registry;
create policy "experiment_registry_admin_read"
  on public.experiment_registry for select
  to authenticated
  using (public.has_role((select auth.uid()), 'admin'::public.app_role));
comment on policy "experiment_registry_admin_read" on public.experiment_registry
  is 'Admins can audit approved experiments and data collection contracts.';

drop policy if exists "agent_action_contracts_admin_read" on public.agent_action_contracts;
create policy "agent_action_contracts_admin_read"
  on public.agent_action_contracts for select
  to authenticated
  using (public.has_role((select auth.uid()), 'admin'::public.app_role));
comment on policy "agent_action_contracts_admin_read" on public.agent_action_contracts
  is 'Admins can audit agent permissions; no agent can self-approve or expand its own authority.';

drop policy if exists "analytics_event_contracts_admin_read" on public.analytics_event_contracts;
create policy "analytics_event_contracts_admin_read"
  on public.analytics_event_contracts for select
  to authenticated
  using (public.has_role((select auth.uid()), 'admin'::public.app_role));
comment on policy "analytics_event_contracts_admin_read" on public.analytics_event_contracts
  is 'Admins can inspect privacy-approved analytics contracts before instrumentation is activated.';
