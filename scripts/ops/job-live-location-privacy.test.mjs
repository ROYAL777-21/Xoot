import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const migration = readFileSync(new URL('../../supabase/migrations/20261016171500_xoot_job_live_positions_private.sql', import.meta.url), 'utf8');
const handler = readFileSync(new URL('../../supabase/functions/xoot-job-location/index.ts', import.meta.url), 'utf8');
const config = readFileSync(new URL('../../supabase/config.toml', import.meta.url), 'utf8');

const hasMinimumTableGate = (sql) =>
  /alter table public\.xoot_job_live_positions enable row level security/i.test(sql) &&
  /revoke all on table public\.xoot_job_live_positions from public, anon, authenticated/i.test(sql) &&
  /grant select, insert, update, delete on table public\.xoot_job_live_positions to service_role/i.test(sql) &&
  !/grant [\s\S]{0,100} on (?:table )?public\.xoot_job_live_positions to (?:anon|authenticated)/i.test(sql);

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
  assert.match(handler, /now - Date\.parse\(previous\.updated_at\) < REPORT_MIN_INTERVAL_MS/);
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
