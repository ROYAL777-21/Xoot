#!/usr/bin/env node
// Actual PostgreSQL 17 privilege/trigger checks against a synthetic loopback DB.
// pg_cron is absent from postgres:17, so the cron installation footer is tested
// structurally and excluded from this isolated database's execution.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

assert.equal(process.env.XOOT_PG_TEST_INTENT, 'private-live-gps');
assert.ok(['127.0.0.1', '::1'].includes(process.env.PGHOST), 'loopback DB only');
assert.ok(/^\d+$/.test(process.env.PGPORT ?? '') && process.env.PGUSER && process.env.PGPASSWORD);
assert.ok(!process.env.PGSERVICE && !process.env.PGSERVICEFILE && process.env.XOOT_PG_MODULE);
const { default: pg } = await import(pathToFileURL(resolve(process.env.XOOT_PG_MODULE)).href);
const config = { host:process.env.PGHOST,port:Number(process.env.PGPORT),
  user:process.env.PGUSER,password:process.env.PGPASSWORD,database:'postgres',
  ssl:false,connectionTimeoutMillis:12000,statement_timeout:10000 };
const original = readFileSync(new URL('../../supabase/migrations/20261016234838_xoot_job_live_positions_private.sql',import.meta.url),'utf8');
assert.match(original,/pg_cron must be installed for short-lived GPS retention/);
assert.match(original,/perform cron\.schedule\(/);
assert.match(original,/delete from public\.xoot_job_live_positions where expires_at <= now\(\)/);
const footer=original.indexOf('do $xoot_cleanup$');
assert.ok(footer>0 && original.trimEnd().endsWith('commit;'));
const ddl=original.slice(0,footer)+'\ncommit;\n';

const admin=new pg.Client(config);
const dbname='xoot_gps_'+randomUUID().replaceAll('-','');
const roles=[];
let db,created=false,checks=0;
const ok=label=>console.log('ok '+(++checks)+' - '+label);
const ids=['00000001','00000002','00000003','00000004','00000005','00000006','00000007','00000008']
  .map(i=>i+'-1111-4111-8111-111111111111');
const [workerA,workerB,bookingA,bookingB,bookingC,jobA,jobB,jobC]=ids;
const count=async id=>Number((await db.query(
  'select count(*)::int as n from public.xoot_job_live_positions where booking_id=$1',[id])).rows[0].n);
const fix=async(id,worker,age=0)=>db.query(
  "insert into public.xoot_job_live_positions(booking_id,xooter_id,latitude,longitude,accuracy_m,recorded_at,expires_at) values($1,$2,-26.1,28.04,10,now()-($3*interval '1 second'),now()+interval '45 seconds')",
  [id,worker,age]);
try {
  await admin.connect();
  const version=Number((await admin.query('show server_version_num')).rows[0].server_version_num);
  assert.ok(version>=170000&&version<180000);
  for(const role of ['anon','authenticated','service_role']){
    if(!(await admin.query('select 1 from pg_roles where rolname=$1',[role])).rowCount){
      await admin.query('create role '+role+' nologin '+(role==='service_role'?'bypassrls':'nobypassrls'));
      roles.push(role);
    }
  }
  await admin.query('create database "'+dbname+'"');created=true;
  db=new pg.Client({...config,database:dbname});await db.connect();
  await db.query('create schema private');
  await db.query("create table public.xooters(id uuid primary key,active boolean not null default true,background_check_status text not null default 'approved')");
  await db.query("create table public.bookings(id uuid primary key,xooter_id uuid,status text not null,cancelled_at timestamptz,completed_at timestamptz,sensitive_data_revoked_at timestamptz)");
  await db.query('create table public.xooter_jobs(id uuid primary key,booking_id uuid not null,xooter_id uuid not null,state text not null)');
  await db.query(ddl);
  await db.query('grant select, update on table public.bookings, public.xooters, public.xooter_jobs to service_role');
  ok('actual PostgreSQL accepts private GPS table and both trigger functions');
  const q=async sql=>(await db.query(sql)).rows[0];
  assert.equal((await q("select relrowsecurity from pg_class where oid='public.xoot_job_live_positions'::regclass")).relrowsecurity,true);
  assert.equal((await q("select count(*)::int as n from pg_policies where schemaname='public' and tablename='xoot_job_live_positions'")).n,0);
  for(const role of ['anon','authenticated']){
    for(const privilege of ['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']){
      const check=await db.query("select has_table_privilege($1,'public.xoot_job_live_positions',$2) as yes",[role,privilege]);
      assert.equal(check.rows[0].yes,false,role+' '+privilege);
    }
    await db.query('begin');await db.query('set local role '+role);
    await assert.rejects(db.query('select * from public.xoot_job_live_positions'),e=>e.code==='42501');
    await db.query('rollback');
  }
  assert.equal((await q("select has_table_privilege('service_role','public.xoot_job_live_positions','SELECT,INSERT,UPDATE,DELETE') as yes")).yes,true);
  ok('zero public RLS policies, client SELECT/TRUNCATE denied and service grants retained');
  await db.query('insert into public.xooters(id) values($1),($2)',[workerA,workerB]);
  await db.query("insert into public.bookings(id,xooter_id,status) values($1,$2,'en_route'),($3,$4,'en_route'),($5,$2,'en_route')",
    [bookingA,workerA,bookingB,workerB,bookingC]);
  await db.query("insert into public.xooter_jobs(id,booking_id,xooter_id,state) values($1,$2,$3,'accepted'),($4,$5,$6,'accepted')",
    [jobA,bookingA,workerA,jobB,bookingB,workerB]);
  // Prove the actual SQL RPC is available only to service_role and enforces
  // simultaneous report throttling and owner/booking checks atomically.
  const rpc='select public.xoot_publish_private_job_location($1,$2,$3,$4,$5,$6) as saved';
  for(const role of ['anon','authenticated']){
    const p=await db.query("select has_function_privilege($1,'public.xoot_publish_private_job_location(uuid,uuid,numeric,numeric,numeric,timestamptz)','EXECUTE') as permitted",[role]);
    assert.equal(p.rows[0].permitted,false);
  }
  await db.query('begin');
  await db.query('set local role service_role');
  const args=[bookingA,workerA,-26.1,28.04,12,new Date().toISOString()];
  const first=await db.query(rpc,args);
  const second=await db.query(rpc,args);
  assert.equal(first.rows[0].saved,true);
  assert.equal(second.rows[0].saved,false);
  assert.equal((await db.query(rpc,[bookingB,workerA,-26.1,28.04,12,new Date().toISOString()])).rows[0].saved,false);
  assert.equal((await db.query(rpc,[bookingB,workerB,-26.1,28.04,12,new Date(Date.now()-35_000).toISOString()])).rows[0].saved,false);
  await db.query('commit');
  assert.equal(await count(bookingA),1);
  ok('service-only atomic publish grants, accepted worker checks and 10-second concurrency throttle');
  await fix(bookingB,workerB);await fix(bookingC,workerA);
  await db.query("update public.bookings set status='arrived' where id=$1",[bookingA]);
  assert.equal(await count(bookingA),0);assert.equal(await count(bookingB),1);
  ok('arrival deletes only the affected worker coordinate');
  await db.query('update public.bookings set cancelled_at=now() where id=$1',[bookingB]);
  assert.equal(await count(bookingB),0);ok('cancellation deletes coordinates immediately');
  await db.query('update public.bookings set sensitive_data_revoked_at=now() where id=$1',[bookingC]);
  assert.equal(await count(bookingC),0);ok('sensitive access revocation deletes coordinates');
  await db.query("update public.bookings set status='en_route',sensitive_data_revoked_at=null where id=$1",[bookingC]);
  await fix(bookingC,workerA);
  await db.query('update public.bookings set xooter_id=$1 where id=$2',[workerB,bookingC]);
  assert.equal(await count(bookingC),0);ok('reassignment deletes old worker coordinate');
  await db.query('update public.bookings set xooter_id=$1 where id=$2',[workerA,bookingC]);
  await fix(bookingC,workerA);
  await db.query('update public.bookings set completed_at=now() where id=$1',[bookingC]);
  assert.equal(await count(bookingC),0);ok('completion deletes coordinates');
  await db.query("update public.bookings set status='en_route',completed_at=null where id=$1",[bookingC]);
  await fix(bookingC,workerA);
  await db.query("insert into public.xooter_jobs(id,booking_id,xooter_id,state) values($1,$2,$3,'accepted')",[jobC,bookingC,workerA]);
  await db.query("update public.xooter_jobs set state='completed' where id=$1",[jobC]);
  assert.equal(await count(bookingC),0);ok('job transition deletes coordinates');
  await fix(bookingC,workerA);
  await db.query("update public.xooter_jobs set state='accepted' where id=$1",[jobC]);
  await db.query('delete from public.xooter_jobs where id=$1',[jobC]);
  assert.equal(await count(bookingC),0);ok('job removal deletes coordinates');
  await assert.rejects(fix(bookingC,workerA,100),e=>e.code==='23514');
  assert.equal(await count(bookingC),0);ok('physical lifetime constraint rejects excessively old positions');
  console.log(checks+' disposable PostgreSQL GPS privacy checks passed');
} finally {
  if(db)await db.end().catch(()=>{});
  if(created)await admin.query('drop database if exists "'+dbname+'" with (force)').catch(()=>{});
  for(const role of roles.reverse())await admin.query('drop role if exists '+role).catch(()=>{});
  await admin.end().catch(()=>{});
}
