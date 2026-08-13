-- Concierge answers can now come from OpenRouter, so `source` has to be able to say so.
--
-- ── What actually breaks without this, which is quieter than it sounds ──────────────────────
-- `report-concierge-answer` reads:
--
--     const source = allowedSources.has(body.source) ? body.source : "unknown";
--
-- so an unrecognised provider does NOT fail the insert — it silently files the report under
-- 'unknown'. Nothing errors, nobody is blocked, and the report is still saved. What is lost is
-- attribution: every complaint about an OpenRouter answer would be recorded as coming from
-- nowhere in particular.
--
-- That is precisely the question worth being able to answer after changing providers — "are the
-- new model's answers being reported more often than the old one's?" — and it is unanswerable
-- from data that says 'unknown'. A soft failure that destroys the measurement is still a failure;
-- it just does not announce itself.
--
-- ── Ordering ───────────────────────────────────────────────────────────────────────────────
-- Apply this BEFORE deploying `support-respond` and `report-concierge-answer`. The reverse order
-- costs a window of mis-attributed reports rather than an outage, but there is no reason to take
-- it. See `docs/release/go-live.md` §3a.

alter table public.zoot_concierge_feedback
  drop constraint if exists zoot_concierge_feedback_source_check;

alter table public.zoot_concierge_feedback
  add constraint zoot_concierge_feedback_source_check
  check (source in (
    'knowledge_base',
    'openai_responses',
    'openrouter',
    'human_escalation',
    'local_knowledge',
    'unknown'
  ));

-- The column predates there being more than one provider. Renaming it would touch `ops-workflow`,
-- `Support.tsx` and the original migration for no behavioural gain, so it keeps its name and says
-- what it actually holds.
comment on column public.zoot_concierge_feedback.source is
  'Which producer the reported answer came from. ''openrouter'' added 2026-08-13 when the Concierge moved to OpenRouter with OpenAI as fallback; both can appear, and which one answered is not fixed per deployment.';
