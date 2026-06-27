-- Remove early prototype Zooter seed records after legacy migrations run.
-- This is intentionally narrow: it targets only the hardcoded `/src/assets/worker-*`
-- demo records inserted by the initial prototype migration.

DELETE FROM public.zooters
WHERE photo_url LIKE '/src/assets/worker-%'
  AND name IN (
    'Maria S.',
    'Diego R.',
    'Aisha K.',
    'Tom W.',
    'Priya N.',
    'Luca M.',
    'Nadia B.',
    'Jamal T.',
    'Sofia G.',
    'Ivan P.',
    'Yuki H.',
    'Eli K.'
  );
