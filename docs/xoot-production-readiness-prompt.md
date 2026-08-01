# Xoot — Production Readiness Prompt

**Purpose.** Paste this at the start of any session that will touch Xoot code heading
for release. It is the standing brief for shipping a two-sided marketplace holding South
African consumers' home-access data at roughly 100,000 users.

**Status:** companion to `docs/xoot-master-brief.md` (what to build) and
`docs/implementation/decision-log.md` (what was decided). This is *how to build it so it
can ship.* Where they conflict, the master brief wins on product and this wins on
engineering practice.

**Written 2026-07-30.** Sections marked **OPEN** are unresolved and are the real
blockers — a reader should treat them as the shortlist, not as caveats.

---

## 0. What this product actually is

Say it plainly, because it sets every bar below.

Xoot sends a vetted stranger into someone's home while they are often not there. The app
holds **gate codes, alarm details, access instructions, addresses, and the times a house
is empty.** For the Xooter side it holds ID documents, banking details, and background
screening results.

That is not "an app with a login". A breach here is a home invasion kit for tens of
thousands of households, and a POPIA notifiable incident on the same day. Every decision
below follows from that sentence, and any trade-off that treats this data as ordinary
customer data is wrong regardless of how it is argued.

**The reflex to build:** before writing a feature, ask *what does this let someone learn
about when a house is empty and how to get into it?* If the answer is "something", the
feature needs an access rule before it needs a UI.

---

## 1. Non-negotiables

These are not preferences. Break one and the release does not go.

1. **No secret in the client, ever.** Anything in `src/`, `mobile/src/` or a built
   bundle is public. Service-role keys, provider secrets and signing keys live in Edge
   Functions or the server environment. `npm run security:scan` and
   `npm run build:artifact-scan` enforce this — keep them in CI and do not add
   exceptions.
2. **Row Level Security on every table holding user data, with a deny default.** A table
   without RLS is readable by anyone with the anon key, which ships in the app.
3. **RLS is row-level, not column-level.** A sensitive column on a table someone can
   already read is readable by them. This has already bitten once (ZD-023): a tip on
   `bookings` would have been visible to every assigned Xooter. Sensitive columns need
   their own table.
4. **Money in integer cents, server-authoritative.** The client may display a price; it
   may never determine one. See `supabase/functions/_shared/pricing.ts` and the parity
   test that pins it to the client ladders.
5. **No claim in the UI that the system cannot honour.** Under the Consumer Protection
   Act a price or benefit representation is a legal statement. `src/lib/tipping.ts` shows
   the pattern: the claim is gated behind a constant, and a test asserts it cannot render
   while the constant is unset.
6. **Every destructive or irreversible action is confirmable, logged, and reversible by
   support.** Cancellations, refunds, account deletion, Xooter deactivation.
7. **Nothing ships to production without the gate green:** `npm run verify` plus
   `npm run mobile:typecheck`.

---

## 2. Data protection — POPIA, and why the defaults are not enough

South Africa's Protection of Personal Information Act applies in full. It is not GDPR
with different words; the differences that matter here:

- **An Information Officer must be registered** with the Information Regulator. This is a
  named person with statutory duties. **OPEN — no entity or Information Officer details
  are recorded** (`decision-log.md`, Pending Founder Decisions #8). This blocks the
  privacy policy being truthful and blocks store submission.
- **Special personal information** includes biometric data and criminal history. Xooter
  background screening touches both. It needs either explicit consent or an authorised
  ground, and the consent has to be specific — a general T&C acceptance does not cover it.
- **Breach notification** goes to the Regulator *and* to every affected data subject, as
  soon as reasonably possible. There is no risk-based exemption as generous as GDPR's.
  You need an incident runbook that can produce the affected-subject list quickly, which
  in practice means knowing which tables hold what.
- **Cross-border transfer** (s72) restricts sending personal information outside South
  Africa. Supabase, Sentry, PostHog, Brevo and Twilio are all likely non-SA. Each needs a
  lawful basis — usually the data subject's consent or a contract with adequate
  safeguards. **OPEN — this has not been assessed.** It is the single most commonly
  missed POPIA obligation for SA startups on a US stack.

**Practical requirements:**

| Requirement | Where it lands |
|---|---|
| Data inventory: every table, what personal information it holds, retention period | New — does not exist |
| Retention and deletion: access codes and alarm details purged on a schedule, not kept forever | `sensitive_data_revoked_at` exists on bookings; verify it is enforced server-side |
| Subject access request: export everything about a person | New |
| Deletion request: honour it without breaking financial records | `pages/legal/AccountDeletion.tsx` exists; verify the backend actually deletes |
| Consent record: what they agreed to, when, which version | **OPEN** — `TermsNotice` shows the notice but nothing records acceptance |

That last row matters more than it looks. Implicit acceptance (ZD-021) is defensible only
if you can later prove *what* was shown and *when*. Store a version identifier and a
timestamp per user at sign-up.

---

## 3. Security posture

**Threat model, in priority order.** Build against these specifically, not against a
generic OWASP list.

1. **A malicious or compromised Xooter account** harvesting customer addresses and access
   codes at scale. This is the highest-severity realistic attack and the least defended
   against by default. Mitigations: access to sensitive booking fields only within a
   time window around the job, rate limits on how many bookings one account can read,
   alerting on bulk reads.
2. **A compromised customer account** used to book a Xooter to an address the attacker
   does not control, or to harvest Xooter identities.
3. **Direct API abuse with the anon key.** The key is public. Assume every RLS policy is
   probed. The booking price hole found on 2026-07-30 was exactly this shape — a valid
   session and one PATCH.
4. **A compromised admin session.** Which is why ZD-021 keeps prices in code rather than
   in an admin-editable table.
5. **Supply chain.** A malicious dependency update reaching a bundle that handles
   addresses.

**Controls that must exist before launch:**

- **MFA for every admin and staff account.** No exceptions, including the founder.
- **Leaked-password protection enabled** on both Supabase projects. This is one toggle
  and it is currently **off on production and staging** — the oldest open security item
  in this project.
- **Rate limiting** on auth, booking creation, and any endpoint returning addresses.
- **Audit log** for every admin action and every read of sensitive booking data. Not for
  compliance theatre — so that after an incident you can tell a customer whether their
  gate code was accessed.
- **Dependency scanning in CI**, with a policy for what blocks a release.
- **Secret rotation runbook.** Assume a key leaks; how fast can you rotate it, and what
  breaks while you do?
- **The `claude-code-security-review` action stays on** and its findings are triaged, not
  dismissed in bulk.

---

## 4. Reliability at 100,000 users

The number changes what breaks. Specifics rather than platitudes:

- **Booking creation is the contended path.** Two customers booking the last Xooter in a
  suburb at the same moment must not both succeed. This needs a transaction and a
  uniqueness constraint, not application-level checking.
- **Connection limits.** Supabase Postgres has a connection ceiling; Edge Functions
  under load will hit it before CPU. Use a pooler and know the number.
- **N+1 reads in list views** are invisible at 100 users and fatal at 100,000. The
  bookings list, the Xooter jobs list and the admin queue are the three to check.
- **Indexes on every foreign key used in an RLS policy.** RLS predicates run per row; an
  unindexed `zooter_id` in a policy turns a list query into a sequential scan.
- **Realtime subscriptions** (`messages`, booking status) hold connections. Budget them.
- **Push notification fan-out** must be queued, not synchronous in a request.
- **Idempotency keys** on payment and booking mutations. Mobile networks retry; a double
  booking is a double charge.

**Load testing exists** (`scripts/load/`) — including a 10k staging readiness script.
Run it against realistic data volumes, not an empty database, because RLS costs scale
with row count.

---

## 5. Payments and money

South African specifics that catch people out:

- **Payment provider.** **OPEN** (`decision-log.md` #4). PayFast, Peach, Yoco and Stripe
  all have different SA settlement, chargeback and PCI implications. This decision gates
  the entire payments phase.
- **Never handle raw card data.** Provider-hosted fields or a redirect. Anything else
  puts you in PCI-DSS scope you cannot afford.
- **Reconciliation.** Every rand in must map to a booking, a membership, a tip or a
  refund. `payment_records` exists; make it complete before volume, not after.
- **Xooter payouts** are the other half and the one that generates disputes. A Xooter who
  is underpaid once will tell every other Xooter.
- **VAT.** Registration is compulsory above R1m turnover in 12 months. At 100k users you
  will cross it. Invoices must show VAT correctly from the day you register, and tips to
  contractors have their own treatment (**OPEN**, master brief §6.1 q3).
- **Refunds and cancellations** must match `pages/legal/RefundsCancellations.tsx`
  exactly. If the code and the policy differ, the policy is what a court reads.

---

## 6. Accessibility, and why it is not optional here

The customer base includes older users booking for parents and users on low-end Android
devices with large system font settings. Beyond that, the App Store and Play Store both
review for it.

- **WCAG AA contrast (4.5:1 for body text).** Already enforced in the token layer — three
  failures were found and fixed this way.
- **Minimum 44pt tap targets.** `MIN_TAP_TARGET` in `design-tokens.ts`.
- **Every icon-only control has an accessible name.**
- **Dynamic Type / font scaling must not break layouts.** Test at the largest setting.
- **`prefers-reduced-motion` respected everywhere** — the splash already does.
- **Screen reader pass** on booking, payment and account deletion at minimum. These are
  the flows where being stuck is most costly.

---

## 7. Observability

You cannot operate this blind at 100k users.

- **Structured logs with a correlation ID** through the whole booking lifecycle.
- **Never log** addresses, gate codes, ID numbers, tokens or full names. Log identifiers
  and look them up. A log aggregator is a second copy of your database with weaker
  access control.
- **Error tracking** (Sentry is wired) with PII scrubbing verified, not assumed.
- **Product analytics** (PostHog is wired) — same rule, and note that behavioural data
  about when someone is home is itself sensitive.
- **Alerts on what matters:** booking failure rate, payment failure rate, auth failure
  spike, Edge Function error rate, unusual bulk reads of sensitive fields.
- **A dashboard someone actually looks at daily.**

---

## 8. Release engineering

- **Staging must mirror production schema.** **OPEN** — ZD-005, the schema source of
  truth, is unresolved and has been the longest-standing blocker in this project. Nothing
  about migrations is safe until it is settled. This is the highest-leverage open item.
- **Migrations are forward-only and reversible in effect.** No editing an applied
  migration.
- **Every migration reviewed for lock behaviour.** An `ALTER TABLE` that rewrites a large
  table takes the site down.
- **Feature flags for anything risky**, so a bad release is a toggle rather than a
  rollback.
- **EAS build profiles are configured**; `expo prebuild` runs clean as of 2026-07-30.
- **Store submissions need real answers** to the privacy questionnaire. ZD-014 says none
  is submitted without legal sign-off — hold that line, because a wrong privacy
  declaration is a misrepresentation to Apple and to users simultaneously.

---

## 9. How to work in this codebase

Conventions that already hold here, and which a new session should match:

- **Comments explain *why*, and especially why not the obvious alternative.** The
  codebase is full of these because most of them were learned by getting it wrong first.
- **A duplicated definition is only safe with a test proving it is still a duplicate.**
  See `shared-native-sync.test.ts` and `design-tokens.test.ts`.
- **Tests assert properties, not snapshots.** "The tip is never visible before
  settlement", not "the component renders this HTML".
- **Every tunable is a named constant at the top of its module** (ZD-021), so a price or
  a policy change is one edit in one place.
- **Verify by running, not by reading.** Four defects in the splash work were only
  visible in a rendered frame; two iOS faults only in `expo prebuild` output.
- **Report honestly.** If a test fails, say so with the output. If something was skipped,
  say that. Do not describe intent as achievement.

---

## 10. The open list, in the order it should be closed

Everything above is achievable. These are what actually block a release:

1. **Schema source of truth** (ZD-005). Blocks every migration, including two written
   and waiting.
2. **Apply the booking price guard** (`20260730083000`). A customer can currently set
   their own booking price to zero and an assigned Xooter can raise the price of a job
   they are working. Written, unapplied, independent of everything else.
3. **Leaked-password protection** on both Supabase projects. One toggle each.
4. **Legal entity and Information Officer** (Pending #8). Blocks the privacy policy and
   store submission.
5. **Cross-border transfer assessment** under POPIA s72 for every non-SA processor.
6. **Payment provider decision** (Pending #4). Blocks payments, payouts and tip
   settlement.
7. **Consent recording** — version and timestamp per user at sign-up.
8. **Twilio classification** (ZD-009). The current messaging service is classified as
   marketing and cannot carry operational traffic.

---

## 11. What to do when a rule here conflicts with shipping

Say so, in the open, with the trade-off named. Do not quietly relax it and do not quietly
block on it either.

The rules most likely to feel expensive are §1.4 (server-authoritative money) and §2's
consent recording. Both are cheap now and extremely expensive to retrofit after
50,000 users have signed up under a T&C version nobody recorded.

The one rule that is never worth trading is §0: this app knows when people's homes are
empty and how to get into them. Everything else is negotiable with a good enough reason.
