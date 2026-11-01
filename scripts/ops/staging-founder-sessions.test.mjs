import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { request } from 'node:http';
import { EventEmitter } from 'node:events';
import { createFounderSessionServer, validateFounderAliases, runStagingAcceptance } from './staging-founder-sessions.mjs';
import {revokeEveryChatTestDevice} from './test-booking-communications-staging.mjs';
const FOUNDER_ALIASES = { customerA:'founder-a+xoot-customer@example.test',workerA:'founder-a+xoot-xooter@example.test',customerB:'founder-b+xoot-customer@example.test',workerB:'founder-b+xoot-xooter@example.test' };
const helpers = [];
afterEach(async () => { await Promise.all(helpers.splice(0).map(h => h.close())); });
async function setup(fetcher = async () => Response.json({}), runAcceptance = async () => ({ exitCode:0, passedGroups:3, cleanupConfirmed:true })) {
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
test('requires four distinct aliases forming approved A/B role pairs', () => {
  assert.throws(()=>validateFounderAliases({...FOUNDER_ALIASES,workerA:'other+xoot-xooter@example.test'}));
  assert.throws(()=>validateFounderAliases({...FOUNDER_ALIASES,workerB:FOUNDER_ALIASES.workerA,customerB:FOUNDER_ALIASES.customerA}));
});

test('accepts the approved one-inbox arrangement without mixing role or pair suffixes', () => {
  const single = { customerA:'founder+xoot-customer@example.test', workerA:'founder+xoot-xooter@example.test',
    customerB:'founder+xoot-customer-b@example.test', workerB:'founder+xoot-xooter-b@example.test' };
  assert.deepEqual(validateFounderAliases(single), single);
  assert.throws(()=>validateFounderAliases({...single,workerB:'founder+xoot-xooter-a@example.test'}));
  assert.throws(()=>validateFounderAliases({...single,workerB:'founder+xoot-customer-b@example.test'}));
  assert.throws(()=>validateFounderAliases({...single,customerB:'founder+xoot-customer-c@example.test'}));
});
test('normal Auth sessions stay server-side and runner needs four distinct users, fixtures and consent', async () => {
  const ids = Object.keys(FOUNDER_ALIASES); let subject = '', ran = false, runs = 0;
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
  const { origin, post } = await setup(fetcher, async input => { ran = true; assert.equal(new Set(Object.values(input.tokens)).size,4); assert.equal(input.bookingA,fixture.bookingA); return {exitCode:0,passedGroups:4,cleanupConfirmed:++runs===1}; });
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
  assert.equal((await post('/run',{consent:'YES'})).status,303);
  await new Promise(resolve=>setImmediate(resolve));
  const failedCleanup = await (await fetch(origin+'/status')).json();
  assert.equal(failedCleanup.run,'Failed');assert.equal(failedCleanup.cleanup,'Not confirmed');
  assert.ok((await (await fetch(origin)).text()).includes('GPS cleanup: Not confirmed'));
  assert.equal((await post('/run',{consent:'YES'})).status,409);
});

const runnerInput = {base:'https://fxmxyabdjqviqbcxmvlp.supabase.co',key:'sb_publishable_synthetic',
  tokens:{customerA:'synthetic-ca',workerA:'synthetic-wa',customerB:'synthetic-cb',workerB:'synthetic-wb'},
  bookingA:'11111111-1111-4111-8111-111111111111',bookingB:'22222222-2222-4222-8222-222222222222'};
function syntheticChild() {
  const child = new EventEmitter(); child.stdout = new EventEmitter(); child.stderr = new EventEmitter();
  child.kill = () => {queueMicrotask(()=>child.emit('close',null));return true;};
  return child;
}
test('a killed timeout still confirms parent-owned STOP for both fixtures without returning stderr', async () => {
  const stops = [];
  const result = await runStagingAcceptance(runnerInput,{timeoutMs:5,spawnChild:()=>{
    const child=syntheticChild();queueMicrotask(()=>{child.stdout.emit('data','PASS: synthetic group\n');child.stderr.emit('data','private-synthetic-payload');});return child;
  },fetcher:async (url,options)=>{
    assert.equal(url.origin,runnerInput.base);stops.push(JSON.parse(options.body));
    return Response.json({success:true,data:{state:'stopped'}});
  }});
  assert.deepEqual(stops.map(stop=>stop.bookingId).sort(),[runnerInput.bookingA,runnerInput.bookingB]);
  assert.ok(stops.every(stop=>stop.action==='stop'));
  assert.equal(result.cleanupConfirmed,true);assert.equal(result.exitCode,1);assert.equal(result.passedGroups,1);
  assert.ok(!JSON.stringify(result).includes('private-synthetic-payload'));
});

test('child cleanup attempts the other device even when the first revocation fails',async()=>{
  const attempted=[];await assert.rejects(revokeEveryChatTestDevice({customerA:{},workerA:{}},async label=>{attempted.push(label);if(label==='customerA')throw new Error('synthetic failure');}));
  assert.deepEqual(attempted,['customerA','workerA']);
});

for(const failFirst of [false,true])test('parent owns both published device IDs and verifies revocation after forced termination; first failure='+failFirst,async()=>{
  let devices;const patches=[];const reads=[];
  const result=await runStagingAcceptance(runnerInput,{includeCommunications:true,timeoutMs:5,spawnChild:(_exe,_args,options)=>{
    devices=[options.env.XOOT_TEST_CHAT_CUSTOMER_A_DEVICE,options.env.XOOT_TEST_CHAT_WORKER_A_DEVICE];
    assert.equal(new Set(devices).size,2);assert.equal(options.env.XOOT_TEST_COMMUNICATIONS,'YES');return syntheticChild();
  },fetcher:async(url,options)=>{
    if(url.pathname.endsWith('/xoot-job-location'))return Response.json({success:true,data:{state:'stopped'}});
    assert.equal(url.pathname,'/rest/v1/user_encryption_keys');const device=url.searchParams.get('device_id').slice(3);assert.ok(devices.includes(device));
    if(options.method==='PATCH'){patches.push(device);return new Response(null,{status:failFirst&&device===devices[0]?500:204});}
    reads.push(device);return Response.json([{device_id:device,revoked_at:new Date().toISOString()}]);
  }});
  assert.deepEqual(patches.sort(),devices.sort());assert.equal(reads.length,failFirst?1:2);
  assert.equal(result.exitCode,1);assert.equal(result.cleanupConfirmed,!failFirst);
  assert.ok(!JSON.stringify(result).includes('synthetic-ca'));
});
test('parent cleanup runs once on duplicate child terminal events and requires both STOP confirmations', async () => {
  let calls=0;
  const result = await runStagingAcceptance(runnerInput,{spawnChild:()=>{
    const child=syntheticChild();queueMicrotask(()=>{child.emit('error',new Error('synthetic'));child.emit('close',1);});return child;
  },fetcher:async()=>{calls++;return Response.json({success:true,data:{state:calls===1?'stopped':'unavailable'}});}});
  assert.equal(calls,2);assert.equal(result.cleanupConfirmed,false);assert.equal(result.exitCode,1);
});

for (const groups of [6, 9]) test('combined acceptance cannot pass with GPS-only child output; groups='+groups, async () => {
  const result=await runStagingAcceptance(runnerInput,{includeCommunications:true,spawnChild:()=>{
    const child=syntheticChild();queueMicrotask(()=>{child.stdout.emit('data',Array.from({length:groups},(_,i)=>'PASS: synthetic '+i+'\n').join(''));child.emit('close',0);});return child;
  },fetcher:async(url,options)=>url.pathname.endsWith('/xoot-job-location')?Response.json({success:true,data:{state:'stopped'}}):options.method==='PATCH'?new Response(null,{status:204}):Response.json([])});
  assert.equal(result.cleanupConfirmed,true);assert.equal(result.passedGroups,groups);assert.equal(result.exitCode,groups===9?0:1);
});
test('cancelling an active child awaits its parent cleanup before resolving', async () => {
  const controller=new AbortController();let releaseCleanup, killed=false;
  const pending=runStagingAcceptance({...runnerInput,signal:controller.signal},{spawnChild:()=>{
    const child=syntheticChild();const kill=child.kill;child.kill=()=>{killed=true;return kill();};return child;
  },fetcher:async()=>{await new Promise(yes=>{releaseCleanup ??= yes;if(releaseCleanup!==yes)yes();});return Response.json({success:true,data:{state:'stopped'}});}});
  controller.abort();await new Promise(yes=>setImmediate(yes));assert.equal(killed,true);
  let settled=false;void pending.then(()=>{settled=true;});assert.equal(settled,false);
  releaseCleanup();const result=await pending;assert.equal(result.cleanupConfirmed,true);assert.equal(result.exitCode,1);
});
test('closing the helper cancels its active runner and awaits cleanup before clearing sessions', async () => {
  let account='', killed=false;const release=[];
  const {helper,post}=await setup(async(url,options)=>{
    if(url.pathname.endsWith('/verify')) {account=Object.entries(FOUNDER_ALIASES).find(([,email])=>email===JSON.parse(options.body).email)[0];return Response.json({access_token:'synthetic-'+account,expires_at:Math.floor(Date.now()/1000)+3600});}
    if(url.pathname.endsWith('/user'))return Response.json({id:`00000000-0000-4000-8000-00000000000${Object.keys(FOUNDER_ALIASES).indexOf(account)+1}`,email:FOUNDER_ALIASES[account],is_anonymous:false});
    return Response.json({});
  },input=>runStagingAcceptance(input,{spawnChild:()=>{
    const child=syntheticChild();const kill=child.kill;child.kill=()=>{killed=true;return kill();};return child;
  },fetcher:async()=>{await new Promise(yes=>release.push(yes));return Response.json({success:true,data:{state:'stopped'}});}}));
  for(const account of Object.keys(FOUNDER_ALIASES)) {await post('/request',{account});await post('/verify',{account,code:'123456'});}
  await post('/fixtures',{bookingA:runnerInput.bookingA,bookingB:runnerInput.bookingB});
  await post('/run',{consent:'YES'});
  const closing=helper.close();await new Promise(yes=>setImmediate(yes));
  assert.equal(killed,true);assert.equal(release.length,2);
  assert.equal(helper.status().accounts.filter(account=>account.signedIn).length,4);
  release.forEach(yes=>yes());await closing;
  assert.equal(helper.status().cleanup,'Confirmed');assert.equal(helper.status().accounts.filter(account=>account.signedIn).length,0);
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
