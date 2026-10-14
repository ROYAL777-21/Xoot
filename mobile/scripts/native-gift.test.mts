import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  ANNUAL_WEEKLY_CLEANS, GIFT_BUNDLES, GIFT_SERVICES,
  nativeGiftIssue, newGiftDraft, parseNativeGiftQuote, giftMoney,
} from '../src/lib/native-gift';

test('gift handoff offers only supported server whole visits and five priced services', () => {
  assert.deepEqual(GIFT_BUNDLES.map(b => b.count), [1, 3, 4, 6, 12]);
  assert.deepEqual(GIFT_SERVICES.map(s => s.key), ['regular', 'airbnb', 'express', 'office', 'moving']);
  assert.equal(ANNUAL_WEEKLY_CLEANS, 52);
  assert.ok(GIFT_BUNDLES.find(b => b.count === 12)?.detail.includes('three months'));
  assert.ok(GIFT_BUNDLES.every(b => !/whole year|half a year|year of cleans/i.test(b.detail)));
  assert.ok(!GIFT_BUNDLES.some(b => b.count === 52), 'unsupported annual packages must not be sold');
});
const sample = {
  version: 'gift-zd037-v1', currency: 'ZAR', service: 'regular',
  count: 3, hours: 5.5, basePerVisitCents: 29600,
  feePerVisitCents: 3900, perVisitCents: 33500, totalCents: 100500,
};
test('accepts an actual server quote with all per-visit fees and matching selection', () => {
  assert.deepEqual(parseNativeGiftQuote({ quote: sample }, 'regular', 3), sample);
  assert.equal(giftMoney(sample.totalCents), 'R1\u00a0005,00'.replace(',', '.').replace('\u00a0', '\u00a0'));
});
test('rejects stale, forged, malformed or unverified money without a fallback', () => {
  for (const q of [
    { ...sample, count: 4 }, { ...sample, totalCents: 1 },
    { ...sample, perVisitCents: 1 }, { ...sample, feePerVisitCents: 0 },
    { ...sample, currency: 'USD' }, { ...sample, hours: -1 },
    { ...sample, totalCents: Number.NaN },
  ]) assert.equal(parseNativeGiftQuote({ quote: q }, 'regular', 3), null);
  assert.equal(parseNativeGiftQuote(null, 'regular', 3), null);
  assert.equal(parseNativeGiftQuote({ quote: sample }, 'airbnb', 3), null);
});
test('requires real email/recipient and local sender without weakening link privacy', () => {
  const base = newGiftDraft('Sender');
  assert.match(nativeGiftIssue(base) || '', /recipient/i);
  assert.match(nativeGiftIssue({ ...base, recipientName: 'Recipient', recipientEmail: 'wrong-address' }) || '', /email/i);
  assert.equal(nativeGiftIssue({ ...base, recipientName: 'Recipient', recipientEmail: 'person@example.co.za' }), null);
  assert.equal(nativeGiftIssue({ ...base, delivery: 'link' }), null);
  assert.match(nativeGiftIssue({ ...base, delivery: 'link', senderName: '' }) || '', /name/i);
  assert.match(nativeGiftIssue({ ...base, delivery: 'link', note: 'x'.repeat(91) }) || '', /shorten/i);
  assert.match(nativeGiftIssue({ ...base, delivery: 'link', senderName: 'X\u0001' }) || '', /name/i);
});
test('native Gift and Care+ show honest fulfilment and live route access', () => {
  const gift = readFileSync(new URL('../src/app/gifts.tsx', import.meta.url), 'utf8');
  const care = readFileSync(new URL('../src/app/care-plus.tsx', import.meta.url), 'utf8');
  const account = readFileSync(new URL('../src/app/account.tsx', import.meta.url), 'utf8');
  assert.match(account, /router\.push\("\/gifts"\)/);
  assert.match(account, /router\.push\("\/care-plus"\)/);
  assert.match(gift, /gift_quote/);
  assert.match(gift, /checkout not yet available/i);
  assert.match(gift, /key=\{user\?\.id \?\? 'guest'\}/);
  assert.doesNotMatch(gift, /Your gift has been (sent|delivered)|Paid successfully|gift has arrived/i);
  assert.match(care, /subscription_plans/);
  assert.match(care, /user_subscriptions/);
  assert.match(care, /Confirm cancellation/);
});
