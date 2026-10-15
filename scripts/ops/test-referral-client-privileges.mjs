#!/usr/bin/env node
// Actual PostgreSQL 17 test. Only a disposable loopback database with synthetic rows.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

assert.equal(process.env.XOOT_PG_TEST_INTENT, 'referral-client-privileges');
assert.ok(['127.0.0.1','::1'].includes(process.env.PGHOST), 'Loopback only');
assert.ok(/^\d+$/.test(process.env.PGPORT ?? '') && process.env.PGUSER && process.env.PGPASSWORD);
assert.ok(!process.env.PGSERVICE && !process.env.PGSERVICEFILE);
assert.ok(process.env.XOOT_PG_MODULE, 'Pinned isolated driver required');
const { default: pg } = await import(pathToFileURL(resolve(process.env.XOOT_PG_MODULE)).href);
const settings={host:process.env.PGHOST,port:Number(process.env.PGPORT),user:process.env.PGUSER,
  password:process.env.PGPASSWORD,database:'postgres',ssl:false,
  connectionTimeoutMillis:12000,statement_timeout:10000};
const sql=readFileSync(new URL('../../supabase/migrations/20261015102137_referral_client_grants_least_privilege.sql',import.meta.url),'utf8');
const database='xoot_referral_'+randomUUID().replaceAll('-','');
const admin=new pg.Client(settings);
let db,created=false;
const ownRoles=[];
let checks=0;
const pass=name=>console.log('ok '+(++checks)+' - '+name);
const tables=['referrals','referral_redemptions'];
const allowed=async(role,table,privilege)=>{
  assert.ok(tables.includes(table));
  return (await db.query('select has_table_privilege($1,$2,$3) permitted',
    [role,'public.'+table,privilege])).rows[0].permitted;
};
const count=async table=>{
  assert.ok(tables.includes(table));
  return Number((await db.query('select count(*)::int n from public.'+table)).rows[0].n);
};
async function fixture(){
  await db.query('drop table if exists public.referral_redemptions,public.referrals cascade');
  await db.query('create table public.referrals (user_id uuid primary key,code text unique not null,created_at timestamptz default now())');
  await db.query('create table public.referral_redemptions (id uuid primary key,referrer_user_id uuid not null,referred_user_id uuid not null unique)');
  await db.query('alter table public.referrals enable row level security');
  await db.query('alter table public.referral_redemptions enable row level security');
  await db.query("create policy owner_read on public.referrals for select to authenticated using (user_id = nullif(current_setting('request.jwt.claim.sub',true),'')::uuid)");
  await db.query("create policy redemption_owner on public.referral_redemptions for select to authenticated using (referrer_user_id = nullif(current_setting('request.jwt.claim.sub',true),'')::uuid)");
  await db.query('grant all on public.referrals,public.referral_redemptions to public,anon,authenticated,service_role');
  await db.query("insert into public.referrals(user_id,code) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','AAAAAA'),('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','BBBBBB')");
  await db.query("insert into public.referral_redemptions(id,referrer_user_id,referred_user_id) values ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')");
}
try{
  await admin.connect();
  const version=Number((await admin.query('show server_version_num')).rows[0].server_version_num);
  assert.ok(version>=170000&&version<180000,'Postgres 17 required');
  for(const role of ['anon','authenticated','service_role']){
    if(!(await admin.query('select 1 from pg_roles where rolname=$1',[role])).rowCount){
      await admin.query('create role '+role+' nologin '+(role==='service_role'?'bypassrls':'nobypassrls'));
      ownRoles.push(role);
    }
  }
  await admin.query('create database "'+database+'"');created=true;
  db=new pg.Client({...settings,database});await db.connect();
  await fixture();
  for(const table of tables){
    assert.equal(await allowed('anon',table,'TRUNCATE'),true);
    await db.query('begin');await db.query('set local role anon');
    await db.query('truncate public.'+table);await db.query('rollback');
    pass('original anonymous TRUNCATE bypasses RLS on '+table+' (rolled back)');
  }
  assert.equal(await count('referrals'),2);
  assert.equal(await count('referral_redemptions'),1);
  await db.query(sql);
  for(const table of tables){
    for(const role of ['anon','authenticated']){
      for(const privilege of ['INSERT','UPDATE','DELETE','TRUNCATE','TRIGGER','REFERENCES','MAINTAIN']){
        assert.equal(await allowed(role,table,privilege),false,role+' '+privilege+' '+table);
      }
    }
    assert.equal(await allowed('anon',table,'SELECT'),false);
    assert.equal(await allowed('authenticated',table,'SELECT'),true);
    assert.equal(await allowed('service_role',table,'INSERT'),true);
    await db.query('begin');await db.query('set local role authenticated');
    await assert.rejects(db.query('truncate public.'+table),error=>error.code==='42501');
    await db.query('rollback');
    pass('authenticated TRUNCATE denied, service access preserved: '+table);
  }
  assert.equal(await count('referrals'),2);
  assert.equal(await count('referral_redemptions'),1);
  pass('all synthetic records preserved');
  await db.query('begin');await db.query('set local role authenticated');
  await db.query("select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true)");
  assert.deepEqual((await db.query('select code from public.referrals')).rows.map(row=>row.code),['AAAAAA']);
  assert.equal((await db.query('select id from public.referral_redemptions')).rowCount,1);
  await db.query('rollback');
  pass('authenticated RLS owner-only SELECT preserved');
  await db.query(sql);pass('reapplying the reviewed migration is safe');
  await fixture();await db.query('drop table public.referral_redemptions');
  await assert.rejects(db.query(sql),error=>error.code==='42P01');
  await db.query('rollback');
  assert.equal(await allowed('anon','referrals','TRUNCATE'),true);
  pass('missing referral prerequisite fails without a partial revoke');
  await fixture();
  const revoke=/revoke all privileges on table public\.referrals, public\.referral_redemptions\s+from public, anon, authenticated;/i;
  assert.match(sql,revoke);
  await assert.rejects(db.query(sql.replace(revoke,'-- planted omission')),error=>
    /not least-privilege/.test(error.message));
  await db.query('rollback');
  assert.equal(await allowed('anon','referrals','TRUNCATE'),true);
  pass('planted omission is detected and rolled back');
  console.log(checks+' PostgreSQL privilege tests passed');
}finally{
  if(db)await db.end().catch(()=>{});
  if(created)await admin.query('drop database if exists "'+database+'" with (force)').catch(()=>{});
  for(const role of ownRoles.reverse())await admin.query('drop role if exists '+role).catch(()=>{});
  await admin.end().catch(()=>{});
}
