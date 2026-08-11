-- Where the suburbs are, so "near you" can mean something.
--
-- WHAT THIS REPLACES
-- ------------------
-- `zooters.distance_mi` is a static seeded column. `ai-match` scored candidates with
-- `score -= distance_mi * 3`, so a Xooter was the same distance from every customer in the
-- country, and `XooterCard` rendered that number to people as `${distance_mi} km`. Nothing
-- computed a distance from anywhere to anywhere.
--
-- WHY SUBURB CENTROIDS AND NOT ADDRESSES
-- --------------------------------------
-- A booking address is where a person lives. Geocoding it and storing the result would buy
-- slightly better ordering at the cost of holding precise home coordinates — which under POPIA is
-- personal location data, kept for a sort order.
--
-- A suburb centroid is a public fact about a place. "Sandton is 6 km from Rosebank" is true
-- whoever lives there, and it answers the only question matching needs to ask: is this trip worth
-- the Xooter's time. No customer coordinate is ever stored.
--
-- WHY IT IS SAFE TO ADD NOW
-- -------------------------
-- Checked before writing: `zooters` and `bookings` both hold **zero rows** on production. There is
-- no data to migrate and no ordering to regress.

create table if not exists public.suburb_centroids (
  suburb text primary key,
  -- The approved launch region this suburb belongs to, matching `approvedLaunchRegions` in
  -- `_shared/action-utils.ts`. Suburbs outside a launch region carry the nearest one, so coverage
  -- can grow without a schema change.
  region text not null,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  -- Lets a suburb be retired without deleting it, so historic bookings still resolve.
  active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.suburb_centroids is
  'Public reference data: one coordinate per suburb, used to rank Xooters by travel distance. Never holds a customer coordinate.';

-- Johannesburg launch area. The twelve approved launch regions plus the immediate neighbours a
-- booking address is most likely to name, so an address in Morningside or Craighall still resolves
-- rather than falling back to unranked.
insert into public.suburb_centroids (suburb, region, latitude, longitude) values
  ('midrand',       'midrand',      -25.9992,  28.1263),
  ('waterfall',     'waterfall',    -26.0086,  28.1094),
  ('sandton',       'sandton',      -26.1076,  28.0567),
  ('bryanston',     'bryanston',    -26.0611,  28.0184),
  ('fourways',      'fourways',     -26.0169,  28.0104),
  ('dainfern',      'dainfern',     -25.9917,  27.9964),
  ('rosebank',      'rosebank',     -26.1467,  28.0436),
  ('hyde park',     'hyde park',    -26.1256,  28.0389),
  ('parkhurst',     'parkhurst',    -26.1447,  28.0128),
  ('melville',      'melville',     -26.1747,  27.9994),
  ('braamfontein',  'braamfontein', -26.1929,  28.0305),
  ('bedfordview',   'bedfordview',  -26.1786,  28.1364),
  -- Neighbours. Region points at the nearest approved launch region.
  ('morningside',   'sandton',      -26.0836,  28.0572),
  ('craighall',     'parkhurst',    -26.1258,  28.0111),
  ('rivonia',       'sandton',      -26.0553,  28.0608),
  ('sunninghill',   'sandton',      -26.0311,  28.0778),
  ('woodmead',      'sandton',      -26.0500,  28.0850),
  ('illovo',        'rosebank',     -26.1319,  28.0511),
  ('parktown',      'braamfontein', -26.1817,  28.0364),
  ('greenside',     'parkhurst',    -26.1489,  27.9989),
  ('linden',        'parkhurst',    -26.1339,  27.9814),
  ('randburg',      'bryanston',    -26.0936,  27.9756),
  ('lonehill',      'fourways',     -26.0139,  28.0203),
  ('kyalami',       'midrand',      -25.9986,  28.0631),
  ('edenvale',      'bedfordview',  -26.1400,  28.1550),
  ('germiston',     'bedfordview',  -26.2178,  28.1672)
on conflict (suburb) do nothing;

-- ── Access ──────────────────────────────────────────────────────────────────────
-- Public reference data, not user data: any signed-in client may read it so the app can show a
-- distance without a round trip through an Edge Function. Nobody but the service role may write —
-- moving a suburb's coordinates would silently re-rank every Xooter in it.
alter table public.suburb_centroids enable row level security;

drop policy if exists "suburb centroids are public reference data" on public.suburb_centroids;
create policy "suburb centroids are public reference data"
  on public.suburb_centroids
  for select
  using (true);

comment on policy "suburb centroids are public reference data" on public.suburb_centroids is
  'Readable by anyone: these are coordinates of places, not of people.';

revoke insert, update, delete on public.suburb_centroids from anon, authenticated;
grant select on public.suburb_centroids to anon, authenticated;
