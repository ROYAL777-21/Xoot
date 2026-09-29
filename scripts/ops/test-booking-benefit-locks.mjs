#!/usr/bin/env node
// Real independent PG sessions, never PGlite. Run only on a disposable loopback
// test server with CREATEDB/CREATEROLE rights (or pre-provisioned API roles).
// Required: XOOT_PG_TEST_INTENT=booking-benefit-locks, PGHOST, PGPORT, PGUSER,
// PGPASSWORD or XOOT_PG_PASSWORD_FILE. Optional XOOT_PG_MODULE resolves pg outside
// the repo; otherwise install pg in the runner. No dependencies are added here.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

assert.equal(process.env.XOOT_PG_TEST_INTENT, 'booking-benefit-locks', 'Explicit local test intent required');
assert.ok(['127.0.0.1', '::1'].includes(process.env.PGHOST), 'Literal loopback PGHOST required');
assert.ok(process.env.PGPORT && process.env.PGUSER, 'Explicit PGPORT and PGUSER required');
assert.ok(!process.env.PGSERVICE && !process.env.PGSERVICEFILE, 'PG service overrides prohibited');
const modulePath = process.env.XOOT_PG_MODULE;
const { default: pg } = await import(modulePath ? pathToFileURL(resolve(modulePath)).href : 'pg');
const settings = {
  host: process.env.PGHOST, port: Number(process.env.PGPORT), user: process.env.PGUSER,
  password: process.env.XOOT_PG_PASSWORD_FILE
    ? readFileSync(process.env.XOOT_PG_PASSWORD_FILE, 'utf8').trim() : process.env.PGPASSWORD,
  database: 'postgres', ssl: false, connectionTimeoutMillis: 15000,
  statement_timeout: 10000, query_timeout: 12000, application_name: 'xoot_synthetic_benefit_test',
};
assert.ok(settings.password, 'Explicit test password required');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const database = `xoot_test_benefits_${randomUUID().replaceAll('-', '')}`;
const admin = new pg.Client(settings);
const clients = [];
const createdRoles = [];
let created = false;
let count = 0;
let blockingProofs = 0;
const log = (name) => { count++; console.log(`ok ${count} - ${name}`); };
const sql = (path) => readFileSync(resolve(root, path), 'utf8');
const lockSql = 'select private.lock_booking_accounts($1::uuid[])';
const insertSql = `insert into public.xootcred_ledger(user_id,amount,direction,status,expires_at)
  values($1,$2,$3,$4,$5) returning id`;
const pending = (promise) => promise.then(value => ({ value }), error => ({ error }));
function success(result) { if (result.error) throw result.error; return result.value; }
function errorCode(result, code) { assert.equal(result.error?.code, code); }

try {
  console.log('# Connecting to the explicitly selected loopback test server');
  await admin.connect();
  const version = Number((await admin.query('show server_version_num')).rows[0].server_version_num);
  assert.ok(version >= 170000 && version < 180000, 'PostgreSQL 17 required');
  for (const role of ['anon','authenticated','service_role']) {
    if (!(await admin.query('select 1 from pg_roles where rolname=$1', [role])).rowCount) {
      // Static identifiers only; remember exactly which test roles we created.
      await admin.query(`create role ${role} nologin`);
      createdRoles.push(role);
    }
  }
  await admin.query(`create database "${database}"`);
  created = true;
  console.log('# Disposable database created; opening independent test sessions');
  for (let i = 0; i < 4; i++) {
    const client = new pg.Client({ ...settings, database });
    await client.connect(); clients.push(client);
  }
  const [observer, first, second, customer] = clients;
  const firstPid = Number((await first.query('select pg_backend_pid() pid')).rows[0].pid);
  const secondPid = Number((await second.query('select pg_backend_pid() pid')).rows[0].pid);
  await observer.query(sql('scripts/ops/fixtures/booking-benefit-locks.sql'));
  await observer.query(sql('supabase/migrations/20260815160000_xootcred_trigger_queries_a_dropped_table.sql'));
  await observer.query(`create trigger zootcred_balance_check before insert on public.xootcred_ledger
    for each row when(new.amount < 0 or new.direction='debit') execute function public.check_xootcred_balance()`);
  await first.query('set role service_role');
  await second.query('set role service_role');
  const entry = async (c, user, amount, direction='credit', status='available', expires=null) =>
    (await c.query(insertSql, [user,amount,direction,status,expires])).rows[0].id;
  const fresh = async (amount=0) => {
    const user = randomUUID();
    await observer.query('insert into auth.users(id) values($1)', [user]);
    if (amount) await entry(observer, user, amount);
    return user;
  };
  const balance = async user => Number((await observer.query(`select coalesce(sum(
    private.booking_credit_effect(amount,direction,status,expires_at,transaction_timestamp())),0) balance
    from public.xootcred_ledger where user_id=$1`, [user])).rows[0].balance);
  const blocked = async (pid=secondPid, blocker=firstPid) => {
    const deadline = Date.now() + 6000;
    while (Date.now() < deadline) {
      const { rows } = await observer.query(`select state,wait_event_type,pg_blocking_pids(pid) blockers
        from pg_stat_activity where pid=$1`, [pid]);
      if (rows[0]?.state === 'active' && rows[0].wait_event_type === 'Lock' && rows[0].blockers.includes(blocker)) {
        blockingProofs++; return;
      }
      // Poll cadence only: a pg_stat_activity/pg_blocking_pids observation is
      // mandatory. Elapsed time alone never counts as concurrency evidence.
      await delay(20);
    }
    throw new Error('Expected database lock blocker was not observed');
  };
  const holds = async (accounts, statement, params=[], expectedCode=null) => {
    await first.query('begin');
    await first.query(lockSql, [accounts]);
    await second.query('begin');
    const work = pending(second.query(statement, params));
    await blocked();
    await first.query('commit');
    const result = await work;
    if (expectedCode) errorCode(result, expectedCode); else success(result);
    await second.query(expectedCode ? 'rollback' : 'commit');
  };
  const rejects = async (statement, params=[], code='23514', client=second) => {
    errorCode(await pending(client.query(statement,params)), code);
  };

  const original = await fresh(100);
  await first.query('begin'); await second.query('begin');
  await entry(first, original,70,'debit');
  await entry(second,original,70,'debit');
  await first.query('commit'); await second.query('commit');
  assert.equal(Number((await observer.query(`select sum(case when direction='debit' then -amount else amount end) balance
    from public.xootcred_ledger where user_id=$1`,[original])).rows[0].balance), -40);
  log('original INSERT trigger permits both uncommitted R70 debits from R100, ending at -R40');

  const corruptHistory = await fresh();
  await entry(observer, corruptHistory, 'NaN');

  await observer.query(sql('supabase/migrations/20260929055022_booking_benefit_account_guards.sql'));
  const buyer = await fresh(100);
  await first.query('begin'); await second.query('begin');
  await entry(first,buyer,70,'debit');
  const losingDebit = pending(entry(second,buyer,70,'debit'));
  await blocked(); await first.query('commit');
  errorCode(await losingDebit,'23514'); await second.query('rollback');
  assert.equal(await balance(buyer),30);
  log('observed competing debit blocks, refreshes balance, rejects overspend; committed balance R30');

  const bulkInsertBuyer = await fresh(100);
  await rejects(`insert into public.xootcred_ledger(user_id,amount,direction,status)
    values($1,70,'debit','available'),($1,70,'debit','available')`, [bulkInsertBuyer]);
  assert.equal(await balance(bulkInsertBuyer), 100);
  assert.equal((await observer.query("select count(*) n from public.xootcred_ledger where user_id=$1 and direction='debit'", [bulkInsertBuyer])).rows[0].n, '0');
  log('bulk debit INSERT observes earlier rows and rolls back the whole statement on overspend');

  const bulkUpdateBuyer = await fresh(100);
  await entry(first, bulkUpdateBuyer, 70, 'debit', 'pending');
  await entry(first, bulkUpdateBuyer, 70, 'debit', 'pending');
  await rejects("update public.xootcred_ledger set status='available' where user_id=$1 and direction='debit'", [bulkUpdateBuyer]);
  assert.equal(await balance(bulkUpdateBuyer), 100);
  assert.equal((await observer.query("select count(*) n from public.xootcred_ledger where user_id=$1 and direction='debit' and status='pending'", [bulkUpdateBuyer])).rows[0].n, '2');
  log('bulk debit activation observes earlier rows and rolls back both status changes on overspend');

  const expiringBuyer = await fresh(100);
  await second.query('begin');
  await second.query('select transaction_timestamp()');
  await first.query('begin');
  await first.query('update public.xootcred_ledger set expires_at=clock_timestamp() where user_id=$1', [expiringBuyer]);
  const expiredWhileWaiting = pending(entry(second, expiringBuyer, 70, 'debit'));
  await blocked(); await first.query('commit');
  errorCode(await expiredWhileWaiting, '23514'); await second.query('rollback');
  assert.equal(await balance(expiringBuyer), 0);
  log('benefit expiry is checked after lock acquisition, not at an older transaction start');

  await rejects(insertSql, [buyer, 'NaN', 'credit', 'available', null]);
  log('non-finite active amounts cannot become spendable credit');
  await rejects(insertSql, [corruptHistory, 1, 'debit', 'available', null]);
  await first.query("update public.xootcred_ledger set status='cancelled' where user_id=$1", [corruptHistory]);
  assert.equal(await balance(corruptHistory), 0);
  log('corrupt historical money blocks new spending but permits inactive cleanup');

  const enough = await fresh(200);
  await first.query('begin'); await second.query('begin');
  await entry(first,enough,70,'debit');
  const fundedDebit = pending(entry(second,enough,70,'debit'));
  await blocked(); await first.query('commit'); success(await fundedDebit); await second.query('commit');
  assert.equal(await balance(enough),60); log('sufficient funds allow both serialized spends');

  const rollbackBuyer = await fresh(100);
  await first.query('begin'); await second.query('begin');
  await entry(first,rollbackBuyer,70,'debit');
  const rolledBackWaiter = pending(entry(second,rollbackBuyer,70,'debit'));
  await blocked(); await first.query('rollback'); success(await rolledBackWaiter); await second.query('commit');
  assert.equal(await balance(rollbackBuyer),30); log('rollback releases account guard and restores spendable funds');

  const independentA = await fresh(100), independentB = await fresh(100);
  await first.query('begin'); await entry(first,independentA,70,'debit');
  await second.query('begin'); await second.query("set local statement_timeout='1500ms'");
  await entry(second,independentB,70,'debit'); await second.query('commit');
  assert.equal((await observer.query('select state from pg_stat_activity where pid=$1',[firstPid])).rows[0].state,'idle in transaction');
  await first.query('rollback'); log('independent buyer commits while first buyer transaction remains open');

  // No signup/fresh(): this account must have neither a guard nor any ledger row.
  const empty = randomUUID();
  await first.query('begin'); await second.query('begin'); await entry(first,empty,100);
  const emptyWaiter = pending(entry(second,empty,70,'debit'));
  await blocked(); await first.query('commit'); success(await emptyWaiter); await second.query('commit');
  assert.equal(await balance(empty),30); log('empty account guard creation serializes first credit and concurrent debit');

  const updateBuyer = await fresh(100);
  const debitId = await entry(first,updateBuyer,70,'debit');
  await second.query('update public.xootcred_ledger set amount=90 where id=$1',[debitId]);
  assert.equal(await balance(updateBuyer),10); log('enlarging debit excludes old row instead of double-counting it');
  await rejects('update public.xootcred_ledger set amount=101 where id=$1',[debitId]);
  assert.equal(await balance(updateBuyer),10); log('enlarging debit beyond available total is rejected');
  const pendingId = await entry(first,updateBuyer,20,'debit','pending');
  await rejects("update public.xootcred_ledger set status='available' where id=$1",[pendingId]);
  log('activating previously pending debit rechecks spendable balance');
  const expiredDebit = await entry(first,updateBuyer,20,'debit','available','2000-01-01');
  await rejects('update public.xootcred_ledger set expires_at=null where id=$1',[expiredDebit]);
  log('reactivating expired debit rechecks spendable balance');
  const poorOwner = await fresh(5), richOwner = await fresh(100);
  await rejects('update public.xootcred_ledger set user_id=$1 where id=$2',[poorOwner,debitId]);
  await second.query('update public.xootcred_ledger set user_id=$1 where id=$2',[richOwner,debitId]);
  assert.equal(await balance(updateBuyer),100); assert.equal(await balance(richOwner),10);
  log('debit transfer rejects unfunded owner and accepts funded owner');
  const creditToDebit = await entry(first,updateBuyer,200);
  await rejects("update public.xootcred_ledger set direction='debit' where id=$1",[creditToDebit]);
  log('credit-to-debit conversion cannot use its own old credit to fund itself');

  const history = await fresh(100);
  const historicalDebit = await entry(first,history,70,'debit');
  await first.query("update public.xootcred_ledger set expires_at='2000-01-01' where user_id=$1 and direction='credit'",[history]);
  assert.equal(await balance(history),-70);
  await first.query("update public.xootcred_ledger set reason='cleanup',status='redeemed' where id=$1",[historicalDebit]);
  await first.query('update public.xootcred_ledger set amount=60 where id=$1',[historicalDebit]);
  await rejects(insertSql,[history,1,'debit','available',null]);
  await first.query("update public.xootcred_ledger set status='cancelled' where id=$1",[historicalDebit]);
  await first.query('delete from public.xootcred_ledger where user_id=$1',[history]);
  assert.equal(await balance(history),0); log('historically negative balance permits unchanged/reduced/inactive cleanup, rejects new spending');

  const legacy = await fresh();
  await entry(first,legacy,100,null); await entry(first,legacy,-70,null);
  await entry(first,legacy,999,'credit','pending'); await entry(first,legacy,999,'credit','expired');
  await entry(first,legacy,999,'credit','cancelled'); await entry(first,legacy,999,'credit','available','2000-01-01');
  await entry(first,legacy,999,'credit','redeemed');
  await entry(first,legacy,999,'debit','pending'); await entry(first,legacy,999,'debit','expired');
  assert.equal(await balance(legacy),30);
  await rejects(insertSql,[legacy,31,'debit','available',null]);
  await entry(first,legacy,30,'debit','redeemed'); assert.equal(await balance(legacy),0);
  log('signed legacy amounts, inactive/expired entries, redeemed debits and nonspendable redeemed typed credits');

  for (const isolation of ['repeatable read','serializable']) {
    const stale = await fresh(100);
    await second.query(`begin isolation level ${isolation}`);
    await second.query('select count(*) from public.xootcred_ledger where user_id=$1',[stale]);
    await first.query('begin'); await entry(first,stale,70,'debit');
    const staleWrite = pending(entry(second,stale,70,'debit'));
    await blocked(); await first.query('commit'); errorCode(await staleWrite,'40001');
    await second.query('rollback'); assert.equal(await balance(stale),30);
    log(`${isolation} stale snapshot aborts after competing guard version change`);
  }

  const owner = await fresh(), other = await fresh();
  const booking = (await first.query('insert into public.bookings(user_id) values($1) returning id',[owner])).rows[0].id;
  const subscription = (await first.query('insert into public.user_subscriptions(user_id) values($1) returning id',[owner])).rows[0].id;
  await holds([owner], "update public.user_subscriptions set status='paused' where id=$1",[subscription]);
  log('membership status mutation waits on buyer guard');
  await holds([owner], "update public.user_subscriptions set next_billing_at=now()-interval '1 day' where id=$1",[subscription]);
  log('membership expiry mutation waits on buyer guard');
  await holds([owner], 'update public.bookings set completed_at=now() where id=$1',[booking]);
  log('booking completion waits on buyer guard');
  await holds([other], 'update public.bookings set user_id=$1 where id=$2',[other,booking]);
  log('booking owner transfer includes new owner guard');
  await holds([owner], 'update public.referrals set code=$1 where user_id=$2',[randomUUID(),owner]);
  log('referral code mutation waits on owner guard');
  const redeemer = await fresh();
  await holds([owner], 'insert into public.referral_redemptions(referrer_user_id,referred_user_id) values($1,$2)',[owner,redeemer]);
  log('redemption insertion waits on referrer guard');
  await holds([redeemer], 'update public.referral_redemptions set rewarded=true where referred_user_id=$1',[redeemer]);
  log('redemption reward mutation waits on referred buyer guard');
  await holds([owner], 'delete from public.referral_redemptions where referred_user_id=$1',[redeemer]);
  log('redemption deletion waits on referrer guard');
  await holds([owner], 'delete from public.user_subscriptions where id=$1',[subscription]);
  log('membership deletion waits on buyer guard');
  await holds([other], 'delete from public.bookings where id=$1',[booking]);
  log('completed booking deletion waits on current owner guard');
  await holds([owner], 'delete from public.referrals where user_id=$1',[owner]);
  log('referral deletion waits on owner guard');

  // Prove sorting with a high UUID already held. A reversed/duplicated request
  // must acquire the low row BEFORE blocking on high; inspect its tuple lock.
  const low = '00000000-0000-4000-8000-000000000001';
  const high = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
  await observer.query(lockSql,[[low,high]]);
  await first.query('begin'); await first.query(lockSql,[[high]]);
  await second.query('begin');
  const sortedWait = pending(second.query(lockSql,[[high,low,high,null]]));
  await blocked();
  // A third writer can prove low was taken without seeing uncommitted versions.
  await customer.query('begin'); await customer.query('set local role service_role');
  const customerPid = Number((await customer.query('select pg_backend_pid() pid')).rows[0].pid);
  const lowWait = pending(customer.query(lockSql,[[low]]));
  await blocked(customerPid,secondPid);
  await first.query('commit'); success(await sortedWait); await second.query('commit');
  success(await lowWait); await customer.query('commit');
  log('distinct account set is sorted before acquisition, including reversed input and duplicates');

  const secure = await fresh();
  const ownBooking = (await first.query('insert into public.bookings(user_id) values($1) returning id',[secure])).rows[0].id;
  await customer.query('set role authenticated');
  await customer.query("select set_config('request.jwt.claim.sub',$1,false)",[secure]);
  await customer.query("update public.bookings set customer_note='allowed synthetic note' where id=$1",[ownBooking]);
  assert.equal((await observer.query('select customer_note from public.bookings where id=$1',[ownBooking])).rows[0].customer_note,'allowed synthetic note');
  log('column-scoped customer booking update still works through restricted trigger wrapper');
  await rejects('update public.bookings set completed_at=now() where id=$1',[ownBooking],'42501',customer);
  await rejects('insert into public.xootcred_ledger(user_id,amount) values($1,1)',[secure],'42501',customer);
  log('outer column grants and ledger write restrictions remain enforced');
  for (const role of ['anon','authenticated']) {
    await customer.query(`set role ${role}`);
    await rejects(lockSql,[[secure]],'42501',customer);
    await rejects('select * from private.booking_account_guards',[],'42501',customer);
    await rejects('insert into private.booking_account_guards(user_id) values($1)',[randomUUID()],'42501',customer);
    await rejects('select private.guard_booking_benefit_write()',[],'42501',customer);
    await rejects('select private.booking_credit_effect(1,null,null,null,now())',[],'42501',customer);
    for (const table of ['xootcred_ledger','user_subscriptions','referral_redemptions','referrals','bookings']) {
      await rejects(`truncate public.${table} cascade`,[],'42501',customer);
      assert.equal((await observer.query('select has_table_privilege($1,$2,$3) permitted',[role,`public.${table}`,'TRIGGER'])).rows[0].permitted,false);
    }
    log(`${role} denied direct private helpers/table and all benefit TRUNCATE/TRIGGER privileges`);
  }
  await first.query(lockSql,[[secure]]);
  await rejects('select private.guard_booking_benefit_write()',[],'42501',first);
  for (const table of ['xootcred_ledger','user_subscriptions','referral_redemptions','referrals','bookings']) {
    await rejects(`truncate public.${table} cascade`,[],'42501',first);
  }
  log('service can explicitly lock but cannot invoke wrapper or bypass guards with TRUNCATE');
  const signup = randomUUID();
  await observer.query('insert into auth.users(id) values($1)',[signup]);
  assert.equal((await observer.query('select count(*) n from public.referrals where user_id=$1',[signup])).rows[0].n,'1');
  assert.equal((await observer.query('select count(*) n from private.booking_account_guards where user_id=$1',[signup])).rows[0].n,'1');
  log('auth owner-context signup trigger creates referral and account guard without new customer grants');

  assert.ok(blockingProofs >= 17, 'Every intended blocked operation must have database evidence');
  assert.equal(count,39, 'All required scenarios must execute');
  console.log(JSON.stringify({ status:'passed', postgresVersion:version, tests:count, observedBlockingBarriers:blockingProofs, syntheticOnly:true }));
} finally {
  await Promise.all(clients.map(async client => {
    await client.query('rollback').catch(() => {});
    await client.end();
  }));
  if (created && /^xoot_test_benefits_[0-9a-f]{32}$/.test(database)) {
    await admin.query(`drop database "${database}"`);
  }
  for (const role of createdRoles.reverse()) await admin.query(`drop role ${role}`);
  await admin.end();
}
