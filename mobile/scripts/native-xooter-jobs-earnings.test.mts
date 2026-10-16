import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  exactRandCents, getXooterEarningsRow, groupXooterJobs, parseXooterJobCards,
  startOfNativeEarningsPeriod, summariseRecordedEarnings, xooterMoney,
} from '../src/lib/native-xooter-ledger';

const worker = '9c75d235-45eb-4994-9514-4a149a3f9b81';
const otherWorker = '7c5ea370-f9e5-4264-9012-f6fc34a2bde5';
const job = {
  job_id: '50f8e391-7ac8-4a59-a66f-2839fb44f302',
  booking_id: '96a0d1de-64c0-4561-9f21-7497e4b9e19e',
  xooter_id: worker, state: 'offered',
  service: 'regular', service_type: 'regular',
  scheduled_at: '2026-10-15T10:30:00+02:00',
  offered_at: '2026-10-14T09:00:00+02:00', duration_hours: 3, status: 'assigned',
  destination_address: 'Do not display this street',
  user_id: 'private-customer-id',
  price: 180.00,
};
const envelope = (jobs: unknown[]) => ({ success: true, data: { jobs } });

test('deployed action success envelope and owner-only public projection', () => {
  const parsed = parseXooterJobCards(envelope([job]), worker);
  assert.equal(parsed?.length, 1);
  assert.equal(parsed?.[0]?.job_id, job.job_id);
  assert.equal(parsed?.[0]?.state, 'offered');
  assert.equal(parsed?.[0] && 'destination_address' in parsed[0], false);
  assert.equal(parsed?.[0] && 'user_id' in parsed[0], false);
  assert.equal(parsed?.[0] && 'price' in parsed[0], false);
});
test('job projection rejects foreign Xooter, replayed, unrecognised or failed provider results', () => {
  assert.equal(parseXooterJobCards(envelope([job]), otherWorker), null);
  assert.equal(parseXooterJobCards(envelope([job, job]), worker), null);
  assert.equal(parseXooterJobCards(envelope([{ ...job, state: 'paid_out' }]), worker), null);
  assert.equal(parseXooterJobCards({ success: false, data: { jobs: [job] } }, worker), null);
  assert.equal(parseXooterJobCards({ jobs: [job] }, worker), null);
  assert.equal(parseXooterJobCards(envelope(new Array(501).fill(job)), worker), null);
});
test('job status groups are mutually exclusive', () => {
  const list = [
    ...parseXooterJobCards(envelope([job]), worker)!,
    { ...job, job_id: '2', state: 'accepted' },
    { ...job, job_id: '3', state: 'declined' },
  ];
  const groups = groupXooterJobs(list);
  assert.deepEqual([groups.offered.length, groups.accepted.length, groups.history.length], [1, 1, 1]);
});
const validRow = {
  id: '92c22aef-9df5-45a7-b7b4-73a8d4f87b4d',
  xooter_id: worker, booking_id: null,
  gross_amount: 101.25, platform_fee: 12.20, net_amount: 89.05,
  status: 'pending', created_at: '2026-10-15T10:30:00Z',
};
test('legitimate nullable booking ID and precise financial ledger amounts', () => {
  assert.deepEqual(getXooterEarningsRow(validRow, worker), validRow);
  assert.equal(getXooterEarningsRow(validRow, otherWorker), null);
  assert.equal(exactRandCents(89.05), 8905);
  assert.equal(exactRandCents(0.1 + 0.2), 30);
  assert.equal(exactRandCents(89.055), null);
  assert.equal(exactRandCents(Infinity), null);
  assert.equal(exactRandCents(1e20), null);
  assert.equal(getXooterEarningsRow({ ...validRow, gross_amount: '101.25' }, worker), null);
  assert.equal(getXooterEarningsRow({ ...validRow, created_at: 'invalid' }, worker), null);
  assert.equal(getXooterEarningsRow({ ...validRow, net_amount: 89.055 }, worker), null);
});
test('totals use integer cents and do not pretend provider payout settlement', () => {
  const a = getXooterEarningsRow({ ...validRow, net_amount: 0.10, gross_amount: 0.10, platform_fee: 0 }, worker)!;
  const b = getXooterEarningsRow({ ...validRow, id: 'different', status: 'recorded', net_amount: 0.20, gross_amount: 0.20, platform_fee: 0 }, worker)!;
  const totals = summariseRecordedEarnings([a, b]);
  assert.equal(totals.recordedNet, 0.30);
  assert.equal(totals.pendingNet, 0.10);
  assert.equal(totals.entries, 2);
  assert.throws(() => summariseRecordedEarnings([{ ...a, net_amount: Number.NaN }]), /Unverified currency amount/);
  assert.match(xooterMoney(101.25), /101/);
});
test('period controls represent rolling 7/30 days rather than fabricated payout windows', () => {
  const now = new Date('2026-10-15T10:00:00Z');
  assert.equal(startOfNativeEarningsPeriod('week', now), '2026-10-08T10:00:00.000Z');
  assert.equal(startOfNativeEarningsPeriod('month', now), '2026-09-15T10:00:00.000Z');
});
test('native Xooter jobs and earnings routes retain owner, RLS and write boundaries', () => {
  const jobs = readFileSync(new URL('../src/app/xooter/jobs.tsx', import.meta.url), 'utf8');
  const earnings = readFileSync(new URL('../src/app/xooter/earnings.tsx', import.meta.url), 'utf8');
  const account = readFileSync(new URL('../src/app/account.tsx', import.meta.url), 'utf8');
  assert.match(jobs, /get-xooter-job-cards/);
  assert.match(jobs, /parseXooterJobCards\(data, account\.id\)/);
  assert.match(jobs, /key=\{user\.id\}/);
  assert.match(earnings, /\.eq\('xooter_id', profile\.id\)/);
  assert.match(earnings, /\.eq\('user_id', userId\)/);
  assert.match(earnings, /key=\{user\.id\}/);
  assert.match(earnings, /state\.period === period/);
  assert.match(earnings, /only the latest 100 entries are shown/);
  assert.match(earnings, /not proof of bank settlement/);
  assert.match(account, /router\.push\("\/xooter\/jobs"\)/);
  assert.doesNotMatch(jobs, /customer_access_code|direct access pin/i);
  assert.doesNotMatch(earnings, /payout completed|payout confirmed|bank transfer successful/i);
  assert.doesNotMatch(jobs, /supabase\.from\('xooter_jobs'\)\.update|action:\s*'accept_job'/i);
});
