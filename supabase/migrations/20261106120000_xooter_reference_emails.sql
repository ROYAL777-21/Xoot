-- Xooter reference emails — 2026-11-06
--
-- WHY THIS MIGRATION EXISTS
-- References were collected as name + phone only. The founder's verification model (2026-11-06)
-- is that references are verified THROUGH their phone and email, and that self-references are
-- detected by phone and email — never by name, which strangers share and which an applicant can
-- simply retype. Enforcing that needs the email address of each reference, which until now had
-- nowhere to live.
--
-- The columns follow the existing reference_1_name / reference_1_phone pattern deliberately:
-- flat columns (not a new jsonb shape) so the admin KYC review surface and any future
-- server-side outreach both read them without a payload unwrap.
--
-- No data migration: existing draft applications have no reference emails and will be asked for
-- them the next time the applicant opens the form — the required-fields check at submit treats
-- them as required from the moment this deploys.

alter table public.xooter_applications
  add column if not exists reference_1_email text,
  add column if not exists reference_2_email text;

-- Drafts saved before this change may carry a null reference email; the Edge Function's
-- required-fields check (getSubmitMissing) enforces presence at SUBMIT time, not at the column
-- level, so in-flight applications are not bricked by the migration landing mid-application.
