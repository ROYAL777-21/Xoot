# Zoot Tool Approval Gates

Do not perform these actions without explicit user approval and a clear rollback/manual recovery note:

- production deployment;
- live Supabase migrations or RLS policy changes;
- live secret creation, rotation, deletion, or exposure;
- payment, refund, subscription activation, or ZootCred balance changes;
- contractor activation, verification badge changes, or trust-status changes;
- legal, insurance, guarantee, or public claims wording changes;
- bulk outreach through Brevo, Twilio, Airtable automations, or marketing tools;
- publishing ads, app-store submissions, or production SEO changes that create public claims.

Safe without extra approval when scoped to the repo:

- creating templates and docs with placeholders;
- running local tests, lint, build, secret scans, and static searches;
- creating local Edge Function code without deploying it;
- writing manual dashboard checklists;
- inspecting local git state and remote CI state when authenticated tools are available.
