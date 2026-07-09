-- Optional Zooter modules and ranking metadata for Phase 4 follow-on hardening.
alter table public.training_modules
  add column if not exists rank_points integer not null default 25,
  add column if not exists badge_label text;

comment on column public.training_modules.rank_points is
  'Non-payment gamification score used by the Zooter training UI and ranking-quality workflows.';
comment on column public.training_modules.badge_label is
  'Short human-readable badge unlocked when the module is passed.';

update public.training_modules
set rank_points = case when required then 40 else 25 end
where rank_points = 0;

insert into public.training_modules (
  id,
  title,
  category,
  description,
  duration_min,
  pass_score,
  required,
  badge_color,
  rank_points,
  badge_label,
  quiz_questions
) values
  (
    '00000000-0000-4000-8000-000000000201',
    'Airbnb turnover readiness',
    'hospitality',
    'Fast guest-ready cleaning, photo proof, linen reset, restock checks, and host communication for short-stay homes.',
    9,
    85,
    false,
    'primary',
    35,
    'Turnover Pro',
    '[{"q":"What should be checked before marking an Airbnb turnover complete?","a":["Photos, linens, restock items, and damage notes","Only the floors","Only the kitchen"],"correct":0}]'::jsonb
  ),
  (
    '00000000-0000-4000-8000-000000000202',
    'Eco and fragrance-free care',
    'wellness',
    'How to serve allergy-aware homes, fragrance-free requests, pets, babies, and clients who prefer lower-impact products.',
    7,
    80,
    false,
    'sage',
    25,
    'Wellness Ready',
    '[{"q":"If a client requests fragrance-free cleaning, what should you do?","a":["Use only approved fragrance-free products and note the request","Add a strong scent at the end","Ignore it if the home smells clean"],"correct":0}]'::jsonb
  ),
  (
    '00000000-0000-4000-8000-000000000203',
    'Premium surface protection',
    'quality',
    'Marble, stone, wood, brass, glass, induction tops, and when to stop before damaging a surface.',
    8,
    85,
    false,
    'primary',
    35,
    'Surface Safe',
    '[{"q":"What is the safest action if you are unsure which product to use on stone?","a":["Pause and ask before applying anything","Use the strongest cleaner","Scrub harder with a rough pad"],"correct":0}]'::jsonb
  ),
  (
    '00000000-0000-4000-8000-000000000204',
    'Quiet luxury communication',
    'client-care',
    'Short updates, respectful tone, privacy boundaries, issue reporting, and how to make clients feel looked after.',
    6,
    80,
    false,
    'sage',
    25,
    'Client Care',
    '[{"q":"Which message is best when you notice a broken item before cleaning?","a":["A short respectful note with a photo before touching the area","Say nothing","Move it out of sight"],"correct":0}]'::jsonb
  ),
  (
    '00000000-0000-4000-8000-000000000205',
    'Office quick-clean standard',
    'business',
    'High-speed office resets, desks, meeting rooms, kitchens, bathrooms, entry areas, and after-hours handover.',
    8,
    80,
    false,
    'primary',
    30,
    'Office Ready',
    '[{"q":"What matters most in a quick office clean?","a":["Visible high-traffic areas, hygiene touchpoints, and clear handover","Only emptying bins","Only vacuuming"],"correct":0}]'::jsonb
  )
on conflict (id) do update set
  title = excluded.title,
  category = excluded.category,
  description = excluded.description,
  duration_min = excluded.duration_min,
  pass_score = excluded.pass_score,
  required = excluded.required,
  badge_color = excluded.badge_color,
  rank_points = excluded.rank_points,
  badge_label = excluded.badge_label,
  quiz_questions = excluded.quiz_questions;
