import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const { PGlite } = await import(pathToFileURL(resolve(process.argv[2])).href);
const migration=await readFile('supabase/migrations/20261010090000_idempotent_booking_chat.sql','utf8');
const owner='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',worker='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',other='cccccccc-cccc-4ccc-8ccc-cccccccccccc',booking='11111111-1111-4111-8111-111111111111',xooter='22222222-2222-4222-8222-222222222222',second='33333333-3333-4333-8333-333333333333',key='44444444-4444-4444-8444-444444444444',key2='55555555-5555-4555-8555-555555555555';
const db=new PGlite();let groups=0;
const check=(actual,expected)=>{assert.deepEqual(actual,expected);groups++;};
try{
 await db.exec(`create role anon;create role authenticated;create role service_role;
 create table bookings(id uuid primary key,user_id uuid,xooter_id uuid,status text,cancelled_at timestamptz,crew_size int);
 create table xooters(id uuid primary key,user_id uuid);create table booking_assignees(booking_id uuid,xooter_id uuid);create table xooter_jobs(booking_id uuid,xooter_id uuid,state text);
 create table messages(id uuid primary key default gen_random_uuid(),booking_id uuid references bookings(id),sender_type text,sender_user_id uuid,body text,created_at timestamptz default now(),envelope_version int,client_safety_flags text[] default '{}',moderation_state text);
 insert into bookings values('${booking}','${owner}','${xooter}','completed',null,1);insert into xooters values('${xooter}','${worker}'),('${second}','${other}');
 insert into messages(booking_id,sender_user_id,body) values('${booking}','${owner}','legacy'),('${booking}','${owner}','legacy');`);
 await db.exec(migration);await db.exec(migration);
 const call=async(actor=owner,id=key,body='xoot:e2ee:v1:original',flags=[]) => (await db.query('select send_booking_message_once($1,$2,$3,$4,$5) result',[actor,booking,id,body,flags])).rows[0].result;
 const count=async()=> (await db.query('select count(*)::int n from messages')).rows[0].n;
 check(await count(),2);check((await call(other)).code,'not_found');check((await call(owner,null)).code,'invalid_request');check((await call(owner,key,'plain')).code,'invalid_request');
 await db.exec("update bookings set status='rated'");check((await call()).code,'closed');await db.exec("update bookings set status='cancelled'");check((await call()).code,'closed');await db.exec("update bookings set status='completed',crew_size=2");check((await call()).code,'crew_pending');await db.exec('update bookings set crew_size=1');
 await db.query('insert into booking_assignees values($1,$2)',[booking,second]);check((await call()).code,'crew_pending');await db.exec('delete from booking_assignees');
 await db.query("insert into xooter_jobs values($1,$2,'accepted')",[booking,second]);check((await call()).code,'crew_pending');await db.exec('delete from xooter_jobs');
 // A real transaction rollback leaves no key reservation or orphan row.
 await db.exec(`create function reject_message() returns trigger language plpgsql as $$ begin if current_setting('xoot.fail',true)='yes' then raise exception 'Isolated failure' using errcode='23514';end if;return NEW;end $$;create trigger fail_insert before insert on messages for each row execute function reject_message();select set_config('xoot.fail','yes',false);`);
 await assert.rejects(call(),error=>error.code==='23514');groups++;check(await count(),2);await db.exec("select set_config('xoot.fail','no',false)");
 const saved=await call(owner,key,'xoot:e2ee:v1:original',['z','a','z']);check(saved.ok,true);check(saved.existing,false);check(saved.message.sender_type,'user');check(saved.message.client_safety_flags,['a','z']);check(await count(),3);
 // Discarded response, then same-key replay and payload conflicts.
 check((await call(owner,key,'xoot:e2ee:v1:original',['a','z'])).message,saved.message);
 check((await call(owner,key,'xoot:e2ee:v1:changed',['a','z'])).code,'key_conflict');check((await call(owner,key,'xoot:e2ee:v1:original',[])).code,'key_conflict');check(await count(),3);
 await db.exec("update bookings set status='rated'");check((await call(owner,key,'xoot:e2ee:v1:original',['a','z'])).message,saved.message);check((await call(owner,key2)).code,'closed');
 await db.exec("update bookings set status='completed'");const workerSaved=await call(worker,key);check(workerSaved.message.sender_type,'xooter');check(await count(),4);
 await db.query('update bookings set xooter_id=$1',[second]);check((await call(worker,key)).code,'not_found');await db.query('update bookings set xooter_id=$1',[xooter]);
 for(const role of ['anon','authenticated']){await db.exec(`set role ${role}`);await assert.rejects(call(),error=>error.code==='42501');groups++;await db.exec('reset role');}
 await db.exec('set role service_role');check((await call(owner,key,'xoot:e2ee:v1:original',['a','z'])).message,saved.message);await db.exec('reset role');
 // PGlite queues these transactions: verifies replay/uniqueness under overlapping promises,
 // not multi-connection row-lock scheduling, which requires PostgreSQL staging validation.
 const replays=await Promise.all(Array.from({length:8},()=>call(owner,key2)));check(new Set(replays.map(row=>row.message.id)).size,1);check(replays.filter(row=>!row.existing).length,1);check(await count(),5);
 await assert.rejects(db.query('insert into messages(booking_id,sender_user_id,client_message_id,body) values($1,$2,$3,$4)',[booking,owner,key,'duplicate']),error=>error.code==='23505');groups++;
}finally{await db.close();}
console.log(JSON.stringify({ok:true,groups,legacyNullsPreserved:true,immutableReplay:true,payloadConflict:true,rollback:true,serviceOnly:true,overlappingReplayPromises:true,concurrentConnections:false,hostedWrites:false}));
