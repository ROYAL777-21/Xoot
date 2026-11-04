// Independent PostgreSQL17 sessions only. No hosted connections/provider calls.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
assert.equal(process.env.XOOT_PG_TEST_INTENT,'atomic-redemption');
assert.ok(['127.0.0.1','::1'].includes(process.env.PGHOST),'Literal loopback required');
assert.ok(process.env.PGPORT && process.env.PGUSER);
assert.ok(!process.env.PGSERVICE && !process.env.PGSERVICEFILE);
const { default: pg } = await import(process.env.XOOT_PG_MODULE
  ? pathToFileURL(resolve(process.env.XOOT_PG_MODULE)).href : 'pg');
const settings = {
  host:process.env.PGHOST,port:Number(process.env.PGPORT),user:process.env.PGUSER,
  password:process.env.XOOT_PG_PASSWORD_FILE ? readFileSync(process.env.XOOT_PG_PASSWORD_FILE,'utf8').trim() : process.env.PGPASSWORD,
  database:'postgres',ssl:false,connectionTimeoutMillis:15000,statement_timeout:10000,query_timeout:12000,
  application_name:'xoot_synthetic_atomic_redemption',
};
assert.ok(settings.password,'Explicit disposable test password required');
const database = 'xoot_test_atomic_' + randomUUID().replaceAll('-','');
const root = resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const sql = path => readFileSync(resolve(root,path),'utf8');
const admin = new pg.Client(settings);
const clients = [], createdRoles = [];
let created = false, barriers = 0, cases = 0;
const pending = promise => promise.then(value => ({value}),error => ({error}));
const success = result => { if(result.error) throw result.error; return result.value; };
const log = name => { cases++; console.log('ok ' + cases + ' - ' + name); };
const rpc = 'select public.redeem_booking_xootcred($1,$2,$3,$4,$5,$6) receipt';
const reserve = `update public.payment_records set provider='payfast'
  where id=$1 and user_id=$2 and status='pending' and amount=$3
    and provider='manual_pending' and provider_reference=$4
    and booking_id=$5 and currency='ZAR' and payment_kind='booking' returning id`;
try {
  await admin.connect();
  const version = Number((await admin.query('show server_version_num')).rows[0].server_version_num);
  assert.ok(version>=170000 && version<180000,'PostgreSQL17 required');
  for(const role of ['anon','authenticated','service_role']) {
    if(!(await admin.query('select from pg_roles where rolname=$1',[role])).rowCount) {
      await admin.query('create role ' + role + ' nologin'); createdRoles.push(role);
    }
  }
  await admin.query('create database "' + database + '"'); created = true;
  for(let i=0;i<3;i++) { const c = new pg.Client({...settings,database}); await c.connect(); clients.push(c); }
  const [observer,first,second] = clients;
  const pids = await Promise.all([first,second].map(async c => Number((await c.query('select pg_backend_pid() pid')).rows[0].pid)));
  await observer.query(sql('scripts/ops/fixtures/booking-benefit-locks.sql'));
  await observer.query(sql('scripts/testing/atomic-redemption-fixture.sql'));
  await observer.query(sql('supabase/migrations/20260815160000_xootcred_trigger_queries_a_dropped_table.sql'));
  await observer.query("create trigger zootcred_balance_check before insert on public.xootcred_ledger for each row when(new.amount < 0 or new.direction='debit') execute function public.check_xootcred_balance()");
  await observer.query(sql('supabase/migrations/20260929055022_booking_benefit_account_guards.sql'));
  await observer.query(sql('supabase/migrations/20261028125915_atomic_booking_cancellation.sql').split('create or replace function private.settle_booking_payment(')[0]);
  await observer.query(sql('supabase/migrations/20261104045943_atomic_booking_xootcred_redemption.sql'));
  for(const c of [first,second]) await c.query('set role service_role');
  const fresh = async (owner=randomUUID(),credit=100) => {
    const booking=randomUUID(),payment=randomUUID(),key=randomUUID(),reference='synthetic_'+randomUUID();
    await observer.query('insert into auth.users(id) values($1) on conflict do nothing',[owner]);
    await observer.query('insert into public.bookings(id,user_id,status) values($1,$2,\'draft\')',[booking,owner]);
    await observer.query("insert into public.payment_records(id,user_id,booking_id,amount,payment_kind,provider_reference) values($1,$2,$3,200,'booking',$4)",[payment,owner,booking,reference]);
    if(credit) await observer.query("insert into public.xootcred_ledger(user_id,amount,direction,status) values($1,$2,'credit','available')",[owner,credit]);
    return {owner,booking,payment,key,reference,args:[owner,booking,payment,key,20000,7000]};
  };
  const state = async x => (await observer.query(`select amount::text,status,provider,
    (select count(*)::integer from public.xootcred_ledger where booking_id=$2 and direction='debit') debits,
    (select count(*)::integer from private.booking_credit_redemptions where payment_record_id=$1) receipts
    from public.payment_records where id=$1`,[x.payment,x.booking])).rows[0];
  const blocked = async () => {
    const until=Date.now()+6000;
    while(Date.now()<until) {
      const r=(await observer.query('select wait_event_type,pg_blocking_pids(pid) blockers from pg_stat_activity where pid=$1',[pids[1]])).rows[0];
      if(r?.wait_event_type==='Lock' && r.blockers.map(Number).includes(pids[0])) { barriers++; return; }
      await delay(20);
    }
    assert.fail('No actual database blocking evidence');
  };
  const begin = c => c.query('begin');
  const commit = c => c.query('commit');
  const rollback = c => c.query('rollback');

  const a=await fresh(), b=await fresh(a.owner,0);
  await begin(first); await first.query(rpc,a.args);
  assert.equal((await state(a)).amount,'200.00','uncommitted price invisible');
  const conflict=pending(second.query(rpc,b.args)); await blocked(); await commit(first);
  assert.equal((await conflict).error?.code,'23514');
  assert.deepEqual(await state(b),{amount:'200.00',status:'pending',provider:'manual_pending',debits:0,receipts:0});
  log('two bookings sharing R100 cannot both redeem R70; rejected debit never discounts loser');

  const replay=await fresh();
  await begin(first); await first.query(rpc,replay.args);
  const duplicate=pending(second.query(rpc,replay.args)); await blocked(); await commit(first);
  assert.equal(success(await duplicate).rows[0].receipt.idempotent,true);
  assert.equal((await state(replay)).debits,1); assert.equal((await state(replay)).receipts,1);
  log('same-key concurrent replay returns the one committed receipt');

  const changed=await fresh();
  await begin(first); await first.query(rpc,changed.args);
  const stale=pending(second.query(rpc,[...changed.args.slice(0,3),randomUUID(),20000,7000]));
  await blocked(); await commit(first); assert.equal((await stale).error?.code,'22023');
  assert.equal((await state(changed)).debits,1);
  log('different key cannot spend again against an obsolete accepted due');

  const creditWins=await fresh();
  await begin(first); await first.query(rpc,creditWins.args);
  const staleCheckout=pending(second.query(reserve,[creditWins.payment,creditWins.owner,200,creditWins.reference,creditWins.booking]));
  await blocked(); await commit(first); assert.equal(success(await staleCheckout).rowCount,0);
  assert.equal((await state(creditWins)).provider,'manual_pending');
  log('redemption wins: stale signed checkout reservation cannot route');

  const checkoutWins=await fresh();
  await begin(first);
  assert.equal((await first.query(reserve,[checkoutWins.payment,checkoutWins.owner,200,checkoutWins.reference,checkoutWins.booking])).rowCount,1);
  const lateCredit=pending(second.query(rpc,checkoutWins.args));
  await blocked(); await commit(first); assert.equal((await lateCredit).error?.code,'22023');
  assert.equal((await state(checkoutWins)).amount,'200.00'); assert.equal((await state(checkoutWins)).debits,0);
  log('checkout wins: routed payment cannot later be repriced');

  // Exercise the actual common account-lock helper and source row order used
  // by the existing settlement/cancellation transactions. This is a lock/state
  // race test, not provider verification or full cancellation acceptance.
  for(const terminal of ['paid','cancelled']) {
    const x=await fresh();
    await begin(first);
    await first.query('select private.lock_payment_booking_accounts($1,null)',[x.booking]);
    await first.query('select id from public.payment_records where id=$1 for update',[x.payment]);
    await first.query('select id from public.bookings where id=$1 for update',[x.booking]);
    await first.query('update public.payment_records set status=$1,paid_at=case when $1=\'paid\' then now() else null end where id=$2',[terminal,x.payment]);
    await first.query("update public.bookings set status=$1,payment_status=$2,cancelled_at=case when $1='cancelled' then now() else null end where id=$3",
      [terminal==='paid'?'payment_confirmed':'cancelled',terminal,x.booking]);
    const late=pending(second.query(rpc,x.args)); await blocked(); await commit(first);
    assert.equal((await late).error?.code,'22023');
    assert.equal((await state(x)).amount,'200.00'); assert.equal((await state(x)).debits,0);
    log(terminal + ' transition wins: waiting credit cannot alter terminal payment');
  }

  const rr=await fresh();
  await first.query('begin isolation level repeatable read');
  await first.query('select count(*) from public.xootcred_ledger where user_id=$1',[rr.owner]);
  await second.query(rpc,rr.args);
  const retry=await pending(first.query(rpc,[...rr.args.slice(0,3),randomUUID(),20000,7000]));
  assert.equal(retry.error?.code,'40001'); await rollback(first);
  assert.equal((await state(rr)).debits,1);
  log('stale repeatable-read facts abort at account guard instead of reusing balance');
  assert.equal(cases,8); assert.equal(barriers,7);
  console.log(JSON.stringify({status:'passed',postgresVersion:version,cases,observedBlockingBarriers:barriers,syntheticOnly:true}));
} finally {
  await Promise.all(clients.map(async c => {await c.query('rollback').catch(()=>{});await c.end();}));
  if(created && /^xoot_test_atomic_[0-9a-f]{32}$/.test(database)) await admin.query('drop database "' + database + '"');
  for(const role of createdRoles.reverse()) await admin.query('drop role ' + role);
  await admin.end();
}
