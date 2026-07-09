# Phase 4 - Completed Booking Invoices

Date: 2026-06-29

## What Changed

- Added `public.booking_invoices` as the immutable completed-booking invoice ledger.
- Added the private `booking-invoices` Supabase Storage bucket for generated PDFs.
- Added owner/admin-only RLS for invoice rows and private invoice PDFs.
- Added the `generate-booking-invoice` Edge Function.
- Added the `resend-booking-invoice` Edge Function.
- Reused `integration_outbox` for Brevo delivery instead of adding a second queue.

## Backend Rules

- An invoice can only be generated for a `completed` or `rated` booking.
- The booking must have a backend-confirmed `payment_records` row with status `paid` or `admin_confirmed`.
- The Edge Function never trusts frontend payment success.
- `booking_id` is unique in `booking_invoices`, so repeated generation is idempotent.
- Invoice facts cannot be mutated after insert. The trigger only allows status, PDF, delivery, and failure fields to advance.
- Resend queues the existing `pdf_path`; it does not regenerate a replacement PDF.

## Secret And Legal Gates

These values must be stored in Supabase Edge Function secrets, not frontend/mobile env files:

- `ZOOT_INVOICE_LEGAL_ENTITY`
- `ZOOT_INVOICE_LEGAL_ENTITY_REGISTRATION`
- `ZOOT_INVOICE_VAT_RATE`
- `ZOOT_INVOICE_VAT_NUMBER`
- `BREVO_API_KEY`
- Brevo transactional template IDs for invoice and resend emails

If VAT rate is greater than zero, `ZOOT_INVOICE_VAT_NUMBER` is required before invoice generation.

## Storage

Bucket: `booking-invoices`

Path convention: `{user_id}/{invoice_id}.pdf`

Access:

- Owner can read their own folder.
- Admin can read for finance/support.
- Client writes are not granted; service-role Edge Functions upload generated PDFs.

## Deployment Still Required

- Apply migration `20260629194645_completed_booking_invoices.sql` to staging first, then production.
- Deploy `generate-booking-invoice` and `resend-booking-invoice` to staging and production.
- Set invoice legal/VAT and Brevo secrets in Supabase Edge Function secrets.
- Smoke-test with a real staging client booking that is completed and paid.
- Confirm Brevo delivery worker/template consumes `booking_invoice_created` and `booking_invoice_resend`.

## Verification Notes

The local implementation is designed to be testable without live provider credentials. Live email delivery remains blocked until Brevo secrets, sender-domain DNS, and transactional templates are configured.
