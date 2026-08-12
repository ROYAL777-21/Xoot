-- An addressable, unguessable handle for a fare-split invitation.
--
-- WHY THIS EXISTS
-- ---------------
-- `20260811220000_booking_fare_splits.sql` shipped the split ledger, and `split-booking-fare`
-- queued one `integration_outbox` row per invitee on the `brevo_email` channel. **Nothing drains
-- that table.** `admin-mark-outbox` lets an admin tick a row off by hand and that is the entire
-- delivery mechanism — there is no Brevo integration, no sender, no scheduled job. So the panel
-- told the organiser "everyone has been emailed their share" while nobody received anything.
--
-- The fix is to stop pretending a queue is a channel. The organiser sends the invitation
-- themselves, from their own WhatsApp or mail client, and this column is what the link points at.
-- That works today, in South Africa, with no provider to buy and no deliverability to configure.
-- The outbox rows stay: they are a real audit trail of who was invited to owe what, and they will
-- deliver the day a provider is connected. They are simply no longer described as a sent email.
--
-- WHY A TOKEN AND NOT THE ROW ID
-- ------------------------------
-- The id would work and is already unique. It is the wrong thing to put in a URL:
--
--   1. Ids are handed out elsewhere. A split id appears in `payment_records.meta.fare_split_id`
--      and in outbox payloads. A URL that is also an internal identifier means every future
--      place that logs an id has logged a credential.
--   2. This one is a bearer credential in a link that will be pasted into WhatsApp, forwarded,
--      screenshotted and quoted in support tickets. It should be rotatable and revocable
--      independently of the row it names, and an id is neither.
--
-- 24 random bytes, hex — 192 bits. Not a UUID: `gen_random_uuid()` is v4 and carries 122 bits,
-- which is plenty against guessing but reads as an id and invites being treated as one.

alter table public.booking_fare_splits
  add column if not exists invite_token text;

-- Backfill before the NOT NULL, so an existing split keeps working rather than being stranded
-- without a link. There are no production rows yet — this table shipped yesterday — but a
-- migration that only works on an empty table is a migration nobody can re-run.
update public.booking_fare_splits
  set invite_token = encode(extensions.gen_random_bytes(24), 'hex')
  where invite_token is null;

alter table public.booking_fare_splits
  alter column invite_token set default encode(extensions.gen_random_bytes(24), 'hex'),
  alter column invite_token set not null;

-- Unique, and indexed by it: the invite page looks a row up by token on every visit, and a
-- sequential scan on a credential lookup is also a timing side channel.
create unique index if not exists booking_fare_splits_invite_token_idx
  on public.booking_fare_splits (invite_token);

comment on column public.booking_fare_splits.invite_token is
  'Unguessable handle for the /split/:token invitation link. A bearer credential: never log it, never put it in an outbox payload that a third party can read. Presenting it proves you were sent the link, not that you are the invitee — accepting still requires signing in as invited_email.';

-- ── What the token does NOT grant ───────────────────────────────────────────────
-- Nothing, at the RLS layer. The read policy is unchanged: organiser and payer only.
--
-- A visitor holding a token has no session, so they read nothing directly. The preview they see
-- comes from the `fare-split-invite` Edge Function, which holds the service role and assembles a
-- deliberately narrow response — service, date, amount, first name. Never the address, the notes,
-- the household profile or the access codes, which is the rule `fare-split-privacy.test.ts` pins.
--
-- And the token alone cannot accept. Accepting attaches a real user to a real obligation, so it
-- still requires being signed in as `invited_email`: the token stops enumeration, the email match
-- stops a forwarded link from making the wrong person liable.
