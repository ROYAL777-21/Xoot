import assert from 'node:assert/strict';
import test from 'node:test';
import { verifyStagingTestIdentities } from './verify-staging-test-identities.mjs';
const base = new URL('https://fxmxyabdjqviqbcxmvlp.supabase.co');
const tokens = { customerA: 'unit-a', customerB: 'unit-b', workerA: 'unit-c', workerB: 'unit-d' };
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

test('unit fixture: distinct token strings for one account cannot pass isolation acceptance', async () => {
  await assert.rejects(verifyStagingTestIdentities({ base, key: 'unit-only', tokens,
    fetcher: async () => Response.json({ id: id(1) }) }), /same user/);
});
test('unit fixture: expired or anonymous auth is rejected before writes', async () => {
  await assert.rejects(verifyStagingTestIdentities({ base, key: 'unit-only', tokens,
    fetcher: async () => new Response(null, { status: 401 }) }), /could not verify/);
  await assert.rejects(verifyStagingTestIdentities({ base, key: 'unit-only', tokens,
    fetcher: async () => Response.json({ id: id(1), is_anonymous: true }) }), /non-anonymous/);
});
test('unit fixture: only server-resolved distinct users pass, using staging Auth and no-store', async () => {
  let n = 0;
  await verifyStagingTestIdentities({ base, key: 'unit-only', tokens,
    fetcher: async (url, options) => {
      assert.equal(url.href, 'https://fxmxyabdjqviqbcxmvlp.supabase.co/auth/v1/user');
      assert.equal(options.cache, 'no-store'); assert.equal(options.redirect, 'error');
      return Response.json({ id: id(++n) });
    } });
  assert.equal(n, 4);
});
test('production target is refused without making a network call', async () => {
  await assert.rejects(verifyStagingTestIdentities({ base: 'https://mvlrkelahhsyjrwgsxaf.supabase.co',
    key: 'unit-only', tokens, fetcher: () => { throw new Error('must not fetch'); } }), /non-staging/);
});
