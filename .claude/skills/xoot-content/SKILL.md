---
name: xoot-content
description: >
  Write and plan Xoot's blog and local-SEO content for South Africa — daily posts,
  suburb landing pages, hooks, keyword targeting, and internal linking. Enforces the
  claim rules that make SA consumer law survivable, so no post promises something the
  product cannot do. Use when asked to write a blog post, plan content, do keyword
  research for Xoot, write meta descriptions, or grow organic reach.
user-invocable: true
---

# Xoot content

Composes with the generic `seo-audit`, `seo-technical`, `seo-schema` and
`marketing-copywriting` skills. This one carries what those cannot know: the market, the
claim rules, and the voice.

## Founder decisions — 2026-08-02

These are settled. Do not re-open them in a draft.

- **The blog lives in this repo**, at `xoot.co.za/blog`, as React routes — not WordPress.
  So internal linking, schema and Core Web Vitals are all under our control, and there is no
  separate stack to provision or harden. `blocker.md`'s WordPress section stops being a
  blocker for the blog specifically.
- **No prices in blog posts unless the founder asks for them.** Stronger than the CPA rule
  below, and it makes posts durable: a post with no number in it never goes stale, never needs
  a sweep when a ladder changes, and can never misquote one. Link to the live pricing page and
  let that be the single place a number appears. If a post genuinely cannot work without a
  price, ask first.
- **All four audiences**, run as rotating campaigns rather than blended together — households,
  Airbnb and property managers, Xooter recruitment, small offices.
- **Care+ is the founding member price**: "R99/month, locked for as long as you stay a
  member." No discount claim, no struck-through figure. A two-month free trial may be added
  later, on request only.

## Who this is written for, and the line not to cross

The founder asked for content specific to women. That is the right call and it is not a
guess: in South Africa both sides of this market are overwhelmingly women — most Xooters are
women, and in most households the person who books, briefs and worries about cleaning is a
woman. Writing to a neutral "homeowner" is writing to nobody.

**The line.** There is a version of this that damages the brand badly, and it is the obvious
version: content that treats cleaning as women's natural duty. "Tips for the busy housewife",
"how to keep your husband's home tidy", anything implying the mess is her failing. For a
company whose workers are women, that is not just distasteful — it tells every Xooter what
Xoot thinks she is.

Write to her as **the person who decides**, not the person who should be scrubbing:

| Write this | Never this |
|---|---|
| The one who carries the mental load and is choosing to put it down | The one whose job it was all along |
| A professional buying back her Saturday | A wife keeping house |
| A mother deciding what her weekend is for | A mother who should be doing more |
| A Xooter running her own book of clients, skilled and paid for it | A "girl", a "maid", "help" |
| "Your home" | "His home", "the family home" |

Two more, specific to this market:

- **Never imply the reader employs a domestic worker in the old sense.** Xoot is a booking
  between two adults, one of whom is running a business. The language of employment — "your
  girl", "the help", "staff" — is a different relationship with a different history.
- **Safety content is written for a woman who has thought about it.** A stranger in your home
  is not a hypothetical concern for most South African women; it is the first objection. Do
  not talk around it, and do not be breezy about it. Say what the vetting actually is.

## Emotive, meaning something specific

"Emotive" is not adjectives. It is naming a feeling the reader already has and has not seen
written down. Four that are real here:

1. **The mental load.** Not the cleaning — the remembering. Who is coming, what needs doing,
   whether the cupboard has bleach. The relief Xoot sells is mostly the relief of not holding
   that list.
2. **The specific guilt of a house you have not got to.** Everybody has stood in a doorway at
   9pm and decided to deal with it tomorrow. Naming that without judgement earns more trust
   than any feature.
3. **Coming home to it done.** The single strongest moment in this product. Write the moment,
   not the service: the door, the light, the smell, the not-having-to.
4. **On the Xooter side — being trusted with someone's home, and what the work pays for.**
   Pride and independence, not gratitude. She is not lucky to be there.

How to do it without slipping into brochure:

- **One concrete detail beats three adjectives.** "The corner of the kitchen counter where the
  post piles up" lands; "immaculate, sparkling, pristine" does not.
- **Second person, and specific.** "You" once per paragraph is plenty.
- **Earn the feeling before you use it.** The emotional line goes after the useful information,
  never instead of it.
- **No manufactured anxiety.** Do not invent a fear to sell the fix — the real ones are
  sufficient, and inventing them is the same s41 problem in a softer register.

## The hard rule, before anything else

**A blog post is a representation.** The Consumer Protection Act 68 of 2008 does not treat
marketing copy as a lesser class of statement: s41 prohibits misleading representations
regardless of intent, and s30 prohibits presenting a price as a reduction from one never
actually charged.

So, in every post:

- **No price that is not live in `supabase/functions/_shared/pricing.ts`.** Prices change;
  posts do not. Prefer "from R—" phrasing linked to the live page over a number in prose, and
  never state a price the ladder cannot produce.
- **No benefit the system cannot deliver today.** If a feature is behind a readiness constant
  (`TIP_READINESS`, `SAFETY_READINESS`, `canOfferTip`, `canArmSos`), it does not appear in a
  post. Check the constant, do not check your memory of it.
- **No "up to X%" saving** without the arithmetic behind it and the segment it is true for.
  Care+ breaks even at 2.54 bookings a month — a fortnightly household is worse off, so
  "members save money" is false for a large share of readers. See
  `docs/care-plus-paywall-copy.md`.
- **No claim about vetting** beyond what verification actually performs. "Background checked"
  means a completed SAPS check, not a submitted one.
- Say "Xooter", never "cleaner" or "maid". The second is inaccurate; the third carries
  history this company should not.

When a draft needs a claim that fails these, write the post without it and say so, rather
than softening the claim until it technically passes.

## What South African local SEO actually rewards

- **Suburb, not city.** "Cleaning service Bryanston" converts and ranks; "cleaning service
  South Africa" does neither. The launch regions are listed in
  `supabase/functions/_shared/action-utils.ts` (`approvedLaunchRegions`) — Midrand, Sandton,
  Bryanston, Bedfordview, Rosebank, Parkhurst, Melville, Fourways, Waterfall, Dainfern, Hyde
  Park, Braamfontein. **Do not write a landing page for a suburb Xoot does not serve.** A page
  that ranks and cannot be fulfilled is a complaint, not a lead.
- **Write in South African English.** Geyser, not water heater. Stoep, braai, load-shedding,
  domestic worker, body corporate, complex, estate. "Organise", "colour", "R" before the
  amount with a space: R450.
- **Local intent is seasonal and specific**: load-shedding cleanup, dust in Highveld winter,
  pre-Diwali and pre-Christmas deep cleans, post-braai, spring cleaning in September, moving
  season at month-end, Airbnb turnovers around long weekends and school holidays.
- **The real search queries are problems, not services.** "How to get red wine out of a
  carpet", "how often should you clean a geyser", "what does a deep clean include", "how much
  should I pay a domestic worker in South Africa". Answer the question properly; the service
  is the natural next step, not the subject.

## Hooks that work here

Lead with the reader's situation, not the company's. Three that consistently earn the click:

1. **The specific cost of not knowing** — "Most Joburg households overpay for a deep clean by
   about R300, because of one thing nobody explains at booking."
2. **The question they have already typed** — "What is actually included in a deep clean?"
   Then answer it in the first two sentences, before any pitch.
3. **The local, dated observation** — "Highveld dust peaks in August. Here is what that does
   to a house, and what to do about it."

Never a hook the article does not pay off. A headline that overpromises is the same s41
problem as a price that overpromises, and it is the one readers punish immediately.

## Structure of a post

- **Title** ≤ 60 characters, primary keyword early, no clickbait.
- **Meta description** ≤ 155 characters, contains the keyword and a reason to click.
- **First 100 words answer the question in the title.** No throat-clearing.
- H2s that are themselves searchable questions.
- One table or list where it genuinely helps — not as decoration.
- **Internal links**: at least one to a service page, one to a suburb page, one to another
  post. Descriptive anchors, never "click here".
- **Schema**: `Article` plus `FAQPage` where there are real questions; `LocalBusiness` on
  suburb pages. Use the `seo-schema` skill.
- **CTA** matched to intent: an informational post earns a newsletter or a guide, not a
  booking button.

## Cadence — seven a week, rotated by audience

The founder chose daily after being told thin daily output is what Google's helpful-content
systems demote. The way to make seven a week survive that is **rotation**: give each day its
own audience and intent, so no two posts compete for the same query and none is a thinner
version of another. Seven posts serving four audiences is a content programme; seven posts
serving one audience is cannibalisation.

| Day | Audience | Type |
|---|---|---|
| Mon | Households | Problem / how-to — the largest search volume |
| Tue | Airbnb & property managers | Turnover, changeover, guest-ready, linen |
| Wed | Households | Comparison or "what's included" — commercial intent |
| Thu | Small offices | Recurring cleans, invoicing, reliability, B2B register |
| Fri | Xooter recruitment | Earnings, how to apply, what the work is like |
| Sat | Households | Seasonal or news-pegged — freshness and links |
| Sun | Any | Evergreen, or a genuine repurpose of the week's best |

Rules that keep this from degrading:

- **A post that has nothing new to say does not ship.** Skipping a day costs less than
  publishing filler, because filler is scored against the whole domain, not just that URL.
- **No two posts in a fortnight target the same primary keyword.** Keep a running list.
- **Friday's recruitment post is not a lesser post.** It is the cheapest recruitment channel
  in the business and it feeds the supply side, which is the constraint.
- **Sunday's repurpose must add something** — a new angle, updated data, a different audience's
  framing. Reposting is not repurposing.

## Research inputs

- **Semrush MCP** for keyword volume, difficulty and SERP gaps. Set `database` to `za`, not
  `us` — the default is wrong for this market and will produce confidently useless numbers.
- **`last30days`** (if installed) for what people are actually saying, ranked by engagement
  rather than by SEO. Good for finding the phrasing real people use.
- The repo itself for what is true: pricing ladders, readiness constants, launch regions.

## Before publishing

1. Every claim traced to code or to the master brief.
2. Every price checked against the live ladder.
3. Suburb served, and spelled the way locals spell it.
4. Title, meta, H1 distinct from each other.
5. Internal links resolve.
6. Read it aloud — if it sounds like a brochure, rewrite the first paragraph.

## Answer-engine optimisation — added 2026-08-26

Everything above still holds. This section adds the second audience: an assistant that will read
the page and answer on your behalf, sending no click at all. The goal shifts from *ranking* to
**being the passage that gets quoted**.

**Why coverage beats keywords now.** An assistant fans one prompt out into many sub-searches and
assembles an answer. A page that half-covers a topic is never the source. So finish a topic —
the question, its sub-questions, its objections and its local variants — before starting the
next. Depth on one subject beats thin coverage of five.

**Three levers decide citation:** consensus (the same claim about you appearing in several
places), freshness (recent wins), and authority (classic SEO underneath — none of this replaces
it).

**Write passages that lift cleanly:**

- **BLUF.** The answer in the first 40–60 words under the H2, self-contained. An engine takes
  the first passage that stands alone; a paragraph that depends on the one before it is skipped.
- **Atomic.** One claim per paragraph.
- **Declarative, with the qualifier attached.** "A three-bedroom deep clean in Bryanston takes
  4–6 hours" is liftable. "It depends" is not.
- **Entity-rich.** Suburbs, services, standards, real processes, real numbers where permitted.
- **Structure.** Lists and comparison tables are disproportionately quoted.

**Mentions matter more than pages.** A branded mention on a third-party site, in a community
thread, or in a review is a stronger AI-visibility signal than anything self-published. Three
tiers: editorial, UGC communities, own properties. Earn them honestly — never astroturf a forum,
which is both against every platform's rules and, when found, the sort of story that ends a local
brand.

**YouTube is disproportionately cited.** Optimise for search hits, not virality: keyword in
title, description **and spoken audio**, since transcripts are indexed.

**Technical, and check it first.** Verify `public/robots.txt` and the Netlify headers do not
block `GPTBot`, `OAI-SearchBot`, `ChatGPT-User`, `PerplexityBot`, `ClaudeBot`, `Claude-Web`,
`Google-Extended`, `Applebot-Extended`. **An accidental `Disallow` is the most common cause of
zero AI visibility** — confirm before proposing any citation strategy.

**Measure it.** AI referrals by referrer host, crawler hits by user-agent, and self-reported
attribution ("how did you hear about us") at booking. Crawler hits move weeks before citations
do, so they are the leading indicator.
