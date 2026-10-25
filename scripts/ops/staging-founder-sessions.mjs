#!/usr/bin/env node
// Owner-entered normal Auth codes only. No admin impersonation, token readback or disk sessions.
import { createServer } from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';

export const STAGING_AUTH = 'https://fxmxyabdjqviqbcxmvlp.supabase.co';
export function validateFounderAliases(aliases) {
  const labels = ['customerA','workerA','customerB','workerB'];
  if (!aliases || Object.keys(aliases).length !== 4 || labels.some(label => typeof aliases[label] !== 'string' ||
    !/^[^+@\s]+\+xoot-(customer|xooter)(-[ab])?@[a-z0-9.-]+\.[a-z]{2,}$/i.test(aliases[label]))) throw new Error('Four authorised alias addresses are required in the private local config');
  const parts = value => /^(.*?)\+xoot-(customer|xooter)(-[ab])?@(.*)$/i.exec(value.toLowerCase());
  for (const pair of ['A','B']) {
    const c = parts(aliases['customer'+pair]), w = parts(aliases['worker'+pair]);
    if (c[2] !== 'customer' || w[2] !== 'xooter' || c[1] !== w[1] || c[4] !== w[4] || c[3] !== w[3] ||
      (c[3] && c[3] !== '-' + pair.toLowerCase())) throw new Error('Each customer and Xooter alias must form its approved A/B pair');
  }
  if (new Set(Object.values(aliases).map(value=>value.toLowerCase())).size !== 4) throw new Error('Four distinct authorised aliases are required');
  return Object.freeze(Object.fromEntries(labels.map(label=>[label,aliases[label].toLowerCase()])));
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const escape = value => String(value).replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));

export function createFounderSessionServer({ key, aliases:configuredAliases, base = STAGING_AUTH, fetcher = fetch, runAcceptance, lifetimeMs = 45 * 60_000 }) {
  if (base !== STAGING_AUTH) throw new Error('This helper accepts only the named Xoot staging project');
  if (typeof key !== 'string' || !key.startsWith('sb_publishable_')) throw new Error('An active staging publishable key is required');
  if (typeof runAcceptance !== 'function') throw new Error('A staging acceptance runner is required');
  const aliases = validateFounderAliases(configuredAliases);
  const csrf = randomBytes(32).toString('hex');
  const sessions = new Map(), sent = new Map(), attempts = new Map(), busy = new Set();
  let activeRun = null, runController = null;
  let origin = '', totalSends = 0, bookings = null, run = 'Not run', cleanup = 'Not run', passedGroups = 0, deadline = 0, closed = false;
  let message = 'Use these authorised aliases only. Enter codes here, never in chat.';
  const safeEqual = candidate => typeof candidate === 'string' && /^[a-f0-9]{64}$/.test(candidate) && timingSafeEqual(Buffer.from(candidate), Buffer.from(csrf));
  const status = () => ({ target: 'Xoot Staging', accounts: Object.entries(aliases).map(([label, email]) => ({ label, email,
    signedIn: sessions.has(label), userId: sessions.get(label)?.userId ?? null })), fixturesReady: Boolean(bookings), run, cleanup, passedGroups,
    adminDispatch: 'Not tested: requires separately authorised AAL1/AAL2 admin sessions' });
  const headers = { 'cache-control':'private, no-store', 'content-security-policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
    'x-frame-options':'DENY', 'x-content-type-options':'nosniff', 'referrer-policy':'strict-origin-when-cross-origin' };
  function send(res, code, body, type = 'text/plain; charset=utf-8') { res.writeHead(code, { ...headers, 'content-type':type }); res.end(body); }
  const form = fields => `<input type="hidden" name="csrf" value="${csrf}">${fields}`;
  function page() {
    const cards = status().accounts.map(a => `<section><h2>${escape(a.label)}</h2><p>${escape(a.email)}</p><p>${a.signedIn ? 'Signed in with a real staging session' : 'Not signed in'}</p>
      <form method="post" action="/request">${form(`<input type="hidden" name="account" value="${a.label}"><button>Send staging code</button>`)}</form>
      <form method="post" action="/verify">${form(`<input type="hidden" name="account" value="${a.label}"><label>Complete email code <input type="password" name="code" inputmode="numeric" autocomplete="one-time-code" minlength="6" maxlength="10" pattern="[0-9]{6,10}" placeholder="000000" required></label><button>Verify code privately</button>`)}</form></section>`).join('');
    return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Xoot staging test sign-in</title>
      <style>body{font:16px system-ui;background:#f5f2ff;color:#19141f;max-width:760px;margin:32px auto;padding:16px}h1{color:#6440e8}section{background:white;padding:20px;border-radius:18px;margin:16px 0}button,input{font:inherit;padding:10px;margin:6px 0;max-width:100%;box-sizing:border-box}button{background:#6440e8;color:white;border:0;border-radius:12px}label{display:block}p{overflow-wrap:anywhere}</style>
      <h1>Xoot · Staging only</h1><p>${escape(message)}</p><p>These accounts are for synthetic privacy tests. No production role or worker verification is changed. Sessions stay in this process for at most 45 minutes.</p>${cards}
      <section><h2>Prepared synthetic bookings</h2><form method="post" action="/fixtures">${form('<label>Customer A booking ID <input name="bookingA" required></label><label>Customer B booking ID <input name="bookingB" required></label><button>Use prepared staging fixtures</button>')}</form>
      <form method="post" action="/run">${form('<label><input type="checkbox" name="consent" value="YES" required> I authorise synthetic staging GPS uploads and cleanup for these four test accounts.</label><button>Run private GPS and ETA checks</button>')}</form><p>Run: ${escape(run)} · Passed groups: ${passedGroups}</p><p>GPS cleanup: ${escape(cleanup)}. If not confirmed, verify fixture expiry before further tests.</p><p>Admin MFA and real devices remain separate checks.</p></section></html>`;
  }
  async function auth(path, body, bearer) {
    const response = await fetcher(new URL(path, STAGING_AUTH), { method:body ? 'POST' : 'GET', cache:'no-store', redirect:'error', signal:AbortSignal.timeout(12_000),
      headers:{ apikey:key, ...(body ? {'content-type':'application/json'} : {}), ...(bearer ? { authorization:'Bearer ' + bearer } : {}) }, ...(body ? {body:JSON.stringify(body)} : {}) });
    if (!response.ok) throw new Error('Normal staging authentication failed');
    return response.json();
  }
  const server = createServer(async (req, res) => {
    try {
      if (!origin || closed || req.headers.host !== new URL(origin).host) return send(res, 403, 'Host rejected');
      if (req.method === 'GET' && req.url === '/') return send(res, 200, page(), 'text/html; charset=utf-8');
      if (req.method === 'GET' && req.url === '/status') return send(res, 200, JSON.stringify(status()), 'application/json');
      if (req.method !== 'POST' || !['/request','/verify','/fixtures','/run'].includes(req.url)) return send(res, 404, 'Not found');
      if (req.headers.origin !== origin) return send(res, 403, 'Origin rejected');
      if (req.headers['content-type']?.split(';')[0] !== 'application/x-www-form-urlencoded') return send(res, 415, 'Form required');
      let text = '';
      for await (const chunk of req) { text += chunk; if (Buffer.byteLength(text) > 1500) return send(res, 413, 'Form too large'); }
      if (closed || Date.now() >= deadline) return send(res, 410, 'Private form expired');
      const data = new URLSearchParams(text);
      if (!safeEqual(data.get('csrf'))) return send(res, 403, 'Form token rejected');
      if (req.url === '/fixtures') {
        const a = data.get('bookingA'), b = data.get('bookingB');
        if (!uuid.test(a ?? '') || !uuid.test(b ?? '') || a === b) return send(res, 400, 'Two distinct prepared staging booking IDs are required');
        if (run === 'Running') return send(res, 409, 'A run is active');
        bookings = { bookingA:a, bookingB:b }; message = 'Prepared fixture IDs saved in memory.';
      } else if (req.url === '/run') {
        if (cleanup === 'Not confirmed') return send(res, 409, 'GPS cleanup was not confirmed. Verify staging fixture expiry before another run.');
        if (data.get('consent') !== 'YES' || sessions.size !== 4 || !bookings || run === 'Running') return send(res, 409, 'Four real sessions, two prepared fixtures and synthetic consent are required');
        if (Date.now() > deadline - 210_000) return send(res, 409, 'This private form is expiring. Restart before a fresh test run.');
        if ([...sessions.values()].some(s => s.expiresAt <= Date.now())) return send(res, 409, 'A staging session expired. Sign in again.');
        run = 'Running'; cleanup = 'Pending'; passedGroups = 0;
        runController = new AbortController();
        const tokens = Object.fromEntries([...sessions].map(([label, s]) => [label, s.token]));
        const signal = runController.signal;
        activeRun = Promise.resolve().then(() => runAcceptance({ tokens, ...bookings, key, base:STAGING_AUTH, signal })).then(result => {
          cleanup = result?.cleanupConfirmed === true ? 'Confirmed' : 'Not confirmed';
          run = result?.exitCode === 0 && result?.cleanupConfirmed === true ? 'Passed' : 'Failed'; passedGroups = result?.passedGroups ?? 0;
        }, () => { run = 'Failed'; cleanup = 'Not confirmed'; }).finally(()=>{activeRun = null; runController = null;});
      } else {
        const label = data.get('account');
        if (!Object.hasOwn(aliases, label ?? '')) return send(res, 400, 'Only the four authorised aliases are permitted');
        const email = aliases[label];
        if (busy.has(label) || run === 'Running') return send(res, 409, 'An operation is active');
        busy.add(label);
        try {
          if (req.url === '/request') {
            if (totalSends >= 12 || Date.now() - (sent.get(label) ?? 0) < 60_000) return send(res, 429, 'Wait before requesting another staging email');
            sent.set(label, Date.now()); totalSends++;
            await auth('/auth/v1/otp', { email, create_user:true });
            attempts.set(label, 0); message = 'Staging email requested. Enter its complete code in the matching account form.';
          } else {
            const code = data.get('code');
            if (!/^[0-9]{6,10}$/.test(code ?? '') || !sent.has(label)) return send(res, 400, 'Request and enter a complete staging code');
            if ((attempts.get(label) ?? 0) >= 5) return send(res, 429, 'Request a fresh code before trying again');
            attempts.set(label, (attempts.get(label) ?? 0) + 1);
            const session = await auth('/auth/v1/verify', { email, token:code, type:'email' });
            if (typeof session.access_token !== 'string') throw new Error('Missing normal session');
            const user = await auth('/auth/v1/user', null, session.access_token);
            if (!uuid.test(user?.id ?? '') || user.is_anonymous === true || user.email?.toLowerCase() !== email ||
              [...sessions].some(([other, s]) => other !== label && s.userId === user.id)) throw new Error('Distinct authorised user required');
            const expiresAt = Number(session.expires_at) * 1000;
            if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) throw new Error('Expired session');
            if (closed || Date.now() >= deadline) throw new Error('Private sign-in form expired');
            sessions.set(label, { token:session.access_token, userId:user.id, expiresAt });
            message = 'Normal staging sign-in verified. The code is cleared; no credential is shown.';
          }
        } finally { busy.delete(label); }
      }
      res.writeHead(303, { ...headers, location:'/' }); res.end();
    } catch { message = 'The staging action could not finish. Check SMTP readiness or request the latest code. No credential was saved to disk.'; send(res, 400, message); }
  });
  let timer, shutdown;
  function close() {
    if (shutdown) return shutdown;
    closed = true; clearTimeout(timer); runController?.abort();
    shutdown = Promise.all([activeRun, new Promise(yes=>{if(server.listening)server.close(yes);else yes();})]).finally(()=>{sessions.clear();});
    return shutdown;
  }
  return { server, status, async start() { await new Promise((yes, no) => { server.once('error', no); server.listen(0, '127.0.0.1', yes); });
    origin = `http://127.0.0.1:${server.address().port}`; deadline = Date.now() + lifetimeMs; timer = setTimeout(() => { void close(); }, lifetimeMs); timer.unref(); return origin; }, close };
}

export async function cleanupStagingFixtures({ tokens, bookingA, bookingB, key, base }, fetcher = fetch) {
  if (base !== STAGING_AUTH || !uuid.test(bookingA ?? '') || !uuid.test(bookingB ?? '') || bookingA === bookingB) return false;
  const results = await Promise.allSettled([[tokens?.workerA,bookingA],[tokens?.workerB,bookingB]].map(async ([token,bookingId]) => {
    if (typeof token !== 'string' || !token) return false;
    const response = await fetcher(new URL('/functions/v1/xoot-job-location',STAGING_AUTH), {
      method:'POST',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(12_000),
      headers:{'content-type':'application/json',apikey:key,authorization:'Bearer '+token},body:JSON.stringify({action:'stop',bookingId}),
    });
    if (!response.ok) return false;
    const body = await response.json();
    return body?.success === true && body?.data?.state === 'stopped';
  }));
  return results.every(result=>result.status === 'fulfilled' && result.value === true);
}

export function runStagingAcceptance(input, { spawnChild = spawn, fetcher = fetch, timeoutMs = 180_000 } = {}) {
  const { tokens, bookingA, bookingB, key, base, signal } = input;
  return new Promise(resolveRun => {
    const env = Object.fromEntries(['PATH','SystemRoot','TEMP','TMP','USERPROFILE'].filter(k => process.env[k]).map(k => [k,process.env[k]]));
    Object.assign(env, { XOOT_TEST_STAGING_URL:base, XOOT_TEST_STAGING_ANON_KEY:key, XOOT_TEST_CUSTOMER_A_JWT:tokens.customerA,
      XOOT_TEST_CUSTOMER_B_JWT:tokens.customerB, XOOT_TEST_WORKER_A_JWT:tokens.workerA, XOOT_TEST_WORKER_B_JWT:tokens.workerB,
      XOOT_TEST_BOOKING_A:bookingA, XOOT_TEST_BOOKING_B:bookingB, XOOT_TEST_SYNTHETIC_CONSENT:'YES' });
    const child = spawnChild(process.execPath, [fileURLToPath(new URL('./test-mapbox-private-journey-staging.mjs', import.meta.url))], { env, windowsHide:true, stdio:['ignore','pipe','pipe'] });
    let output = '';
    child.stdout.on('data', chunk => { output = (output + chunk).slice(-16_000); });
    child.stderr.on('data', () => {}); // Never expose a child error's potentially private actual/expected payload.
    let finishing = false, watchdog, timeout, timedOut = false, aborted = false;
    const finish = async (exitCode, childStopped = true) => {
      if (finishing) return;
      finishing = true; clearTimeout(timeout); clearTimeout(watchdog);
      signal?.removeEventListener('abort',abort);
      const cleanupConfirmed = await cleanupStagingFixtures(input,fetcher) && childStopped;
      resolveRun({ exitCode:cleanupConfirmed && !timedOut && !aborted ? exitCode : 1, cleanupConfirmed,
        passedGroups:output.split('\n').filter(line => line.startsWith('PASS:')).length });
    };
    const kill = () => {
      try {
        if (!child.kill()) { void finish(1,false); return; }
        if (!finishing) watchdog = setTimeout(()=>{void finish(1,false);},5_000);
      } catch { void finish(1,false); }
    };
    const abort = () => { aborted = true; kill(); };
    child.once('error', () => {void finish(1,!child.pid);}); child.once('close', code => {void finish(code ?? 1);});
    timeout = setTimeout(()=>{timedOut = true;kill();},timeoutMs);
    signal?.addEventListener('abort',abort,{once:true});
    if (signal?.aborted) abort();
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const configAt = process.argv.indexOf('--config');
  if (configAt < 0 || !process.argv[configAt+1]) throw new Error('Pass --config with an ignored, owner-restricted local JSON file containing staging public key and approved aliases');
  const config = JSON.parse(await readFile(process.argv[configAt+1], 'utf8'));
  const helper = createFounderSessionServer({ key:config.key, aliases:config.aliases, runAcceptance:runStagingAcceptance });
  const origin = await helper.start();
  console.log('Owner-private staging sign-in form: ' + origin);
  process.once('SIGINT', () => { void helper.close(); });
}
