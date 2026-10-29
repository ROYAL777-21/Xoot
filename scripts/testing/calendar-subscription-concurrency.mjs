// Actual concurrent row-lock test against the named disposable local Docker fixture only.
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const container='xoot-calendar-contract-20261026',database='calendar_v2';
const id='10000000-0000-4000-8000-000000000003';
async function sql(statement){return new Promise((resolve,reject)=>{
  const child=spawn('docker',['exec','-i',container,'psql','-qAt','-U','postgres','-d',database,'-v','ON_ERROR_STOP=1']);
  let output='',error='';child.stdout.on('data',chunk=>output+=chunk);child.stderr.on('data',chunk=>error+=chunk);
  child.on('error',reject);child.on('exit',code=>code===0?resolve(output.trim()):reject(new Error(error)));child.stdin.end(statement);
});}
try{
  assert.equal(await sql(`insert into public.bookings(id,user_id,service,scheduled_at,duration_hours,status,updated_at,calendar_revision) values('${id}','00000000-0000-4000-8000-000000000001','regular',now()+interval '1 day',4,'contractor_accepted',now(),999) returning calendar_revision;`),'0');
  const statement=`set role service_role;begin;update public.bookings set duration_hours=duration_hours+0.25,updated_at='2026-10-26T20:00:00.100Z',calendar_revision=999 where id='${id}' returning calendar_revision;select pg_sleep(0.2);commit;`;
  const results=await Promise.all([sql(statement),sql(statement)]);
  assert.deepEqual(results.map(Number).sort(),[1,2]);
  assert.equal(await sql(`select calendar_revision from public.bookings where id='${id}';`),'2');
  console.log('Concurrent same-timestamp booking changes returned revisions1and2; caller-supplied999ignored.');
}finally{await sql(`delete from public.bookings where id='${id}';`);}
