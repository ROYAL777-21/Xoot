# Xoot plugin package

Portable Agent Plugins package for Xoot. The server implementation lives in `supabase/functions/xoot-mcp`, and the remote endpoint is configured in `mcp.json`.

**Important:** The production URL in `mcp.json` is the planned endpoint on Xoot's existing Supabase project. It will not respond until the new Edge Function has been deployed and verified. Do not submit or install this package before a real end-to-end MCP smoke test.

## Contents

- `plugin.json`: portable package and draft directory listing metadata.
- `mcp.json`: remote HTTP MCP connection, no user authentication (public read-only).
- `skills/explore-xoot-home-care/SKILL.md`: safe service exploration and booking hand-off guidance.

## Before public submission

Review the listing text, select the correct directory category, add approved brand artwork, test all tools with the intended host, capture a demonstration and submission evidence, and verify current privacy/terms URLs. Zip this folder with `plugin.json` at the archive root. Complete verification, review and publication in the official plugin dashboard.

See `../../docs/integrations/LLM_PLUGIN.md`.
