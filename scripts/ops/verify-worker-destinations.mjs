import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const {PGlite}=await import(pathToFileURL(resolve(process.argv[2])).href);
const fixture=await readFile('scripts/testing/worker-address-fixture.sql','utf8');
const migration=await readFile('supabase/migrations/20261102191938_current_accepted_worker_destinations.sql','utf8');
const delivery=await readFile('supabase/migrations/20261102192255_worker_destination_source_delivery.sql','utf8');
const owner='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002';
const worker='10000000-0000-4000-8000-000000000001',replacement='10000000-0000-4000-8000-000000000002';
const booking='20000000-0000-4000-8000-000000000001',job='30000000-0000-4000-8000-000000000001';
let assertions=0;
const check=(actual,expected,label)=>{assert.deepEqual(actual,expected,label);assertions++;};
async function run(fix){
 const db=new PGlite();
 try{
  await db.exec(fixture);if(fix)await db.exec(migration);
  await db.query('insert into public.xooters(id,user_id) values($1,$2),($3,$4)',[worker,owner,replacement,other]);
  await db.query("insert into public.bookings(id,xooter_id,crew_size,status,address,scheduled_at) values($1,$2,1,'contractor_accepted','Synthetic public venue',clock_timestamp()+interval '30 days')",[booking,worker]);
  await db.query("insert into public.xooter_jobs(id,booking_id,xooter_id,state) values($1,$2,$3,'accepted')",[job,booking,worker]);
  const destination=async actor=>{
   await db.exec('set role service_role');try{return(await db.query('select destination_address from public.get_xooter_job_cards_for_user($1)',[actor])).rows.map(r=>r.destination_address);}finally{await db.exec('reset role');}
  };
  check(await destination(owner),['Synthetic public venue'],'accepted destination30days ahead, independently of access-code time window');
  check(await destination(other),[],'another account has no job card');check(await destination(null),[],'null actor has no job card');
  await db.query('update public.bookings set xooter_id=$1',[replacement]);
  if(!fix){assert.deepEqual(await destination(owner),['Synthetic public venue']);return;}
  check(await destination(owner),[null],'stale accepted primary is denied after reassignment');
  await db.query('update public.bookings set xooter_id=$1',[worker]);
  for(const state of ['offered','declined','expired','completed']){await db.query('update public.xooter_jobs set state=$1',[state]);check(await destination(owner),[null],`no destination for ${state}`);}
  await db.exec("update public.xooter_jobs set state='accepted'");
  for(const status of ['cancelled','completed','rated','replacement_required','replacement_offered','reassigned','unknown']){
   await db.query('update public.bookings set status=$1',[status]);check(await destination(owner),[null],`no destination when booking ${status}`);
  }
  await db.exec("update public.bookings set status='contractor_accepted'");
  for(const field of ['cancelled_at','completed_at','job_completed_at','sensitive_data_revoked_at']){
   await db.exec(`update public.bookings set ${field}=clock_timestamp()`);check(await destination(owner),[null],`${field} closes destination`);await db.exec(`update public.bookings set ${field}=null`);
  }
  await db.exec('update public.xooters set active=false');check(await destination(owner),[null],'inactive worker receives no address');await db.exec('update public.xooters set active=true');
  await db.query('update public.bookings set xooter_id=$1,original_xooter_id=$1,crew_size=2',[replacement]);
  await db.query('insert into public.booking_assignees values($1,$2)',[booking,worker]);check(await destination(owner),[null],'partial crew roster is insufficient');
  await db.query('insert into public.booking_assignees values($1,$2)',[booking,replacement]);check(await destination(owner),['Synthetic public venue'],'accepted member of complete current crew can plan ahead');
  await db.exec('update public.bookings set original_xooter_id=null');check(await destination(owner),[null],'unknown original crew provenance is insufficient');
  await db.query('update public.bookings set original_xooter_id=$1',[worker]);check(await destination(owner),[null],'changed primary cannot reuse the historical crew roster');
  await db.query('update public.bookings set original_xooter_id=$1,was_reassigned=true',[replacement]);check(await destination(owner),[null],'reassignment marker independently closes nonprimary crew access');
  await db.exec('update public.bookings set was_reassigned=false,replacement_count=1');check(await destination(owner),[null],'replacement attempt independently closes nonprimary crew access');
  await db.query("update public.bookings set xooter_id=$1,original_xooter_id=$1,was_reassigned=false,replacement_count=0",[worker]);
  check(await destination(owner),['Synthetic public venue'],'original accepted primary still has advance access');
  await db.query("update public.bookings set xooter_id=$1,status='replacement_offered',was_reassigned=true,replacement_count=1",[replacement]);
  check(await destination(owner),[null],'outgoing crew primary is denied during replacement');
  await db.exec("update public.bookings set status='contractor_accepted',address='Changed synthetic public venue'");
  check(await destination(owner),[null],'historical crew roster cannot reauthorize the outgoing primary after replacement acceptance');
  await db.query("insert into public.xooter_jobs(id,booking_id,xooter_id,state) values($1,$2,$3,'accepted')",['30000000-0000-4000-8000-000000000002',booking,replacement]);
  check(await destination(other),['Changed synthetic public venue'],'replacement accepted primary receives the current destination in advance');
  await db.query('delete from public.booking_assignees where xooter_id=$1',[worker]);check(await destination(owner),[null],'removed crew member cannot use a stale accepted job');
  for(const role of ['anon','authenticated'])check((await db.query("select has_function_privilege($1,'public.get_xooter_job_cards_for_user(uuid)','execute') as allowed",[role])).rows[0].allowed,false,`${role} cannot call service RPC`);
  check((await db.query("select prosecdef from pg_proc where oid='public.get_xooter_job_cards_for_user(uuid)'::regprocedure")).rows[0].prosecdef,false,'read RPC uses invoker privileges');
 }finally{await db.close();}
}
async function proveCrewRegression(){
 const db=new PGlite();
 try{
  await db.exec(fixture);
  const unbounded=migration.replace(/        and b\.original_xooter_id is not null and b\.xooter_id=b\.original_xooter_id\r?\n        and b\.was_reassigned is false and b\.replacement_count=0\r?\n/,'');
  assert.notEqual(unbounded,migration,'negative control removes the four provenance conditions');
  await db.exec(unbounded);
  await db.query('insert into public.xooters(id,user_id) values($1,$2),($3,$4)',[worker,owner,replacement,other]);
  await db.query("insert into public.bookings(id,xooter_id,original_xooter_id,crew_size,status,address) values($1,$2,$2,2,'contractor_accepted','Initial synthetic public venue')",[booking,worker]);
  await db.query('insert into public.booking_assignees values($1,$2),($1,$3)',[booking,worker,replacement]);
  await db.query("insert into public.xooter_jobs(id,booking_id,xooter_id,state) values($1,$2,$3,'accepted')",[job,booking,worker]);
  await db.query("update public.bookings set xooter_id=$1,status='replacement_offered',was_reassigned=true,replacement_count=1",[replacement]);
  await db.exec("update public.bookings set status='contractor_accepted',address='Changed synthetic public venue';set role service_role");
  check((await db.query('select destination_address from public.get_xooter_job_cards_for_user($1)',[owner])).rows[0].destination_address,'Changed synthetic public venue','unbounded historical crew fallback reproduces the outgoing-primary leak');
 }finally{await db.close();}
}
async function proveDelivery(){
 const db=new PGlite();
 const history=()=>db.query('select version,name,statements from supabase_migrations.schema_migrations');
 try{
  await db.exec(fixture);await db.exec('create schema supabase_migrations;create table supabase_migrations.schema_migrations(version text primary key,name text,statements text[])');
  // A failed history insert must roll the preceding function/grant DDL back too.
  await db.exec('alter table supabase_migrations.schema_migrations add constraint force_rollback check(false)');
  await assert.rejects(db.exec(delivery));check((await history()).rows.length,0,'failed DDL delivery records no canonical history');
  check((await db.query("select prosecdef from pg_proc where oid='public.get_xooter_job_cards_for_user(uuid)'::regprocedure")).rows[0].prosecdef,true,'history failure rolls the function change back');
  await db.exec('alter table supabase_migrations.schema_migrations drop constraint force_rollback');
  await db.exec(delivery);const original=(await history()).rows;check(original.length,1,'fresh delivery records only the just-executed canonical source');
  check(original[0].version,'20261102191938','actual canonical staging version is retained');
  check(original[0].statements[0],migration.replaceAll('\r\n','\n').replace(/^begin;\n/m,'').replace(/^commit;\n/m,''),'history stores actual executed SQL, not an unexecuted stamp');
  await db.exec(delivery);check((await history()).rows,original,'repeat delivery preserves source history');
  await db.query('update supabase_migrations.schema_migrations set statements=array[$1]',[migration.replaceAll('\r\n','\n')]);
  await db.exec(delivery);check((await history()).rows[0].statements[0],migration.replaceAll('\r\n','\n'),'actual staging full-source receipt is accepted without alteration');
  await db.exec("update supabase_migrations.schema_migrations set statements=array['unknown source']");await assert.rejects(db.exec(delivery));assertions++;
  await db.query('update supabase_migrations.schema_migrations set statements=array[$1]',[migration.replaceAll('\r\n','\n')]);
  await db.exec('grant execute on function public.get_xooter_job_cards_for_user(uuid) to authenticated');await assert.rejects(db.exec(delivery));assertions++;
  await db.exec('revoke execute on function public.get_xooter_job_cards_for_user(uuid) from authenticated');
  await db.exec("alter function public.get_xooter_job_cards_for_user(uuid) security definer");await assert.rejects(db.exec(delivery));assertions++;
 }finally{await db.close();}
}
await run(true);await run(false);await proveCrewRegression();await proveDelivery();
console.log(JSON.stringify({check:'current-worker-destination-before-visit-day',assertions,oldStaleAssignmentDefectReproduced:true,unboundedCrewDefectReproduced:true,atomicDeliveryAndHistoryTested:true,passed:true,providerCalls:0,hostedChanges:0}));
