# Metadata Drift Control

Reviewed: 2026-07-10 00:12 SAST

This document defines how Zoot prevents source, release, database, article, and provider metadata from drifting away from the actual product state.

## Sources Of Truth

| Area | Source of truth | Drift risk |
| --- | --- | --- |
| Product code | GitHub `main` | Closed PRs, temporary branches, or local branches treated as active product state |
| Release evidence | `docs/release/*`, `docs/PRODUCTION_COMPLETION_AUDIT.md`, `blocker.md` | Docs naming an old commit, old PR, or solved blocker as current |
| Supabase migrations | `supabase/migrations`, `supabase/migration-drift-allowlist.json` | Dashboard branch metadata and local migration versions disagree without documented equivalence |
| Articles and SEO | `src/lib/blog-posts.ts`, `content/seo/generated/daily-blog-queue.json`, `public/sitemap.xml` | Published dates, queue state, and sitemap entries disagree |
| Environment configuration | Provider dashboards, GitHub variables/secrets, EAS env, Supabase Edge secrets | Chat-pasted or local-only values treated as production configuration |
| Mobile release state | EAS build records and `docs/native/*` | Simulator build evidence treated as physical-device or store evidence |

## Required Drift Gates

Run these before merging release, migration, article, or provider-readiness changes:

```powershell
npm run ops:readiness -- -Json
npm run seo:validate
npm run ops:supabase:drift-check -- -Environment staging
npm run ops:supabase:drift-check -- -Environment production
git diff --check
```

When remote Supabase migration evidence is available, also run:

```powershell
npm run ops:supabase:drift-check -- -Environment staging -RemoteMigrationsFile C:\secure\zoot-staging-migration-list.txt -RequireRemoteEvidence
npm run ops:supabase:drift-check -- -Environment production -RemoteMigrationsFile C:\secure\zoot-production-migration-list.txt -RequireRemoteEvidence
```

Do not use broad `supabase db push`, direct edits to `supabase_migrations`, or undocumented repair-marking to clear drift.

## Pull Request Rules

1. Every implementation branch must start from current `main`.
2. A merged PR is not the active source after a newer PR lands; current `main` is the active source.
3. Closed or CodeRabbit-generated PRs may be used as review material only after their changes are rebased and verified against current `main`.
4. Release docs must point to the latest green GitHub Actions evidence on `main`; do not require a documentation-only PR just to refresh a moving SHA.
5. Temporary branch refs may remain for audit, but they are not deployment targets.

## Article Rules

1. A post is considered published only when the article registry, queue state, and sitemap all agree.
2. Publish dates must use real release dates, not draft dates.
3. Comparison articles must stay factual, non-defamatory, and grounded in approved Zoot source-of-truth content.
4. WordPress may become the editorial CMS, but canonical published website URLs remain controlled by the Zoot web app until a different strategy is approved.

## Provider And Environment Rules

1. Pasted secrets are not source-of-truth credentials.
2. Provider state is current only when read back from the provider dashboard/API and recorded in the relevant runbook.
3. GitHub repository variables must contain public-safe frontend values only.
4. EAS public variables may use `EXPO_PUBLIC_` only for public-safe values.
5. Supabase Edge secrets and provider dashboards hold private server-side credentials.

## Response To Drift

When drift is detected:

1. Stop release promotion.
2. Identify whether the drift is code, documentation, migration metadata, article metadata, provider configuration, or mobile build evidence.
3. Update the source-of-truth file or runbook first.
4. Add or update a guard so the same drift cannot recur silently.
5. Re-run the required drift gates.
6. Record the result in `blocker.md` only if live/manual work remains.
