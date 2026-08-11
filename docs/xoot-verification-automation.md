# Automating Xooter verification

Answering: *"I don't want to have to self verify manually, is there some secure way to
automate onboarding?"*

Short answer: yes, and it is more secure automated than manual — provided the automation
writes the result and the applicant never can. That condition is now enforced by the
database (`20260802120000_client_write_surface_lockdown.sql`), so this design and that
migration are two halves of one thing.

## The rule that makes automation safe

Manual verification is not safe because a human looked at it. It is safe because the person
being checked is not the person recording the result. Automation keeps that property or
loses it entirely.

> A verification status is written only by a signature-verified webhook from the verification
> provider, using the service role. The applicant's session cannot write it, cannot influence
> it, and cannot read the raw provider payload.

Concretely:

1. Applicant uploads raw material — ID document, live selfie, consent — to a private bucket.
2. An Edge Function submits it to the provider and stores the provider's `check_id`.
3. **The provider calls back.** The function verifies the HMAC signature against a secret held
   in Supabase Edge Function secrets, looks up the `check_id`, and writes the status with the
   service role.
4. The applicant polls their own status through a read that exposes the outcome and nothing
   else — not the score, not the reason codes, not the raw response.

Failure modes to close explicitly, because they are how this gets broken in practice:

- **Unsigned callback.** Reject anything without a valid signature. The webhook URL will be
  discovered; assume it is public.
- **Replay.** Store the provider's event ID and ignore duplicates. Otherwise a captured
  "clear" callback can be replayed against a different application.
- **`check_id` confusion.** Bind the callback to the application it was created for. Never
  take the applicant or application ID from the callback body.
- **Provider down = pass.** Timeouts must land in `pending`, never in `clear`. Fail closed.

## What actually has to be true about a Xooter

Five separate questions, often conflated:

| Check | Question it answers | Automatable |
|---|---|---|
| Identity | Is this a real SA identity, and is this document genuine? | Yes — Home Affairs / HANIS lookup via an accredited bureau |
| Liveness + face match | Is the person holding the phone the person on the document? | Yes — biometric liveness, seconds |
| Right to work | May this person legally work in South Africa? | Partly — citizens and PRs cleanly; permits need document review |
| Criminal record | SAPS clearance | Partly — submission automatable, turnaround is days to weeks |
| Bank account | Does this account belong to this identity? | Yes — bank account verification against the identity |

Two of these deserve comment.

**Right to work is the one that will bite.** A meaningful share of domestic and cleaning work
in South Africa is done by foreign nationals holding asylum, refugee, or work permits. A
naive "SA ID or reject" rule quietly excludes a large part of the labour pool and is likely
unlawful discrimination on top. Permits need a document-review path with a human, so build
the queue for it rather than pretending the rule is binary.

**Criminal clearance is slow and it is a snapshot.** It cannot gate the whole funnel or nobody
onboards. And a clearance issued in January says nothing about March. Both facts are handled
by the state machine below.

## Decide automatically in one direction only

This is a legal constraint, not a design preference. **POPIA section 71 restricts decisions
based solely on automated processing** where the decision has legal consequences for the
person or substantially affects them. Refusing someone's application to earn a living is
squarely that.

So:

- **Auto-approve** when every check returns clean and confidence clears threshold. No human,
  no queue, minutes not days. This is the case that removes your manual work, and it will be
  the large majority.
- **Never auto-reject.** A failure routes to human review with the reason attached. The
  applicant is told a decision is under review, given the substance of the concern, and can
  submit a correction or challenge it. Keep the record of who decided and why.
- **Auto-restrict** is the useful middle: verified identity but clearance still pending means
  a real, limited state rather than a binary.

Practically this means you review the exceptions, not the applications — which is the actual
ask, and it is also the only version that is lawful.

## The state machine

```
draft → submitted → checks_running
                       ├─ all clear ─────────────→ approved_provisional → approved_full
                       ├─ any flag ──────────────→ manual_review → approved_full | declined
                       └─ provider error/timeout → manual_review
```

- `approved_provisional` — identity and liveness are confirmed, criminal clearance is not
  back yet. Can take work, but not the jobs where the risk is concentrated: no key-holding,
  no unaccompanied access, no Care+ placements. This is what makes a slow SAPS check
  survivable.
- `approved_full` — everything clear.
- `declined` — always human-authored, always with a reason and an appeal path.

Every transition is written by the server. The columns backing this are already ungranted to
`authenticated`, so the state machine cannot be short-circuited from a client.

## The gap automation does not close

Onboarding verifies who applied. It does not verify **who turns up at the house**. The
sharpest attack against a home-services marketplace is a clean account onboarded by one
person and worked by another — and no amount of onboarding rigour catches it.

The mitigation is cheap and belongs in the app rather than in onboarding: a **liveness selfie
at job start**, matched against the biometric captured at onboarding, before the address and
access instructions are released. It closes the impersonation gap, it produces a timestamped
record of who was at the property, and it costs one extra screen. Given what the access
instructions unlock, this is arguably higher value than anything in the onboarding funnel.

Alongside it:

- **Re-verify periodically.** Annual re-clearance, and re-check on any trust incident. Record
  the check date so "verified" always carries a date.
- **Revoke fast.** One admin action must move an active Xooter to suspended and cut access
  everywhere, in seconds, without a deploy.

## Providers

Categories matter more than names, and pricing and APIs move, so treat these as where to
start rather than as a recommendation:

- **Identity + liveness, Africa-focused:** Smile ID, iiDENTIFii.
- **Identity + liveness, global:** Onfido, Sumsub, Veriff.
- **Background screening, SA:** MIE (Managed Integrity Evaluation), Lexis RefCheck, XDS,
  TransUnion. These bundle criminal, qualification, and credit checks and hold the SAPS
  submission relationships.
- **Bank account verification:** available through the SA bureaus above, and typically also
  through whichever payment provider you land on — worth checking before buying it twice.

Ask every candidate the same four questions, because they are what determines whether this
design works: Do you sign your webhooks, and how? Do you provide an event ID for replay
protection? What is your criminal-check turnaround, p50 and p95? Where is the data stored,
and can you commit to it in an operator agreement?

That last one is not optional. Each provider is an **operator** under POPIA and needs a
written operator agreement, and any that stores data outside South Africa pulls in the
section 72 cross-border assessment already open in `blocker.md`.

## Cost, because it changes the funnel

Each check costs real money per applicant, and applicants who never complete onboarding still
consume checks. Two consequences worth deciding before building:

- Order the checks cheapest-first and gate on each. Do not buy a criminal check for someone
  whose ID lookup already failed.
- Decide whether the cost is absorbed, recouped from first earnings, or charged upfront.
  Charging an upfront fee to apply for work is a well-worn scam pattern and will be read that
  way regardless of intent — if it is recouped from earnings, say so in plain language.

## What I would build first

1. The webhook receiver, signature verification, replay protection, and the state machine.
   This is the security-critical part and it does not depend on which vendor you pick.
2. Identity + liveness with one provider. This alone auto-approves the identity half and is
   the bulk of the manual work.
3. The manual-review queue for exceptions and permits — needed on day one, because the
   exceptions are the cases that were always going to need you.
4. Criminal check submission, feeding `approved_provisional` → `approved_full`.
5. Job-start liveness. Small, and it closes the gap the rest of this cannot.

## Open, and needs answering before step 2

- Which provider, which pulls in an operator agreement and a POPIA s72 answer.
- Whether Xoot pays for checks or recoups them.
- What `approved_provisional` is allowed to do — the list above is a proposal, not a decision.
- Who is the named human reviewer for exceptions and declines, since POPIA requires there to
  be one.
