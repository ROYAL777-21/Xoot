import assert from 'node:assert/strict';
import test from 'node:test';
import { bookingWeekday, createBookingInput } from '../src/generated/booking-flow';
import { nativeBookingIssue, nativeBookingPrefill, validBookingDate, withBookingDate, withBookingProperty, withBookingRooms, withNativeBookingService } from '../src/lib/native-booking-input';
import { parseBookingQuoteInput } from '../../supabase/functions/_shared/booking-quote';

// Standalone Node/tsx checks; kept outside the Expo app's TypeScript compilation.
const NOW = Date.parse('2026-09-27T10:15:00Z'); // 12:15 SAST

test('prefills validate calendar dates, service aliases and bounded local area text', () => {
  const filled = nativeBookingPrefill({ service: 'residential', date: '2026-09-27', area: `\nSandton${'x'.repeat(200)}`, intent: 'book_clean' }, Date.parse('2026-09-27T09:00:00Z'));
  assert.equal(filled.input.service, 'regular');
  assert.equal(filled.input.time, '11:30');
  assert.equal(filled.area.length, 120);
  assert.equal(filled.area.includes('\n'), false);
  assert.equal(filled.assisted, true);
  assert.equal('area' in filled.input, false);
  assert.equal('address' in filled.input, false);
  for (const date of ['2026-02-30', '2026-09-26', '2099-01-01', 'not-a-date']) {
    assert.equal(nativeBookingPrefill({ date }, NOW).input.date, '2026-09-28');
  }
  assert.equal(nativeBookingPrefill({ service: ['office'], area: ['private'], date: ['2026-09-27'] }, NOW).area, '');
  assert.equal(nativeBookingPrefill({ service: '__proto__' }, NOW).input.service, 'regular');
});

test('date validation uses SAST midnight and a one-year upper bound', () => {
  const midnight = Date.parse('2026-09-27T22:05:00Z');
  assert.equal(validBookingDate('2026-09-27', midnight), false);
  assert.equal(validBookingDate('2026-09-28', midnight), true);
  assert.equal(validBookingDate('2027-09-29', midnight), false);
  assert.equal(validBookingDate('2028-02-29', Date.parse('2028-02-28T00:00:00Z')), true);
  assert.equal(validBookingDate('2027-02-29', NOW), false);
});

test('date changes keep repeat days consistent and one-time visits have no repeat days', () => {
  const weekly = { ...createBookingInput('regular', NOW), frequency: 'weekly' as const, repeatDays: [1, 3] };
  const next = withBookingDate(weekly, '2026-10-02', NOW);
  // The original first-visit weekday moves; the explicitly chosen extra day remains.
  assert.deepEqual(next.repeatDays, [3, 5]);
  const plainWeekly = createBookingInput('regular', NOW);
  assert.equal(plainWeekly.frequency, 'weekly');
  assert.deepEqual(plainWeekly.repeatDays, [bookingWeekday(plainWeekly.date)]);
  const changed = withBookingDate(plainWeekly, '2026-10-02', NOW);
  assert.deepEqual(changed.repeatDays, [bookingWeekday(changed.date)]);
  assert.deepEqual(nativeBookingPrefill({ service: 'airbnb', date: '2026-10-02' }, NOW).input.repeatDays, [5]);
  assert.ok(next.repeatDays.includes(bookingWeekday(next.date)));
  assert.deepEqual(withBookingDate({ ...weekly, frequency: 'once' }, '2026-10-02', NOW).repeatDays, []);
  assert.equal(withBookingDate(weekly, 'bad', NOW).time, '');
});

test('expired and Airbnb late times cannot be reviewed or accepted', () => {
  const input = createBookingInput('regular', NOW);
  const today = { ...input, date: '2026-09-27', time: '12:00' };
  assert.match(nativeBookingIssue(today, 'Full address', NOW)!, /future/);
  assert.equal(nativeBookingIssue({ ...today, time: '12:30' }, 'Full address', NOW), null);
  assert.match(nativeBookingIssue({ ...createBookingInput('airbnb', NOW), time: '14:30' }, 'Full address', NOW)!, /future/);
  assert.equal(nativeBookingPrefill({ service: 'airbnb', date: '2026-09-27' }, Date.parse('2026-09-27T12:00:00Z')).input.date, '2026-09-28');
});

test('review validation catches missing address, short linen duration and invalid referral input', () => {
  const input = createBookingInput('regular', NOW);
  assert.match(nativeBookingIssue(input, '', NOW)!, /address/);
  assert.match(nativeBookingIssue({ ...createBookingInput('airbnb', NOW), linen: 'wash_dry_repack' }, 'Full address', NOW)!, /5 hours/);
  assert.match(nativeBookingIssue({ ...input, referralCode: '<bad>' }, 'Full address', NOW)!, /referral/);
  assert.equal(nativeBookingIssue({ ...input, referralCode: 'friend_100' }, 'Full address', NOW), null);
  assert.match(nativeBookingIssue({ ...input, frequency: 'weekly', repeatDays: [] }, 'Full address', NOW)!, /weekday/);
});

test('property correction keeps the requested service and produces a server-valid input', () => {
  const regular = { ...createBookingInput('regular', NOW), addOns: ['inside_fridge'] as const, time: '16:30' };
  for (const property of ['airbnb', 'office', 'empty'] as const) {
    const next = withBookingProperty({ ...regular, addOns: [...regular.addOns] }, property, NOW);
    assert.equal(next.service, 'regular', 'The server must review the requested service, not a silent client swap');
    assert.deepEqual(next.addOns, []);
    assert.equal(next.linen, property === 'airbnb' ? 'none' : null);
    assert.doesNotThrow(() => parseBookingQuoteInput(next, NOW));
    assert.equal(nativeBookingIssue(next, 'Full address', NOW), null);
    if (property === 'airbnb') assert.ok(next.time <= '14:00');
  }
  const invalidHome = withBookingProperty(createBookingInput('office', NOW), 'house', NOW);
  assert.match(nativeBookingIssue(invalidHome, 'Full address', NOW)!, /regular or express/);
});

test('rooms follow the supplied handoff size and duration defaults, including bathroom thresholds', () => {
  const initial = nativeBookingPrefill({}, NOW).input;
  assert.equal(initial.homeSize, 'medium');
  assert.equal(initial.hours, 5.5);
  const large = withBookingRooms(initial, 1, 3);
  assert.equal(large.homeSize, 'large');
  assert.equal(large.hours, 8);
  const small = withBookingRooms({ ...large, crewSize: 4 }, 1, 1);
  assert.equal(small.homeSize, 'small');
  assert.equal(small.hours, 4);
  assert.equal(small.crewSize, 2);
  assert.equal(withBookingRooms(initial, 4, 1).homeSize, 'large');
  assert.equal(withBookingRooms(initial, 1, 2).homeSize, 'medium');
  assert.equal(withBookingRooms(createBookingInput('airbnb', NOW), 4, 3).hours, 4);
  assert.equal(withNativeBookingService({ ...initial, service: 'express' }, 'regular').hours, 5.5);
});
