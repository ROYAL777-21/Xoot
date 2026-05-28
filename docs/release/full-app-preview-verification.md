# Full App Preview Verification

This note tracks runtime preview verification for the built Zoot web app.

Required checks before calling a preview fully functional:

- The public preview URL renders meaningful Zoot content and is not a blank shell.
- The full React build loads without framework overlays or console runtime errors.
- Core public routes such as `/`, `/care-plus`, and `/auth` render through SPA fallback.
- Core app routes such as `/app`, `/app/plans`, `/app/airbnb-host`, and `/app/office` either render for authenticated users or redirect safely to auth without blank-page failure.
- Premium actions with haptic hooks degrade safely on browsers without native haptics.
- Supabase configuration uses the intended project values for the target environment.
- Store-review, AI-use, security, Care+, host, office, and native-readiness documentation remains discoverable from repo docs.

Runtime notes:

- A previous manual chunk split caused a runtime cycle between React and UI vendor chunks, so chunking was removed until it has browser smoke coverage.
- A relative Vite asset base caused nested SPA routes such as `/app/plans` to request assets from `/app/assets/...`; hosted root previews now use `base: "/"` with Netlify SPA redirects.
