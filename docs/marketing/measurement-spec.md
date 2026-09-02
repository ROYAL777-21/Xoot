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

## OpenRush — connected, and it closes the AEO measurement gap

Verified 2026-08-27 via `describe_capabilities`. The tools that matter need **no owned-data
connection**:

| Tool | Gives us | Credits |
|---|---|---|
| `discover_ai_citations` | Which sources AI cites in our category | 22 |
| `inspect_ai_visibility` | How xoot.co.za appears in AI answers vs named competitors | 20 |
| `compare_keyword_coverage` | Keyword gap vs competitors | 12 |
| `discover_competitors` | Who actually competes organically | 7 |
| `research_keywords` / `inspect_keyword` / `inspect_serp` | Demand, detail, live SERP | 3 / 5 / 2 |
| `audit_site` | Technical + content health crawl | 9 |
| `compare_backlink_gap` | Referring domains linking to N competitors | 40 |

> ⚠️ **OpenRush defaults to `location: "United States", language: "English"`. Override to South
> Africa on every single call.** This is the same trap `xoot-content` documents for the Semrush
> `za` database: the wrong market returns numbers that are confident and useless.

**Cadence, to control credit spend:** AI-visibility monthly · keyword and SERP work weekly ·
backlink gap quarterly. `inspect_serp` and `research_keywords` are cheap enough to run freely.

`get_search_performance` and `get_website_analytics` **do** require connections (Search Console,
analytics property) — both are items 1 and 4 below, which upgrades OpenRush from external
estimates to Xoot's own numbers.

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
