# Agent Rules

These rules apply to Codex, Hermes, and any support agent working on Zoot. Agents should preserve the brand, security model, approval gates, and source-of-truth boundaries in this repo.

## Codex Rules

- Read relevant `/docs` files before implementation work.
- Prefer small, file-targeted changes that can be tested.
- Do not modify Supabase migrations, auth, payments, booking logic, or UI when the task is documentation-only.
- Do not invent backend behavior. If backend support is missing, ship typed mock data or safe UI states clearly marked as not production-authoritative.
- Do not expose secrets, service-role keys, tokens, API keys, gate codes, ID documents, bank details, or raw verification files.
- Do not make unsupported public claims, guarantees, reviews, legal promises, insurance promises, or availability promises.
- Preserve premium positioning and avoid discount-led copy.
- Never introduce the words `Zapier` or `Zap` into agent outputs or automation files.
- Twilio implementation must remain voice-only unless project governance changes.
- Use in-app notifications as the primary operational channel.

## Hermes Rules

Hermes owns orchestration, routing, memory, and internal IF-THEN automation logic. Hermes must act only from known source-of-truth triggers.

Every automation must define:

- IF: source event and table/state.
- THEN: action.
- OWNER: responsible agent or team.
- STACK TOOL: app, Airtable, Brevo, Twilio voice, WhatsApp urgent queue, payment provider, or Supabase function.
- DATA USED: fields read.
- FAILURE MODE: safe fallback.
- APPROVAL GATE: whether human approval is required.

Hermes must not infer cancellation, completion, verification failure, payment success, contractor availability, or trust outcomes from incomplete data.

## Deployment Rules

- Production deployment requires passing lint, tests, build, dependency audit, secret scan, and security review for touched surfaces.
- Do not deploy directly from an unreviewed AI session.
- Protected branches, rollback capability, and environment separation are required for production.
- Production secrets belong in the hosting/Supabase secret store, never source code or chat.
- Hostinger/static deployment must include security headers, routing fallback, PWA assets, and no leaked preview-only paths.
- Credential-blocked features should degrade safely instead of showing broken buttons.

## Editing Rules

- Documentation changes may update `/docs` and supporting references only.
- App changes must preserve existing patterns in React, Vite, TypeScript, Tailwind, shadcn/ui, and Supabase.
- Backend/business-rule changes must be server-side or RLS-enforced where possible.
- Do not modify generated lockfiles, migrations, or deployment config unless the task requires it.
- Do not remove user or teammate changes unless explicitly approved.
- Do not rewrite large areas just to polish style.
- Keep docs concise, implementation-ready, and free of filler.

## Approval Workflow

Human approval is required before:

- production deployment
- changing auth, RLS, payments, booking state, cancellation, replacement, referral, or ZootCred logic
- altering Supabase migrations or storage policy
- adding or changing public legal, insurance, background-check, or guarantee claims
- refunds above threshold, payout changes, account bans, or trust/safety decisions
- bulk outreach, marketing send, or WhatsApp campaign behavior
- viewing or exporting sensitive documents, gate codes, access notes, bank details, or support incident evidence

## Communication Rules

- Report completed work separately from credential-blocked items.
- Be explicit when something is UI/mock-data only.
- When a risk is found, include affected files/tables/functions, recommended fix, and execution order.
- When stopping for approval, state exactly which files were changed and which files were intentionally untouched.
