#!/usr/bin/env node
// Deliberately manual, staging-only live acceptance. Never schedule on production.
// Requires four unrelated consented synthetic identities and two accepted en-route
// synthetic bookings. No service-role key, real users, secret logging or route history.
import assert from 'node:assert/strict';

const STAGING_REF = 'fxmxyabdjqviqbcxmvlp';
const required = [
  'XOOT_TEST_STAGING_URL',
  'XOOT_TEST_STAGING_ANON_KEY',
  'XOOT_TEST_CUSTOMER_A_JWT', 'XOOT_TEST_CUSTOMER_B_JWT',
  'XOOT_TEST_WORKER_A_JWT', 'XOOT_TEST_WORKER_B_JWT',
  'XOOT_TEST_BOOKING_A', 'XOOT_TEST_BOOKING_B',
];
const missing = required.filter(name => !process.env[name]?.trim());
if (missing.length) {
  console.error('Staging acceptance not run. Missing configured variable names: ' + missing.join(', '));
  process.exit(2);
}
if (process.env.XOOT_TEST_SYNTHETIC_CONSENT !== 'YES') {
  console.error('Staging acceptance not run. Require XOOT_TEST_SYNTHETIC_CONSENT=YES for consenting test accounts.');
  process.exit(2);
}
const base = new URL(process.env.XOOT_TEST_STAGING_URL);
if (base.protocol !== 'https:' || base.hostname !== STAGING_REF + '.supabase.co' ||
    base.username || base.password || base.search || base.hash) {
  console.error('Refusing any non-staging Supabase URL.');
  process.exit(2);
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const bookingA = process.env.XOOT_TEST_BOOKING_A, bookingB = process.env.XOOT_TEST_BOOKING_B;
if (!uuid.test(bookingA) || !uuid.test(bookingB) || bookingA === bookingB) {
  console.error('Two distinct synthetic UUID bookings are required.');
  process.exit(2);
}
const tokens = {
  customerA: process.env.XOOT_TEST_CUSTOMER_A_JWT,
  customerB: process.env.XOOT_TEST_CUSTOMER_B_JWT,
  workerA: process.env.XOOT_TEST_WORKER_A_JWT,
  workerB: process.env.XOOT_TEST_WORKER_B_JWT,
};
if (new Set(Object.values(tokens)).size !== 4) {
  console.error('Four distinct customer/worker JWTs are required.');
  process.exit(2);
}
const key = process.env.XOOT_TEST_STAGING_ANON_KEY;
const endpoint = new URL('/functions/v1/xoot-job-location', base);
const timeoutMs = 12_000;

async function call(token, body) {
  const signal = AbortSignal.timeout(timeoutMs);
  try {
    const response = await fetch(endpoint, {
      method: 'POST', signal, cache: 'no-store', redirect: 'error',
      headers: {
        'content-type': 'application/json', apikey: key,
        ...(token ? { authorization: 'Bearer ' + token } : {}),
      },
      body: JSON.stringify(body),
    });
    const raw = await response.text();
    let json = null;
    try { json = JSON.parse(raw); } catch { /* malformed reply fails assertions */ }
    // Never print payloads or outgoing request bodies; they may contain GPS.
    return { status: response.status, json, cache: response.headers.get('cache-control') };
  } catch {
    throw new Error('Staging Edge network request unavailable');
  }
}
function state(result, expected) {
  assert.equal(result.status, 200, 'expected an authorised staging response');
  assert.equal(result.json?.success, true, 'expected server success envelope');
  assert.equal(result.json?.data?.state, expected, 'unexpected private GPS state');
}
function denied(result) {
  assert.ok([401, 403, 404].includes(result.status), 'cross-account private access must fail without coordinates');
  assert.equal(result.json?.data?.latitude, undefined);
  assert.equal(result.json?.data?.longitude, undefined);
  assert.equal(result.json?.data?.minutes, undefined);
}
function pointWithNoHistory(response) {
  state(response, 'current');
  const p = response.json.data;
  assert.ok(Number.isFinite(p.latitude) && Number.isFinite(p.longitude));
  assert.ok(Date.now() - Date.parse(p.recordedAt) < 60_000);
  assert.ok(Date.parse(p.expiresAt) > Date.now());
  assert.equal(p.history, undefined);
  assert.equal(p.trail, undefined);
  assert.ok(response.cache?.includes('no-store'), 'live coordinates must not be cached');
}
async function publish(workerToken, bookingId) {
  // A synthetic Durban point is deliberately outside the initial Johannesburg
  // launch suburbs: already-accepted journeys must not depend on zone polygons.
  for (let attempt = 0; attempt < 2; attempt++) {
    const report = await call(workerToken, {
      action: 'publish', bookingId, consent: true,
      latitude: -29.8587, longitude: 31.0218, accuracyM: 12,
      capturedAt: new Date().toISOString(),
    });
    if (report.status === 200) { state(report, 'accepted'); return; }
    if (report.status !== 409 || attempt !== 0) throw new Error('Synthetic worker publish not accepted');
    await new Promise(resolve => setTimeout(resolve, 11_000));
  }
}
async function stop(workerToken, bookingId) {
  const result = await call(workerToken, { action: 'stop', bookingId });
  state(result, 'stopped');
}

let publishedA = false, publishedB = false;
try {
  denied(await call('', { action: 'read', bookingId: bookingA }));
  denied(await call(tokens.customerB, { action: 'read', bookingId: bookingA }));
  denied(await call(tokens.workerB, { action: 'read', bookingId: bookingA }));
  denied(await call(tokens.customerB, { action: 'eta', bookingId: bookingA }));
  denied(await call(tokens.customerA, { action: 'publish', bookingId: bookingA, consent: true }));
  console.log('PASS: missing JWT, unrelated customers/workers, and forged customer publish denied');

  for (const invalid of [
    { consent: false, latitude: -29.8587, longitude: 31.0218, accuracyM: 12,
      capturedAt: new Date().toISOString() },
    { consent: true, latitude: -29.8587, longitude: 31.0218, accuracyM: 999,
      capturedAt: new Date().toISOString() },
    { consent: true, latitude: -29.8587, longitude: 31.0218, accuracyM: 12,
      capturedAt: new Date(Date.now() - 91_000).toISOString() },
  ]) {
    const invalidPublish = await call(tokens.workerA, {
      action: 'publish', bookingId: bookingA, ...invalid,
    });
    assert.equal(invalidPublish.status, 400, 'bad consent, accuracy or capture time must be rejected');
  }
  console.log('PASS: missing consent, poor accuracy and replayed GPS rejected');

  await publish(tokens.workerA, bookingA); publishedA = true;
  await publish(tokens.workerB, bookingB); publishedB = true;
  pointWithNoHistory(await call(tokens.customerA, { action: 'read', bookingId: bookingA }));
  pointWithNoHistory(await call(tokens.customerB, { action: 'read', bookingId: bookingB }));
  denied(await call(tokens.customerB, { action: 'read', bookingId: bookingA }));
  console.log('PASS: distinct accepted Xooters publish; only assigned customers read fresh private GPS');

  const adminAal1 = process.env.XOOT_TEST_ADMIN_AAL1_JWT;
  const adminAal2 = process.env.XOOT_TEST_ADMIN_AAL2_JWT;
  if (Boolean(adminAal1) !== Boolean(adminAal2)) {
    throw new Error('Provide both staging admin AAL1 and AAL2 JWTs or neither');
  }
  if (adminAal1 && adminAal2) {
    denied(await call(adminAal1, { action: 'dispatch' }));
    const dispatch = await call(adminAal2, { action: 'dispatch' });
    state(dispatch, 'available');
    assert.ok(Array.isArray(dispatch.json.data.points));
    assert.ok(dispatch.cache?.includes('no-store'));
    for (const p of dispatch.json.data.points) {
      assert.equal(p.address, undefined);
      assert.equal(p.customerName, undefined);
      assert.equal(p.history, undefined);
    }
    console.log('PASS: AAL1 denied and AAL2 admin dispatch feed private and no-store');
  } else {
    console.log('NOT TESTED: admin AAL1/AAL2 dispatch acceptance (two optional admin JWTs absent)');
  }

  const eta = await call(tokens.customerA, { action: 'eta', bookingId: bookingA });
  state(eta, 'current');
  const e = eta.json.data;
  assert.ok(Number.isInteger(e.minutes) && e.minutes > 0 && e.minutes <= 1440);
  assert.ok(Number.isFinite(e.kilometres) && e.kilometres >= 0);
  assert.ok(Date.now() - Date.parse(e.fixRecordedAt) < 60_000);
  assert.ok(eta.cache?.includes('no-store'));
  for (const forbidden of ['latitude', 'longitude', 'address', 'route', 'geometry', 'bookingId']) {
    assert.equal(e[forbidden], undefined, 'the ETA must not expose any private route or location data');
  }
  console.log('PASS: Mapbox road ETA from a synthetic outside-zone GPS position (no invented result)');

  await stop(tokens.workerA, bookingA); publishedA = false;
  state(await call(tokens.customerA, { action: 'read', bookingId: bookingA }), 'unavailable');
  state(await call(tokens.customerA, { action: 'eta', bookingId: bookingA }), 'unavailable');
  pointWithNoHistory(await call(tokens.customerB, { action: 'read', bookingId: bookingB }));
  console.log('PASS: STOP revokes route and point without disturbing another customer');
  console.log('STAGING ACCEPTANCE PASSED. Still separately verify physical Android/iOS, POPIA, billing and expiry cron.');
} catch (error) {
  console.error('STAGING ACCEPTANCE FAILED: ' + (error instanceof Error ? error.message : 'Unknown error'));
  process.exitCode = 1;
} finally {
  // Clear both synthetic job positions on exit. Never report any GPS values.
  if (publishedA) await stop(tokens.workerA, bookingA).catch(() => null);
  if (publishedB) await stop(tokens.workerB, bookingB).catch(() => null);
}
