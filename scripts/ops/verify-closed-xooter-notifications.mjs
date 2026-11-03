import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
process.on('uncaughtException',error=>{console.error(JSON.stringify({check:'closed-production-notification-schema',passed:false,error:error.message,code:error.code}));process.exit(1);});
const {PGlite}=await import(pathToFileURL(resolve(process.argv[2])).href);
const sql=async p=>(await readFile(p,'utf8')).replaceAll('\r\n','\n');
const fixture=await sql('scripts/testing/xooter-journey-fixture.sql');
const wrapper=await sql('supabase/migrations/20261102195704_closed_xooter_notification_schema.sql');
const manifest=JSON.parse(await readFile('docs/release/evidence/2026-11-02/notification-production-schema-manifest.json','utf8'));
const sha=s=>createHash('sha256').update(s).digest('hex');
assert.equal(sha(wrapper),manifest.wrapperSha256);
let checks=0;const check=(value,expected,label)=>{assert.deepEqual(value,expected,label);checks++;};
async function setup(production=false){const db=new PGlite();await db.exec(fixture);await db.exec('create schema supabase_migrations;create table supabase_migrations.schema_migrations(version text primary key,name text,statements text[])');if(production)await db.exec('alter table public.integration_outbox drop constraint integration_outbox_status_check');return db;}
const histories=async db=>(await db.query('select version,name,statements from supabase_migrations.schema_migrations order by version')).rows;
const policy=async db=>(await db.query('select enabled,used,maximum,cardinality(allowed_user_ids) as allowed from private.xooter_email_policy')).rows;
for(const production of [false,true]){
 const db=await setup(production);
 try{
  await db.exec("insert into public.notifications(user_id,kind) values('00000000-0000-4000-8000-000000000001','unrelated_fixture');insert into public.integration_outbox(source_table,event_type,status,channel) values('unrelated_fixture','other_event','needs_approval','in_app')");
  await db.exec(wrapper);
  check(await policy(db),[{enabled:false,used:0,maximum:20,allowed:0}],`${production?'production text':'staging CHECK'} starts closed with no allowance spend`);
  check((await db.query('select (select count(*) from private.xooter_journeys) as journeys,(select count(*) from private.xooter_journey_events) as events,(select count(*) from public.notifications) as notifications,(select count(*) from public.integration_outbox) as outbox')).rows,[{journeys:0,events:0,notifications:1,outbox:1}],'no historical customer/application backfill or unrelated outbox mutation');
  const records=await histories(db);check(records.length,3,'only three just-executed canonical versions recorded');
  for(let i=0;i<3;i++)check(sha(records[i].statements[0]),manifest.versions[i].executedSha256,'canonical receipt stores exact executed SQL');
  if(production)check((await db.query("select count(*) n from pg_constraint where conrelid='public.integration_outbox'::regclass and contype='c'")).rows[0].n,0,'compatibility assertion adds no global status constraint');
  await db.exec("update private.xooter_email_policy set used=1,allowed_user_ids=array['00000000-0000-4000-8000-000000000001'::uuid]");
  await db.exec(wrapper);check(await histories(db),records,'replay preserves canonical receipts');check(await policy(db),[{enabled:false,used:1,maximum:20,allowed:1}],'replay does not refill allowance or replace allowlist');
 }finally{await db.close();}
}
for(const path of ['scripts/testing/xooter-journey-contract.sql','scripts/testing/xooter-email-contract.sql']){
 const fullContract=await setup(true);
 try{
  await fullContract.exec(wrapper);
  const contract=await sql(path);await fullContract.exec(contract);checks+=(contract.match(/select public\.(?:assert_journey|expect_journey_error)\(/g)??[]).length;
 }finally{await fullContract.close();}
}
const rollback=await setup(true);
try{
 await rollback.exec("alter table supabase_migrations.schema_migrations add constraint fail_middle_history check(version<>'20261102082516')");
 await assert.rejects(rollback.exec(wrapper));checks++;
 check(await histories(rollback),[],'middle failure rolls all canonical history back');
 check((await rollback.query("select to_regclass('private.xooter_journeys') as journeys,to_regprocedure('public.manage_xooter_communications(text,jsonb,integer)') as rpc")).rows,[{journeys:null,rpc:null}],'middle history failure rolls preceding tables/functions back');
}finally{await rollback.close();}
for(const mutation of ['partial-history','unrecorded-table','unknown-status-check','status-domain']){
 const db=await setup(true);
 try{
  if(mutation==='partial-history')await db.exec("insert into supabase_migrations.schema_migrations values('20261102082500','unknown',array['not executed'])");
  if(mutation==='unrecorded-table')await db.exec('create table private.xooter_journeys(marker text)');
  if(mutation==='unknown-status-check')await db.exec("alter table public.integration_outbox add constraint unknown_status_guard check(status<>'completed')");
  if(mutation==='status-domain')await db.exec('create domain public.synthetic_status as text;alter table public.integration_outbox alter column status type public.synthetic_status');
  await assert.rejects(db.exec(wrapper));checks++;
  check((await histories(db)).length,mutation==='partial-history'?1:0,`${mutation} refuses unearned history`);
 }finally{await db.close();}
}
for(const mutation of ['history-body','private-grant','worker-definer','missing-trigger','enabled-policy']){
 const db=await setup();
 try{
  await db.exec(wrapper);
  if(mutation==='history-body')await db.exec("update supabase_migrations.schema_migrations set statements=array['changed source'] where version='20261102082500'");
  if(mutation==='private-grant')await db.exec('grant select on private.xooter_journeys to authenticated');
  if(mutation==='worker-definer')await db.exec('alter function public.xooter_email_worker_authorized() security definer');
  if(mutation==='missing-trigger')await db.exec('drop trigger xooter_application_journey on public.xooter_applications');
  if(mutation==='enabled-policy')await db.exec('update private.xooter_email_policy set enabled=true');
  await assert.rejects(db.exec(wrapper));checks++;
 }finally{await db.close();}
}
const existingStage=await setup();
try{
 for(const v of manifest.versions){const source=await sql(`supabase/migrations/${v.version}_${v.name}.sql`);await existingStage.exec(source);await existingStage.query('insert into supabase_migrations.schema_migrations values($1,$2,array[$3])',[v.version,v.name,source]);}
 const before=await histories(existingStage);await existingStage.exec(wrapper);check(await histories(existingStage),before,'existing actual staging source receipts remain immutable');
}finally{await existingStage.close();}
console.log(JSON.stringify({check:'closed-production-notification-schema',assertions:checks,sourceFunctions:12,outboxTextAndStageCheckTested:true,middleFailureRollback:true,actualExecutedHistory:true,providerCalls:0,hostedChanges:0,passed:true}));
