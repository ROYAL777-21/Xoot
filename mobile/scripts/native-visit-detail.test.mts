import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { isBookingId, LIVE_VISIT_STAGES, visitProgress, visitStatusStory } from '../src/lib/native-visit-detail';

test('real booking lifecycle is source-ordered without fabricated route estimates', () => {
  assert.deepEqual([...LIVE_VISIT_STAGES], ['awaiting_assignment','assigned','contractor_accepted','en_route','arrived','in_progress','completed']);
  assert.equal(visitProgress('assigned')?.index, 1);
  assert.equal(visitProgress('reassigned')?.index, 1);
  assert.equal(visitProgress('rated')?.index, 6);
  assert.equal(visitProgress('cancelled'), null);
  assert.equal(visitProgress('replacement_offered'), null);
});
test('copy does not invent a payout, refund or confirmed arrival', () => {
  assert.match(visitStatusStory('cancelled').detail, /does not prove/i);
  assert.match(visitStatusStory('completed').detail, /does not by itself confirm payment/i);
  assert.match(visitStatusStory('en_route').detail, /estimates are not available/i);
  assert.match(visitStatusStory('assigned').detail, /not yet been confirmed/i);
  assert.match(visitStatusStory('unknown').detail, /support/i);
});
test('visit route IDs accept only bounded UUID references', () => {
  assert.equal(isBookingId('3dbf2f4e-afba-42e7-8e5d-620b801f930e'), true);
  for (const value of ['', '../other-user', ['3dbf2f4e-afba-42e7-8e5d-620b801f930e'], 'not-a-uuid']) {
    assert.equal(isBookingId(value), false);
  }
});
test('visit details use only owner-bound booking provider and no payment/ETA inventions', () => {
  const file = readFileSync(new URL('../src/app/visits/[id].tsx', import.meta.url), 'utf8');
  const listing = readFileSync(new URL('../src/app/bookings.tsx', import.meta.url), 'utf8');
  assert.match(file, /useNativeCoreData/);
  assert.match(file, /user && !authLoading/);
  assert.match(file, /booking\.status/);
  assert.match(listing, /pathname: '\/visits\/\[id\]'/);
  assert.doesNotMatch(file, /12 min away|Paid successfully|payout completed|live map available/i);
  assert.doesNotMatch(listing, /Booking total R/);
  assert.match(file, /Book this service again/);
  assert.match(file, /Need help with this visit/);
});
