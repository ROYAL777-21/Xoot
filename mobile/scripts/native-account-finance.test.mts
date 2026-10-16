import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  olderXooterEarningsFilter, validateXooterEarningsPage,
  summariseRecordedEarnings, type XooterEarning,
} from '../src/lib/native-xooter-ledger';

const owner = 'worker-owner';
const idHigh = '92c988a2-dca7-4e33-9c7b-7c4ca34f87e3';
const idLow = '92c988a2-dca7-4e33-9c7b-7c4ca34f87e2';
const first: XooterEarning = {
  id: idHigh, xooter_id: owner, booking_id: null, status: 'pending',
  net_amount: 300.12, gross_amount: 400.12, platform_fee: 100,
  created_at: '2026-10-14T10:00:00.123456+00:00',
};
const second: XooterEarning = {
  ...first, id: idLow, net_amount: 300.11,
  created_at: '2026-10-14T10:00:00.123455+00:00',
};
const args = { owner, from: '2026-10-08T00:00:00.000Z', snapshot: '2026-10-17T00:00:00.000Z' };

test('strict keyset preserves Postgres microseconds across page boundaries', () => {
  assert.equal(olderXooterEarningsFilter(first),
    `created_at.lt.2026-10-14T10:00:00.123456+00:00,and(created_at.eq.2026-10-14T10:00:00.123456+00:00,id.lt.${idHigh})`);
  assert.equal(validateXooterEarningsPage([first, second], args), true);
  assert.equal(validateXooterEarningsPage([second], { ...args, cursor: first }), true);
  assert.equal(validateXooterEarningsPage([first], { ...args, cursor: first }), false);
});

test('financial pages fail closed for duplicates, reordering, other workers and wrong date bounds', () => {
  assert.equal(validateXooterEarningsPage([first, { ...first }], args), false);
  assert.equal(validateXooterEarningsPage([second, first], args), false);
  assert.equal(validateXooterEarningsPage([{ ...first, xooter_id: 'other-worker' }], args), false);
  assert.equal(validateXooterEarningsPage([{ ...first, created_at: '2026-10-20T10:00:00Z' }], args), false);
  assert.equal(validateXooterEarningsPage([{ ...first, created_at: '2026-10-01T10:00:00Z' }], args), false);
  assert.equal(validateXooterEarningsPage([first], { ...args, from: '2026-10-19T00:00:00Z' }), false);
  assert.equal(validateXooterEarningsPage([first], { ...args, cursor: { ...first, id: '../injection' } }), false);
});

test('identical PostgreSQL timestamps respect UUID descending ordering', () => {
  const tied = { ...second, created_at: first.created_at };
  assert.equal(validateXooterEarningsPage([first, tied], args), true);
  assert.equal(validateXooterEarningsPage([tied, first], args), false);
});

test('invalid and oversized cursor values cannot be inserted into PostgREST syntax', () => {
  assert.equal(olderXooterEarningsFilter({ id: first.id, created_at: '2026-10-14T10:00:00Z),xooter_id.eq.other' }), null);
  assert.equal(olderXooterEarningsFilter({ id: 'abc);x', created_at: first.created_at }), null);
  assert.equal(validateXooterEarningsPage(Array(52).fill(first), args), false);
});

test('unsafe aggregate totals are refused instead of displaying rounded payout amounts', () => {
  assert.deepEqual(summariseRecordedEarnings([first, second]),
    { recordedNet: 600.23, pendingNet: 600.23, entries: 2 });
  const huge = { ...first, net_amount: 50000000000000 };
  assert.throws(() => summariseRecordedEarnings([{ ...huge }, { ...huge, id: idLow }]), /overflow|precision/i);
});

test('native You saved places are owner-tagged before render, including loading and errors', () => {
  const screen = readFileSync(new URL('../src/app/account.tsx', import.meta.url), 'utf8');
  assert.match(screen, /placeSnapshot\.ownerId === currentOwner/);
  assert.match(screen, /places = placeOwnerMatches \? placeSnapshot\.places : \[\]/);
  assert.match(screen, /placeError = placeOwnerMatches && placeSnapshot\.error/);
  assert.match(screen, /placeLoading = !placeOwnerMatches \|\| placeSnapshot\.loading/);
  assert.match(screen, /\.eq\("user_id", currentOwner\)/);
  assert.match(screen, /if \(!active\) return;/);
  assert.match(screen, /Loading your saved places/);
  assert.doesNotMatch(screen, /if \(!user\) return;\s+void supabase\s+\.from\("household_profiles"\)/);
});

test('Expo earnings rejects malformed server pages and refuses unsafe totals in UI', () => {
  const screen = readFileSync(new URL('../src/app/xooter/earnings.tsx', import.meta.url), 'utf8');
  assert.match(screen, /validateXooterEarningsPage\(rows/);
  assert.match(screen, /Earnings history overlapped an earlier page/);
  assert.match(screen, /totals === null \? <EmptyState/);
  assert.match(screen, /Earnings need verification/);
  assert.doesNotMatch(screen, /Paid out this week|payout complete|payday Friday/i);
});
