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
An SMTP key already used by Supabase Auth is not a Brevo REST API key. Actual secret presence,
sender/domain approval and private founder-inbox acceptance are still to be established for the
new sender. [Official SMTP guidance](https://developers.brevo.com/docs/smtp-integration).

Release status: implementation in progress. No new production notification migration, schedule
or external delivery is claimed by this document. The deployed website is release2a459bdd,
Vercel dpl_4fm1ii63PdWJntDBmug3FynFLU9e READY, and production scanner processing stays closed.
