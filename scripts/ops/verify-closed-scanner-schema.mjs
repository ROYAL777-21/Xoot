import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { closedScannerDelivery,deliveryPath } from './build-closed-scanner-schema.mjs';
const { PGlite }=await import(process.argv[2] ? pathToFileURL(resolve(process.argv[2])).href : '@electric-sql/pglite');
const built=await closedScannerDelivery();assert.equal((await readFile(deliveryPath,'utf8')).replace(/\r\n/g,'\n'),built.sql);
async function baseline() {
  const db=new PGlite();
  await db.exec(await readFile('scripts/testing/kyc-quarantine-fixture.sql','utf8'));
  await db.exec(await readFile('supabase/migrations/20261027032349_kyc_private_quarantine_interlock.sql','utf8'));
  await db.exec('create schema supabase_migrations;create table supabase_migrations.schema_migrations(version text primary key,name text,statements text[])');
  return db;
}
const db=await baseline();
try {
  await db.exec(built.sql);
  const history=(await db.query("select version,encode(sha256(convert_to(statements[1],'UTF8')),'hex') as sha from supabase_migrations.schema_migrations order by version")).rows;
  assert.deepEqual(history,built.manifest.sources.map(s=>({version:s.version,sha:s.executedSqlSha256})));
  assert.deepEqual((await db.query('select used,maximum,personal_documents_allowed from private.kyc_scan_budget')).rows,
    [{used:0,maximum:32,personal_documents_allowed:false}]);
  await db.exec("set role service_role;select public.claim_kyc_scan_v2(null,'clean_pdf');select public.authorize_kyc_scan_dispatch((select id from private.kyc_scan_attempts));select public.finish_kyc_scan((select id from private.kyc_scan_attempts),'error','provider_unavailable',null,null,false);reset role");
  const before=(await db.query('select to_jsonb(a) as receipt from private.kyc_scan_attempts a')).rows;
  await db.exec(built.sql);
  assert.equal((await db.query('select used from private.kyc_scan_budget')).rows[0].used,1);
  assert.deepEqual((await db.query('select to_jsonb(a) as receipt from private.kyc_scan_attempts a')).rows,before);
  assert.equal((await db.query('select count(*)::integer as n from supabase_migrations.schema_migrations')).rows[0].n,3);
  console.log(JSON.stringify({check:'closed-schema-delivery-history-and-spend-preserving-retry',passed:true}));
} finally {await db.close();}
const failed=await baseline();
try {
  const mutant=built.sql.replace("select current_user = 'service_role';","select missing_scanner_column;");
  assert.notEqual(mutant,built.sql);await assert.rejects(failed.exec(mutant),error=>error.code==='42703');
  assert.equal((await failed.query("select to_regclass('private.kyc_scan_budget') as budget")).rows[0].budget,null);
  assert.equal((await failed.query('select count(*)::integer as n from supabase_migrations.schema_migrations')).rows[0].n,0);
  console.log(JSON.stringify({check:'middle-source-failure-rolls-back-ddl-and-all-history',passed:true}));
} finally {await failed.close();}
const partial=await baseline();
try {
  await partial.query('insert into supabase_migrations.schema_migrations values($1,$2,$3)',[built.manifest.sources[0].version,'synthetic-unverified-history',[]]);
  await assert.rejects(partial.exec(built.sql),error=>error.code==='55000');
  assert.equal((await partial.query("select to_regclass('private.kyc_scan_budget') as budget")).rows[0].budget,null);
  assert.equal((await partial.query('select count(*)::integer as n from supabase_migrations.schema_migrations')).rows[0].n,1);
  console.log(JSON.stringify({check:'partial-history-is-not-repair-stamped',passed:true}));
} finally {await partial.close();}
console.log('Actual local PostgreSQL only: no production connection, provider call or personal processing.');
for(const [name,mutation] of [
  ['disabled-storage-rls','alter table storage.objects disable row level security'],
  ['raw-policy-noop','alter policy kyc_raw_reads_closed on storage.objects using(true)'],
  ['owner-path-helper-noop',"create or replace function private.kyc_unregistered_owner_path(p_path text) returns boolean language sql security definer set search_path='' as $$select true$$"],
  ['activation-body-noop',"create or replace function private.kyc_quarantine_activation_interlock() returns trigger language plpgsql security invoker set search_path='' as $$begin return new;end$$"],
  ['activation-trigger-when-false',"drop trigger kyc_role_clearance_required on public.user_roles;create trigger kyc_role_clearance_required before insert or update on public.user_roles for each row when(false) execute function private.kyc_quarantine_activation_interlock()"],
  ['activation-trigger-different-function',"create function private.synthetic_noop_trigger() returns trigger language plpgsql as $$begin return new;end$$;drop trigger kyc_role_clearance_required on public.user_roles;create trigger kyc_role_clearance_required before insert or update on public.user_roles for each row execute function private.synthetic_noop_trigger()"],
]) {
  const mutated=await baseline();
  try {
    await mutated.exec(mutation);await assert.rejects(mutated.exec(built.sql),error=>error.code==='55000');
    assert.equal((await mutated.query("select to_regclass('private.kyc_scan_budget') as budget")).rows[0].budget,null);
    assert.equal((await mutated.query('select count(*)::integer as n from supabase_migrations.schema_migrations')).rows[0].n,0);
    console.log(JSON.stringify({check:'ineffective-protection-refuses-delivery',mutation:name,passed:true}));
  } finally {await mutated.close();}
}
