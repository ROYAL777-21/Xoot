# What is in here, and where each thing posts

Regenerate everything: `npx vite build` → `node scripts/marketing/capture-app.mjs` →
`node scripts/marketing/render-ads.mjs` → `node scripts/marketing/render-creatives.mjs`.

⛔ **Nothing here is AI-generated.** The typeset creatives are rendered by Playwright from brand
tokens read out of the handoff at render time; the app frames are screenshots of a real build. The
one generated image in the set is the homepage hero photograph, and it carries its own
`AI-generated illustration` marker drawn by the app.

⛔ **No production data was touched to make any of this.** `capture-app.mjs` serves the built app
locally and intercepts every off-host request; the run prints `no request left this machine` and
exits non-zero if one ever does. Production's *0 bookings, 1 user* is load-bearing evidence in
`NEEDS-FOUNDER.md` and a screenshot is not worth spending it.

---

## `ads/` — 12 postable ad frames, 1080×1350 (Meta 4:5 feed)

Each ad is an **A/B pair**. `-a` is the hook alone; `-b` adds a **call-out** — the "this is for me"
half that `hormozi-playbooks.md` (Hooks) says every one of these was missing. Same image, same hook,
one variable.

| Pair | Hook | Call-out on `-b` | Real screen behind it |
|---|---|---|---|
| `AD-01` | "You've walked past that same pile for eleven days." | Sandton homes | Homepage hero |
| `AD-02` | "A form, a callback, and a price at the end." | Anyone who has phoned for a quote | The six services |
| `AD-03` | "The button stays off until both photos exist." | If you have ever been let into your own home by a stranger | Trust workflow |
| `AD-04` | "Book the same Xooter again." | Care+ members | The Care+ band |
| `AD-05` | "Give someone their weekend back." | For your mother, who will not ask | Gift a clean |
| `AD-06` | "Four hours, every Saturday." | Fourways and Parkhurst | Referral |

⚠️ **Suburb call-outs are read from `src/lib/operations.ts` at render time**, not typed. An ad naming
a suburb Xoot does not serve is a misrepresentation under CPA s41, and gate 5 is supply-before-demand.

## `app/` — 13 screenshots + 2 screen recordings, from the real build

| File | What |
|---|---|
| `site-hero-phone` · `site-hero-desktop` | The hero, both orientations |
| `site-gift-phone` · `site-careplus-phone` | The two sections ported 2026-09-04 |
| `site-services-phone` · `site-services-desktop` | The service catalogue |
| `site-trust-phone` · `site-trust` | Trust workflow, and the trust centre |
| `site-refer-phone` | The referral section |
| `site-care-plus` | The Care+ page |
| **`frame-phone-landscape`** · `frame-ipad` · `frame-laptop` | ⚠️ **Layout checks, not for posting.** The four viewports `Xoot Responsive Check.dc.html` names. Landscape phone had never been rendered before and was broken when it first was |
| `video-home-scroll-phone/*.webm` | 9:16 screen recording, homepage |
| `video-care-plus-phone/*.webm` | 9:16 screen recording, Care+ |

⚠️ **WebM, not MP4.** Playwright's bundled ffmpeg has no H.264 encoder. Instagram and TikTok accept
WebM on upload; if a tool insists on MP4, convert with a real ffmpeg.

## The 17 typeset creatives — one per channel draft

`IG-*`, `FB-*`, `LI-*`, `X-*`, `TT-*`, `SUB-*`, `STORY-*`, `YT-avatar`, `YT-banner`. Each pairs with a
named draft in `docs/marketing/drafts/`. See `MANIFEST.md` for the pairing and sizes.

---

## ⛔ What is NOT here, and why

`docs/marketing/held-content/` holds finished copy that **cannot be published yet** — the gift
campaign (needs PayFast, a redemption path, a refund path and the CPA s63 expiry decision), customer
testimonials and before/afters (need a completed booking and signed POPIA consent), and Xooter
earnings creative (needs the LRA s200A classification answer).

Each of those files opens with a banner naming its gate. They are written to ship the day it clears.
