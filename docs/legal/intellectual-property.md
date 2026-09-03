# Xoot intellectual property — what is protected, what is not, and what to file

Written 2026-09-03 at the founder's request: *"can you ensure that everything company related is
copyrighted and can you provide me with a steps in order to register a patent for whatever needs one,
or trademark?"*

> ⚠️ **This is procedural information about South African registries, not legal advice.** It is
> written from the statutes and the CIPC process as they stand, so that the founder walks into an
> attorney's office knowing what to ask for rather than paying to be told what a trademark is. **The
> trademark filing in particular should be done by an attorney or a registered trademark
> practitioner** — the reason is in §3, and it is a real one, not a disclaimer reflex.

---

# 1. The short answer to "ensure everything is copyrighted"

## ✅ It already is, automatically, and there is nothing to file

Under the **Copyright Act 98 of 1978**, copyright in South Africa **subsists automatically** the
moment a work is created in material form, provided the author is a qualified person (a South
African citizen, resident, or a body incorporated in the Republic) and the work is original.

**There is no copyright register in South Africa.** You cannot file a copyright application at CIPC
or anywhere else. The single exception is **cinematograph films**, registrable under the
*Registration of Copyright in Cinematograph Films Act 62 of 1977* — which becomes relevant only if
Xoot produces the brand documentary discussed for the Motion work.

So "ensure everything is copyrighted" is not a filing task. It is three practical tasks, and this
session did the parts it could:

| Task | Status | Where |
|---|---|---|
| Assert ownership in the repository | ✅ **Done this session** | `LICENSE` (new) |
| Mark the product itself | ✅ **Done this session** — the `©` symbol was missing | `src/components/xoot/Footer.tsx` |
| Close the accidental-publication hole | ✅ **Done this session** | `package.json` gained `"license": "UNLICENSED"` |
| Keep dated evidence of authorship | ✅ Already true | Every commit in this repo is timestamped and attributed |
| Record the registered entity name | ⛔ **Blocked on the founder** | §6 |

### ⚠️ What was actually wrong before today

Three things, and the first is the one that matters:

1. **The site footer read `2026 Xoot. All rights reserved.` with no `©` symbol.** Copyright subsists
   whether or not it is marked, so this was not fatal — but the mark is what puts a copier on
   notice, and its absence lets an infringer argue **innocent infringement** in mitigation of
   damages. Fixed.
2. **There was no `LICENSE` file.** A public-looking repository carrying no licence invites the
   argument that the work was released openly. Fixed, explicitly proprietary.
3. **`package.json` had no `license` field.** `"private": true` was already set and would have
   blocked an accidental `npm publish` on its own; the missing `license` field was the weaker of the
   two gaps, and is now `UNLICENSED`.

### ⛔ What copyright does *not* protect, and this is the important part

Copyright protects **the expression, never the idea**. It protects:

- the source code as written, the CSS, the component library, the design tokens
- the written copy on the site and in the app
- photographs, illustrations, the logo *as an artistic work*, video

It does **not** protect:

- **the idea of an on-demand home-services marketplace** — anyone may build one tomorrow
- **the business model**, the commission ladder as a concept, the pricing structure as a concept
- **the name "Xoot"** — that is a trademark question, §3, and it is the one that actually matters
- **functionality** — a competitor may reimplement every feature in their own code lawfully

⚠️ **The practical consequence:** copyright is the weakest of the three protections for a company
like this and it is the one that arrives free. **The name is the asset worth money, and the name is
the one that requires a filing and a fee.** If only one thing on this page gets done, do §3.

---

# 2. Who owns it — the question that precedes all of this

⛔ **Settle this before filing anything**, because a registry filing in the wrong name is worse than
no filing.

| Work | Default owner under SA law | Action needed |
|---|---|---|
| Code written by an **employee** in the course of employment | The **employer** | None, if employment is properly documented |
| Code, design or copy by an **independent contractor** | ⚠️ **The contractor**, not the company | **Written assignment required** |
| The **2026-09-03 design handoff** | Whoever authored it, unless assigned | ⛔ **Check this** |
| Work by the **founder before incorporation** | The founder personally | Assign to the company |
| Anything AI-assisted | See below | See below |

## ⚠️ Two live exposures in this specific repository

**a) The design handoff.** `design/handoff-2026-09-03/` is 78 files of authored design work now
committed to this repository and ported into `src/`. If a third party produced it, **copyright vests
in them by default** — commissioning and paying for a work does *not* transfer copyright in South
African law without a written assignment signed by the copyright owner (s22(3) of the Act requires
assignment to be in writing and signed). A verbal agreement, an invoice, or a Slack "yes, it's yours"
does not do it.

**b) Founder-authored work predating the company.** If the entity was incorporated after this work
began, the company does not own it until the founder assigns it in writing. This is trivially fixed
now and expensively fixed during due diligence.

## ⚠️ AI-assisted authorship — say the honest thing

Parts of this codebase were written with AI assistance, and that is recorded in the commit history
rather than hidden. South African law is not settled here; s1 of the Act contemplates
computer-generated works with the author being *"the person by whom the arrangements necessary for
the creation of the work were undertaken"*, which points at the company. **This is untested in South
African courts.**

The practical mitigation is the same either way: **the value is in the trademark, the operating
business, the Xooter network and the customer relationships**, none of which depend on resolving an
open question in copyright law. Do not let this become a reason to delay §3.

---

# 3. 🥇 Trademark — the filing that actually matters, and do it first

**This is the recommendation on this page.** The name **Xoot**, and the logo, are the only assets
here that are genuinely scarce, genuinely ownable, and genuinely at risk from someone else moving
first.

## ⚠️ First, the misconception that costs founders their name

> **Registering a company at CIPC gives you no trademark rights whatsoever.**

Company registration and trademark registration are separate registers with separate legal effects.
A company called *Xoot (Pty) Ltd* can be lawfully stopped from trading as "Xoot" by someone who
registered the **trademark** — and the company-name registration is no defence. They are frequently
confused because CIPC administers both.

You do acquire some **common-law rights through use** (the delict of *passing off*), but enforcing
passing off requires proving reputation, misrepresentation and damage — expensive, evidence-heavy,
and uncertain. A registered trademark replaces all three with a certificate.

## Registrar

**CIPC** — the Companies and Intellectual Property Commission, at `cipc.co.za`, which administers
trademarks under the **Trade Marks Act 194 of 1993**. Filings go through CIPC's online portal or a
practitioner.

## Step 1 — Search before you spend

Search the CIPC trademarks database for "Xoot" and, critically, for **confusingly similar** marks —
not just identical ones. Phonetic and visual similarity both count: *Zoot*, *Xute*, *Xoote*, *Scoot*
are all worth checking, and **`Zoot` deserves particular attention** given this repository's own
directory is still named `zoot-your-local-helpers`, which suggests the name was arrived at from that
direction.

⚠️ **A practitioner's search is worth paying for here.** The registry search tells you what is
registered; it does not tell you what is *confusingly similar in the Registrar's judgement*, and that
judgement is where applications die.

## Step 2 — Pick the classes, and file in all of them

Trademarks are registered per **class** under the **Nice Classification**, and **each class is a
separate application with a separate fee.** Registering in class 37 does not protect you in class 42.

For Xoot, in priority order:

| Class | Covers | Why Xoot needs it |
|---|---|---|
| **37** | Cleaning services, repair, installation | 🥇 **The core service.** File this one first if budget forces a choice |
| **35** | Advertising, business management, bringing services together for others | 🥈 **The marketplace itself** — the intermediary function, not the cleaning |
| **42** | Software as a service, design and development of software | 🥉 The platform, the app, the booking system |
| **9** | Downloadable software, mobile applications | The iOS/Android app as a product |
| **45** | Personal and social services, security services | Care+, the SOS feature, vetting and background checks |
| **39** | Transport, travel arrangement | Only if Xoot ever moves goods or people — currently speculative |

**A realistic minimum is 37 + 35 + 42.** Anything less leaves the marketplace or the software
unprotected while protecting the cleaning.

## Step 3 — File both marks, separately

1. The **word mark** `XOOT` — protects the name in any font, any styling. **This is the more
   valuable of the two**, because it stops a competitor using the name at all.
2. The **logo / device mark** — protects the specific visual. File it as well; it is a separate
   application per class.

⚠️ **File the word mark first if the budget is finite.** A logo can be redesigned; a name cannot be
recovered once someone else registers it.

## Step 4 — Expect it to take a long time, and use ™ meanwhile

South African trademark registration commonly runs **18–24 months** from filing to registration:
formalities, substantive examination, then a **three-month opposition period** after publication in
the *Patent Journal*.

- Use **™** from the day you file. It signals a claim and requires no registration.
- Use **®** **only after registration is granted.** ⛔ Using ® on an unregistered mark is an
  offence under the Trade Marks Act, and it is the kind of detail that surfaces in litigation.

**Protection backdates to the filing date**, so the wait is not lost time — which is exactly why
filing early matters more than filing perfectly.

## Step 5 — Renew

Ten years from filing, renewable indefinitely in ten-year terms. **Diarise it.** Trademarks are lost
to missed renewals far more often than to legal challenge.

---

# 4. Patents — the honest answer is *probably nothing here is patentable*

## ⛔ Software is excluded from patentability in South Africa

**Section 25(2)(f) of the Patents Act 57 of 1978** expressly excludes *"a program for a computer"*
from being an invention — and s25(3) applies that exclusion to the program *as such*.

Everything Xoot has built is software: a booking flow, a pricing engine, a matching algorithm, a
commission ladder, a masked-calling integration. **A booking marketplace is not patentable subject
matter in South Africa.** No amount of drafting changes that.

## ⚠️ And the SA patent system has a trap that makes a bad filing worse than none

South Africa is a **non-examining (depository) jurisdiction.** CIPC does **not** substantively examine
patent applications for novelty or inventive step. It checks formalities and grants.

**This means a granted South African patent is not evidence that the invention is valid.** Anyone can
obtain one for something unpatentable, and it will be struck down the first time it is enforced or
challenged. Founders spend real money on SA patents believing a grant means something it does not.

⚠️ **If a patent attorney offers to file a patent on the Xoot platform, ask them directly how they
get past s25(2)(f).** A good answer exists only if there is a genuine technical invention outside the
software. There is not one in this repository today.

## ✅ What *is* worth filing instead: a registered design

**This is the overlooked one, and it may be the second-best filing after the trademark.**

Under the **Designs Act 195 of 1993**, CIPC registers designs — and unlike patents, this is a real
and appropriate protection for an app:

| | Aesthetic design (Part A) | Functional design (Part F) |
|---|---|---|
| **Protects** | Appearance — shape, configuration, pattern, ornamentation | Shape/configuration necessitated by function |
| **Term** | **15 years** | **10 years** |
| **Relevance to Xoot** | 🥇 **The app UI, screen layouts, the icon set, the visual identity** | Low |

⚠️ **There is a deadline, and it is easy to miss.** A design must be **new** — but South Africa
allows a **six-month grace period** from the date the design is first released to the public in the
Republic. **Publishing the app or the site starts that clock.**

⛔ **The 2026-09-03 design is not yet publicly released, because `xoot.co.za` still serves a GoDaddy
page.** That is an accidental advantage. **If a registered design is wanted, decide before the DNS
cutover, not after** — because gate 2 in `launch-protocol.md` is the event that starts the six
months running.

## The one genuine patent candidate, and it is thin

If anything here were patentable it would be a **technical** solution rather than a business method —
something in the masked-calling or voice-over-data layer that solves a technical problem in a novel
way. Reviewing `src/hooks/useVoiceCall.ts` and the Twilio integration honestly: **it composes
existing, documented Twilio capabilities.** Skilled integration is not invention.

**Recommendation: do not spend money on a patent.** Spend it on the trademark and, if the design is
distinctive enough to be worth defending, on the registered design before launch.

---

# 5. Everything else worth protecting, ranked by what it actually costs

| Asset | Protection | Cost | Priority |
|---|---|---|---|
| **The name "Xoot"** | Trademark, classes 37/35/42 | Fee per class + attorney | 🥇 **Do this first** |
| **The app and site look** | Registered design, Part A | Modest CIPC fee | 🥈 **Decide before DNS cutover** |
| **Source code, copy, docs** | Copyright — **automatic** | Free | ✅ Done today |
| **`xoot.co.za`** | Domain registration | Annual | ✅ Held; ⚠️ set auto-renew |
| **Social handles** | First-come registration | Free | ⚠️ Claim now, even unused |
| **Pricing model, ladder, matching logic** | **Trade secret only** | Free, needs discipline | See below |
| **Xooter and customer lists** | Trade secret + **POPIA obligations** | Free | ⚠️ POPIA is a duty, not an asset |
| **The training curriculum** | Copyright — automatic | Free | 🥉 Genuinely valuable — see below |

## ⚠️ Trade secret is doing more work here than any registry

The commission ladder, the R47/h floor logic, the matching weights and the unit economics are **not
patentable and not protected by copyright as ideas.** Their only protection is that competitors do
not know them. That protection is maintained by:

- **NDAs** with contractors, and confidentiality clauses in every employment contract
- ⚠️ **Not publishing the numbers.** This bears directly on the marketing plan: `founder-voice.md`
  build-in-public drafts discuss the commission ladder and the pricing floor. **Building in public
  and keeping trade secrets are in direct tension**, and the founder is choosing between them every
  time a draft is approved. Worth deciding deliberately rather than post by post.
- Keeping this repository private

## 🥉 The training curriculum deserves a line of its own

`growth-strategy-2026.md` concluded, from the masterclass, that Xoot is *"a teaching business that
happens to sell cleaning"* and that the training is **the asset a competitor cannot copy by scraping
the site.** That makes the curriculum in `training_modules` one of the more defensible things the
company owns — and it is protected by copyright **automatically**, as long as it is written down.

**Which is the argument for writing it down properly**, rather than leaving it as seeded rows. An
unwritten training method is neither copyright nor trade secret. It is just knowledge in someone's
head, and it leaves when they do.

---

# 6. ⛔ What the founder must supply before any of this proceeds

| # | Needed | Why | Blocks |
|---|---|---|---|
| 1 | **Registered entity name and registration number** | Cannot assert copyright or file a trademark in a name that is not recorded anywhere | `LICENSE`, site footer, app about screen, **every filing** |
| 2 | **Was the 2026-09-03 design produced by a third party?** | If yes, copyright vests in them without a **written, signed** assignment | Ownership of `design/handoff-2026-09-03/` and everything ported from it |
| 3 | **Is the entity incorporated, and when?** | Pre-incorporation work needs assignment from the founder personally | Clean chain of title |
| 4 | **Decision: registered design, yes or no?** | ⚠️ **The six-month grace period starts at public release** | Must be decided **before** the DNS cutover in `launch-protocol.md` gate 2 |
| 5 | **Decision: build-in-public vs trade secret** | The two are in tension over the ladder and the floor | Every founder draft in `docs/marketing/drafts/` |
| 6 | **Trademark practitioner engaged** | The clearance search is where applications live or die | §3 |

⚠️ **Items 1 and 4 are time-sensitive in opposite directions.** Item 1 blocks nothing operationally
and can be answered in a sentence. **Item 4 has a deadline attached to an event the founder is
actively trying to trigger** — taking the site live. Decide it before, not after.

---

## Sources

Statutes referenced, so the attorney conversation starts from the same page:

- **Copyright Act 98 of 1978** — automatic subsistence; s22(3) written-assignment requirement
- **Registration of Copyright in Cinematograph Films Act 62 of 1977** — the one registrable copyright
- **Trade Marks Act 194 of 1993** — registration, classes, ® misuse
- **Patents Act 57 of 1978** — s25(2)(f) computer-program exclusion; non-examining system
- **Designs Act 195 of 1993** — Part A aesthetic / Part F functional; six-month grace period
- **Protection of Personal Information Act 4 of 2013 (POPIA)** — customer and Xooter data
- **Registrar:** CIPC, `cipc.co.za`, for trademarks, designs, patents and companies

⚠️ Statutes are amended. Confirm current fees and timelines with CIPC or a practitioner rather than
treating the figures above as fixed — the **process** is stable, the **numbers** are not.
