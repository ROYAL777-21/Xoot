import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { isBookingId, LIVE_VISIT_STAGES, visitProgress, visitStatusStory } from '../src/lib/native-visit-detail';
import { MAX_FIX_AGE_MS, readFreshJobPosition } from '../src/lib/private-job-journey';

test('real booking lifecycle is source-ordered without fabricated route estimates', () => {
  assert.deepEqual([...LIVE_VISIT_STAGES], ['awaiting_assignment','assigned','contractor_accepted','en_route','arrived','in_progress','completed']);
  assert.equal(visitProgress('assigned')?.index, 1);
  assert.equal(visitProgress('confirmed')?.index, 2);
  assert.equal(visitProgress('enroute')?.index, 3);
  assert.equal(visitProgress('pending'), null);
  assert.match(visitStatusStory('confirmed').title, /accepted/i);
  assert.match(visitStatusStory('enroute').title, /way/i);
  assert.match(visitStatusStory('pending').title, /payment/i);
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
  const provider = readFileSync(new URL('../src/components/native-core.tsx', import.meta.url), 'utf8');
  assert.match(provider, /loadedAccountId === currentAccountId/);
  assert.match(provider, /bookings: ownerMatched \? bookings : \[\]/);
  assert.match(provider, /profile: ownerMatched \? profile : null/);
  assert.match(provider, /unreadNotifications: ownerMatched \? unreadNotifications : 0/);
  assert.match(file, /useNativeCoreData/);
  assert.match(file, /user && !authLoading/);
  assert.match(file, /booking\.status/);
  assert.match(file, /error && !booking/);
  assert.match(file, /Assigned Xooter details are temporarily unavailable/);
  assert.match(listing, /pathname: '\/visits\/\[id\]'/);
  assert.doesNotMatch(file, /12 min away|Paid successfully|payout completed|live map available/i);
  assert.doesNotMatch(listing, /Booking total R/);
  assert.match(file, /Book this service again/);
  assert.match(file, /Need help with this visit/);
});


test('private native journey is owner-scoped, opt-in, ephemeral, and does not invent an ETA', () => {
  const view = readFileSync(new URL('../src/components/private-job-journey.native.tsx', import.meta.url), 'utf8');
  const fallback = readFileSync(new URL('../src/components/private-job-journey.tsx', import.meta.url), 'utf8');
  const helper = readFileSync(new URL('../src/lib/private-job-journey.ts', import.meta.url), 'utf8');
  const visit = readFileSync(new URL('../src/app/visits/[id].tsx', import.meta.url), 'utf8');
  assert.match(view, /EXPO_PUBLIC_ENABLE_LIVE_JOURNEY === 'true'/);
  assert.match(view, /const \[viewing, setViewing\] = useState\(false\)/);
  assert.match(view, /AppState\.addEventListener\('change'/);
  assert.match(view, /setViewing\(false\)/);
  assert.match(view, /state !== 'active'/);
  assert.match(view, /action: 'read', bookingId/);
  assert.match(helper, /MAX_FIX_AGE_MS = 60_000/);
  assert.match(view, /Date\.parse\(point\.expiresAt\) - Date\.now\(\)/);
  assert.match(view, /setPoint\(null\)/);
  assert.match(view, /logoEnabled attributionEnabled/);
  assert.match(view, /Opening this map sends its/);
  assert.match(view, /No exact arrival time is promised/);
  assert.doesNotMatch(view, /localStorage|AsyncStorage|SecureStore|backgroundLocation|etaMinutes|action: 'publish'/);
  assert.match(visit, /bookings\.find\(item => item\.id === safeId\)/);
  assert.match(visit, /<PrivateJobJourney bookingId=\{booking\.id\}/);
  assert.match(fallback, /return null/);
});


test('native GPS response validation refuses stale, forged or malformed fixes', () => {
  const now = Date.parse('2026-10-17T10:00:00.000Z');
  const good = { success: true, data: {
    state: 'current', latitude: -26.1, longitude: 28.03, accuracyM: 15,
    recordedAt: new Date(now - 1000).toISOString(),
    expiresAt: new Date(now + 59_000).toISOString(),
  } };
  assert.equal(MAX_FIX_AGE_MS, 60_000);
  assert.deepEqual(readFreshJobPosition(good, now), {
    latitude: -26.1, longitude: 28.03, expiresAt: good.data.expiresAt,
  });
  for (const invalid of [
    null, [], {}, { ...good, success: false },
    { ...good, data: { ...good.data, state: 'unavailable' } },
    { ...good, data: { ...good.data, latitude: 91 } },
    { ...good, data: { ...good.data, longitude: -181 } },
    { ...good, data: { ...good.data, latitude: NaN } },
    { ...good, data: { ...good.data, accuracyM: 300 } },
    { ...good, data: { ...good.data, accuracyM: undefined } },
    { ...good, data: { ...good.data, recordedAt: new Date(now - 61_000).toISOString() } },
    { ...good, data: { ...good.data, recordedAt: new Date(now + 31_000).toISOString() } },
    { ...good, data: { ...good.data, expiresAt: new Date(now - 1).toISOString() } },
    { ...good, data: { ...good.data, expiresAt: new Date(now + 200_000).toISOString() } },
  ]) {
    assert.equal(readFreshJobPosition(invalid, now), null);
  }
});
