# Xoot measurement spec

**Principle: an unmeasured activity is a guess with a budget.** Every marketing action declares
its metric, its horizon and its success threshold *before* it runs.

Second principle, and the one that is usually skipped: **write down what would prove you wrong.**
A hypothesis that cannot fail is not a hypothesis.

---

## Honest state of the data, 2026-08-26

Say this plainly rather than reporting confident numbers on top of nothing:

| Source | State |
|---|---|
| Web analytics | **Not installed.** No Netlify Analytics, no GA4, no Plausible |
| App analytics / crash reporting | **Not installed.** No Crashlytics or Sentry in `mobile/` |
| Database | Live and queryable, but **≈0 rows** — no bookings, one auth user |
| Search Console / Bing | Not connected |
| AI referral tracking | Not possible until analytics exist |
| App store metrics | Not published yet |

**Nothing below can report a real number today.** The first job is instrumentation, not
dashboards. Any "growth report" produced before this is fiction.

## The funnel to instrument

| Stage | Metric | Where it comes from |
|---|---|---|
| Reach | impressions, sessions, AI citations | analytics + manual assistant checks |
| Interest | blog sessions, scroll depth, follows | analytics |
| Intent | booking flow started | app event → Supabase |
| Purchase | booking paid | `payment_records` |
| Repeat | 2nd booking ≤30d | `bookings` |
| Retention | 30/60/90-day cohort survival, Care+ churn | `bookings`, memberships |
| Advocacy | reviews, referrals, UGC | reviews, `referrals` |
| Supply | Xooter applications → approved → active | `xooter_applications`, `xooters` |

## What to install, in order

1. **Privacy-respecting web analytics** on `xoot.co.za` — must record referrer host so AI
   traffic (`chatgpt.com`, `perplexity.ai`, `claude.ai`, `gemini.google.com`,
   `copilot.microsoft.com`) is separable from organic. POPIA applies: collect the minimum,
   disclose it, and do not ship a tracker that needs consent you have not obtained.
2. **Crash + error reporting in `mobile/`** — Sentry or Crashlytics. A crash in a booking flow
   is a growth problem measured in lost revenue, and right now it would be invisible.
3. **Server-side funnel events** into Supabase — booking started / abandoned / paid, with the
   step reached. Server-side survives ad blockers and is the only trustworthy funnel.
4. **Search Console + Bing Webmaster.**
5. **Crawler-hit logging by user-agent** — the leading indicator of AI visibility, and it moves
   weeks before citations do.

## Reporting rules

- **Always state `n`.** On a base this small, most differences are noise; saying so is the job,
  not a hedge.
- **Never a blended churn or CAC figure.** Segment by cohort and by acquisition channel — the
  only useful question is which channel brings customers who stay.
- **Never invent a metric.** If it is not instrumented, the answer is "not measured yet, here is
  how we would measure it".
- **Record losses.** `docs/marketing/growth-log.md` keeps every experiment including the failed
  ones. A log of wins only teaches nothing and selects for unfalsifiable bets.
