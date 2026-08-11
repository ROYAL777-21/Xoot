# The daily content routine

Seven posts a week, rotated by audience, published from this repo. This file is the runbook;
`.claude/skills/xoot-content/SKILL.md` is the editorial standard.

## Why it is not switched on yet

The routine fires a session that writes a post and opens a PR. Two things have to be true
first, and neither is true today:

1. **A domain, so publishing means something.** `blocker.md` records that no production domain
   is registered. Posts written now sit in the repo either way; a daily cadence only starts
   earning once they are reachable and indexable.
2. **A human in the loop for the first month.** The founder chose to review before publish.
   The routine is built to open a PR, never to publish directly — so the review step is
   structural rather than a discipline someone has to maintain.

The trigger is created and **disabled**. Enable it on launch day.

## The rotation

| Day | Audience | Angle |
|---|---|---|
| Mon | Households | Problem / how-to — the largest search volume |
| Tue | Airbnb & property | Turnover, changeover, guest-ready, linen |
| Wed | Households | Comparison or "what's included" — commercial intent |
| Thu | Small offices | Recurring cleans, reliability, invoicing, B2B register |
| Fri | Xooter recruitment | Earnings, applying, what the work is like |
| Sat | Households | Seasonal or news-pegged — freshness and links |
| Sun | Any | Evergreen, or a genuine repurpose of the week's best |

## What the routine does each morning

1. Read `src/lib/blog-posts.ts` and take every `primaryKeyword` from the last fortnight.
2. Pick today's audience from the rotation.
3. Choose a keyword **no post has used in fourteen days**. If nothing is available and nothing
   new is worth saying, **skip the day and say so.** Filler is scored against the whole domain,
   not just its own URL, so a missed day is cheaper than a thin one.
4. Draft to `.claude/skills/xoot-content/SKILL.md` — the audience rules, the emotive rules, the
   claim rules.
5. Run `npx vitest run src/lib/blog-posts.test.ts`. Six guards; all must pass.
6. Open a PR. Never commit to the default branch.

## The guards it cannot talk its way past

`src/lib/blog-posts.test.ts` enforces, mechanically:

- **No prices.** Founder rule. Also means a post never goes stale when a ladder changes.
- **Only served suburbs in `areas`** — read from `approvedLaunchRegions` in the Edge Function
  shared module, so the blog cannot claim coverage the dispatcher does not have.
- **No pre-rename slugs.**
- **No two posts on one primary keyword**, and no slug that is a prefix of another.
- **Metadata within the lengths a search result actually shows.**

A draft that fails any of these does not get a PR. That is the point: the editorial standard
is a document and can be argued with; the guards cannot.

## Enabling it

The trigger is **`Xoot daily blog`** (`trig_014pQtc9GKHMc5zxizBQjqSD`) in Routines, created
**disabled**, firing 03:00 UTC / 05:00 SAST daily when enabled.

One limitation worth knowing before it runs: it was created without MCP connectors, so its
sessions have no Supabase or GitHub connector tools. It does not need them — the post is a
data file and a sitemap entry, and the PR is opened with git — but if the routine ever needs
to read live pricing or advisors, it has to be recreated from a session holding those grants,
or from the claude.ai Routines UI.

On launch:

1. Confirm the domain is live and `/blog` is reachable.
2. Enable the trigger.
3. Watch the first week's PRs closely. If two consecutive days produce something you would not
   have published, disable it and fix the skill rather than editing the posts — the skill is
   what generalises.

## Manual run

Invoke the skill directly: `/xoot-content` with the day's audience. Same rules, same guards,
no waiting for the cron.
