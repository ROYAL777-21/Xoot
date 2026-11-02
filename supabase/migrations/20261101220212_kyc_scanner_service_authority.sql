-- Authenticate through PostgREST's real JWT/key verification, not token-string equality.
-- Read-only; no budget, processing, Storage policy or contractor-state change.
begin;
create function public.kyc_scan_worker_authorized()
returns boolean language sql stable security invoker set search_path='' as $$
  select current_user = 'service_role';
$$;
revoke all on function public.kyc_scan_worker_authorized() from public,anon,authenticated;
grant execute on function public.kyc_scan_worker_authorized() to service_role;
comment on function public.kyc_scan_worker_authorized() is
  'Read-only service worker probe. Use the presented credential, never decoded claims or a privileged fallback client.';
notify pgrst,'reload schema';
commit;
