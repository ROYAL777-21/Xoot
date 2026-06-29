# Provider Auth And Cloudflare Attempt Evidence

Reviewed: 2026-06-29 21:19 SAST

These checks were run without printing or storing provider secret values in the repository.

## Local Tooling

- `npm run ops:provider-auth:check` completed successfully on 2026-06-29 21:19 SAST.
- `psql (PostgreSQL) 18.4` is available through the local Scoop PostgreSQL extraction path used by the diagnostic.
- Docker is still not installed, so full local Supabase reset still needs Docker or a separate ops shell.

## GitHub CLI

- `gh auth status` reports an active authenticated `ROYAL777-21` GitHub account.
- GitHub CLI is no longer an authentication blocker for repo variable or PR operations; the remaining GitHub work is to supply only public-safe variable values and keep private provider secrets out of repository variables.

## Supabase CLI

- `supabase --version` reports `2.108.0`.
- `supabase login --help` confirms the CLI supports `supabase login --token <token>` and `--no-browser`.
- The provider-auth diagnostic still reports `LegacyPlatformAuthRequiredError` because this shell has no local Supabase profile and no `SUPABASE_ACCESS_TOKEN`.
- Per Supabase CLI docs, a personal access token should be supplied through native CLI login or a local environment variable. Do not paste the token into chat.

## CodeRabbit CLI

- `coderabbit --version` reports `0.6.4`.
- `coderabbit auth status --agent` reports `not_authenticated`.
- `coderabbit auth login --agent` returns `environment_unsupported` because localhost callback and stdin fallback are unavailable in this Windows session.
- `coderabbit auth login --help` confirms `coderabbit auth login --api-key <api-key>` is the available non-browser path. Use an approved vault or the official GitHub app; do not paste the API key into chat.

## Cloudflare Zone

- Cloudflare API `GET /zones?name=zoothome.co.za` returned zero matching zones.
- Cloudflare API `POST /zones` with `name: "zoothome.co.za"`, `type: "full"`, and `jump_start: true` failed because the connected token lacks `com.cloudflare.api.account.zone.create`.
- The blocker is account permission scope, not repo code. Create the zone manually in the Cloudflare dashboard or provide a rotated token with account zone-create permission through an approved secret store.
