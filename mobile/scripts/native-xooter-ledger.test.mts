import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  getXooterEarningsRow, groupXooterJobs, parseXooterJobCards,
  startOfNativeEarningsPeriod, summariseRecordedEarnings, xooterMoney,
} from '../src/lib/native-xooter-ledger';

const owner = 'worker-1';
const job = {
  job_id: 'job-1', booking_id: 'booking-1', xooter_id: owner,
  state: 'offered', offered_at: '2026-10-14T09:00:00Z', responded_at: null,
  service: 'regular', service_type: 'regular', scheduled_at: '2026-10-17T08:00:00Z',
  duration_hours: 5, status: 'awaiting_assignment',
  destination_address: 'PRIVATE NOT FOR JOB CARDS',
  user_id: 'CUSTOMER ID MUST NEVER DISPLAY', price: 700,
};
const earning = { id: 'earning-1', xooter_id: owner, booking_id: 'booking-1',
  gross_amount: 500, platform_fee: 125, net_amount: 375, status: 'pending', created_at: '2026-10-14T10:00:00Z' };

test('the Xooter job parser refuses other workers and strips sensitive fields', () => {
  const parsed = parseXooterJobCards({ success: true, data: { jobs: [job] } }, owner);
  assert.equal(parsed?.[0]?.job_id, job.job_id);
  assert.equal(parsed?.[0]?.service, 'regular');
  assert.ok(!('destination_address' in (parsed?.[0] || {})));
  assert.ok(!('user_id' in (parsed?.[0] || {})));
  assert.ok(!('price' in (parsed?.[0] || {})));
  assert.equal(parseXooterJobCards({ jobs: [job] }, 'someone-else'), null);
  assert.equal(parseXooterJobCards({ success: true, data: { jobs: [{ ...job, xooter_id: 'someone-else' }] } }, owner), null);
  assert.equal(parseXooterJobCards({ success: true, data: { jobs: 'not-an-array' } }, owner), null);
  assert.equal(parseXooterJobCards({ success: false, data: { jobs: [job] } }, owner), null);
});
test('offers, accepted and other historical statuses group without invented records', () => {
  const rows = parseXooterJobCards({ success: true, data: { jobs: [
    job, { ...job, job_id: 'job-2', state: 'accepted' },
    { ...job, job_id: 'job-3', state: 'declined' },
  ] } }, owner)!;
  const grouped = groupXooterJobs(rows);
  assert.deepEqual([grouped.offered.length, grouped.accepted.length, grouped.history.length], [1, 1, 1]);
});
test('earnings only accept own finite records and do not imply provider settlement', () => {
  assert.deepEqual(getXooterEarningsRow(earning, owner), earning);
  assert.equal(getXooterEarningsRow({ ...earning, xooter_id: 'other' }, owner), null);
  assert.equal(getXooterEarningsRow({ ...earning, net_amount: Number.NaN }, owner), null);
  assert.equal(getXooterEarningsRow({ ...earning, created_at: 'bad date' }, owner), null);
  const parsed = getXooterEarningsRow(earning, owner)!;
  assert.deepEqual(summariseRecordedEarnings([parsed]), { recordedNet: 375, pendingNet: 375, entries: 1 });
  assert.match(xooterMoney(375), /375/);
});
test('periods are explicit rolling 7 and 30 days with no fictitious Friday payout', () => {
  const today = new Date('2026-10-15T00:00:00Z');
  assert.equal(startOfNativeEarningsPeriod('week', today), '2026-10-08T00:00:00.000Z');
  assert.equal(startOfNativeEarningsPeriod('month', today), '2026-09-15T00:00:00.000Z');
});
test('native Xooter screens retain account-scoped fetch, safe job cards and bounded ledgers', () => {
  const jobs = readFileSync(new URL('../src/app/xooter/jobs.tsx', import.meta.url), 'utf8');
  const earnings = readFileSync(new URL('../src/app/xooter/earnings.tsx', import.meta.url), 'utf8');
  const account = readFileSync(new URL('../src/app/account.tsx', import.meta.url), 'utf8');
  assert.match(account, /router\.push\("\/xooter\/jobs"\)/);
  assert.match(jobs, /get-xooter-job-cards/);
  assert.match(jobs, /WebBrowser\.openBrowserAsync\(portal\)/);
  assert.doesNotMatch(jobs, /Linking\.openURL\(portal\)/);
  assert.match(jobs, /\.eq\('user_id', userId\)/);
  assert.match(jobs, /key=\{user\.id\}/);
  assert.match(jobs, /parseXooterJobCards\(data, account\.id\)/);
  assert.doesNotMatch(jobs, /\{job\.destination_address\}|\{job\.user_id\}/);
  assert.match(earnings, /\.eq\('xooter_id', profile\.id\)/);
  assert.match(earnings, /\.limit\(101\)/);
  assert.match(earnings, /key=\{user\.id\}/);
  assert.match(earnings, /not proof of bank settlement/i);
  assert.doesNotMatch(earnings, /Paid out this week|pays out every Friday/i);
});
