-- Drop duplicate generated FK indexes found by the Supabase performance advisor.
--
-- These indexes duplicate existing human-named indexes on the same tables and
-- columns. Keeping the human-named indexes preserves query coverage while
-- removing unnecessary write overhead in production. `if exists` keeps the
-- migration safe on staging, where these generated duplicates are absent.

drop index if exists public.idx_fk_bookings_710be9c8ff0ac18a769b7bbdc2139821;
drop index if exists public.idx_fk_bookings_1b3afd9e1c632dabba5ce8753ef64700;
drop index if exists public.idx_fk_bookings_e03aa2239e8035e5f319cfb0832e2b8c;
drop index if exists public.idx_fk_bookings_9af70df2cdbc90076ebbee646a540ca3;
drop index if exists public.idx_fk_integration_outbox_5366d64d19a03af936eb8e766c10b676;
drop index if exists public.idx_fk_integration_outbox_80cb33dcb43dead17ee03ca1d6b37a03;
