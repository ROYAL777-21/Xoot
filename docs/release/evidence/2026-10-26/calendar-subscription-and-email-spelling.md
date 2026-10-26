# Automatic calendar subscription and email spelling — 26 October 2026

Founder reports missing signup PIN on live xoot.co.za. The supplied `.vom` spelling was subsequently
clarified as a chat typo; do not assert it caused the live failure. Production read-only finds the
existing `.com` account confirmed. Audit records user_repeated_signup at16:03UTC and successful login
at16:04UTC on26October; the24-hour Auth log lookup returns that signup200, not a demonstrated SMTP
error. This supports existing-account recovery, not a claim that all new signups or email delivery
work. A generic sign-in exit is added to confirmation without exposing whether an account exists.
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

Independent review of0b5f7cb found and reproduced a stale-account action during delayed SHA256 and
same-second revision collisions, plus missing RPC/config guard declarations. Corrections add a strict
expectedSubject deny-precondition against verified Auth before every status/enable/disable read or
write, an immediate post-digest current-account check, exact RPC types and a narrow capability-only
gateway exception. Caller-provided owner IDs never select the acting user. A private SECURITY INVOKER
booking trigger now forces revision0on insert, preserves it for irrelevant updates and increments the
stored OLD revision under the row lock for service/schedule/duration/status changes. Caller-supplied
revisions are ignored. Calendar SEQUENCE uses that durable integer, including same-second changes.
The original updated_at trigger, booking policies and monetary calculations are untouched.

Revised local checks:56tests across the six calendar/Auth/config/RPC suites pass; TS/scoped lint/Deno
pass before the final additional type declaration. Exact revised SQL passes real PostgreSQL17.6,
including attempted revision forgery, unchanged fields and reschedule/cancel0→1→2. Two concurrent
service connections return revisions1and2at the same supplied timestamp and leave revision2.
Three independently targeted negative controls (owner predicate, expiry and revision trigger) fail at
their exact assertions, roll back and restore a passing original. The first concurrent/negative run
shared a fixture and failed for the wrong reason; the retained runner now executes those checks
serially and verifies each expected failure message. Initial DOM scanner rejected a test's innerHTML
read; the test now inspects text and attributes without that API. Remaining scanner checks pass.

Delivery status: not yet staged or production. VITE_CALENDAR_SYNC_ENABLED remains off by default.
Required GitHub checks are blocked by exhausted included Actions minutes; no gate bypass or paid
upgrade. Record actual delivery/readback separately before enabling any preview flag.
