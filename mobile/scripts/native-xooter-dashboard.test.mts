import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import type { XooterJobCard } from '../src/lib/native-xooter-ledger';
import {
  hasVerifiedXooterHomeAccess, readXooterHomeProfile,
  sastCalendarDay, xooterHomeSnapshot,
} from '../src/lib/native-xooter-dashboard';

const owner = '6b83a123-94d9-4c0b-b628-f44270549073';
const profile = {
  id: 'fba1bece-b6bc-4cae-b971-7caab2bb903a',
  user_id: owner, active: true, background_check_status: 'approved',
};
const makeJob = (id: string, state: XooterJobCard['state'], scheduled_at: string | null): XooterJobCard => ({
  job_id: id, booking_id: 'ba0a2e50-2af9-4098-8f28-de0e3439ab32',
  xooter_id: profile.id, state,
  service: 'regular', service_type: 'regular',
  scheduled_at, offered_at: null, duration_hours: 3, status: null,
});

test('SAST calendar dates cross midnight at UTC 22:00 regardless of device timezone', () => {
  assert.equal(sastCalendarDay('2026-10-15T21:59:59.999Z'), '2026-10-15');
  assert.equal(sastCalendarDay('2026-10-15T22:00:00.000Z'), '2026-10-16');
  assert.equal(sastCalendarDay('2026-12-31T22:15:00Z'), '2027-01-01');
  assert.equal(sastCalendarDay('invalid'), null);
});
test('only accepted jobs are counted in today; offers remain separate', () => {
  const now = new Date('2026-10-16T07:00:00Z');
  const summary = xooterHomeSnapshot([
    makeJob('accepted-today', 'accepted', '2026-10-16T08:00:00Z'),
    makeJob('offer-today', 'offered', '2026-10-16T09:00:00Z'),
    makeJob('accepted-tomorrow', 'accepted', '2026-10-17T08:00:00Z'),
    makeJob('declined-today', 'declined', '2026-10-16T11:00:00Z'),
  ], now);
  assert.equal(summary.offers, 1);
  assert.equal(summary.accepted, 2);
  assert.deepEqual(summary.today.map(job => job.job_id), ['accepted-today']);
  assert.equal(summary.next?.job_id, 'accepted-today');
});
test('old first-visit times cannot show as Next even if stale accepted status', () => {
  const now = new Date('2026-10-16T12:00:00Z');
  const summary = xooterHomeSnapshot([
    makeJob('stale-today', 'accepted', '2026-10-16T06:00:00Z'),
    makeJob('tomorrow', 'accepted', '2026-10-17T06:00:00Z'),
  ], now);
  assert.equal(summary.today.length, 1);
  assert.equal(summary.next?.job_id, 'tomorrow');
});
test('eligibility requires a current-owner profile, activation and approved background screening', () => {
  assert.deepEqual(readXooterHomeProfile(profile, owner), profile);
  assert.equal(hasVerifiedXooterHomeAccess(profile), true);
  assert.equal(hasVerifiedXooterHomeAccess({ ...profile, active: false }), false);
  assert.equal(hasVerifiedXooterHomeAccess({ ...profile, background_check_status: 'pending' }), false);
  assert.equal(readXooterHomeProfile({ ...profile, user_id: 'another-worker' }, owner), null);
  assert.equal(readXooterHomeProfile({ ...profile, active: 'true' }, owner), null);
  assert.equal(readXooterHomeProfile({ ...profile, background_check_status: 1 }, owner), null);
  assert.equal(readXooterHomeProfile(null, owner), null);
});
test('Expo UI never hardcodes income/arrival times or uses unscoped jobs', () => {
  const home = readFileSync(new URL('../src/app/xooter/index.tsx', import.meta.url), 'utf8');
  const account = readFileSync(new URL('../src/app/account.tsx', import.meta.url), 'utf8');
  assert.match(home, /\.eq\('user_id', userId\)/);
  assert.match(home, /hasVerifiedXooterHomeAccess\(profile\)/);
  assert.match(home, /parseXooterJobCards\(jobResult, profile.id\)/);
  assert.match(home, /key=\{user.id\}/);
  assert.match(home, /let current = true/);
  assert.match(home, /return \(\) => \{ current = false; \}/);
  assert.match(account, /router\.push\("\/xooter"\)/);
  for (const route of ['/xooter/jobs', '/xooter/earnings', '/xooter/kyc', '/xooter/training']) {
    assert.ok(home.includes(route), `Expected dashboard shortcut: ${route}`);
  }
  assert.doesNotMatch(home, /R2.?840|R680|98% on time|Paid out this week|live GPS map|customer_address|access_code/i);
});
