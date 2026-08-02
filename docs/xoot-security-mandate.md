# Xoot security mandate

The founder's instruction, restated as something that can actually be checked. Written
2026-08-02, after an audit of the live production authorization surface.

## The instruction, as given

> Safeguard the app from black hat hackers and penetration to the highest order because we
> will be dealing with hundreds of thousands of user data and sensitive information. Ensure
> that the backend is the only one with the source of truth, not the front end also.

Both halves are right. Neither is yet a specification. This file makes them one.

## Revision 1 — name the threat, because it is not the usual one

"Protect user data" imports the wrong mental model. For most products a breach means
embarrassment, a credit-monitoring offer, and a fine. Xoot stores **gate codes, alarm
codes, access instructions, and the hours a house is empty**, tied to a street address,
alongside the identity documents and bank details of the people who hold those codes.

The realistic worst case is not a leaked mailing list. It is a burglary, or worse, at an
address the attacker chose from a filtered query. Two consequences follow:

- **The blast radius is physical and irreversible.** There is no rotating a gate code after
  someone has walked through it. Controls that are merely "industry standard" are not
  automatically adequate here.
- **The insider is in the threat model.** A Xooter is, by design, given the codes to a
  house. The question is never only "can an outsider get in" but "what can a legitimately
  signed-in account reach beyond its own business".

**Design test for any screen or endpoint:** what does this let someone learn about when a
house is empty and how to get into it? If the answer is anything, it needs an access rule
before it needs a layout.

## Revision 2 — "the backend is the source of truth" needs a sharper edge

The instruction is correct but under-specifies in one direction and over-specifies in
another.

**Under-specified: the backend is not one thing.** Putting the logic in an Edge Function is
not enough, because Edge Functions are not the only door. Supabase publishes PostgREST, and
the anon key that reaches it ships inside the web bundle and the app binary. An attacker
with a normal account and `curl` never touches your Edge Function.

> **The enforcement point is the database, not the API layer.** Authorization is correct
> only if it holds when the client is hostile and the UI does not exist.

The audit that prompted this file found exactly that gap: no UI ever offered to edit a
verification status, and the database would have accepted it from anyone who asked.

**Over-specified: the frontend legitimately holds one kind of truth.** `design/Xoot_App.html`
is the source of truth for how the app looks, and `src/index.css` for the token values. That
is a different axis and it is fine. The rule is about *authority over facts*, so state it
that way:

> A client may write facts it **authors**. It may never write facts the business **decides**
> about it.

A user authors their phone number, their address, their review text, their gift message. The
business decides their verification status, their loyalty balance, whether their training
passed, whether their application was approved, what a booking costs. Same row, different
authority — which is why row-level rules alone cannot express it.

**Corollary the instruction should include:** the client may *predict*. Optimistic UI and
offline caches are fine and often necessary on South African mobile data. They are display,
not authority: the server recomputes and the client reconciles. "Never trust the client" does
not mean "never cache".

## Revision 3 — say what enforces it, or it is a wish

RLS is row-level. It cannot hide or protect a column. Two mechanisms can:

| Need | Mechanism |
|---|---|
| Which **rows** a role may touch | RLS policy |
| Which **columns** a role may write | `GRANT UPDATE (col, …)` — column-aware, checked before policies |
| Which **columns** a role may read, when two parties share `authenticated` | Separate table (ZD-023) |
| Rules that depend on row state or transition | `BEFORE` trigger, `SECURITY DEFINER`, `search_path = ''` |
| Append-only | Revoke UPDATE and DELETE outright |

Default posture: **`anon` writes nothing.** It is a public credential. Any write grant it
holds is surface an attacker starts with, whether or not a policy currently blocks it.

## Revision 4 — "to the highest order" needs a definition of done

As written it cannot be satisfied or refuted. Replace it with standing invariants that fail
a build or a review:

1. **No secret in a client bundle.** Enforced by `npm run security:scan` and
   `npm run build:artifact-scan`. Never add an exception; report hardcoded secrets rather
   than working around them.
2. **Every new table ships with RLS enabled, a policy, and an explicit grant.** A table with
   RLS and no policy denies by default — correct. A table with a blanket grant and a
   permissive policy is the bug this mandate exists to prevent.
3. **Money is integer cents and server-authoritative.** The client displays a price; it never
   determines one.
4. **Audit and evidence tables are append-only**, enforced by revoked grants rather than by
   convention. A record the people it describes can edit is not evidence.
5. **Attribution is taken from the session, never the payload.** `actor_id`, `user_id`,
   `reviewed_by` are set by the server from `auth.uid()`.
6. **No claim the system cannot honour** — Consumer Protection Act. Gate the claim behind a
   readiness constant and test that it cannot render while unset (`src/lib/tipping.ts`).
7. **The authorization surface is re-derived, not remembered.** Join grants to policies and
   read the result; do not reason from the migration that was supposed to have applied.

## Revision 5 — what the founder must do, which no amount of code replaces

These are not code tasks and cannot be closed from the repository:

- **Leaked-password protection** is off on both projects. One Auth toggle each. It is the
  only security-advisor finding on either.
- **MFA on every admin account**, with role assignment audited. An admin account is a master
  key to every gate code in the system.
- **Rotate every secret pasted into a chat window.** Listed in `blocker.md`.
- **Recover the six production Edge Functions that have no source in this repo** — two of
  them read and write the sensitive-access table, two are publicly invocable. Unreviewable
  code with service-role reach is the single largest unknown in the system.
- **POPIA Information Officer and legal entity.** Breach notification under POPIA has no
  generous risk exemption, and the notification runbook must exist before a breach, not
  after.
- **Penetration test by a third party before public launch.** Self-audit finds the class of
  bug you thought to look for. This audit found a systemic one; it does not prove there is
  not another class nobody has looked for yet.

## The improved instruction

> Xoot handles the physical-access credentials of hundreds of thousands of homes, so treat a
> breach as a burglary risk rather than a privacy incident, and treat every signed-in account
> — customer, Xooter, admin — as potentially hostile.
>
> Enforce authorization in the database, not the API layer: it must hold against `curl` with
> a valid token and no UI. A client may write only the facts it authors; every fact the
> business decides about a user — verification, balances, approvals, prices, job state — is
> written by the server alone, using column-level grants where the split runs within a row.
> Audit and evidence tables are append-only, and attribution always comes from the session,
> never the request body. The client may cache and predict for offline use; it may never be
> authoritative.
>
> `anon` writes nothing. No secret ships in a client bundle. Every new table arrives with
> RLS, a policy, and an explicit grant, and the live authorization surface is re-derived from
> the catalogue rather than assumed from migrations.
>
> Where a control cannot be enforced in code, name it as a founder action in `blocker.md`
> rather than declaring it done.
