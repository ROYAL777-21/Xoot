# External tools — install notes and rules of engagement

Two tools the founder asked to bring in on 2026-08-02. Both are genuinely useful here. Neither
is installed yet, because both need something this environment does not have, and one of them
must not be run casually.

## Strix — `usestrix/strix`

Open-source AI penetration testing. Apache 2.0. It does not just scan: it builds working
proof-of-concept exploits, which is exactly the difference between a report you can act on and
a list of maybes.

**Why it fits.** `docs/xoot-security-mandate.md` says self-audit only finds the bug class you
thought to look for. This session found one systemic class — column-level write escalation —
and that does not prove there is not another nobody has looked for. Strix is the cheapest way
to look with different eyes before paying for a human engagement.

**Requirements:** Docker running, plus an LLM API key (`STRIX_LLM`, `LLM_API_KEY`). Install is
`curl -sSL https://strix.ai/install | bash`.

**Blocked on:** Docker. `blocker.md` records that Docker is unavailable on the founder's
Windows host, which is the same thing blocking a local Supabase reset. Solve once, unblock
both.

### Rules of engagement — read before running it

1. **Staging only.** Never point it at `mvlrkelahhsyjrwgsxaf`. It writes real exploit traffic;
   against production that is an incident, not a test.
2. **Seed staging with synthetic data first.** An exploit PoC against a real customer's gate
   code is a breach you caused. Staging currently holds 4 auth users and no
   `sensitive_booking_access` rows — keep it that way, or use fabricated values.
3. **Authorisation in writing before any hosted target.** Testing infrastructure you do not
   own — Supabase, Netlify, Hostinger, Cloudflare — needs their permission, and each has its
   own policy. Testing your own application logic on your own project does not.
4. **Rotate anything it touches.** It will handle tokens. Assume every credential in the run
   is burned.
5. **Its findings are input, not verdict.** Confirm each one the way this session confirmed
   the write surface: read the live catalogue, then decide. An AI pentester overstates for the
   same reason I did — reading one layer in isolation.

Do not run it against production even if asked casually. That is a decision that needs to be
made deliberately, with a window and a rollback, not in passing.

## last30days — `mvanhorn/last30days-skill`

Searches Reddit, X, YouTube, Hacker News, arXiv, Techmeme and others at once, ranked by actual
engagement rather than by editorial or SEO signal. Its own description: *"An AI agent-led
search engine scored by upvotes, likes, and real money — not editors."*

**Why it fits.** The `xoot-content` skill needs to know what South African households actually
say and search, in their own words. Keyword tools give volume for phrasings you already
thought of; this surfaces the phrasings you did not. It is the better input for hooks and for
the problem-shaped queries that outperform service-shaped ones.

**Requirements:** Python 3.12+. Reddit, Hacker News, Polymarket, GitHub, arXiv and Techmeme
work with no keys. X, YouTube, TikTok, Instagram, Perplexity and Brave need keys or cookies.

**Install:** `/plugin marketplace add mvanhorn/last30days-skill`, or
`npx skills add mvanhorn/last30days-skill -g`.

**Caveat that matters for content.** Engagement-ranked is not the same as true. A highly
upvoted claim about cleaning, pricing, or labour law is evidence of what people *believe*, and
belief is exactly what you want for hooks and objections — but it is not a source for a factual
claim in a post. Facts still come from the repo, the master brief, or law. The `xoot-content`
claim rules apply to anything sourced this way, without exception.

## Skills created in-repo the same day

- **`xoot-authz-audit`** — the grant × policy method, which is the one genuinely transferable
  thing this session produced. Encoded because it was learned by getting it wrong first: the
  first run of that audit reported a booking-price hole that was not reachable.
- **`xoot-content`** — SA local SEO plus the claim rules that keep a blog post from becoming a
  CPA s41 problem. Composes with the existing `seo-*` and `marketing-*` skills rather than
  duplicating them.
