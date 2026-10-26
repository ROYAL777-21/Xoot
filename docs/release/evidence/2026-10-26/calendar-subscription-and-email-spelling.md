# Automatic calendar subscription and email spelling — 26 October 2026

Founder reports missing signup PIN on live xoot.co.za and supplies `nkosiskosana11@gmail.vom`.
Production read-only finds the existing `.com` account confirmed, last signed in26October, and no
matching `.vom` account. This supports correcting the supplied spelling; it does not certify all new
signups or email deliverability. The existing account uses sign-in, rather than registering again.
Auth now warns about exactly `gmail.vom` and offers explicit correction before any request. Other
domains are unchanged; addresses are never silently rewritten. Its new regression fails against the
old implementation and passes after the correction. Signup completion PR95 remains unreleased.

The requested automatic sync is a read-only calendar subscription, separate from single-visit import.
Normal verified Auth is required to create/replace/disable its link. Client CSPRNG creates32random
bytes; only SHA256 is saved. One active link per owner expires after365days. Rotation/revocation
invalidates the old link. The link stays only in current-account memory and private clipboard on an
explicit copy action, never persistent browser storage or a rendered input/anchor. Calendar services
need the private link to refresh. Anyone possessing it can read the minimal visit schedule; provider
or infrastructure request logs may retain request URLs. Revocation stops future reads, not copies
already retained by a calendar provider.

The feed deliberately accepts that separate capability without a Supabase session: external calendar
readers cannot refresh short-lived user JWTs. The separate management function retains gateway JWT
verification and `auth.getUser`. Service-only, SECURITY INVOKER SQL binds the hash lookup, expiry,
per-link6/minute limit and owner query in one transaction. Direct anon/authenticated table/RPC access
is revoked and RLS enabled. Feed includes only ID, allowlisted service label, schedule/duration,
status/revision and canonical booking link; no address, email, home notes, access codes or GPS.
It publishes90days past /366days future, up to1,000events; overflow/invalid data fail closed rather
than silently truncating. Stable UID, revision and CANCELLED tombstones preserve change identity.
Private no-store/noindex responses; no application request/token logging.

Customers explicitly add the subscription in their calendar. A file import is still a copy. Refresh
timing is chosen by Apple/Google/Outlook and can be delayed. No paid calendar service, Google write
permission or Apple Developer membership was added. References: [Apple subscriptions](https://support.apple.com/en-za/guide/iphone/iph3d1110d4/ios),
[Google From URL](https://support.google.com/calendar/answer/37100),
[Outlook subscriptions](https://support.microsoft.com/en-us/outlook/import-or-subscribe-to-a-calendar-in-outlook-com-or-outlook-on-the-web),
[Supabase authorization](https://supabase.com/docs/guides/functions/auth-headers).

Validation at prepared source:72focused tests across8files pass, TypeScript/scoped ESLint and Deno
checks pass. Actual isolated PostgreSQL17.6 executes the exact migration and role/privacy/rotation/
expiry/cancellation/rate contract. Removing the owner filter fails the exact-owner assertion; removing
expiry fails expired-link denial; both transaction mutations roll back and the original passes again.
The first UI test exposed a transient pre-refresh copy button and is corrected to wait for acknowledged
active state. A second failure was an inaccurate disable mock and was corrected to return disabled.
The ported server address input passes its10checks; BookingFlow23checks pass without suppressing the
new provider component. No real normal-JWT calendar connection, provider import/refresh, phone
acceptance, independent patch signoff or production activation is claimed by these local checks.

Delivery status: not yet staged or production. VITE_CALENDAR_SYNC_ENABLED remains off by default.
Required GitHub checks are blocked by exhausted included Actions minutes; no gate bypass or paid
upgrade. Record actual delivery/readback separately before enabling any preview flag.
