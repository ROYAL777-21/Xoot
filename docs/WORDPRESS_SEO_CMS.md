# WordPress SEO CMS

Reviewed: 2026-06-26

WordPress is included in the Xoot tech stack as the SEO editorial CMS. It supports article review, scheduling, media approval, metadata governance, and content operations. The React/Vite website remains the public renderer and app shell.

## Architecture

| Layer | Responsibility |
| --- | --- |
| WordPress | Drafting, editing, approvals, scheduling, author notes, categories, tags, excerpts, media library, SEO metadata. |
| Vite website | Public pages, article rendering, sitemap, JSON-LD, conversion CTAs, app routes, security headers, and Core Web Vitals. |
| Supabase | Authenticated app data, bookings, support, Xooter data, payments, sensitive access, article automation metadata if needed. |
| CI/server sync | Pull approved WordPress posts into the build or sync metadata into `src/lib/blog-posts.ts` after editorial approval. |

## Content Governance

- WordPress may contain only public marketing and article content.
- No client, Xooter, booking, payment, household, support, identity, access-code, or admin data belongs in WordPress.
- AI-generated drafts must remain draft-first and human-reviewed before publication.
- Do not publish fake client logos, fake testimonials, fake guarantees, or unsupported service-area claims.
- Canonical Xoot article URLs should remain `/articles/<slug>` unless a different canonical strategy is approved.

## Required WordPress Configuration

- Production WordPress URL.
- Staging WordPress URL if separate.
- Application Password or API token for a least-privilege editorial/sync user.
- Webhook secret for publish/update notifications.
- Preview secret for unpublished draft previews.
- SEO plugin fields mapped to title, meta description, canonical URL, Open Graph image, category, tags, and excerpt.
- Robots settings that allow approved published articles and block admin, preview, and draft URLs.

## Environment Variables

Public-safe values may be visible in build logs if needed:

```env
WORDPRESS_SITE_URL=
WORDPRESS_PUBLIC_CANONICAL_BASE=https://xoot.co.za/articles
```

Server/CI-only values:

```env
WORDPRESS_REST_API_URL=
WORDPRESS_APP_USERNAME=
WORDPRESS_APP_PASSWORD=
WORDPRESS_WEBHOOK_SECRET=
WORDPRESS_PREVIEW_SECRET=
WORDPRESS_SYNC_DRY_RUN=true
```

Never expose WordPress application passwords or webhook secrets in `VITE_` or `EXPO_PUBLIC_` variables.

## Launch Checklist

- [ ] Create staging and production WordPress environments or confirm a single production CMS with draft workflow.
- [ ] Create a least-privilege API user for article sync only.
- [ ] Store credentials only in CI/provider secret storage.
- [ ] Confirm published posts contain title, slug, excerpt, meta description, category, tags, local SEO intent, and CTA.
- [ ] Confirm sitemap and canonical URLs point to the public Xoot website.
- [ ] Confirm draft/preview endpoints are not indexed.
- [ ] Confirm media library contains only approved public assets.
