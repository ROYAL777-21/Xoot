# Booking chat read correction — 26 October 2026

## Actual failure and correction

Two genuine four-account staging runs inserted ciphertext but the assigned Xooter REST read
returned HTTP500 / SQLSTATE42P17. The deployed SELECT policies formed a cycle:
messages → bookings → xooter_jobs → bookings. These failed runs are not chat acceptance.

The reviewed SQL changes only bookings_participant_read. A boolean predicate in the unexposed
private schema binds access to auth.uid(): the booking owner, its current assigned Xooter with
an accepted matching job, or the existing authoritative admin role. It accepts no caller actor
and returns no row data. Original message/job policies and write privileges remain unchanged.
The inherited role-only admin branch does not constitute MFA acceptance. Household access codes
remain subject to the separate sensitive-access function/window.

## Reviewed and deployed source

- SQL implementation reviewed at8c36582; bounded harness reviewed at050e04c.
- CLI originally generated20261026020929_booking_chat_nonrecursive_read.sql.
- MCP applied the exact SQL only to fxmxyabdjqviqbcxmvlp, recording actual version20261026024032.
  The local filename and harness reference were aligned to that ledger version; no duplicate remains.
- SQL SHA256:87770e5317056987ea91a4e559bc2e7fd4221f3be9a3faa9558a2f26ae47058d.
- The ledger's sole statement equals the reviewed source after trimming surrounding whitespace.
- Owner UI readback: exposed schemas public and graphql_public; private unchecked. No setting changed.
- Catalogue readback: postgres trusted bypass-RLS owner, SECURITY DEFINER, empty search_path,
  EXECUTE authenticated only (anon/service_role false), no client schema CREATE, all three tables'
  RLS enabled, message/job policies identical to the pre-apply snapshot.
- Production read-only ledger contains neither the original nor applied migration version/name.
  No production apply or broad migration repair/push occurred.

## Meaningful verification

Isolated PostgreSQL17 reproduced42P17 on the old policy, then passed exact booking/job/message
row checks for owner/current accepted worker and denials for outsiders, offered/declined workers,
reassignment, null/missing IDs and forged user metadata. Existing admin role semantics were tested
separately. No write grants or other policies changed. Removing the accepted-job check failed its
negative control. Restoring the old policy with bounded statement/lock/process timeouts failed
specifically42P17, then the positive passed. An earlier invoker experiment exhausted local memory;
it is invalid assertion evidence, was replaced, and its two synthetic databases were removed.
Final local synthetic database count was zero; the exact labelled local container was removed.

After the fix, the founder privately completed four fresh ordinary staging Auth sign-ins.
The existing reviewed parent/child harness atf6dd7b6 passed all9 groups:

1. Four distinct normal, non-anonymous subjects.
2. No-auth, outsider and forged customer GPS publishing denied.
3. Consent, accuracy, stale and replay boundaries enforced.
4. Assigned customer sees only fresh no-store GPS, without history.
5. Actual Mapbox road ETA on synthetic public test inputs; no private route/points returned.
6. STOP removes location/ETA without disturbing the second customer's booking.
7. Real library encryption → normal-JWT server send → stored ciphertext → assigned read →
   real library decrypt succeeds in both customer/worker directions.
8. Unrelated customer/worker key lookup, ciphertext read and send denied; plaintext rejected.
9. Participant voice gate returns feature_disabled without a provider token; outsiders denied.
   No Twilio provider call was made.

Parent reports Passed /9 /cleanup Confirmed; the non-sensitive receipt says bodyChecks passed.
Before fixture deletion:2 ciphertext messages,2 test devices, both revoked,0 GPS points.
After rollback-rehearsed committed cleanup:0 bookings/jobs/synthetic workers/messages/GPS.
The2 revoked public test-device records remain as audit metadata. Normal Auth users remain.
No code, password, JWT, private device key or message plaintext is included in this evidence.

## Remaining gates

This accepts the tested staging REST/cryptographic paths; it does not accept BookingDetail's
real browser rendering, Realtime delivery, admin AAL1/AAL2, physical-device GPS/background behaviour,
signed native builds, live Twilio audio or production activation. Source review and stage success
do not replace required release CI, provider/worker readiness or safe production migration review.
Staging advisors retain the prior service-only no-policy INFOs, public safety-PIN warning and
leaked-password-protection warning; no new exposed predicate warning appeared.
