import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { isEligibleXooterProfile, parseWebXooterJobCards } from './xooter-web-job-cards';

const userId = '76cc3c24-20e1-4f87-9458-a2d36672d9cf';
const workerId = '20b4a60b-dbb2-47cd-b999-f9f1f4b44e57';
const job = {
  job_id: '653252ff-3e82-48f3-b268-69ce7e120982',
  booking_id: '799130c3-58d8-40b0-a5cb-82c741beca02',
  xooter_id: workerId, state: 'offered', scheduled_at: '2026-10-18T11:00:00Z',
  service: 'regular', service_type: 'regular', duration_hours: 5,
  destination_address: 'CONFIDENTIAL HOME ADDRESS',
  user_id: 'PRIVATE CUSTOMER ID', price: 1200,
  gate_code: 'PRIVATE GATE CODE', access_instructions: 'PRIVATE DETAILS',
};
const wrapped = (jobs: unknown[]) => ({ success: true, data: { jobs } });
describe('authenticated Xooter job-card web contract', () => {
  it('rejects the formerly misread legacy flat response and reads the real Edge envelope', () => {
    expect(parseWebXooterJobCards({ jobs: [job] }, workerId)).toBeNull();
    const cards = parseWebXooterJobCards(wrapped([job]), workerId);
    expect(cards).toHaveLength(1);
    expect(cards?.[0]).toMatchObject({ id: job.job_id, xooter_id: workerId, state: 'offered' });
    expect(cards?.[0]?.bookings.service).toBe('regular');
    expect(cards?.[0]?.destination_address).toBeNull();
  });
  it('discards customer IDs, pricing and access codes rather than retaining server objects', () => {
    const [card] = parseWebXooterJobCards(wrapped([job]), workerId)!;
    const raw = JSON.stringify(card);
    for (const confidential of ['CONFIDENTIAL', 'PRIVATE', 'gate_code', 'user_id', 'price'])
      expect(raw).not.toContain(confidential);
    expect(raw).not.toContain('access_instructions');
  });
  it('exposes an accepted nonterminal destination but withdraws it on cancellation/revocation', () => {
    const accepted = { ...job, state: 'accepted', status: 'assigned' };
    expect(parseWebXooterJobCards(wrapped([accepted]), workerId)?.[0]?.destination_address)
      .toBe('CONFIDENTIAL HOME ADDRESS');
    for (const withdrawn of [
      { ...accepted, state: 'expired' }, { ...accepted, status: 'cancelled' },
      { ...accepted, cancelled_at: '2026-10-18T11:00:00Z' },
      { ...accepted, sensitive_data_revoked_at: '2026-10-18T11:00:00Z' },
    ]) expect(parseWebXooterJobCards(wrapped([withdrawn]), workerId)?.[0]?.destination_address).toBeNull();
  });
  it('rejects failed wrappers, duplicate jobs, unknown states, oversized replies and other owners', () => {
    expect(parseWebXooterJobCards({ success: false, data: { jobs: [job] } }, workerId)).toBeNull();
    expect(parseWebXooterJobCards(wrapped([job, job]), workerId)).toBeNull();
    expect(parseWebXooterJobCards(wrapped([{ ...job, state: 'money_paid' }]), workerId)).toBeNull();
    expect(parseWebXooterJobCards(wrapped([{ ...job, xooter_id: userId }]), workerId)).toBeNull();
    expect(parseWebXooterJobCards(wrapped(new Array(501).fill(job)), workerId)).toBeNull();
    expect(parseWebXooterJobCards(wrapped([job]), '../unsafe')).toBeNull();
  });
  it('connects the parsed response to the actual account-keyed Jobs UI and avoids booking-price pay claims', () => {
    const source = readFileSync('src/pages/xooter/Jobs.tsx', 'utf8');
    expect(source).toContain('parseWebXooterJobCards(data, worker.id)');
    expect(source).toContain('isEligibleXooterProfile(worker, userId)');
    expect(source).toContain("key={user?.id ?? 'guest'}");
    expect(source).not.toContain('data?.jobs ?? []');
    expect(source).not.toContain('formatZAR(Number(b.price))');
    expect(source).toContain("respondingJobId !== null");
  });

  it('requires an approved, active, owner-matched Xooter before enabling offers', () => {
    const profile = { id: workerId, user_id: userId, active: true, background_check_status: 'approved' };
    expect(isEligibleXooterProfile(profile, userId)).toBe(true);
    for (const invalid of [
      { ...profile, user_id: 'someone-else' },
      { ...profile, active: false },
      { ...profile, background_check_status: 'pending' },
      { ...profile, background_check_status: null },
      { ...profile, id: 'invalid-id' },
    ]) expect(isEligibleXooterProfile(invalid, userId)).toBe(false);
  });
});
