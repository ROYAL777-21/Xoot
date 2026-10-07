# Notification database verification

Prepared migration: `20261002000000_notifications_realtime_permissions.sql`.
Local PostgreSQL 17.11 execution: 2 October. Independent spec/security-quality review:
7 October, against the unchanged implementation. No hosted migration was applied.

The migration removes client TRUNCATE/TRIGGER from notifications and push_tokens, including
PUBLIC grants, and checks all eight effective client/table/privilege combinations. It adds
only notifications to the existing realtime publication, preserving its options, tables,
owner policies, legitimate grants and primary-key replica identity. Missing publication
or remaining inherited privileges fail the atomic statement without partial changes.

The disposable verifier executed **23 assertion groups and 30 expected SQL rejections**:

- Original successful client truncation and trigger creation were reproduced inside rolled-back transactions.
- Both client roles are denied those operations after the migration.
- Owner notification reads/read-flag updates and owner push CRUD still work; cross-owner
  access, notification content/ownership rewrites and client notification insertion/deletion fail.
- Service/system notification insertion still works. Exact policy/grant/publication snapshots
  preserve unrelated state, exclude push_tokens and remain stable on repeated application.
- PUBLIC-only excess grants are removed. All eight inherited-grant cases and a missing
  publication produce the expected failure with no partial revocation or publication changes.

Tests load the actual historical schema/grant/final-policy sections. The scaffold contains
synthetic users and one existing published table. Execution requires explicit test intent,
literal loopback, an explicit database account and bounded timeouts. The script removes only
its uniquely created test database/roles and verifies existing role attributes/memberships
are unchanged before reporting success. No customer rows or credentials were printed.

Syntax, recommended JavaScript lint (zero errors/warnings), workflow matrix/required-step
checks and two pre-connection safety-refusal probes passed. CI now includes this verifier
as a required step on PostgreSQL 17.6 and 17.11; its remote results must be checked after push.
The review package showed line-ending noise; Git's normalized working-tree diff confirms
the workflow has exactly ten added lines and zero removed lines.

Local PostgreSQL assertions do not prove hosted Supabase WebSocket delivery. Required next
steps are successful staging migration preflight, audited CLI application, post-application
catalog checks and authenticated INSERT/UPDATE delivery with consenting test accounts.
Production delivery follows the reviewed rollout. Provider/native notification lifecycle
remains a separate unfinished part of the full plan.
