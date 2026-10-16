import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { nativeMapboxSearchUrl, parseNativeMapboxSuggestions } from '../src/lib/mapbox-geocoding';
import {
  getMobileConfigIssue,
  getUnsafePublicMapboxTokenNames,
  isUnsafePublicMapboxToken,
} from '../src/lib/env';

const nativeMap = readFileSync(new URL('../src/components/service-area-map.native.tsx', import.meta.url), 'utf8');
const nativeBooking = readFileSync(new URL('../src/components/booking-flow.tsx', import.meta.url), 'utf8');
const nativeSuggestions = readFileSync(new URL('../src/components/mapbox-address-suggestions.tsx', import.meta.url), 'utf8');
const webMap = readFileSync(new URL('../src/components/service-area-map.tsx', import.meta.url), 'utf8');
const easPreflight = readFileSync(new URL('./validate-env.ts', import.meta.url), 'utf8');
const booking = readFileSync(new URL('../src/components/booking-flow.tsx', import.meta.url), 'utf8');
const appConfig = readFileSync(new URL('../app.config.ts', import.meta.url), 'utf8');

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

test('booking opens only the public map on opt-in without forwarding typed address, notes or access', () => {
  assert.match(booking, /const \[showServiceAreas, setShowServiceAreas\] = useState\(false\)/);
  assert.match(booking, /accessibilityLabel=\{showServiceAreas \? 'Hide service area map' : 'View service area map'\}/);
  assert.match(booking, /\{showServiceAreas && <ServiceAreaMap \/>\}/);
  assert.doesNotMatch(booking, /<ServiceAreaMap[^>]+(address|access|notes)=/);
  assert.doesNotMatch(nativeMap, /onUserLocationUpdate|UserLocation|LocationPuck|watchPosition|reverseGeocode/);
  assert.match(nativeMap, /Reference locations only|Reference locations|Booking confirms availability/);
});

test('offline and blocked map loads recover without leaking provider errors or claiming live GPS', () => {
  assert.match(nativeMap, /onMapLoadingError=\{\(\) => setMapStatus\(current => current === 'ready' \? current : 'error'\)\}/);
  assert.match(nativeMap, /onDidFinishLoadingMap=\{\(\) => setMapStatus\('ready'\)\}/);
  assert.match(nativeMap, /setTimeout\(\(\) => setMapStatus/);
  assert.match(nativeMap, /clearTimeout\(timeout\)/);
  assert.match(nativeMap, /key=\{attempt\}/);
  assert.match(nativeMap, /Retry service area map/);
  assert.match(nativeMap, /You can still enter your address and continue your booking/);
  assert.doesNotMatch(nativeMap, /live ETA|live GPS|customer pin|onUserLocationUpdate/);
});

test('production native config rejects missing token and preview remains usable', () => {
  const env = {
    EXPO_PUBLIC_APP_ENV: 'production',
    EXPO_PUBLIC_SUPABASE_PROJECT_ID: 'fxmxyabdjqviqbcxmvlp',
    EXPO_PUBLIC_SUPABASE_URL: 'https://fxmxyabdjqviqbcxmvlp.supabase.co',
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_synthetic-test-not-secret',
    EXPO_PUBLIC_EAS_PROJECT_ID: 'synthetic-eas-project',
  };
  assert.match(getMobileConfigIssue(env) ?? '', /EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN is required/);
  assert.equal(getMobileConfigIssue({ ...env, EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN: 'pk.synthetic-public-only' }), null);
  assert.match(getMobileConfigIssue({ ...env, EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN: 'sk.private' }) ?? '', /restricted public pk\.\* tokens/);
  assert.equal(getMobileConfigIssue({ ...env, EXPO_PUBLIC_APP_ENV: 'preview' }), null);
  assert.match(easPreflight, /appEnv === 'production' && !text\('EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN'\)/);
  assert.match(easPreflight, /text\('EAS_BUILD_PROFILE'\) === 'production' && appEnv !== 'production'/);
  assert.match(appConfig, /MGLMapboxMetricsEnabledSettingShownInApp: true/);
  assert.match(appConfig, /mapboxEnabled: Boolean\(process\.env\.EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN\?\.trim\(\)\.startsWith\('pk\.'\)\)/);
});

test('native and website address selection use licensed permanent Geocoding only after opt-in', () => {
  const temporary = nativeMapboxSearchUrl('14 Fredman Drive, Sandton', 'pk.synthetic');
  const permanent = nativeMapboxSearchUrl('14 Fredman Drive, Sandton, South Africa', 'pk.synthetic', true);
  assert.equal(new URL(temporary!).searchParams.get('permanent'), 'false');
  assert.equal(new URL(permanent!).searchParams.get('permanent'), 'true');
  assert.equal(new URL(temporary!).searchParams.get('country'), 'za');
  assert.equal(nativeMapboxSearchUrl('14 Fredman Drive, Sandton', 'sk.private'), null);
  const results = parseNativeMapboxSuggestions({ features: [
    { properties: { mapbox_id: 'id-one', full_address: '14 Fredman Drive, Sandton, South Africa',
      feature_type: 'address', context: { country: { country_code: 'ZA' } } },
      geometry: { coordinates: [28.1, -26.1] } },
    { properties: { mapbox_id: 'foreign', full_address: '1 Other Road, France',
      feature_type: 'address', context: { country: { country_code: 'FR' } } } },
  ] });
  assert.deepEqual(results, [{id: 'id-one', label: '14 Fredman Drive, Sandton, South Africa'}]);
  assert.doesNotMatch(JSON.stringify(results), /28\.1/);

  assert.match(nativeBooking, /<MobileMapboxAddressSuggestions value=\{address\}/);
  assert.match(nativeSuggestions, /accessibilityLabel=\{enabled \? 'Disable Mapbox address suggestions'/);
  assert.match(nativeSuggestions, /nativeMapboxSearchUrl\(item.label, token, true\)/);
  assert.match(nativeSuggestions, /parseNativeMapboxSuggestions\(body\)/);
  assert.doesNotMatch(nativeSuggestions, /onSelect\(item.label\)/);
  assert.match(nativeSuggestions, /chosen\.current\?\.abort\(\)/);
  assert.match(nativeSuggestions, /A changed address invalidates an outstanding Permanent Geocoding confirmation/);
  assert.match(nativeSuggestions, /Enter your address manually/);
  assert.doesNotMatch(nativeSuggestions, /watchPosition|Location\.watch|UserLocation/);
});
