-- Tighten live advisor findings for Phase 4 invoice and Phase 7 payment helpers.
-- These functions are backend/service helpers; public clients must not call them
-- through PostgREST RPC.

do $$
begin
  if to_regprocedure('public.prevent_booking_invoice_snapshot_mutation()') is not null then
    alter function public.prevent_booking_invoice_snapshot_mutation()
      set search_path = '';

    revoke all on function public.prevent_booking_invoice_snapshot_mutation() from public;
    revoke all on function public.prevent_booking_invoice_snapshot_mutation() from anon;
    revoke all on function public.prevent_booking_invoice_snapshot_mutation() from authenticated;
  end if;

  if to_regprocedure('public.can_activate_payment_provider(text,text)') is not null then
    revoke all on function public.can_activate_payment_provider(text, text) from public;
    revoke all on function public.can_activate_payment_provider(text, text) from anon;
    revoke all on function public.can_activate_payment_provider(text, text) from authenticated;
    grant execute on function public.can_activate_payment_provider(text, text) to service_role;
  end if;

  if to_regprocedure('public.can_release_zooter_payout(uuid,uuid)') is not null then
    revoke all on function public.can_release_zooter_payout(uuid, uuid) from public;
    revoke all on function public.can_release_zooter_payout(uuid, uuid) from anon;
    revoke all on function public.can_release_zooter_payout(uuid, uuid) from authenticated;
    grant execute on function public.can_release_zooter_payout(uuid, uuid) to service_role;
  end if;
end $$;

comment on function public.prevent_booking_invoice_snapshot_mutation()
  is 'Prevents post-issue mutation of invoice facts while allowing backend status/PDF delivery fields to advance. Search path is pinned for trigger safety.';

comment on function public.can_activate_payment_provider(text, text)
  is 'Service-role readiness check for Stitch/Ozow activation. Client RPC execution is revoked so payment controls cannot be probed from public clients.';

comment on function public.can_release_zooter_payout(uuid, uuid)
  is 'Service-role readiness check for payout release. Client RPC execution is revoked so payout release controls cannot be probed from public clients.';
