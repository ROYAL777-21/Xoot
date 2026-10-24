import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { request } from 'node:http';
import { createFounderSessionServer, validateFounderAliases } from './staging-founder-sessions.mjs';
const FOUNDER_ALIASES = { customerA:'founder-a+xoot-customer@example.test',workerA:'founder-a+xoot-xooter@example.test',customerB:'founder-b+xoot-customer@example.test',workerB:'founder-b+xoot-xooter@example.test' };
const helpers = [];
afterEach(async () => { await Promise.all(helpers.splice(0).map(h => h.close())); });
async function setup(fetcher = async () => Response.json({}), runAcceptance = async () => ({ exitCode:0, passedGroups:3 })) {
  const helper = createFounderSessionServer({ key:'sb_publishable_synthetic', aliases:FOUNDER_ALIASES, fetcher, runAcceptance }); helpers.push(helper);
  const origin = await helper.start(); const html = await (await fetch(origin)).text(); const csrf = html.match(/name="csrf" value="([a-f0-9]+)"/)[1];
  const post = (path, values, headers = {}) => fetch(origin + path, { method:'POST', redirect:'manual', headers:{ origin, 'content-type':'application/x-www-form-urlencoded', ...headers }, body:new URLSearchParams({ csrf, ...values }) });
  return { helper, origin, csrf, post };
}
test('refuses production targets and server credentials', () => {
  assert.throws(() => createFounderSessionServer({ key:'sb_publishable_test', base:'https://mvlrkelahhsyjrwgsxaf.supabase.co' }));
  assert.throws(() => createFounderSessionServer({ key:'service-role-secret' }));
});
test('requires exact Host, Origin, CSRF, bounded form and approved aliases before Auth calls', async () => {
  let requests = 0; const { origin, post } = await setup(async () => { requests++; return Response.json({}); });
  const hostileHost = await new Promise((done, fail) => { const req = request(origin, {headers:{host:'attacker.example'}}, res => {res.resume();done(res.statusCode);});req.once('error',fail);req.end(); });
  assert.equal(hostileHost, 403);
  assert.equal((await post('/request', {account:'customerA'}, {origin:'https://attacker.example'})).status, 403);
  assert.equal((await post('/request', {account:'customerA'}, {origin:'null'})).status, 403);
  assert.equal((await post('/request', {account:'customerA',csrf:'wrong'})).status, 403);
  assert.equal((await post('/request', {account:'other'})).status, 400);
  assert.equal((await post('/request', {account:'__proto__'})).status, 400);
  assert.equal((await post('/request', {account:'customerA',extra:'x'.repeat(1600)})).status, 413);
  assert.equal(requests, 0);
  assert.equal((await post('/request', {account:'customerA'})).status, 303);
  assert.equal((await post('/request', {account:'customerA'})).status, 429);
  assert.equal(requests, 1);
});
test('requires four aliases forming the two authorised founder pairs', () => {
  assert.throws(()=>validateFounderAliases({...FOUNDER_ALIASES,workerA:'other+xoot-xooter@example.test'}));
  assert.throws(()=>validateFounderAliases({...FOUNDER_ALIASES,workerB:FOUNDER_ALIASES.workerA,customerB:FOUNDER_ALIASES.customerA}));
});
test('normal Auth sessions stay server-side and runner needs four distinct users, fixtures and consent', async () => {
  const ids = Object.keys(FOUNDER_ALIASES); let subject = '', ran = false;
  const fixture = { bookingA:'11111111-1111-4111-8111-111111111111', bookingB:'22222222-2222-4222-8222-222222222222' };
  const fetcher = async (url, options) => {
    assert.equal(url.origin, 'https://fxmxyabdjqviqbcxmvlp.supabase.co');
    const body = options.body ? JSON.parse(options.body) : null;
    if (url.pathname.endsWith('/otp')) { assert.equal(body.create_user, true); return Response.json({}); }
    if (url.pathname.endsWith('/verify')) { subject = Object.entries(FOUNDER_ALIASES).find(([,e]) => e === body.email)[0];
      return Response.json({ access_token:'synthetic-private-session-' + subject, expires_at:Math.floor(Date.now()/1000)+3600 }); }
    const id = `00000000-0000-4000-8000-00000000000${ids.indexOf(subject)+1}`;
    return Response.json({ id, email:FOUNDER_ALIASES[subject], is_anonymous:false });
  };
  const { origin, post } = await setup(fetcher, async input => { ran = true; assert.equal(new Set(Object.values(input.tokens)).size,4); assert.equal(input.bookingA,fixture.bookingA); return {exitCode:0,passedGroups:4}; });
  assert.equal((await post('/run', {consent:'YES'})).status, 409);
  for (const account of ids) {
    assert.equal((await post('/request', {account})).status, 303);
    assert.equal((await post('/verify', {account,code:'123456'})).status, 303);
  }
  const html = await (await fetch(origin)).text(); const snapshot = await (await fetch(origin+'/status')).text();
  assert.ok(!html.includes('synthetic-private-session-') && !snapshot.includes('synthetic-private-session-'));
  assert.ok(!html.includes('123456') && !snapshot.includes('123456'));
  assert.equal(JSON.parse(snapshot).accounts.filter(a=>a.signedIn).length,4);
  assert.equal((await post('/fixtures',fixture)).status,303);
  assert.equal((await post('/run',{})).status,409);
  assert.equal((await post('/run',{consent:'YES'})).status,303);
  await new Promise(resolve => setImmediate(resolve)); assert.equal(ran,true);
  assert.equal((await (await fetch(origin+'/status')).json()).run,'Passed');
});
test('rejects an Auth user outside the approved alias and does not reveal the returned token', async () => {
  const { post, origin } = await setup(async url => Response.json(url.pathname.endsWith('/verify') ? { access_token:'do-not-expose',expires_at:Math.floor(Date.now()/1000)+3600 } : url.pathname.endsWith('/user') ? { id:'11111111-1111-4111-8111-111111111111',email:'other@example.test' } : {}));
  await post('/request',{account:'customerA'}); const result = await post('/verify',{account:'customerA',code:'12345678'});
  assert.equal(result.status,400); assert.ok(!(await result.text()).includes('do-not-expose'));
  assert.equal((await (await fetch(origin+'/status')).json()).accounts[0].signedIn,false);
});

test('limits failed code verification before another provider call', async () => {
  let verifications = 0;
  const { post } = await setup(async url => {
    if (url.pathname.endsWith('/verify')) { verifications++; return Response.json({}, {status:400}); }
    return Response.json({});
  });
  await post('/request',{account:'customerA'});
  for (let attempt=0; attempt<5; attempt++) assert.equal((await post('/verify',{account:'customerA',code:'123456'})).status,400);
  assert.equal((await post('/verify',{account:'customerA',code:'123456'})).status,429);
  assert.equal(verifications,5);
});

test('rejects the same Auth identity reused for another approved alias', async () => {
  let email='';
  const { post, origin } = await setup(async (url, options) => {
    if (url.pathname.endsWith('/verify')) {
      email=JSON.parse(options.body).email;
      return Response.json({access_token:'synthetic-session',expires_at:Math.floor(Date.now()/1000)+3600});
    }
    if (url.pathname.endsWith('/user')) return Response.json({id:'11111111-1111-4111-8111-111111111111',email,is_anonymous:false});
    return Response.json({});
  });
  for (const account of ['customerA','workerA']) {
    await post('/request',{account});
    assert.equal((await post('/verify',{account,code:'123456'})).status,account==='customerA'?303:400);
  }
  const status=await (await fetch(origin+'/status')).json();
  assert.equal(status.accounts.filter(account=>account.signedIn).length,1);
});
