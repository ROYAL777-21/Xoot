-- MCP booking intents: server-only, customer-scoped and idempotent.
-- A prepared quote is never a confirmed booking; payment confirmation stays with PayFast.
create table if not exists public.llm_booking_intents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  oauth_client_id text not null,
  idempotency_key text not null,
  saved_address_id uuid not null references public.saved_addresses(id),
  service_key text not null check (service_key in ('regular','express','office','airbnb','moving')),
  hours numeric(4,1) not null check (hours >= 1 and hours <= 10),
  booking_date date not null,
  booking_time text not null,
  booking_cover_opt_in boolean not null default false,
  quote_total_cents integer not null check (quote_total_cents >= 5000),
  quote_breakdown jsonb not null default '{}'::jsonb,
  status text not null default 'prepared' check (status in ('prepared','submitting','submitted','needs_review')),
  booking_id uuid references public.bookings(id),
  payment_record_id uuid references public.payment_records(id),
  prepared_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  submitted_at timestamptz,
  unique (user_id, oauth_client_id, idempotency_key),
  constraint llm_intent_submission_ref check (status <> 'submitted' or booking_id is not null)
);
create index if not exists llm_booking_intents_user_idx
  on public.llm_booking_intents(user_id, prepared_at desc);
create index if not exists llm_booking_intents_expiry_idx
  on public.llm_booking_intents(expires_at) where status = 'prepared';

alter table public.llm_booking_intents enable row level security;
-- Strictly no user/client table API access, even with an OAuth JWT: all operations
-- are controlled by xoot-mcp with validated user identity and reviewed client ID.
revoke all on public.llm_booking_intents from public, anon, authenticated;
comment on table public.llm_booking_intents is
  'LLM booking quote/intent ledger; service-role only. Preserve submitting rows for manual reconciliation after ambiguous failures.';
