-- Finish the Zoot → Xoot rename in the DATA the product displays, and nowhere else.
--
-- ── The distinction this migration is built around ──────────────────────────────────────────
-- `zoot` appears in the database in three very different roles, and only one of them is safe to
-- rewrite:
--
--   1. PROSE — descriptions, purposes, knowledge text. Read by humans, or quoted to customers.
--      This migration changes these, and only these.
--
--   2. KEYS — `operational_controls.control_key` ('concierge.zootcred_support',
--      'zooter.sensitive_access', 'zoot_black.enabled', …), `agent_action_contracts.agent_key`
--      ('zoot_concierge'), `analytics_event_contracts.event_name`
--      ('zooter_training_module_completed'). These are looked up BY VALUE from Edge Function and
--      client code — `isOperationalControlEnabled(supa, "concierge.zooter_support")` and friends.
--      Renaming a key here without changing every caller does not error: the lookup simply finds
--      nothing and the control reads as **off**, silently disabling the feature it governs. That
--      is a worse outcome than the stale name, so they are left alone until code and data can move
--      in one change.
--
--   3. IDENTIFIERS — 19 tables and 27 columns (`zooters`, `zootcred_ledger`, `zooter_id`, …) plus
--      the `app_role` enum label 'zooter'. A separate and much larger migration touching every
--      function, policy, view and foreign key. Not attempted here.
--
-- `payment_provider_capabilities.reconciliation_reference_format` ('ZOOT-{PROVIDER}-…') is left
-- alone deliberately too: it is the shape of a **finance reference**, and changing what
-- reconciliation references look like is a finance decision, not a spelling one.
--
-- ── Why the knowledge row matters even though nothing reads it yet ──────────────────────────
-- `zoot_concierge_knowledge_versions` is a snapshot; the Edge Functions serve the bundled
-- `_shared/zoot-knowledge.ts`, which already says Xoot throughout (checked: zero 'Zoot' matches).
-- So this row is not currently quoted to anyone. It becomes live the moment DB-backed retrieval is
-- approved — the original migration says exactly that — and it would then start telling customers
-- about "ZootCred". Fixing it now is cheap; fixing it after it is live is a customer-visible wrong
-- brand name in support answers.

update public.operational_controls
set description = replace(replace(description, 'Zoot', 'Xoot'), 'zoot', 'xoot')
where description like '%oot%' and description ~ '[Zz]oot';

-- Also stale for a second reason: ZD-027 made OpenRouter the primary provider with OpenAI as
-- fallback, so a description naming only OpenAI understates what the switch governs.
update public.operational_controls
set description = 'Allows Xoot Concierge to call a language model — OpenRouter first, OpenAI as fallback — after redaction, rate limiting and escalation controls pass review.'
where control_key = 'support.openai_fallback';

update public.agent_action_contracts
set data_boundaries = replace(replace(data_boundaries, 'Zoot', 'Xoot'), 'zoot', 'xoot')
where data_boundaries ~ '[Zz]oot';

update public.analytics_event_contracts
set purpose = replace(replace(purpose, 'Zoot', 'Xoot'), 'zoot', 'xoot')
where purpose ~ '[Zz]oot';

update public.training_modules
set description = replace(replace(description, 'Zoot', 'Xoot'), 'zoot', 'xoot')
where description ~ '[Zz]oot';

update public.zoot_concierge_knowledge_versions
set source_summary = replace(replace(source_summary, 'Zoot', 'Xoot'), 'zoot', 'xoot'),
    knowledge_context = replace(replace(knowledge_context, 'Zoot', 'Xoot'), 'zoot', 'xoot')
where source_summary ~ '[Zz]oot' or knowledge_context ~ '[Zz]oot';

-- `Zoot` → `Xoot` also fixes `ZootCred` → `XootCred` and `Zooter` → `Xooter` in one pass, because
-- both contain the brand as a prefix. Verified by previewing every affected row before applying.
