# Zoot Security Checklist

## Env And Secrets

- `VITE_` variables are public only.
- No service-role key in `src/`.
- No real `.env` committed.
- Production fails loudly if `VITE_SUPABASE_URL` or `VITE_SUPABASE_PUBLISHABLE_KEY` is missing, placeholder, or preview-only.
- Staging and production credentials are separate.

## Browser Trust Boundary

The browser must not be authoritative for:

- prices
- payment status
- refunds
- booking state transitions
- Care+ activation
- ZootCred ledger changes
- contractor verification or activation
- admin review resolution

## Supabase

- RLS enabled on sensitive tables.
- Users read/write only their own scoped data.
- Contractors see sensitive access data only in the approved service window.
- Admin actions require role checks and audit rows.

## Webhooks

- Payment callbacks must verify provider signatures/secrets.
- Payment success pages are UI only; they do not activate paid benefits.
- Provider references must map idempotently to exactly one payment record.
