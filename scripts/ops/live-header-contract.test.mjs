import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { hasNoindex, hasPrivateNoStore } from './live-header-contract.mjs';

const verifier = fileURLToPath(new URL('./verify-live-site.mjs', import.meta.url));
const html = '<!doctype html><html><body><div id="root"></div><script type="module" src="/assets/index-stub.js"></script></body></html>';
const bundle = 'const SUPABASE_URL="https://abcdefghijklmnopqrst.supabase.co";const KEY="sb_publishable_ABCDEFGHIJKLMN";';

test('private headers accept complete, case-insensitive comma-separated directives only', () => {
  assert.equal(hasNoindex('noindex, noarchive, nosnippet'), true);
  assert.equal(hasNoindex('NOARCHIVE,  NoInDeX  '), true);
  assert.equal(hasNoindex('index, noindex-extra'), false);
  assert.equal(hasNoindex(null), false);
  assert.equal(hasPrivateNoStore('no-store, private, max-age=0, must-revalidate'), true);
  assert.equal(hasPrivateNoStore('PRIVATE, NO-STORE'), true);
  assert.equal(hasPrivateNoStore('public, no-store, private'), false);
  assert.equal(hasPrivateNoStore('no-store, private-extra'), false);
  assert.equal(hasPrivateNoStore('no-cache, private'), false);
  assert.equal(hasPrivateNoStore(undefined), false);
});

async function withSite(brokenRoute, visit) {
  const requested = new Set();
  const server = createServer((request, response) => {
    const path = (request.url ?? '/').split('?')[0];
    requested.add(path);
    const headers = {
      'content-type': 'text/html; charset=utf-8',
      'content-security-policy': "default-src 'self'; frame-ancestors 'none'; object-src 'none'",
      'strict-transport-security': 'max-age=31536000; includeSubDomains',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'strict-origin-when-cross-origin',
      'permissions-policy': 'camera=()',
    };
    if (path.startsWith('/xooter') || ['/app', '/auth', '/admin'].includes(path)) {
      headers['x-robots-tag'] = path === brokenRoute ? 'noindex-looks-safe' : 'noindex, noarchive, nosnippet';
      headers['cache-control'] = path === brokenRoute ? 'public, no-store, private' : 'no-store, private, max-age=0';
    }
    if (path.startsWith('/.well-known/')) {
      response.writeHead(404, headers);
      response.end('Not yet available');
    } else if (path === '/assets/index-stub.js') {
      response.writeHead(200, { ...headers, 'content-type': 'application/javascript' });
      response.end(bundle);
    } else {
      response.writeHead(200, headers);
      response.end(html);
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const address = server.address();
    assert.ok(address && typeof address === 'object');
    return await visit('http://127.0.0.1:' + address.port, requested);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

function runVerifier(site) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [verifier, site], { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });
}

test('real live-site command accepts all private-route headers on a healthy local host', { timeout: 20000 }, async () => {
  await withSite(null, async (site, requested) => {
    const result = await runVerifier(site);
    assert.equal(result.code, 0, result.stdout + '\n' + result.stderr);
    assert.match(result.stdout, /PASS\s+\/xooter\/future-private-route is noindex/);
    assert.match(result.stdout, /PASS\s+\/xooter\/future-private-route is private no-store/);
    assert.ok(requested.has('/xooter/future-private-route'), 'unlisted nested route must be inspected');
  });
});

test('real live-site command rejects deceptive headers on an unlisted nested Xooter route', { timeout: 20000 }, async () => {
  await withSite('/xooter/future-private-route', async (site) => {
    const result = await runVerifier(site);
    assert.equal(result.code, 1, result.stdout + '\n' + result.stderr);
    assert.match(result.stdout, /FAIL\s+\/xooter\/future-private-route is noindex/);
    assert.match(result.stdout, /FAIL\s+\/xooter\/future-private-route is private no-store/);
    assert.match(result.stdout, /PASS\s+\/xooter\/jobs is noindex/);
  });
});
