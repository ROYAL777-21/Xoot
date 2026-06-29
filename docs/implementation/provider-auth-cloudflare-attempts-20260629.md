# Provider Auth And Cloudflare Attempt Evidence

Reviewed: 2026-06-29

These checks were run without printing or storing provider secret values in the repository.

## Supabase CLI

- `supabase --version` reports `2.108.0`.
- `supabase login --help` confirms the CLI supports `supabase login --token <token>` and `--no-browser`.
- `supabase projects list --debug` still fails with `LegacyPlatformAuthRequiredError` because this shell has no local Supabase profile and no `SUPABASE_ACCESS_TOKEN`.
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
