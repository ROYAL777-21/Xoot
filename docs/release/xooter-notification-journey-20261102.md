# Xooter notification journey — 2 November 2026

The founder requests welcome, unfinished-onboarding reminders, completion updates, retention,
tips and promotions. Existing notification rows work in-app, but an outbox row is not delivery:
no general Brevo sender currently drains that queue. Build the following bounded journey before
claiming external sends. Preserve transactional status, genuine verification and user choice.

| Event | Source | Channels and limits |
| --- | --- | --- |
| Welcome | First confirmed account enrolment in the Xooter journey | One in-app record and transactional email |
| Continue onboarding | Still incomplete after 24h and 72h | Two reminders maximum; removable in preferences; stop after submission |
| Application received | Actual application submission | In-app and email; says under review, never approved |
| Application needs attention | Actual review transition | Safe prompt only; private review notes stay inside Xoot |
| Onboarding complete | Actual approved application, active Xooter and role | In-app and email; never inferred from uploads or a clean malware scan |
| Profile and customer tips | Approved account, optional tips enabled | In-app first; no earnings guarantee, review manipulation or off-platform contact |
| Return reminder | Optional tips enabled and 14 days inactive | Once per inactivity period, with a seven-day optional-message cap |
| Promotions | Separate explicit consent and a real approved campaign | No invented offers; an unsubscribe path and provider evidence precede email activation |

All recipients must be confirmed, current auth accounts, not an email field supplied in an
application. Event identity and notification/outbox creation are atomic and unique. Anonymous
callers cannot create an event or choose another recipient. Ordinary users may only change their
own preferences. Optional tips/promotions default OFF. No historical bulk campaign is activated.

Email uses Xoot branding, fixed first-party routes, escaped content and only a safe first name.
Addresses, identity/bank documents, private screening notes and access instructions stay in Xoot.
Provider acceptance and confirmed delivery are different states. An uncertain provider result
must not be retried automatically. The new sender consumes only this journey's private records;
it must never drain unrelated historical finance/support outbox rows.

Brevo's [Free plan](https://help.brevo.com/hc/en-us/articles/208580669-FAQs-What-are-the-limits-of-the-Free-plan)
has a shared 300-email daily allowance, including transactional sends. Keep authentication mail
capacity, bounded batches and a separate closed staging test budget; do not buy credits or a plan.
The founder explicitly chose SMTP and to KEEP API IP blocking on. The unused API-key draft was
discarded; no API key or API-policy change occurred. Brevo's actual UI showed Free and300emails
available on2November. The founder privately created/saved a separate standard64character SMTP
key, expiring2February2027. Existing sign-in keys remain untouched. Actual name-only readback,
sender/domain approval and founder-inbox acceptance still precede external activation.

The sender pins smtp-relay.brevo.com:2525, requires STARTTLS/certificate validation, disables
file/URL access and debug logs, and sends to exactly one current confirmed auth email. It never
uses the editable application email. A stable message ID is for correlation, not an SMTP promise
of deduplication. Unknown outcomes remain uncertain with no automatic resend. A private policy
requires a current Free-plan review, named test-account allowlist and nonrenewing20attempt cap.
Optional external retention/promotion mail stays closed pending a reviewed unsubscribe/campaign
path; opt-in in-app tips remain separate. [Official SMTP guidance](https://developers.brevo.com/docs/smtp-integration).

Staging setup names: BREVO_SMTP_USER, BREVO_SMTP_PASSWORD and XOOT_LIFECYCLE_APP_URL (the exact
reviewed preview URL). Never print these credential values or put them in source. Production
SMTP settings, the existing Auth sender and API IP restrictions are not changed by this patch.

Release status: implementation in progress. No new production notification migration, schedule
or external delivery is claimed by this document. The deployed website is release2a459bdd,
Vercel dpl_4fm1ii63PdWJntDBmug3FynFLU9e READY, and production scanner processing stays closed.
