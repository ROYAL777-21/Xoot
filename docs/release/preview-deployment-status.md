# Preview Deployment Status

Current public preview:

- Netlify site: https://zoot-home-care.netlify.app
- Netlify project: https://app.netlify.com/projects/zoot-home-care
- Current Netlify deploy ID: `6a189bd7a6082006e0ca6aed`
- Status: live static overview preview. It is useful for showing the Xoot/Care+ direction, but it is not the full React app bundle.

Verified full-app local preview:

- Local URL during QA: `http://127.0.0.1:4192/`
- Build source: GitHub Actions artifact `zoot-web-dist` from run `26603831935` on branch `codex/verify-runtime-preview-root-base`.
- Runtime fixes now on `main`: removed unsafe manual vendor chunking and restored root asset base for hosted SPA routes.
- Smoke-tested routes: `/`, `/care-plus`, `/auth`, `/app`, `/app/plans`, `/app/properties/airbnb`, `/app/properties/office`, `/zooter/apply`.
- Expected signed-out behavior: protected routes redirect safely to `/auth` instead of blank-screening.

Deployment blockers observed:

- Netlify MCP upload of the full app artifact repeatedly fails with `TypeError: fetch failed` or `500 Internal Server Error`, including outside sandbox restrictions.
- Netlify CLI is available locally but not logged in, so direct `netlify deploy --dir ...` cannot be used without a Netlify auth token or browser login.
- Vercel connector shows the team but no existing projects. The connector only returns CLI instructions; direct Vercel deployment needs project/auth setup.
- GitHub Pages is not currently serving the app; `https://royal777-21.github.io/zoot-your-local-helpers/` returns 404.

Recommended next step for a full live app preview:

1. Connect the GitHub repository to Netlify/Vercel through the provider dashboard, or provide local CLI authentication.
2. Set production/preview environment variables for `VITE_SUPABASE_URL`, `VITE_SUPABASE_PROJECT_ID`, and `VITE_SUPABASE_PUBLISHABLE_KEY`.
3. Deploy from `main` with `npm ci && npm run build` and publish `dist`.
4. Run the browser route matrix from `docs/release/full-app-preview-verification.md` against the live URL before calling it fully functional.
