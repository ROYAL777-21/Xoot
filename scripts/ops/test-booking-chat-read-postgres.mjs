import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';

// Synthetic local SQL only. These claims are not genuine hosted Auth/JWT proof.
if(process.env.XOOT_PG_TEST_INTENT!=='booking-chat-read')throw new Error('Explicit local chat-read test intent required');
const container=process.env.XOOT_CHAT_TEST_CONTAINER;
if(!/^xoot-chat-sql-[0-9]+$/.test(container??''))throw new Error('Named local chat test container required');
const info=JSON.parse(execFileSync('docker',['inspect',container],{encoding:'utf8'}))[0];
assert.equal(info.Config.Labels?.['xoot.test.intent'],'booking-chat-read');
assert.equal(info.HostConfig.NetworkMode,'none');
assert.ok(!info.Mounts.some(m=>m.Type==='bind'),'No host bind mounts');
const database='xoot_chat_'+randomUUID().replaceAll('-','');
const run=(sql,db=database)=>execFileSync('docker',['exec','-i',container,'psql','-X','-q','-U','postgres','-d',db,'-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose','-At'],{input:sql,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
const ca='11111111-1111-4111-8111-111111111111',wa='22222222-2222-4222-8222-222222222222',cb='33333333-3333-4333-8333-333333333333',wb='44444444-4444-4444-8444-444444444444',admin='55555555-5555-4555-8555-555555555555';
const ba='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',bb='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',xa='cccccccc-cccc-4ccc-8ccc-cccccccccccc',xb='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const as=(uid,sql)=>run(`begin;set local role authenticated;set local "request.jwt.claim.sub"='${uid??''}';${sql};rollback;`);
const read=uid=>as(uid,'select count(*) from public.messages');
run(`do $$begin if not exists(select from pg_roles where rolname='anon') then create role anon;end if;if not exists(select from pg_roles where rolname='authenticated') then create role authenticated;end if;if not exists(select from pg_roles where rolname='service_role')then create role service_role bypassrls;end if;end$$;create database ${database};`,'postgres');
try{
  assert.match(run('show server_version;'),/^17\./);
  run(`create schema auth;create schema private;create type public.app_role as enum('user','xooter','admin');
    create function auth.uid()returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create table public.user_roles(user_id uuid,role public.app_role);
    create function private.has_role(p_user_id uuid,p_role public.app_role)returns boolean language sql stable security definer set search_path='' as $$select exists(select from public.user_roles where user_id=p_user_id and role=p_role)$$;
    create function public.has_role(p_user_id uuid,p_role public.app_role)returns boolean language sql stable as $$select private.has_role(p_user_id,p_role)$$;
    grant usage on schema public,auth,private to authenticated;grant usage on schema public,auth to anon;
    create table public.xooters(id uuid primary key,user_id uuid);
    create table public.bookings(id uuid primary key,user_id uuid,xooter_id uuid);
    create table public.xooter_jobs(id uuid primary key,booking_id uuid,xooter_id uuid,state text);
    create table public.messages(id uuid primary key,booking_id uuid,body text);
    alter table public.xooters enable row level security;alter table public.bookings enable row level security;
    alter table public.xooter_jobs enable row level security;alter table public.messages enable row level security;
    grant select on public.xooters,public.bookings,public.xooter_jobs,public.messages to authenticated;
    create policy xooters_self on public.xooters for select to authenticated using(user_id=(select auth.uid())or private.has_role((select auth.uid()),'admin'));
    create policy bookings_participant_read on public.bookings for select to authenticated using(user_id=(select auth.uid())or public.has_role((select auth.uid()),'admin')or exists(select from public.xooter_jobs j join public.xooters x on x.id=j.xooter_id where j.booking_id=bookings.id and x.user_id=(select auth.uid())and j.state='accepted'));
    create policy jobs_read on public.xooter_jobs for select to authenticated using(exists(select from public.xooters x where x.id=xooter_jobs.xooter_id and x.user_id=(select auth.uid()))or exists(select from public.bookings b where b.id=xooter_jobs.booking_id and b.user_id=(select auth.uid()))or public.has_role((select auth.uid()),'admin'));
    create policy messages_participants_select on public.messages for select to authenticated using(exists(select from public.bookings b left join public.xooters x on x.id=b.xooter_id where b.id=messages.booking_id and(b.user_id=(select auth.uid())or x.user_id=(select auth.uid())or private.has_role((select auth.uid()),'admin'))));
    insert into public.xooters values('${xa}','${wa}'),('${xb}','${wb}');
    insert into public.bookings values('${ba}','${ca}','${xa}'),('${bb}','${cb}','${xb}');
    insert into public.xooter_jobs values('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','${ba}','${xa}','accepted'),('ffffffff-ffff-4fff-8fff-ffffffffffff','${bb}','${xb}','offered');
    insert into public.messages values('99999999-9999-4999-8999-999999999999','${ba}','synthetic ciphertext A'),('88888888-8888-4888-8888-888888888888','${bb}','synthetic ciphertext B');
    insert into public.user_roles values('${admin}','admin');`);
  assert.throws(()=>read(wa),e=>String(e.stderr).includes('42P17'),'Actual old policy must reproduce recursive read SQLSTATE42P17');
  const policySnapshot=run("select string_agg(policyname||':'||qual,'|' order by policyname)from pg_policies where schemaname='public'and tablename in('messages','xooter_jobs');");
  let migration=readFileSync(new URL('../../supabase/migrations/20261026020929_booking_chat_nonrecursive_read.sql',import.meta.url),'utf8');
  if(process.env.XOOT_CHAT_TEST_PLANT==='no-accepted-job'){
    const before=migration;migration=migration.replace(" and j.state = 'accepted'",'');assert.notEqual(migration,before);
  }else if(process.env.XOOT_CHAT_TEST_PLANT==='invoker'){
    const before=migration;migration=migration.replace('stable security definer','stable security invoker');assert.notEqual(migration,before);
  }else if(process.env.XOOT_CHAT_TEST_PLANT)throw new Error('Unknown negative control');
  run(migration);
  const ids=(who,table)=>as(who,`select coalesce(string_agg(id::text,','order by id),'')from public.${table}`);
  assert.equal(ids(ca,'bookings'),ba);assert.equal(ids(cb,'bookings'),bb);assert.equal(ids(wa,'bookings'),ba);assert.equal(ids(wb,'bookings'),'');
  assert.equal(ids(ca,'messages'),'99999999-9999-4999-8999-999999999999');assert.equal(ids(cb,'messages'),'88888888-8888-4888-8888-888888888888');
  assert.equal(ids(wa,'messages'),'99999999-9999-4999-8999-999999999999');assert.equal(ids(wb,'messages'),'');
  assert.equal(ids(wa,'xooter_jobs'),'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee');assert.equal(ids(cb,'xooter_jobs'),'ffffffff-ffff-4fff-8fff-ffffffffffff');
  assert.equal(read('00000000-0000-4000-8000-000000000000'),'0');
  assert.equal(as(ca,'select private.xoot_can_read_booking(null)'),'f');
  assert.equal(as(ca,'select count(*) from public.bookings'),'1');assert.equal(as(wa,'select count(*) from public.bookings'),'1');assert.equal(as(wb,'select count(*) from public.bookings'),'0');assert.equal(as(wa,'select count(*) from public.xooter_jobs'),'1');assert.equal(as(cb,'select count(*) from public.xooter_jobs'),'1');assert.equal(read(ca),'1');assert.equal(read(cb),'1');assert.equal(read(wa),'1');assert.equal(read(wb),'0','Unaccepted Xooter must not read');assert.equal(read(admin),'2');assert.equal(read(null),'0');
  assert.equal(as(ca,`select private.xoot_can_read_booking('${bb}')`),'f');
  assert.equal(as(ca,"select private.xoot_can_read_booking('00000000-0000-4000-8000-000000000000')"),'f');
  assert.equal(as(ca,`set local "request.jwt.claims"='{"user_metadata":{"role":"admin"}}';select count(*) from public.messages`),'1','User metadata must not grant admin access');
  assert.equal(run("select string_agg(policyname||':'||qual,'|' order by policyname)from pg_policies where schemaname='public'and tablename in('messages','xooter_jobs');"),policySnapshot,'Message/job policies unchanged');
  run(`update public.xooter_jobs set state='declined'where booking_id='${ba}';`);assert.equal(read(wa),'0');
  run(`update public.xooter_jobs set state='accepted'where booking_id='${ba}';update public.bookings set xooter_id='${xb}'where id='${ba}';`);assert.equal(read(wa),'0','Reassigned old Xooter denied');assert.equal(read(wb),'0','No accepted matching new assignment');
  run(`insert into public.xooter_jobs values('77777777-7777-4777-8777-777777777777','${ba}','${xb}','accepted');`);assert.equal(read(wb),'1');
  run(`do $$begin
    if has_function_privilege('anon','private.xoot_can_read_booking(uuid)','execute')then raise exception 'Anon execute leak';end if;
    if has_schema_privilege('authenticated','private','create')then raise exception 'Private schema write leak';end if;
    if has_table_privilege('authenticated','public.messages','insert')or has_table_privilege('authenticated','public.messages','update')or has_table_privilege('authenticated','public.messages','delete')then raise exception 'Message write leak';end if;
    if not(select relrowsecurity from pg_class where oid='public.messages'::regclass)then raise exception 'RLS disabled';end if;
    if not(select prosecdef and proconfig=array['search_path=""'] from pg_proc where oid='private.xoot_can_read_booking(uuid)'::regprocedure)then raise exception 'Unsafe predicate context';end if;
    if not(select r.rolsuper or r.rolbypassrls from pg_proc p join pg_roles r on r.oid=p.proowner where p.oid='private.xoot_can_read_booking(uuid)'::regprocedure)then raise exception 'Predicate owner must bypass the recursive policies';end if;
  end$$;`);
  console.log('PASS: old recursive policy42P17; owner/accepted-assigned-Xooter/admin reads; outsiders, offers, reassignments and empty identity denied; private grants/search_path and existing message/job policies preserved');
}finally{run(`drop database ${database} with(force);`,'postgres');}
