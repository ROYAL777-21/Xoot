import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const base = new URL('../../supabase/functions/', import.meta.url);
const read = p => readFileSync(new URL(p,base),'utf8');
const handler = read('xoot-job-location/index.ts');
const dispatch = read('_shared/live-dispatch.ts');
const map = readFileSync(new URL('../../src/components/xoot/PrivateDispatchMap.tsx',import.meta.url),'utf8');
const ops = readFileSync(new URL('../../src/pages/admin/Ops.tsx',import.meta.url),'utf8');
const web = readFileSync(new URL('../../src/components/xoot/LiveJobJourney.tsx',import.meta.url),'utf8');
const native = readFileSync(new URL('../../mobile/src/components/private-job-location-publisher.native.tsx',import.meta.url),'utf8');

test('public GPS read and write never inherit admin access', () => {
  assert.match(handler,/action === "dispatch"\) return servePrivateDispatch\(req, actorId, origin\)/);
  assert.match(handler,/if \(!isWorker && !isCustomer\) return fail/);
  assert.match(handler,/if \(!isWorker\) return fail/);
  assert.doesNotMatch(handler,/\.select\("\*"\)/);
});

test('dispatch requires verified JWT, AAL2 MFA, and database role; no client-supplied role', () => {
  assert.match(handler,/requireAuth\(req, origin\)/);
  assert.match(dispatch,/assurance !== "aal2"/);
  assert.match(dispatch,/isAdminUser\(db, actorId\)/);
  assert.match(dispatch,/return fail\("dispatch unavailable", origin, 404\)/);
  assert.doesNotMatch(dispatch,/body\.isAdmin|body\.userId|body\.actorId/);
});

test('admin feed contains no customer addresses or historical GPS trails', () => {
  assert.match(dispatch,/MAX_ACTIVE_DISPATCH = 30/);
  assert.match(dispatch,/POSITION_MAX_AGE_MS = 60_000/);
  assert.match(dispatch,/\.gt\("expires_at"/);
  assert.match(dispatch,/\.gte\("recorded_at"/);
  assert.match(dispatch,/\.eq\("state","accepted"\)/);
  assert.match(dispatch,/\.eq\("background_check_status","approved"\)/);
  assert.match(dispatch,/\.eq\("active", true\)/);
  assert.match(dispatch,/Cache-Control", "private, no-store"/);
  assert.doesNotMatch(dispatch,/destination_address|address:|customerName|gate_code|password|phone/);
  assert.doesNotMatch(dispatch,/console\.log|console\.warn|audit_log/);
});

test('dispatch interface requires prior MFA, opt-in, visibility and expiry cleanup', () => {
  assert.match(ops,/currentLevel !== "aal2"/);
  assert.match(ops,/<PrivateDispatchMap \/>/);
  assert.match(map,/VITE_ENABLE_LIVE_JOURNEY === "true"/);
  assert.match(map,/View live dispatch/);
  assert.match(map,/visibilitychange/);
  assert.match(map,/document\.visibilityState !== "visible"/);
  assert.match(map,/Date\.parse\(p\.expiresAt\) > Date\.now\(\)/);
  assert.match(map,/setPoints\(\[\]\)/);
  assert.match(map,/attributionControl: true/);
  assert.doesNotMatch(map,/localStorage|sessionStorage|IndexedDB|worker_name|home_address/);
});

test('worker consent text clearly discloses authenticated dispatch viewing', () => {
  assert.match(web,/MFA-verified Xoot dispatch administrators/);
  assert.match(native,/MFA-verified Xoot dispatch administrators/);
});
