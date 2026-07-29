# AI Usage Review Checklist

Use this checklist before shipping AI-assisted Xoot features to the website, mobile app, support tooling, marketing flows, or internal agents.

## Scope And Disclosure

- Identify whether the feature generates content, summarises content, ranks decisions, automates support, recommends bookings, or routes operational work.
- Tell users when AI is materially involved in support responses, reminders, generated copy, photo analysis, ranking, or moderation.
- Avoid presenting AI outputs as human decisions unless a human has reviewed and approved them.
- Do not use AI to imply fake reviews, fake client stories, fake Xooter credentials, fake insurance coverage, or unsupported guarantee claims.
- Keep AI-generated Care+ prompts as suggestions, not commitments: availability, replacement support, and support timing must match backend reality.

## Data Minimisation And Privacy

- Do not send raw ID documents, selfies, bank details, gate codes, lockbox codes, full addresses, access notes, or sensitive support incidents to general-purpose AI tools unless explicitly approved and covered by vendor terms.
- Use redaction or structured summaries for AI prompts wherever possible.
- Keep secrets, API keys, admin tokens, webhook secrets, and production credentials out of prompts, screenshots, files, logs, and chat messages.
- Maintain a data processing register for every AI provider, model, hosted agent, vector store, and logging system.
- Apply POPIA retention, deletion, and access policies to AI logs and generated outputs.

## Human Review Gates

- Require human approval for refunds, payout changes, account bans, background-check overrides, legal-sensitive responses, safety complaints, theft/damage incidents, harassment claims, public claims, production deploys, and bulk outreach.
- Route support messages about account-specific, payment, cancellation, replacement, access-code, safety, or complaint topics to a human queue.
- Make AI support responses easy to override, correct, and audit.
- Keep an escalation trail showing who reviewed the output and what action was taken.

## Moderation And Safety

- Block AI outputs that create harassment, discriminatory content, scams, malicious code, fake official documents, sexual/deepfake abuse, dangerous instructions, or deceptive claims.
- Moderate user prompts, support messages, reviews, bios, profile photos, attachments, and before/after photos.
- Add user reporting paths for offensive or incorrect AI-generated content.
- Test prompt-injection attempts against support, admin search, agent tooling, and internal dashboards.
- Keep AI tools least-privilege: the content agent does not access ID documents, marketing does not access raw support incidents, finance cannot approve refunds without human approval.

## Accuracy And Claims

- Keep public copy factual and supportable. Do not say guaranteed replacement unless backend operations truly guarantee it.
- Do not claim named background-check providers, full insurance, instant support, or availability unless production processes prove it.
- Ensure AI reminders are framed as suggestions: `Your usual Thursday slot is available` is acceptable only when backed by live availability; otherwise use softer language.
- Review generated marketing content for competitor claims, invented metrics, fake endorsements, and misleading savings claims.

## App Review Readiness

- If AI content generation becomes a central Google Play app feature, include user feedback/reporting and prohibited-content safeguards.
- Ensure store metadata explains AI-assisted features accurately and does not exaggerate automation.
- Keep Apple review notes clear about what AI does, what humans review, and what data is processed.
- Ensure Android Data Safety and iOS privacy disclosures include any AI vendors or SDKs that collect, process, or share user data.

## Operational Audit

- Log AI agent tool calls, approvals, escalations, prompt template versions, and output categories without logging raw secrets or sensitive home access data.
- Review AI outputs regularly for hallucinated policies, unsupported guarantees, off-platform instructions, and bias.
- Add a rollback path for AI prompts and agent tools.
- Re-run this checklist whenever a new model, vendor, agent, dataset, or support automation is introduced.
