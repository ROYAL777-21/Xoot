/**
 * Live, opt-in staging-only authenticated test of Xoot's private GPS Edge path.
 * No tokens, coordinates, addresses or auth payloads are logged.
 *
 * Required:
 * XOOT_STAGING_LOCATION_E2E_APPROVED=consenting-synthetic-test-only
 * XOOT_STAGING_TEST_BOOKING_ID=<an accepted en-route synthetic booking UUID>
 * XOOT_STAGING_TEST_WORKER_JWT=<JWT for assigned approved Xooter>
 * XOOT_STAGING_TEST_CUSTOMER_JWT=<JWT for owning customer>
 * XOOT_STAGING_TEST_OUTSIDER_JWT=<JWT for unrelated user>
 * XOOT_STAGING_PUBLISHABLE_KEY=<staging Supabase public/publishable key>
 *
 * Optional XOOT_STAGING_TEST_ADMIN_AAL2_JWT for protected dispatch.
 * This script will NEVER target the production Supabase project.
 */
import assert from 'node:assert/strict';

const REF = 'fxmxyabdjqviqbcxmvlp';
const BASE = 'https://' + REF + '.supabase.co/functions/v1/xoot-job-location';
const BANNED_REF = 'mvlrkelahhsyjrwgsxaf';
const APPROVAL = 'consenting-synthetic-test-only';
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const SYNTHETIC = Object.freeze({ latitude: -26.10670, longitude: 28.05670, accuracyM: 25 });

function required(name, env = process.env) {
  const val = env[name];
  if (typeof val !== 'string' || !val.trim()) throw new Error('Missing ' + name);
  return val.trim();
}

function verifySafeTarget(env = process.env) {
  const given = env.XOOT_STAGING_SUPABASE_URL;
  if (given && given.replace(/\/+$/, '') !== 'https://' + REF + '.supabase.co') {
    throw new Error('Refusing non-staging project URL');
  }
  if (env.XOOT_STAGING_LOCATION_E2E_APPROVED !== APPROVAL) {
    throw new Error('No explicit staging synthetic-location test approval');
  }
  if (!UUID.test(required('XOOT_STAGING_TEST_BOOKING_ID', env))) {
    throw new Error('Booking test ID must be a UUID');
  }
  const credentials = ['XOOT_STAGING_TEST_WORKER_JWT','XOOT_STAGING_TEST_CUSTOMER_JWT',
    'XOOT_STAGING_TEST_OUTSIDER_JWT','XOOT_STAGING_PUBLISHABLE_KEY'];
  for (const name of credentials) required(name, env);
  if (BASE.includes(BANNED_REF)) throw new Error('Production project forbidden');
  if (new URL(BASE).hostname !== REF + '.supabase.co') throw new Error('Invalid target');
}

async function call(action, token, bookingId, body = {}, publicKey = '', signal) {
  const response = await fetch(BASE, {
    method: 'POST', signal,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token,
      'apikey': publicKey,
    },
    body: JSON.stringify({ action, bookingId, ...body }),
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => null);
  return {
    code: response.status,
    state: payload?.data?.state,
    success: payload?.success === true,
    data: payload?.data,
    noStore: (response.headers.get('cache-control') ?? '').includes('no-store'),
  };
}

function assertDenied(result, label) {
  assert.equal(result.success, false, label + ': request unexpectedly authorised');
  assert.ok([401,403,404].includes(result.code), label + ': expected access denial');
  assert.equal(result.data?.latitude, undefined, label + ': private coordinate leaked');
  assert.equal(result.data?.longitude, undefined, label + ': private coordinate leaked');
}

async function main() {
  verifySafeTarget();
  const env = process.env;
  const booking = required('XOOT_STAGING_TEST_BOOKING_ID');
  const key = required('XOOT_STAGING_PUBLISHABLE_KEY');
  const worker = required('XOOT_STAGING_TEST_WORKER_JWT');
  const customer = required('XOOT_STAGING_TEST_CUSTOMER_JWT');
  const outsider = required('XOOT_STAGING_TEST_OUTSIDER_JWT');

  // The three identities must differ; compare hashes, never print them.
  assert.notEqual(worker, customer, 'Worker and customer must be different test accounts');
  assert.notEqual(worker, outsider, 'Worker and unrelated user must be different accounts');
  assert.notEqual(customer, outsider, 'Customer and unrelated user must be different accounts');

  const controller = new AbortController();
  const watchdog = setTimeout(() => controller.abort(), 60_000);
  const send = (action, jwt, detail = {}) =>
    call(action, jwt, booking, detail, key, controller.signal);

  let potentiallyPublished = false;
  try {
    const outsiderBefore = await send('read', outsider);
    assertDenied(outsiderBefore, 'Unrelated user cannot read booking');

    const invalidConsent = await send('publish', worker, {
      ...SYNTHETIC, capturedAt: new Date().toISOString(), consent: false,
    });
    assert.equal(invalidConsent.code, 400, 'Sharing without consent must fail');

    const stale = await send('publish', worker, {
      ...SYNTHETIC, capturedAt: new Date(Date.now() - 120_000).toISOString(), consent: true,
    });
    assert.equal(stale.code, 400, 'Replayed GPS must fail');

    const inaccurate = await send('publish', worker, {
      ...SYNTHETIC, accuracyM: 650, capturedAt: new Date().toISOString(), consent: true,
    });
    assert.equal(inaccurate.code, 400, 'Imprecise GPS must fail');

    const customerWrite = await send('publish', customer, {
      ...SYNTHETIC, capturedAt: new Date().toISOString(), consent: true,
    });
    assertDenied(customerWrite, 'Customer must never publish worker location');

    const published = await send('publish', worker, {
      ...SYNTHETIC, capturedAt: new Date().toISOString(), consent: true,
    });
    assert.equal(published.success, true, 'Synthetic GPS publish must succeed');
    assert.equal(published.state, 'accepted', 'GPS write was not accepted');
    potentiallyPublished = true;

    const visible = await send('read', customer);
    assert.equal(visible.success, true, 'Owning customer cannot read active point');
    assert.equal(visible.state, 'current', 'Fresh worker point not current');
    assert.equal(Number(visible.data?.latitude).toFixed(5), SYNTHETIC.latitude.toFixed(5));
    assert.equal(Number(visible.data?.longitude).toFixed(5), SYNTHETIC.longitude.toFixed(5));
    assert.equal(visible.noStore, true, 'Private location must be non-cacheable');

    const outsiderAfter = await send('read', outsider);
    assertDenied(outsiderAfter, 'Unrelated customer cannot read current point');

    const replay = await send('publish', worker, {
      ...SYNTHETIC, capturedAt: new Date().toISOString(), consent: true,
    });
    assert.equal(replay.code, 409, 'Too-frequent GPS publish was not throttled');

    const adminJwt = env.XOOT_STAGING_TEST_ADMIN_AAL2_JWT;
    if (adminJwt) {
      const dispatch = await send('dispatch', adminJwt);
      assert.equal(dispatch.success, true, 'MFA admin dispatch request failed');
      assert.equal(dispatch.state, 'available');
      assert.ok(Array.isArray(dispatch.data?.points));
      assert.equal(dispatch.noStore, true, 'Dispatch output must not be cached');
    }

    const stopped = await send('stop', worker);
    assert.equal(stopped.success, true, 'Worker could not stop sharing');
    assert.equal(stopped.state, 'stopped');
    potentiallyPublished = false;

    const afterStop = await send('read', customer);
    assert.equal(afterStop.state, 'unavailable', 'Revoked GPS must disappear immediately');
    console.log('PASS: staging job-scoped GPS auth, accuracy, replay, customer/worker isolation, no-store and revocation.');
    if (!adminJwt) console.log('NOT TESTED: MFA-administrator dispatch (optional AAL2 JWT missing).');
    console.log('NOT TESTED: physical iOS/Android GPS, billing, Mapbox tiles, device backgrounding, cancellation lifecycle and final production.');
  } finally {
    clearTimeout(watchdog);
    // Always make a best-effort STOP, including if an assertion fails after publishing.
    if (potentiallyPublished) {
      const cleanup = new AbortController();
      const timer = setTimeout(() => cleanup.abort(), 9000);
      try { await call('stop', worker, booking, {}, key, cleanup.signal); }
      catch { console.error('WARNING: synthetic point cleanup could not be verified; row has <=90-second TTL.'); }
      finally { clearTimeout(timer); }
    }
  }
}

async function selfTest() {
  assert.throws(() => verifySafeTarget({}), /approval/);
  assert.throws(() => verifySafeTarget({
    XOOT_STAGING_LOCATION_E2E_APPROVED: APPROVAL,
    XOOT_STAGING_SUPABASE_URL: 'https://' + BANNED_REF + '.supabase.co',
  }), /non-staging/);
  assert.throws(() => verifySafeTarget({
    XOOT_STAGING_LOCATION_E2E_APPROVED: APPROVAL,
    XOOT_STAGING_TEST_BOOKING_ID: 'not-a-uuid',
  }), /UUID/);
  assert.equal(new URL(BASE).hostname, REF + '.supabase.co');
  assert.equal(BANNED_REF === REF, false);
  assertDenied({ success: false, code: 404, data: {} }, 'synthetic outsider');
  assert.throws(() => assertDenied({ success: true, code: 200, data: { latitude: 1 } }, 'synthetic leak'));
  console.log('PASS: staging-only live GPS acceptance-runner safeguards (no network calls).');
}

if (process.argv.includes('--self-test')) {
  await selfTest();
} else {
  await main().catch(error => {
    // Avoid logging credential-bearing HTTP objects, query URLs or user identities.
    console.error('FAIL: staging GPS acceptance — ' + (error instanceof Error ? error.message.replace(/eyJ[A-Za-z0-9._-]+/g, '[redacted]') : 'unknown'));
    process.exitCode = 1;
  });
}
