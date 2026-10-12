#!/usr/bin/env node
// Actual PostgreSQL 17, independent sessions, observed lock barriers. Synthetic
// schema only; the calculator/guards/writer come from the real migrations.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
assert.equal(process.env.XOOT_PG_TEST_INTENT,'reviewed-booking-transaction');
assert.ok(['127.0.0.1','::1'].includes(process.env.PGHOST),'Literal loopback required');
assert.ok(process.env.PGPORT && process.env.PGUSER);
assert.ok(!process.env.PGSERVICE && !process.env.PGSERVICEFILE);
const { default: pg }=await import(process.env.XOOT_PG_MODULE ? pathToFileURL(resolve(process.env.XOOT_PG_MODULE)).href : 'pg');
const settings={host:process.env.PGHOST,port:Number(process.env.PGPORT),user:process.env.PGUSER,
  password:process.env.XOOT_PG_PASSWORD_FILE ? readFileSync(process.env.XOOT_PG_PASSWORD_FILE,'utf8').trim() : process.env.PGPASSWORD,
  database:'postgres',ssl:false,connectionTimeoutMillis:15000,statement_timeout:12000,query_timeout:15000,
  application_name:'xoot_synthetic_reviewed_booking_test'};
assert.ok(settings.password,'Explicit test password required');
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const sql=p=>readFileSync(resolve(root,p),'utf8');
const database=`xoot_test_writer_${randomUUID().replaceAll('-','')}`;
const admin=new pg.Client(settings), clients=[], createdRoles=[];
let created=false,count=0,barriers=0,passed=false,initialRoles=null;
const roleSnapshot=async()=> (await admin.query(`select oid,rolname,rolsuper,rolinherit,rolcreaterole,rolcreatedb,
  rolcanlogin,rolreplication,rolbypassrls from pg_roles where rolname=any($1) order by rolname`,
  [['anon','authenticated','service_role',settings.user]])).rows;
const log=name=>{count++;console.log(`ok ${count} - ${name}`);};
const rpc='select public.create_reviewed_booking($1::uuid,$2::uuid,$3::jsonb,$4::jsonb,$5::text) result';
const pending=p=>p.then(value=>({value}),error=>({error}));
const success=r=>{if(r.error) throw r.error; return r.value;};
const input={contractVersion:1,service:'airbnb',propertyType:'airbnb',homeSize:'large',hours:5.5,crewSize:2,
  addOns:[],linen:'none',date:'2099-10-12',time:'08:00',frequency:'once',repeatDays:[],referralCode:'',requestedCreditCents:0,coverRequested:false};
const booking={selectedXooterIds:[],householdProfileId:null,propertyAccountId:null,address:'Sandton synthetic fixture',instructions:''};
const surfaces=['public.bookings','public.booking_crew_slots','public.payment_records','public.booking_status_events',
  'public.referral_redemptions','public.xootcred_ledger','public.recurring_schedules','public.admin_review_queue',
  'public.integration_outbox','public.admin_audit_log','private.booking_creation_attempts'];
try {
  await admin.connect();
  initialRoles=await roleSnapshot();
  const version=Number((await admin.query('show server_version_num')).rows[0].server_version_num);
  assert.ok(version>=170000 && version<180000);
  for(const role of ['anon','authenticated','service_role']) {
    if(!(await admin.query('select 1 from pg_roles where rolname=$1',[role])).rowCount) {
      await admin.query(`create role ${role} nologin`); createdRoles.push(role);
    }
  }
  await admin.query(`create database "${database}"`); created=true;
  for(let i=0;i<4;i++){const c=new pg.Client({...settings,database});await c.connect();clients.push(c);}
  const [observer,first,second,customer]=clients;
  const pid=async c=>Number((await c.query('select pg_backend_pid() pid')).rows[0].pid);
  const firstPid=await pid(first),secondPid=await pid(second);
  await observer.query(sql('scripts/ops/fixtures/booking-benefit-locks.sql'));
  await observer.query(sql('scripts/ops/fixtures/reviewed-booking-transaction.sql'));
  await observer.query(sql('supabase/migrations/20260809120000_booking_commission_rate.sql'));
  await observer.query(sql('supabase/migrations/20260815160000_xootcred_trigger_queries_a_dropped_table.sql'));
  await observer.query(`create trigger zootcred_balance_check before insert on public.xootcred_ledger
    for each row when(new.amount<0 or new.direction='debit') execute function public.check_xootcred_balance()`);
  await observer.query(sql('supabase/migrations/20260903120000_zd035_crew_and_zd036_referrals.sql'));
  await observer.query(sql('supabase/migrations/20260928003000_booking_quote_calculator.sql'));
  await observer.query(sql('supabase/migrations/20260929055022_booking_benefit_account_guards.sql'));
  const historicalUser=randomUUID();await observer.query('insert into auth.users values($1)',[historicalUser]);
  const historical=(await observer.query(`insert into public.bookings(user_id,price,duration_hours,commission_rate_bps)
    values($1,342,5.5,3250) returning *`,[historicalUser])).rows[0];
  await observer.query(sql('supabase/migrations/20261012120000_reviewed_booking_transaction.sql'));
  await first.query('set role service_role');await second.query('set role service_role');
  const fresh=async(amount=0)=>{
    const user=randomUUID();await observer.query('insert into auth.users values($1)',[user]);
    if(amount) await observer.query("insert into public.xootcred_ledger(user_id,amount,direction,status) values($1,$2,'credit','available')",[user,amount]);
    return user;
  };
  const make=async(user,changes={},details={})=>{
    const i={...input,...changes},b={...booking,...details};
    const quote=(await observer.query(`select private.calculate_booking_quote_v1($1,private.booking_quote_facts_v1($2,$3,clock_timestamp())) q`,
      [i,user,i.referralCode])).rows[0].q;
    return {user,key:randomUUID(),definition:{input:i,booking:b},quote:{...quote,fingerprint:'a'.repeat(64)},service:quote.service};
  };
  const args=a=>[a.user,a.key,a.definition,a.quote,a.service];
  const create=async(a,c=first)=>(await c.query(rpc,args(a))).rows[0].result;
  const totals=async()=>Promise.all(surfaces.map(async t=>Number((await observer.query(`select count(*) n from ${t}`)).rows[0].n)));
  const zeroWrite=async(action)=>{const before=await totals();const result=await action();assert.deepEqual(await totals(),before);return result;};
  const blocked=async()=>{
    const deadline=Date.now()+6000;
    while(Date.now()<deadline){
      const r=(await observer.query('select state,wait_event_type,pg_blocking_pids(pid) blockers from pg_stat_activity where pid=$1',[secondPid])).rows[0];
      if(r?.state==='active' && r.wait_event_type==='Lock' && r.blockers.includes(firstPid)){barriers++;return;}
      await delay(20);
    }
    throw new Error('Expected database lock barrier not observed');
  };
  const reject=async(a,code='22023')=>zeroWrite(async()=>{
    const r=await pending(create(a));assert.equal(r.error?.code,code);return r;
  });
  const one=await make(await fresh());const createdOne=await create(one);
  assert.equal(createdOne.status,'created');assert.equal(createdOne.acceptedQuote.baseCents,39300);assert.equal(createdOne.acceptedQuote.bookingFeeCents,3900);assert.equal(createdOne.acceptedQuote.totalCents,43200);
  const row=(await observer.query('select * from public.bookings where id=$1',[createdOne.bookingId])).rows[0];
  assert.equal(Number(row.price),393);assert.equal(Number(row.duration_hours),3);assert.equal(Number(row.solo_hours),5.5);
  assert.equal(row.xooter_id,null);assert.equal(row.commission_rate_bps,null);
  assert.equal((await observer.query('select amount from public.payment_records where id=$1',[createdOne.paymentRecordId])).rows[0].amount,'432.00');
  assert.equal(Number((await observer.query('select sum(gross_cents) s from public.booking_crew_slots where booking_id=$1',[row.id])).rows[0].s),39300);
  assert.equal((await observer.query('select count(*) n from public.booking_assignees')).rows[0].n,'0');
  log('R393+R39 creates one draft/obligation, elapsed 3h, solo 5.5h, honest two empty slots and no assignments');
  for(const crew of [1,2,3,4]) {
    const a=await make(await fresh(),{crewSize:crew,addOns:['clean_appliances'],linen:'wash_dry_repack'});const r=await create(a);
    const slots=(await observer.query('select slot_no,gross_cents from public.booking_crew_slots where booking_id=$1 order by slot_no',[r.bookingId])).rows;
    assert.equal(slots.length,crew);assert.equal(slots.reduce((n,s)=>n+Number(s.gross_cents),0),a.quote.baseCents+a.quote.addOnsCents);
    log(`crew ${crew} extras/linen preserve fixed gross allocations without invented commission/net`);
  }
  for(const crew of [1,2,3,4]) {
    const values=[];for(let slot=1;slot<=crew;slot++)values.push(Number((await first.query('select private.booking_slot_gross_v1(10001,$1,$2) g',[crew,slot])).rows[0].g));
    assert.equal(values.reduce((a,b)=>a+b,0),10001);assert.ok(values[0]>=values.at(-1));
  }
  log('odd cents allocate deterministically over crews 1–4 with stable slot remainder');
  const beforeHistorical={...historical}; const afterHistorical=(await observer.query('select * from public.bookings where id=$1',[historical.id])).rows[0];
  for(const k of Object.keys(beforeHistorical))assert.deepEqual(afterHistorical[k],beforeHistorical[k]);
  assert.equal(afterHistorical.contract_version,null);assert.equal(afterHistorical.crew_size,1);
  log('historical solo money, duration, commission and original fields unchanged');
  const benefitBuyer=await fresh(200),referrer=await fresh();
  await observer.query("update public.referrals set code='WRITER_REF' where user_id=$1",[referrer]);
  await observer.query("insert into public.user_subscriptions(user_id,next_billing_at) values($1,now()+interval '1 day')",[benefitBuyer]);
  const benefit=await make(benefitBuyer,{referralCode:'WRITER_REF',requestedCreditCents:7000,frequency:'weekly',repeatDays:[1,3]});
  const benefitResult=await create(benefit);
  assert.equal(benefit.quote.carePlusMember,true);assert.equal(benefit.quote.referralDiscountCents,10000);assert.equal(benefit.quote.creditUsedCents,7000);
  const pref=(await observer.query('select * from public.recurring_schedules where source_booking_id=$1',[benefitResult.bookingId])).rows[0];
  assert.equal(pref.cadence_days,7);assert.deepEqual(pref.repeat_days,[1,3]);assert.equal(pref.status,'preferences_only');assert.equal(pref.xooter_id,null);
  assert.equal((await observer.query('select rewarded,credit_cents from public.referral_redemptions where booking_id=$1',[benefitResult.bookingId])).rows[0].rewarded,false);
  log('membership+R100 referral+credit atomic; weekly preferences preserved; referrer reward waits for paid completion');
  for(const member of [false,true])for(const referral of [false,true])for(const credit of [0,7000]) {
    const u=await fresh(200);
    if(member)await observer.query("insert into public.user_subscriptions(user_id,next_billing_at) values($1,now()+interval '1 day')",[u]);
    const a=await make(u,{referralCode:referral?'WRITER_REF':'',requestedCreditCents:credit});const r=await create(a);
    assert.equal(a.quote.totalCents,(member?35400:43200)-(referral?10000:0)-credit);
    assert.equal(Number((await observer.query('select sum(gross_cents) s from public.booking_crew_slots where booking_id=$1',[r.bookingId])).rows[0].s),39300);
    log(`benefit combination membership=${member}, referral=${referral}, credit=${credit} keeps full R393 allocated work`);
  }
  const fortnight=await make(await fresh(),{frequency:'fortnightly',repeatDays:[1]});const fr=await create(fortnight);
  assert.equal((await observer.query('select cadence_days from public.recurring_schedules where source_booking_id=$1',[fr.bookingId])).rows[0].cadence_days,14);
  log('fortnightly cadence stays 14, separate from weekly 7');
  const highDemand=await make(await fresh(),{service:'express',propertyType:'flat',hours:1,crewSize:1,linen:null,time:'16:00'});
  const highResult=await create(highDemand);
  assert.equal(highDemand.quote.highDemandCents,3300);
  assert.equal(Number((await observer.query('select sum(gross_cents) s from public.booking_crew_slots where booking_id=$1',[highResult.bookingId])).rows[0].s),22000);
  assert.equal(Number((await observer.query('select high_demand_premium from public.bookings where id=$1',[highResult.bookingId])).rows[0].high_demand_premium),33);
  log('high-demand premium stored separately and excluded from work allocation, preserving current payout treatment');
  const worker=randomUUID();await observer.query('insert into public.xooters(id) values($1)',[worker]);
  for(const crew of [1,2,4]) {
    const a=await make(await fresh(),{crewSize:crew},{selectedXooterIds:[worker]});
    assert.deepEqual(await zeroWrite(()=>create(a)),{status:'assignment_unavailable',reason:'reservation_policy_unavailable'});
  }
  log('selected/full and partial rosters fail closed with precise policy reason, zero booking/money/benefit effects');
  await observer.query('update public.xooters set active=false where id=$1',[worker]);
  const inactive=await make(await fresh(),{}, {selectedXooterIds:[worker]});
  assert.deepEqual(await zeroWrite(()=>create(inactive)),{status:'assignment_unavailable',reason:'worker_unavailable'});
  log('inactive selected worker rejected under stable worker lock');
  const tamper=await make(await fresh());
  for(const field of ['baseCents','addOnsCents','highDemandCents','bookingFeeCents','coverCents','carePlusDiscountCents','referralDiscountCents','creditUsedCents','totalCents','pricingVersion','lines','carePlusMember','referral','serviceCorrection','unexpected']){
    const a=structuredClone(tamper);a.quote[field]=typeof a.quote[field]==='number'?a.quote[field]+1:'tampered';
    assert.equal((await zeroWrite(()=>create(a))).status,'quote_changed');
  }
  log('complete accepted quote tampering in 15 fields requotes with zero effects');
  for(const change of [a=>{a.service='office';},a=>{a.definition.input.date='2020-01-01';},a=>{a.definition.input.time='14:00';a.definition.input.hours=8;},
    a=>{a.definition.booking.address='Outside launch';},a=>{a.definition.booking.householdProfileId=randomUUID();},
    a=>{a.definition.booking.propertyAccountId=randomUUID();},a=>{a.definition.input.buyerId=randomUUID();},
    a=>{a.definition.booking.selectedXooterIds=[worker,worker];},a=>{a.quote.fingerprint='invalid';},
    a=>{a.definition.booking.instructions='\nnot normalized';},
    a=>{a.definition.booking.address='Sandton '+String.fromCodePoint(0x1f642).repeat(120);},
    a=>{a.definition.booking.address='Sandton\u00a0fixture';}]) {
    const a=structuredClone(tamper);change(a);await reject(a);
  }
  log('service/schedule/end-of-day/coverage/ownership/unknown-input/duplicate-roster/fingerprint validation has zero effects');
  const h=randomUUID(),p=randomUUID();await observer.query('insert into public.household_profiles values($1,$2)',[h,tamper.user]);
  await observer.query('insert into public.property_accounts(id,user_id) values($1,$2)',[p,tamper.user]);
  const owned=await make(tamper.user,{}, {householdProfileId:h,propertyAccountId:p});await create(owned);
  const wrongOwner=await make(await fresh(),{}, {householdProfileId:h,propertyAccountId:p});await reject(wrongOwner);
  log('owned household/property accepted and unrelated ownership rejected');
  const replay=await zeroWrite(()=>create(one));assert.deepEqual(replay,{...createdOne,status:'replayed'});
  await observer.query("insert into public.user_subscriptions(user_id,next_billing_at) values($1,now()+interval '1 day')",[one.user]);
  assert.deepEqual(await zeroWrite(()=>create(one)),replay);
  for(const field of ['definition','quote','service']){
    const a=structuredClone(one);if(field==='definition')a.definition.booking.instructions='changed';if(field==='quote')a.quote.fingerprint='b'.repeat(64);if(field==='service')a.service='office';
    assert.equal((await zeroWrite(()=>create(a))).status,'request_key_reused');
  }
  const other=await make(await fresh());other.key=one.key;const otherResult=await create(other);assert.notEqual(otherResult.bookingId,createdOne.bookingId);
  log('lost-response replay is exact after membership change; definition/quote/service reuse conflicts; another buyer never replays IDs');
  const calculatorDefinition=(await observer.query("select pg_get_functiondef('private.calculate_booking_quote_v1(jsonb,jsonb)'::regprocedure) d")).rows[0].d;
  await observer.query(`create or replace function private.calculate_booking_quote_v1(p_input jsonb,p_facts jsonb) returns jsonb
    language plpgsql immutable security invoker set search_path='' as $$begin raise exception 'simulated pricing version retirement';end$$`);
  assert.deepEqual(await zeroWrite(()=>create(one)),replay);
  await observer.query(calculatorDefinition);
  log('committed attempt replays even when current pricing calculator rejects all new attempts');
  await observer.query(`create function public.synthetic_writer_fail() returns trigger language plpgsql as $$begin raise exception 'injected mandatory failure';end$$`);
  const failBuyer=await fresh(500);await observer.query("insert into public.user_subscriptions(user_id,next_billing_at) values($1,now()+interval '1 day')",[failBuyer]);
  const failure=await make(failBuyer,{referralCode:'WRITER_REF',requestedCreditCents:7000,frequency:'weekly',repeatDays:[1]});
  for(const table of surfaces){
    await observer.query(`create trigger synthetic_fail before insert on ${table} for each row execute function public.synthetic_writer_fail()`);
    await reject(failure,'P0001');
    await observer.query(`drop trigger synthetic_fail on ${table}`);
    log(`${table} mandatory insert failure rolls back every creation surface`);
  }
  const retry=await create(failure);assert.equal(retry.status,'created');assert.equal((await zeroWrite(()=>create(failure))).status,'replayed');
  log('same request retry after failures creates exactly once');
  const dup=await make(await fresh());await first.query('begin');const dupFirst=await create(dup);
  await second.query('begin');const dupWork=pending(create(dup,second));await blocked();await first.query('commit');
  const dupSecond=success(await dupWork);assert.deepEqual(dupSecond,{...dupFirst,status:'replayed'});await second.query('commit');
  log('duplicate attempt waits on observed request barrier; one creation, stable same IDs');
  const concurrentBuyer=await fresh();const ca=await make(concurrentBuyer,{referralCode:'WRITER_REF'}),cb=await make(concurrentBuyer,{referralCode:'WRITER_REF'});
  await first.query('begin');await create(ca);await second.query('begin');const competing=pending(create(cb,second));await blocked();await first.query('commit');
  assert.equal(success(await competing).status,'quote_changed');await second.query('commit');
  assert.equal((await observer.query('select count(*) n from public.bookings where user_id=$1',[concurrentBuyer])).rows[0].n,'1');
  log('first-referral race waits on observed account barrier; loser requotes without orphan booking');
  const spender=await fresh(100);const sa=await make(spender,{requestedCreditCents:7000}),sb=await make(spender,{requestedCreditCents:7000});
  await first.query('begin');await create(sa);await second.query('begin');const spending=pending(create(sb,second));await blocked();await first.query('commit');
  assert.equal(success(await spending).status,'quote_changed');await second.query('commit');
  assert.equal((await observer.query("select count(*) n from public.xootcred_ledger where user_id=$1 and direction='debit'",[spender])).rows[0].n,'1');
  log('simultaneous credit spends serialize; second requotes, only one debit commits');
  for(const mutation of ['credit','membership','expiry']) {
    const u=await fresh(100);await observer.query("insert into public.user_subscriptions(user_id,next_billing_at) values($1,now()+interval '1 day')",[u]);
    const a=await make(u,{requestedCreditCents:7000});
    await first.query('begin');await first.query('select private.lock_booking_accounts($1)',[[u]]);
    await second.query('begin');await second.query('select transaction_timestamp()');const wait=pending(create(a,second));await blocked();
    if(mutation==='credit')await first.query("insert into public.xootcred_ledger(user_id,amount,direction,status) values($1,80,'debit','redeemed')",[u]);
    if(mutation==='membership')await first.query("update public.user_subscriptions set status='cancelled' where user_id=$1",[u]);
    if(mutation==='expiry')await first.query('update public.xootcred_ledger set expires_at=clock_timestamp() where user_id=$1',[u]);
    await first.query('commit');assert.equal(success(await wait).status,'quote_changed');await second.query('commit');
    assert.equal((await observer.query('select count(*) n from public.bookings where user_id=$1',[u])).rows[0].n,'0');
    log(`${mutation} mutation while writer waits refreshes facts at a fresh clock and writes no booking`);
  }
  const rollback=await make(await fresh());await first.query('begin');await create(rollback);await second.query('begin');const rollbackWait=pending(create(rollback,second));await blocked();await first.query('rollback');
  assert.equal(success(await rollbackWait).status,'created');await second.query('commit');
  log('rolled-back creator releases request barrier; waiting same-key retry creates once');
  const held=await make(await fresh()),independent=await make(await fresh());await first.query('begin');await create(held);
  await second.query('begin');await second.query("set local statement_timeout='1500ms'");assert.equal((await create(independent,second)).status,'created');await second.query('commit');await first.query('rollback');
  log('unrelated booking progresses while other buyer transaction is held');
  const movingOwner=await fresh(),movingBuyer=await fresh();await observer.query("update public.referrals set code='MOVE_REF' where user_id=$1",[movingOwner]);
  const moving=await make(movingBuyer,{referralCode:'MOVE_REF'});await first.query('begin');await first.query('select private.lock_booking_accounts($1)',[[movingBuyer,movingOwner]]);
  await second.query('begin');const movingWait=pending(create(moving,second));await blocked();
  await first.query('update public.referrals set user_id=$1 where user_id=$2',[randomUUID(),movingOwner]);await first.query('commit');
  assert.equal((await movingWait).error?.code,'40001');await second.query('rollback');
  assert.equal((await observer.query('select count(*) n from public.bookings where user_id=$1',[movingBuyer])).rows[0].n,'0');
  const movedCurrent=await make(movingBuyer,{referralCode:'MOVE_REF'});assert.equal((await create(movedCurrent)).status,'created');
  log('referral owner change behind barrier aborts 40001 without adding out-of-order guard; whole transaction retry succeeds');
  const unknownBuyer=await fresh(),codeOwner=await fresh();
  const unknown=await make(unknownBuyer,{referralCode:'FUTURE_REF'});
  await first.query('begin');const unknownResult=await create(unknown);
  await second.query('begin');const codeCreation=pending(second.query("update public.referrals set code='FUTURE_REF' where user_id=$1",[codeOwner]));
  await blocked();await first.query('commit');success(await codeCreation);await second.query('commit');
  assert.equal(unknownResult.acceptedQuote.referral.status,'unknown_code');
  assert.equal((await observer.query('select count(*) n from public.referral_redemptions where booking_id=$1',[unknownResult.bookingId])).rows[0].n,'0');
  log('absent referral code serialized against new ownership; accepted no-discount quote stays stable until commit');
  const serial=await make(await fresh());await second.query('begin isolation level repeatable read');await second.query('select count(*) from private.booking_account_guards');
  await first.query('select private.lock_booking_accounts($1)',[[serial.user]]);
  assert.equal((await pending(create(serial,second))).error?.code,'40001');await second.query('rollback');
  assert.equal((await create(serial)).status,'created');log('stale higher-isolation account snapshot aborts 40001; fresh retry succeeds');
  const codeSnapshotBuyer=await fresh(),codeSnapshotOwner=await fresh();
  const codeSnapshot=await make(codeSnapshotBuyer,{referralCode:'SNAPSHOT_REF'});
  await second.query('begin isolation level repeatable read');await second.query('select count(*) from private.booking_referral_code_guards');
  await first.query("update public.referrals set code='SNAPSHOT_REF' where user_id=$1",[codeSnapshotOwner]);
  assert.equal((await pending(create(codeSnapshot,second))).error?.code,'40001');await second.query('rollback');
  assert.equal((await observer.query('select count(*) n from public.bookings where user_id=$1',[codeSnapshotBuyer])).rows[0].n,'0');
  log('obsolete absent-code snapshot aborts 40001 through version-changing code guard');
  for(const role of ['anon','authenticated']) {
    await customer.query(`set role ${role}`);
    assert.equal((await pending(create(one,customer))).error?.code,'42501');
    for(const t of ['public.booking_assignees','public.booking_crew_slots','private.booking_creation_attempts','private.booking_referral_code_guards'])assert.equal((await pending(customer.query(`select * from ${t}`))).error?.code,'42501');
    assert.equal((await pending(customer.query('select private.booking_quote_facts_v1($1,$2,clock_timestamp())',[one.user,'']))).error?.code,'42501');
    assert.equal((await pending(customer.query('select private.lock_booking_referral_codes($1)',[['WRITER_REF']]))).error?.code,'42501');
    log(`${role} cannot execute writer or read assignment/slot finances or committed attempts despite broad fixture defaults`);
  }
  assert.equal((await pending(first.query('update public.bookings set price=1 where id=$1',[createdOne.bookingId]))).error?.code,'23514');
  assert.equal((await pending(first.query('update public.payment_records set amount=1 where id=$1',[createdOne.paymentRecordId]))).error?.code,'23514');
  log('reviewed booking and primary payment money are immutable after acceptance');
  assert.equal((await pending(first.query('insert into public.booking_crew_slots values($1,3,1,1)',[createdOne.bookingId]))).error?.code,'23514');
  assert.equal((await pending(first.query('update public.booking_crew_slots set gross_cents=1 where booking_id=$1',[createdOne.bookingId]))).error?.code,'42501');
  assert.equal((await pending(first.query('delete from public.booking_crew_slots where booking_id=$1',[createdOne.bookingId]))).error?.code,'42501');
  log('service cannot overfill slots or mutate accepted allocation cents');
  assert.equal((await observer.query("select count(*) n from public.integration_outbox where status<>'needs_approval'")).rows[0].n,'0');
  assert.equal((await observer.query('select count(*) n from public.booking_assignees')).rows[0].n,'0');
  assert.equal((await observer.query('select count(*) n from public.xooter_jobs')).rows[0].n,'0');
  assert.ok(barriers>=9,'Every expected wait requires observed lock evidence');
  assert.equal(count,53,'All required transaction scenarios must execute');
  passed=true;
  console.log(JSON.stringify({status:'passed',postgresVersion:version,tests:count,observedBlockingBarriers:barriers,syntheticOnly:true,selectedRosterPolicyGate:true}));
} finally {
  await Promise.all(clients.map(async c=>{await c.query('rollback').catch(()=>{});await c.end();}));
  if(created && /^xoot_test_writer_[0-9a-f]{32}$/.test(database))await admin.query(`drop database "${database}"`);
  for(const role of createdRoles.reverse())await admin.query(`drop role ${role}`);
  if(initialRoles)assert.deepEqual(await roleSnapshot(),initialRoles,'Preexisting role identities/attributes must survive unchanged');
  if(created) {
    assert.equal((await admin.query('select count(*) n from pg_database where datname=$1',[database])).rows[0].n,'0');
    console.log(JSON.stringify({cleanup:'verified',ownedDatabaseRemoved:true,preexistingRolesPreserved:true,passed}));
  }
  await admin.end();
}
