#!/usr/bin/env node
// Disposable PostgreSQL 17 contract for the referral prerequisite preceding ZD035.
// Never connect to staging/production; no user data or credentials are read.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

assert.equal(process.env.XOOT_PG_TEST_INTENT,'referral-base-prerequisite');
assert.ok(['127.0.0.1','::1'].includes(process.env.PGHOST));
assert.ok(/^\d+$/.test(process.env.PGPORT??'')&&process.env.PGUSER&&process.env.PGPASSWORD);
assert.ok(!process.env.PGSERVICE&&!process.env.PGSERVICEFILE);
assert.ok(process.env.XOOT_PG_MODULE);
const {default:pg}=await import(pathToFileURL(resolve(process.env.XOOT_PG_MODULE)).href);
const options={host:process.env.PGHOST,port:Number(process.env.PGPORT),
  user:process.env.PGUSER,password:process.env.PGPASSWORD,database:'postgres',ssl:false,
  connectionTimeoutMillis:12000,statement_timeout:10000};
const source=path=>readFileSync(new URL('../../supabase/migrations/'+path,import.meta.url),'utf8');
const baseline=source('20260903000000_referral_base_prerequisite_convergence.sql');
const crew=source('20260903120000_zd035_crew_and_zd036_referrals.sql');
const grants=source('20261015102137_referral_client_grants_least_privilege.sql');
const database='xoot_referral_baseline_'+randomUUID().replaceAll('-','');
const admin=new pg.Client(options);
const ownRoles=[];
let db,created=false,count=0;
const ok=name=>console.log('ok '+(++count)+' - '+name);
const query=async sql=>(await db.query(sql)).rows;
try {
  await admin.connect();
  const v=Number((await admin.query('show server_version_num')).rows[0].server_version_num);
  assert.ok(v>=170000&&v<180000,'PostgreSQL 17 required');
  for(const role of ['anon','authenticated','service_role']){
    if(!(await admin.query('select 1 from pg_roles where rolname=$1',[role])).rowCount){
      await admin.query('create role '+role+' nologin '+(role==='service_role'?'bypassrls':'nobypassrls'));
      ownRoles.push(role);
    }
  }
  await admin.query('create database "'+database+'"');created=true;
  db=new pg.Client({...options,database});await db.connect();
  await db.query('create schema auth;create schema private');
  await db.query("create type public.app_role as enum ('user','admin')");
  await db.query("create function auth.uid() returns uuid language sql stable as 'select nullif(current_setting(''request.jwt.claim.sub'',true),'''')::uuid'");
  await db.query("create function private.has_role(uuid,public.app_role) returns boolean language sql stable as 'select false'");
  await db.query('grant usage on schema public,auth,private to anon,authenticated,service_role');
  await db.query('create table public.bookings(id uuid primary key)');
  await db.query('create table public.xooters(id uuid primary key)');
  await db.query(baseline);
  for(const table of ['referrals','referral_redemptions']){
    const rows=await query("select relrowsecurity from pg_class where oid='public."+table+"'::regclass");
    assert.equal(rows[0].relrowsecurity,true);
    assert.equal((await query("select has_table_privilege('anon','public."+table+"','TRUNCATE') permitted"))[0].permitted,false);
    assert.equal((await query("select has_table_privilege('authenticated','public."+table+"','SELECT') permitted"))[0].permitted,true);
    assert.equal((await query("select has_table_privilege('service_role','public."+table+"','INSERT') permitted"))[0].permitted,true);
  }
  assert.equal((await query("select has_function_privilege('anon','public.gen_referral_code()','EXECUTE') permitted"))[0].permitted,false);
  ok('empty production baseline creates guarded RLS tables and service-only generator');
  const first=(await query('select public.gen_referral_code() code'))[0].code;
  assert.match(first,/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
  await db.query('insert into public.referrals(user_id,code) values($1,$2)',
    ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',first]);
  const second=(await query('select public.gen_referral_code() code'))[0].code;
  assert.notEqual(first,second);
  ok('signup code generator returns a unique canonical referral code');

  await db.query(crew);
  assert.equal((await query("select to_regclass('public.booking_assignees') present"))[0].present,'booking_assignees');
  const col=(await query("select exists(select 1 from information_schema.columns where table_schema='public' and table_name='referral_redemptions' and column_name='booking_id') present"))[0];
  assert.equal(col.present,true);
  await db.query(grants);
  ok('source-order ZD035/036 crew, redemption columns, and privilege hardening apply successfully');

  const fnBefore=(await query("select oid::text as oid,pg_get_functiondef(oid) body from pg_proc where oid='public.gen_referral_code()'::regprocedure"))[0];
  await db.query(baseline);
  const fnAfter=(await query("select oid::text as oid,pg_get_functiondef(oid) body from pg_proc where oid='public.gen_referral_code()'::regprocedure"))[0];
  assert.deepEqual(fnAfter,fnBefore);
  assert.equal((await query('select count(*)::int n from public.referrals'))[0].n,1);
  ok('already-migrated staging baseline preserves records, grants and existing generator unchanged');

  await db.query('begin');await db.query('set local role authenticated');
  await db.query("select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true)");
  assert.deepEqual((await query('select code from public.referrals')).map(r=>r.code),[first]);
  await db.query('rollback');
  ok('reconstructed owner SELECT is actually subject to RLS');

  await db.query('drop table public.referral_redemptions cascade');
  await assert.rejects(db.query(baseline),e=>/Partial referral baseline/.test(e.message));
  await db.query('rollback');
  assert.equal((await query("select to_regclass('public.referral_redemptions') v"))[0].v,null);
  ok('partial legacy database causes a safe no-write abort');

  await db.query('drop table public.referrals cascade');
  const missingRLS=baseline.replace('alter table public.referrals enable row level security;',
    '-- deliberate planted missing RLS');
  assert.notEqual(missingRLS,baseline);
  await assert.rejects(db.query(missingRLS),e=>/RLS disabled on reconstructed referral table/.test(e.message));
  await db.query('rollback');
  assert.equal((await query("select to_regclass('public.referrals') v"))[0].v,null);
  ok('planted RLS removal rolls back the entire new-schema creation');

  console.log(count+' guarded bootstrap PostgreSQL contract checks passed');
}finally{
  if(db)await db.end().catch(()=>{});
  if(created)await admin.query('drop database if exists "'+database+'" with (force)').catch(()=>{});
  for(const role of ownRoles.reverse())await admin.query('drop role if exists '+role).catch(()=>{});
  await admin.end().catch(()=>{});
}
