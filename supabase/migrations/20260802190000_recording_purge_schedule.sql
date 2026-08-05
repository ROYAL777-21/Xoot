-- Actually delete expired recordings.
--
-- `private.purge_expired_recordings()` was written with the recording schema but nothing ever
-- called it, so the "unattached recordings are deleted after 30 days" promise in
-- `src/lib/safety.ts` was true of the code and false of the system. A retention rule that
-- depends on someone remembering to run it is not a retention rule, and under POPIA it is the
-- kind of gap that turns a documented safeguard into a misrepresentation.
--
-- pg_cron rather than an external scheduler: the deletion is a single statement against the
-- same database, and routing it through an Edge Function would add a network hop, a secret,
-- and a second thing that can be down.

begin;

create extension if not exists pg_cron with schema extensions;

-- 03:10 UTC — 05:10 SAST, outside any plausible booking window, so a purge never competes with
-- a live visit for connections.
select cron.schedule(
  'purge-expired-visit-recordings',
  '10 3 * * *',
  $$select * from private.purge_expired_recordings();$$
);

commit;

-- The storage objects themselves are not removed here. `purge_expired_recordings()` returns the
-- `storage_path` of every row it deleted precisely so a worker can delete the ciphertext too;
-- until that worker exists, the rows go and the encrypted blobs remain.
--
-- That ordering is deliberate. Losing the row while keeping an unreferenced encrypted blob is
-- recoverable and inert — nobody holds the key. Losing the blob while keeping the row would
-- leave a recording that appears attachable to an incident and cannot be produced.
--
-- Tracked in blocker.md under the safety section.
