-- The existing messages policy expands bookings -> xooter_jobs -> bookings and
-- fails every normal client read with 42P17. Break the cycle at its root without broadening private booking rows.
do $preflight$
begin
  if to_regclass('public.messages') is null
    or to_regclass('public.bookings') is null
    or to_regclass('public.xooters') is null
    or to_regclass('public.xooter_jobs') is null
    or to_regprocedure('private.has_role(uuid,public.app_role)') is null then
    raise exception 'Canonical booking/chat and private role prerequisites required';
  end if;
  if not (select relrowsecurity from pg_class where oid='public.bookings'::regclass)
    or not exists(select 1 from pg_policies where schemaname='public' and tablename='bookings'
      and policyname='bookings_participant_read' and cmd='SELECT' and roles=array['authenticated']::name[])
    or exists(select 1 from pg_policies where schemaname='public' and tablename='bookings'
      and cmd in('ALL','SELECT') and policyname<>'bookings_participant_read') then
    raise exception 'Unexpected booking read policies; review before replacement';
  end if;
end;
$preflight$;

-- A private boolean policy predicate, not a public data/actor RPC. Its definer
-- context breaks the policy cycle; the caller's verified auth.uid() still decides
-- access. It returns no account, booking, address, document or message content.
create function private.xoot_can_read_booking(p_booking_id uuid)
returns boolean language sql stable security definer set search_path = '' as $predicate$
  select auth.uid() is not null and exists (
    select 1 from public.bookings b
    where b.id=p_booking_id and (
      b.user_id=auth.uid()
      or exists (
        select 1 from public.xooters x join public.xooter_jobs j
          on j.xooter_id=x.id and j.booking_id=b.id
        where x.id=b.xooter_id and x.user_id=auth.uid() and j.state = 'accepted'
      )
      or private.has_role(auth.uid(),'admin'::public.app_role)
    )
  );
$predicate$;
revoke all on function private.xoot_can_read_booking(uuid) from public,anon,authenticated,service_role;
grant execute on function private.xoot_can_read_booking(uuid) to authenticated;
comment on function private.xoot_can_read_booking(uuid) is
  'RLS-only ciphertext read predicate: verified current uid must own the booking, be its current assigned Xooter with an accepted matching job, or have the existing authoritative admin role. No caller-supplied actor or data output.';

drop policy bookings_participant_read on public.bookings;
create policy bookings_participant_read on public.bookings for select to authenticated
  using (private.xoot_can_read_booking(id));
comment on policy bookings_participant_read on public.bookings is
  'Owner/admin/current accepted Xooter rows without recursive booking/job RLS. Message and job policies, private columns and all write grants unchanged.';
