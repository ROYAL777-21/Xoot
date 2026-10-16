import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const migration = readFileSync(new URL('../../supabase/migrations/20261016171500_xoot_job_live_positions_private.sql', import.meta.url), 'utf8');
const handler = readFileSync(new URL('../../supabase/functions/xoot-job-location/index.ts', import.meta.url), 'utf8');
const config = readFileSync(new URL('../../supabase/config.toml', import.meta.url), 'utf8');
const web = readFileSync(new URL('../../src/components/xoot/LiveJobJourney.tsx', import.meta.url), 'utf8');
const detail = readFileSync(new URL('../../src/pages/app/BookingDetail.tsx', import.meta.url), 'utf8');

const hasMinimumTableGate = (sql) =>
  /alter table public\.xoot_job_live_positions enable row level security/i.test(sql) &&
  /revoke all on table public\.xoot_job_live_positions from public, anon, authenticated/i.test(sql) &&
  /grant select, insert, update, delete on table public\.xoot_job_live_positions to service_role/i.test(sql) &&
  !/grant [\s\S]{0,100} on (?:table )?public\.xoot_job_live_positions to (?:anon|authenticated)/i.test(sql);

test('atomic GPS RPC also has a complete SQL dollar-quoted function body', () => {
  const begin = migration.indexOf('create or replace function public.xoot_publish_private_job_location(');
  const finish = migration.indexOf('revoke all on function public.xoot_publish_private_job_location(', begin);
  assert.ok(begin >= 0 && finish > begin, 'RPC DDL must exist');
  const body = migration.slice(begin, finish);
  assert.match(body, /security invoker\s+set search_path = ''\s+as \$\$\s+declare/);
  assert.match(body, /\n\$\$;\s*$/);
  assert.doesNotMatch(body, /\bas \$\s*\ndeclare/);
});

test('all private GPS trigger bodies use valid PostgreSQL dollar-quote delimiters', () => {
  const bodies = [...migration.matchAll(/language plpgsql security definer set search_path = '' as \$\$([\s\S]*?)\$\$;/gi)];
  assert.equal(bodies.length, 2, 'Both trigger functions must have complete $$ bodies');
  assert.doesNotMatch(migration, /\bas \$\s*\nbegin/i, 'Single-dollar PL/pgSQL bodies are invalid');
  assert.equal(bodies.every((match) => match[1].includes('begin') && match[1].includes('end;')), true);
});

test('inactive bookings do not reveal private lifecycle state to unauthorised callers', () => {
  const authorised = handler.indexOf('if (!isWorker && !isCustomer) return fail');
  const active = handler.indexOf('if (!active) return ok');
  assert.ok(authorised > -1 && active > -1 && authorised < active,
    'Caller identity must be verified before disclosing job state');
});

test('foreground stop waits for any outstanding position upload before deletion', () => {
  assert.match(web, /const pending = inFlightPublish\.current/);
  assert.match(web, /if \(pending\) await pending\.catch/);
  assert.match(web, /if \(!sharingActive\.current\) return/);
  assert.match(web, /if \(enabled && position\) return/);
});

test('only service-role Edge transport can access GPS table; no direct client or realtime public access', () => {
  assert.equal(hasMinimumTableGate(migration), true);
  assert.match(migration, /xooter_id uuid not null references public\.xooters/);
  assert.match(migration, /booking_id uuid primary key references public\.bookings/);
  assert.match(migration, /expires_at > recorded_at and expires_at <= recorded_at \+ interval '90 seconds'/);
  assert.doesNotMatch(migration, /alter publication|add table .*xoot_job_live_positions/i);
  assert.equal(hasMinimumTableGate(migration.replace(/revoke all on table public\.xoot_job_live_positions from public, anon, authenticated/gi, '--removed')), false);
  assert.equal(hasMinimumTableGate(migration.replace(/enable row level security/gi, '--removed')), false);
  assert.equal(hasMinimumTableGate(migration + '\ngrant select on public.xoot_job_live_positions to authenticated;'), false);
});

test('pg_cron physically deletes expired GPS rather than only obscuring stale rows', () => {
  assert.match(migration, /pg_cron must be installed for short-lived GPS retention/);
  assert.match(migration, /cron\.schedule\(/);
  assert.match(migration, /\* \* \* \* \*/);
  assert.match(migration, /delete from public\.xoot_job_live_positions where expires_at <= now\(\)/);
});

test('cancellation, completion and reassignment proactively clear live GPS', () => {
  assert.match(migration, /create trigger xoot_remove_location_on_booking_change/);
  assert.match(migration, /create trigger xoot_remove_location_on_job_change/);
  assert.match(migration, /new\.xooter_id is distinct from old\.xooter_id/);
  assert.match(migration, /new\.cancelled_at is not null/);
  assert.match(migration, /new\.completed_at is not null/);
  assert.match(migration, /new\.sensitive_data_revoked_at is not null/);
  assert.match(migration, /tg_op = 'DELETE'/);
  assert.match(migration, /revoke all on function private\.xoot_clear_live_location_on_booking_update\(\) from public, anon, authenticated/);
  assert.match(migration, /revoke all on function private\.xoot_clear_live_location_on_job_change\(\) from public, anon, authenticated/);
});

test('Edge JWT, accepted booking, current worker and explicit consent are all mandatory', () => {
  assert.match(config, /\[functions\.xoot-job-location\]\s*verify_jwt = true/);
  assert.match(handler, /await requireAuth\(req, origin\)/);
  assert.match(handler, /const actorId = auth\.user\.id/);
  assert.match(handler, /\["en_route", "enroute"\]\.includes\(String\(booking\.status\)\)/);
  assert.match(handler, /!booking\.cancelled_at && !booking\.completed_at && !booking\.sensitive_data_revoked_at/);
  assert.match(handler, /\.eq\("booking_id", bookingId\)\s*\.eq\("xooter_id", booking\.xooter_id\)\.eq\("state", "accepted"\)/);
  assert.match(handler, /worker\.user_id === actorId/);
  assert.match(handler, /booking\.user_id === actorId/);
  assert.match(handler, /if \(!isWorker && !isCustomer\)/);
  assert.match(handler, /if \(!isWorker\) return fail/);
  assert.match(handler, /body\.consent !== true/);
  assert.match(handler, /Math\.abs\(now - recorded\) > CLOCK_SKEW_MS/);
  assert.match(handler, /db\.rpc\("xoot_publish_private_job_location"/);
  assert.match(migration, /where public\.xoot_job_live_positions\.updated_at <= v_now - interval '10 seconds'/);
  assert.match(migration, /for update of b, j/);
  assert.match(migration, /revoke all on function public\.xoot_publish_private_job_location/);
  assert.match(migration, /to service_role;/);
  assert.doesNotMatch(handler, /\.upsert\(update/);
  assert.match(handler, /if \(action === "stop"\)/);
});

test('non-participants and stale records never see GPS, nor does API report an invented ETA', () => {
  assert.match(handler, /if \(!isWorker && !isCustomer\) return fail\("booking unavailable", origin, 404\)/);
  assert.match(handler, /Cache-Control", "private, no-store"/);
  assert.match(handler, /!candidate \|\| typeof candidate !== "object" \|\| Array\.isArray\(candidate\)/);
  assert.match(handler, /point\.xooter_id !== worker\.id/);
  assert.match(handler, /now > expiry \|\| now - captured > POSITION_MAX_AGE_MS/);
  assert.match(handler, /return ok\(\{ state: "unavailable" \}, origin\)/);
  assert.doesNotMatch(handler, /etaMinutes|routeDuration|Mapbox|console\.log\([^)]*(?:latitude|longitude)/);
});

test('web job journey is disabled by default and requires explicit foreground worker consent', () => {
  assert.match(web, /VITE_ENABLE_LIVE_JOURNEY === "true"/);
  assert.match(web, /if \(!ENABLED \|\| !mapboxToken\.startsWith\("pk\."\)\) return null/);
  assert.match(web, /Share my location for this booking/);
  assert.match(web, /View en-route location/);
  assert.match(web, /consent: true/);
  assert.match(web, /getCurrentPosition|watchPosition/);
  assert.match(web, /document\.visibilityState === "hidden"/);
  assert.match(web, /navigator\.geolocation\.clearWatch/);
  assert.match(web, /action: "stop"/);
  assert.match(web, /action: "read"/);
  assert.match(web, /action: "publish"/);
  assert.match(web, /attributionControl: true/);
  assert.match(web, /60_000/);
  assert.doesNotMatch(web, /localStorage|sessionStorage|saveGPS|backgroundLocation|etaMinutes/);
  assert.match(detail, /<LiveJobJourney bookingId=\{id\} isAssignedWorker=\{isAssignedXooter\}/);
  assert.match(detail, /VITE_ENABLE_LIVE_JOURNEY === "true"/);
  assert.match(detail, /No live GPS feed or calculated arrival time/);
});
