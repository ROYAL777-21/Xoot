-- Phase 4 booking state machine enum support.
-- This migration is separate so new enum values can be used safely in the next migration.

do $$
begin
  alter type public.booking_status add value if not exists 'en_route';
  alter type public.booking_status add value if not exists 'rated';
exception
  when duplicate_object then null;
end $$;
