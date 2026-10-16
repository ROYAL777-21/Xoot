import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  getMobileConfigIssue,
  getUnsafePublicMapboxTokenNames,
  isUnsafePublicMapboxToken,
} from '../src/lib/env';

const nativeMap = readFileSync(new URL('../src/components/service-area-map.native.tsx', import.meta.url), 'utf8');
const webMap = readFileSync(new URL('../src/components/service-area-map.tsx', import.meta.url), 'utf8');
const easPreflight = readFileSync(new URL('./validate-env.ts', import.meta.url), 'utf8');

test('Mapbox native map displays mandatory credits and does not occlude footer controls', () => {
  assert.match(nativeMap, /<Mapbox\.MapView[^>]+\blogoEnabled\b[^>]+\battributionEnabled\b/);
  assert.doesNotMatch(nativeMap, /logoEnabled=\{false\}|attributionEnabled=\{false\}/);
  assert.match(nativeMap, /overlay:\s*\{[^}]*top:\s*Spacing\.lg/s);
  assert.doesNotMatch(nativeMap, /overlay:\s*\{[^}]*bottom:\s*Spacing\.lg/s);
});

test('unconfigured/invalid token uses a customer-safe fallback and no false ETA', () => {
  assert.match(nativeMap, /if \(!token \|\| !token\.startsWith\('pk\.'\)\)/);
  assert.match(nativeMap, /Map preview unavailable/);
  assert.doesNotMatch(nativeMap, /Add \`EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN\`/);
  assert.doesNotMatch(nativeMap, /logoEnabled=\{false\}/);
  assert.match(webMap, /Service areas/);
  assert.match(webMap, /not a promise of live availability or a real-time journey/);
  assert.doesNotMatch(webMap, /Native map ready|safe ETA context|Add a public Mapbox token/);
});

test('native public config rejects secret and malformed map credentials', () => {
  assert.equal(isUnsafePublicMapboxToken(undefined), false);
  assert.equal(isUnsafePublicMapboxToken(''), false);
  assert.equal(isUnsafePublicMapboxToken('pk.example-public-key'), false);
  assert.equal(isUnsafePublicMapboxToken('sk.example-secret-token'), true);
  assert.equal(isUnsafePublicMapboxToken('obviously-not-a-token'), true);
  assert.deepEqual(getUnsafePublicMapboxTokenNames({
    EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN: 'sk.no',
    EXPO_PUBLIC_MAPBOX_TOKEN: 'garbage',
  }), ['EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN', 'EXPO_PUBLIC_MAPBOX_TOKEN']);
  assert.match(getMobileConfigIssue({
    EXPO_PUBLIC_APP_ENV: 'development',
    EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN: 'garbage',
  }) ?? '', /restricted public pk\.\* tokens/);
  assert.equal(getMobileConfigIssue({
    EXPO_PUBLIC_APP_ENV: 'development',
    EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN: 'pk.example',
  }), null);
  assert.match(easPreflight, /!text\(name\)\.startsWith\('pk\.'\)/);
});
