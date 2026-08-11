-- Stop customers and Xooters rewriting a booking's price.
--
-- SPLIT OUT of the tipping migration deliberately, and given an earlier timestamp so it
-- lands first. That one is gated on ZD-005 (schema source of truth unresolved) and can
-- wait. This one should not: it protects money in production today and depends on
-- nothing else.
--
-- The hole: `update own bookings` (customers) and `zooters update assigned bookings`
-- both grant UPDATE on the whole `bookings` row with no column restriction. So a
-- customer can set the price of their own booking to zero, and an assigned Xooter can
-- raise the price of a job they are working to anything they like. Neither needs a UI —
-- one PATCH from the browser with a valid session does it.
--
-- Found 2026-07-30 while writing the tip author guard. Recorded as ZD-023.
--
-- Reverting rather than raising: a legitimate update that carries the old price along
-- unchanged must not fail. `auth.uid() is null` is the server-side path — edge functions
-- using the service role — which is where price changes legitimately come from.

create or replace function public.enforce_booking_price_author()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.price is distinct from old.price
     and auth.uid() is not null
     and not public.has_role(auth.uid(), 'admin') then
    new.price := old.price;
  end if;

  if new.status is distinct from old.status
     and auth.uid() is not null
     and not public.has_role(auth.uid(), 'admin')
     -- A customer may cancel their own booking; that is the one status change a client
     -- session legitimately makes directly.
     and not (new.status = 'cancelled'::public.booking_status and old.user_id = auth.uid()) then
    new.status := old.status;
  end if;

  return new;
end;
$$;

drop trigger if exists booking_price_author_guard on public.bookings;

create trigger booking_price_author_guard
  before update on public.bookings
  for each row
  execute function public.enforce_booking_price_author();
