import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  getXooterEarningsRow, groupXooterJobs, isXooterJobId, olderXooterEarningsFilter, parseXooterJobCards, xooterCents, XOOTER_EARNINGS_PAGE_SIZE,
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
const earning = { id: '92c988a2-dca7-4e33-9c7b-7c4ca34f87e2', xooter_id: owner, booking_id: '21e79685-325c-4d2e-a039-8599fc0afe91',
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
test('real production nullable booking references remain valid ledger entries', () => {
  const adjustment = { ...earning, booking_id: null };
  assert.deepEqual(getXooterEarningsRow(adjustment, owner), adjustment);
  assert.equal(getXooterEarningsRow({ ...adjustment, booking_id: '../other-account' }, owner), null);
  assert.equal(getXooterEarningsRow({ ...adjustment, xooter_id: 'another-worker' }, owner), null);
  assert.deepEqual(summariseRecordedEarnings([getXooterEarningsRow(adjustment, owner)!]), {
    recordedNet: 375, pendingNet: 375, entries: 1,
  });
});

test('malformed, replayed and overlarge worker job replies fail closed', () => {
  const result = (jobs: unknown[]) => ({ success: true, data: { jobs } });
  assert.equal(parseXooterJobCards(result([job, job]), owner), null);
  assert.equal(parseXooterJobCards(result([{ ...job, state: 'fake_payout' }]), owner), null);
  assert.equal(parseXooterJobCards(result(Array(501).fill(job)), owner), null);
  assert.equal(parseXooterJobCards(result([job]), owner)?.length, 1);
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
test('money is summed as exact cents, not floating-point amounts or fake bank settlements', () => {
  assert.equal(xooterCents(0.1), 10);
  assert.equal(xooterCents(0.2), 20);
  assert.equal(xooterCents(0.001), null);
  assert.equal(xooterCents(Number.NaN), null);
  assert.equal(xooterCents(1e16), null);
  assert.deepEqual(summariseRecordedEarnings([
    { ...earning, id: '127079d4-5c10-4e12-aee8-2cfd9fd98e49', net_amount: 0.1, status: 'pending' },
    { ...earning, id: '127079d4-5c10-4e12-aee8-2cfd9fd98e50', net_amount: 0.2, status: 'pending' },
  ]), { recordedNet: 0.3, pendingNet: 0.3, entries: 2 });
  assert.equal(getXooterEarningsRow({ ...earning, net_amount: 4.0001 }, owner), null);
});
test('keyset pagination validates the current worker cursor and stable ordering', () => {
  assert.equal(XOOTER_EARNINGS_PAGE_SIZE, 50);
  assert.equal(isXooterJobId('4e3db7c0-962c-4879-b3a2-66a7e580244c'), true);
  assert.equal(isXooterJobId('../someone-else'), false);
  const filter = olderXooterEarningsFilter(earning);
  assert.equal(filter, `created_at.lt.2026-10-14T10:00:00.000Z,and(created_at.eq.2026-10-14T10:00:00.000Z,id.lt.${earning.id})`);
  assert.equal(olderXooterEarningsFilter({ id: '../malicious', created_at: earning.created_at }), null);
  assert.equal(olderXooterEarningsFilter({ id: earning.id, created_at: 'bad' }), null);
});
test('native Xooter screens retain account-scoped fetch, safe job cards and bounded ledgers', () => {
  const jobs = readFileSync(new URL('../src/app/xooter/jobs.tsx', import.meta.url), 'utf8');
  const earnings = readFileSync(new URL('../src/app/xooter/earnings.tsx', import.meta.url), 'utf8');
  const account = readFileSync(new URL('../src/app/account.tsx', import.meta.url), 'utf8');
  const jobDetail = readFileSync(new URL('../src/app/xooter/job/[id].tsx', import.meta.url), 'utf8');
  assert.match(account, /router\.push\("\/xooter\/jobs"\)/);
  assert.match(jobs, /pathname: '\/xooter\/job\/\[id\]'/);
  assert.match(jobDetail, /parseXooterJobCards\(data, owner.id\)/);
  assert.match(jobDetail, /isXooterJobId\(params.id\)/);
  assert.match(jobDetail, /key=\{\`\$\{user.id\}:\$\{params.id\}\`\}/);
  assert.doesNotMatch(jobDetail, /destination_address|gate_code|alarm_code|customer_id/);
  assert.match(jobs, /get-xooter-job-cards/);
  assert.match(jobs, /WebBrowser\.openBrowserAsync\(portal\)/);
  assert.doesNotMatch(jobs, /Linking\.openURL\(portal\)/);
  assert.match(jobs, /\.eq\('user_id', userId\)/);
  assert.match(jobs, /key=\{user\.id\}/);
  assert.match(jobs, /parseXooterJobCards\(data, account\.id\)/);
  assert.doesNotMatch(jobs, /\{job\.destination_address\}|\{job\.user_id\}/);
  assert.match(earnings, /\.eq\('xooter_id', args\.owner\)/);
  assert.match(earnings, /\.eq\('user_id', userId\)/);
  assert.match(earnings, /getLedgerPage\(\{ owner: profile\.id/);
  assert.match(earnings, /\.limit\(XOOTER_EARNINGS_PAGE_SIZE \+ 1\)/);
  assert.match(earnings, /olderXooterEarningsFilter/);
  assert.match(earnings, /Load older earnings/);
  assert.match(earnings, /Partial sum of records loaded so far/);
  assert.match(earnings, /key=\{\`\$\{user.id\}:\$\{period\}\`\}/);
  assert.match(earnings, /Earnings ledger entry/);
  assert.match(earnings, /not proof of bank settlement/i);
  assert.doesNotMatch(earnings, /Paid out this week|pays out every Friday/i);
});
