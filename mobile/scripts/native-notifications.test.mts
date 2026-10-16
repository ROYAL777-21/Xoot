import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  NATIVE_NOTIFICATION_PAGE_SIZE, notificationMicros, olderNativeNotificationFilter,
  parseNativeNotificationPage, validateNativeNotificationHistory,
} from '../src/lib/native-notifications';
import { nativeNotificationDestination } from '../src/lib/handoff-search';

const owner = '9e37b3c3-98d6-4f28-bd62-0fbfbdd02022';
const other = 'b6c4b5da-536f-4c4e-9b74-1ec5004c8b0f';
const early = '2026-10-17T08:40:00.123455+00:00';
const late = '2026-10-17T08:40:00.123456+00:00';
const snap = '2026-10-17T08:45:00.000Z';
const row = (id: string, created_at = late, user_id = owner) => ({
  id, user_id, kind: 'booking', title: 'Visit confirmed',
  body: 'A real booking update', link: '/app/bookings', read: false, created_at,
});
const id1 = 'b26c0906-c0c4-4c76-a7ac-8d9acf7ca24e';
const id2 = 'ad6c0906-c0c4-4c76-a7ac-8d9acf7ca24e';
const id3 = '9d6c0906-c0c4-4c76-a7ac-8d9acf7ca24e';

test('microsecond-aware keyset never skips same-millisecond notifications', () => {
  assert.ok(notificationMicros(late)! > notificationMicros(early)!);
  assert.equal(notificationMicros('garbage'), null);
  assert.equal(notificationMicros('2026-10-17T08:40:00.123456Z'), notificationMicros(late));
  assert.match(olderNativeNotificationFilter({ created_at: late, id: id1 }) || '', /123456/);
  assert.equal(olderNativeNotificationFilter({ created_at: 'bad', id: id1 }), null);
  assert.equal(olderNativeNotificationFilter({ created_at: late, id: 'id.eq.fake,OR' }), null);
});
test('valid account-owned history accepts exact reverse time and UUID ties', () => {
  const records = [row(id1, late), row(id2, late), row(id3, early)];
  assert.deepEqual(parseNativeNotificationPage(records, { owner, snapshot: snap }), records);
  assert.deepEqual(parseNativeNotificationPage([row(id3, early)], {
    owner, snapshot: snap, cursor: { id: id2, created_at: late },
  }), [row(id3, early)]);
  assert.equal(NATIVE_NOTIFICATION_PAGE_SIZE, 40);
});
test('cross-account, unverified, replayed or malformed notices fail closed', () => {
  const args = { owner, snapshot: snap };
  for (const value of [
    [row(id1, late, other)],
    [row(id1, late), row(id1, late)],
    [row(id3, early), row(id1, late)],
    [row(id1, '2026-10-17T08:55:00Z')],
    [{ ...row(id1), read: 'false' }],
    [{ ...row(id1), created_at: 'javascript:alert(1)' }],
    [{ ...row(id1), title: 'x'.repeat(301) }],
    [row('not-a-uuid')],
    new Array(NATIVE_NOTIFICATION_PAGE_SIZE + 2).fill(row(id1)),
  ]) assert.equal(parseNativeNotificationPage(value, args), null);
  assert.equal(parseNativeNotificationPage([row(id1, late)], {
    ...args, cursor: { id: id2, created_at: late },
  }), null);
});
test('cross-page history integrity never allows replay or wrong ordering', () => {
  const a = { items: [row(id1, late)], hasMore: true };
  const b = { items: [row(id2, late), row(id3, early)], hasMore: false };
  assert.equal(validateNativeNotificationHistory([a, b]), true);
  assert.equal(validateNativeNotificationHistory([a, { ...b, items: [row(id1, late)] }]), false);
  assert.equal(validateNativeNotificationHistory([b, a]), false);
});
test('notification deep links stay in approved native routes', () => {
  assert.equal(nativeNotificationDestination('/app/bookings'), '/bookings');
  assert.equal(nativeNotificationDestination('//attacker.example/xoot'), null);
  assert.equal(nativeNotificationDestination('https://attacker.example'), null);
  assert.equal(nativeNotificationDestination('/xooter/jobs'), '/xooter/jobs');
});
test('UI fetches owner records, offers a load-older state and confirms updates', () => {
  const file = readFileSync(new URL('../src/app/notifications.tsx', import.meta.url), 'utf8');
  assert.match(file, /key=\{user\.id\}/);
  assert.match(file, /\.eq\('user_id', userId\)/);
  assert.match(file, /getNextPageParam/);
  assert.match(file, /validateNativeNotificationHistory/);
  assert.match(file, /Load older updates/);
  assert.match(file, /eq\('read', false\)/);
  assert.match(file, /nativeNotificationDestination/);
  assert.doesNotMatch(file, /\blimit\(100\)/);
  assert.doesNotMatch(file, /Your gift has arrived|Paid successfully|Nomsa is on the way/i);
});
