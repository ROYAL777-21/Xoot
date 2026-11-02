import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const {PGlite}=await import(pathToFileURL(resolve(process.argv[2])).href);
const fixture=await readFile('scripts/testing/worker-address-fixture.sql','utf8');
const migration=await readFile('supabase/migrations/20261102213000_current_accepted_worker_destinations.sql','utf8');
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
  await db.query('update public.bookings set xooter_id=$1,crew_size=2',[replacement]);
  await db.query('insert into public.booking_assignees values($1,$2)',[booking,worker]);check(await destination(owner),[null],'partial crew roster is insufficient');
  await db.query('insert into public.booking_assignees values($1,$2)',[booking,replacement]);check(await destination(owner),['Synthetic public venue'],'accepted member of complete current crew can plan ahead');
  await db.query('delete from public.booking_assignees where xooter_id=$1',[worker]);check(await destination(owner),[null],'removed crew member cannot use a stale accepted job');
  for(const role of ['anon','authenticated'])check((await db.query("select has_function_privilege($1,'public.get_xooter_job_cards_for_user(uuid)','execute') as allowed",[role])).rows[0].allowed,false,`${role} cannot call service RPC`);
  check((await db.query("select prosecdef from pg_proc where oid='public.get_xooter_job_cards_for_user(uuid)'::regprocedure")).rows[0].prosecdef,false,'read RPC uses invoker privileges');
 }finally{await db.close();}
}
await run(true);await run(false);
console.log(JSON.stringify({check:'current-worker-destination-before-visit-day',assertions,oldStaleAssignmentDefectReproduced:true,passed:true,providerCalls:0,hostedChanges:0}));
