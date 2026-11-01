-- Restored verbatim from the existing production migration history on 29 October 2026.
-- Preserve this previously applied version; never delete its ledger entry to allow db push.
begin;

alter table public.user_safety_pins enable row level security;

 drop policy if exists "user_safety_pins_owner_select" on public.user_safety_pins;
create policy "user_safety_pins_owner_select"
  on public.user_safety_pins
  for select
  to authenticated
  using (user_id = auth.uid());

revoke execute on function public.set_safety_pin(text) from anon, authenticated;
grant execute on function public.set_safety_pin(text) to service_role;

commit;
