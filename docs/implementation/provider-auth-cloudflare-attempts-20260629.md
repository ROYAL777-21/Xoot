# Provider Auth And Cloudflare Attempt Evidence

Reviewed: 2026-07-10 00:42 SAST

These checks were run without printing or storing provider secret values in the repository.

## Local Tooling

- `npm run ops:provider-auth:check` completed successfully on 2026-07-01 12:57 SAST.
- `psql (PostgreSQL) 18.4` is available through the local Scoop PostgreSQL extraction path used by the diagnostic.
- Docker is still not installed, so full local Supabase reset still needs Docker or a separate ops shell.

## GitHub CLI

- `gh auth status` reports an active authenticated `ROYAL777-21` GitHub account.
- GitHub CLI is no longer an authentication blocker for repo variable or PR operations; the remaining GitHub work is to supply only public-safe variable values and keep private provider secrets out of repository variables.
- Rechecked on 2026-07-10: `gh auth status` still reports an active authenticated `ROYAL777-21` account. The external readiness diagnostic now gives GitHub auth a longer timeout to avoid false negatives from slow GitHub API responses.

## Supabase CLI

- `supabase --version` reports `2.108.0`.
- `supabase login --help` confirms the CLI supports `supabase login --token <token>` and `--no-browser`.
- The provider-auth diagnostic still reports `LegacyPlatformAuthRequiredError` because this shell has no local Supabase profile and no `SUPABASE_ACCESS_TOKEN`.
- Rechecked on 2026-07-10: `SUPABASE_ACCESS_TOKEN`, `ZOOT_STAGING_SUPABASE_DB_URL`, `ZOOT_PRODUCTION_SUPABASE_DB_URL`, and `SUPABASE_DB_URL` are still absent from this shell, so live Auth redirect apply and live migration dry-run/repair remain blocked by local credential state.
- Per Supabase CLI docs, a personal access token should be supplied through native CLI login or a local environment variable. Do not paste the token into chat.
- Migration-history repair now also supports `-PromptDatabasePassword` in `scripts/ops/repair-supabase-migration-history.ps1`, so a full database URL no longer needs to be pasted into chat or stored in the repo for the guarded repair flow.
- Staging migration repair planning was re-run on 2026-07-10 with `npm run ops:supabase:repair-migrations -- -Environment staging -PlanOnly`; it still allowlists only `20260629113000`, `20260629200351`, `20260630005420`, and `20260630102715`, and still blocks known partial/split migrations.

## CodeRabbit CLI

- `coderabbit --version` reports `0.6.4`.
- `coderabbit auth login --agent` previously returned `environment_unsupported` because localhost callback and stdin fallback are unavailable in this Windows session.
- `coderabbit auth login --help` confirms `coderabbit auth login --api-key <api-key>` is the available non-browser path.
- CodeRabbit is now API-key authenticated locally. `coderabbit doctor` reports 8 pass, 1 warning for browser OAuth fallback only.
- `coderabbit review --type uncommitted --plain` completed on 2026-07-01 with no findings for the migration-repair helper patch.
- Rechecked through the external readiness diagnostic on 2026-07-10: CodeRabbit CLI `0.6.4` is installed and authenticated with local API-key credentials.

## Cloudflare Zone

- Cloudflare API `GET /zones?name=xoot.co.za` returned zero matching zones.
- Cloudflare API `POST /zones` with `name: "xoot.co.za"`, `type: "full"`, and `jump_start: true` failed because the connected token lacks `com.cloudflare.api.account.zone.create`.
- The blocker is account permission scope, not repo code. Create the zone manually in the Cloudflare dashboard or provide a rotated token with account zone-create permission through an approved secret store.
