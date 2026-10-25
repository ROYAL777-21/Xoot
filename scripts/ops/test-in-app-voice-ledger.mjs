import { execFileSync, spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

// Destructive fixtures are confined to a newly-created, labelled, network-isolated local container.
if (process.env.XOOT_PG_TEST_INTENT !== 'in-app-voice-ledger') throw new Error('Explicit local voice-ledger test intent required');
const container = process.env.XOOT_VOICE_TEST_CONTAINER;
if (!/^xoot-voice-sql-[0-9]+$/.test(container ?? '')) throw new Error('A named local voice test container is required');
const inspect = JSON.parse(execFileSync('docker', ['inspect', container], { encoding: 'utf8' }))[0];
assert.equal(inspect.Config.Labels?.['xoot.test.intent'], 'in-app-voice-ledger');
assert.equal(inspect.HostConfig.NetworkMode, 'none');
assert.ok(!inspect.Mounts.some(m => m.Type === 'bind'), 'No host filesystem bind mounts allowed');
const args = ['exec', '-i', container, 'psql', '-X', '-q', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1', '-At'];
const sql = input => execFileSync('docker', args, { input, encoding: 'utf8', stdio: ['pipe','pipe','pipe'] }).trim();
const sqlAsync = input => new Promise((resolve,reject) => {
  const child = spawn('docker',args,{stdio:['pipe','pipe','pipe']}); let out='',err='';
  child.stdout.on('data',chunk=>{out+=chunk;});child.stderr.on('data',chunk=>{err+=chunk;});
  child.on('error',reject);child.on('close',code=>code===0?resolve(out.trim()):reject(new Error(err)));
  child.stdin.end(input);
});
function heldSql(input) {
  const child=spawn('docker',args,{stdio:['pipe','pipe','pipe']}); let out='',err='',ready;
  const marker=new Promise((resolve,reject)=>{ready=resolve;child.once('error',reject);});
  const done=new Promise((resolve,reject)=>{
    child.stdout.on('data',chunk=>{out+=chunk;if(out.includes('XOOT_ROOM_LOCK_HELD'))ready();});
    child.stderr.on('data',chunk=>{err+=chunk;});child.on('error',reject);
    child.on('close',code=>code===0?resolve(out.trim()):reject(new Error(err)));
  });
  done.catch(()=>{});
  child.stdin.write(input+" select 'XOOT_ROOM_LOCK_HELD';\n");
  return {marker,done,finish:commit=>child.stdin.end(commit?'commit;\n':'rollback;\n')};
}
const pause = ms => new Promise(resolve=>setTimeout(resolve,ms));
assert.equal(sql("select count(*) from information_schema.tables where table_schema in ('public','auth');"),'0','Test requires a pristine local database');
sql(`create extension pg_cron;
  create role anon; create role authenticated; create role service_role bypassrls;
  create schema auth; create table auth.users(id uuid primary key);
  create table public.bookings(id uuid primary key);
  create table public.masked_call_sessions(id uuid primary key);
  alter table public.masked_call_sessions enable row level security;
  grant select,truncate,references,trigger on public.masked_call_sessions to anon,authenticated;
  grant all on public.masked_call_sessions to service_role;
  alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
  insert into auth.users values ('11111111-1111-4111-8111-111111111111'),('11111111-1111-4111-8111-222222222222');
  insert into public.bookings values ('22222222-2222-4222-8222-222222222222'),('33333333-3333-4333-8333-333333333333');`);
let migration = readFileSync(new URL('../../supabase/migrations/20261025191835_in_app_voice_ephemeral_sessions.sql',import.meta.url),'utf8');
if (process.env.XOOT_VOICE_TEST_PLANT === 'no-room-lock') {
  const actual = migration;
  migration = migration.replace('where r.id = p_room_id for update;', 'where r.id = p_room_id;');
  assert.notEqual(migration,actual,'The concurrency negative control must actually remove the callback room lock');
} else if (process.env.XOOT_VOICE_TEST_PLANT) throw new Error('Unknown local negative control');
const guard = `do $$ begin if has_table_privilege('anon','public.xoot_in_app_voice_sessions','TRUNCATE') then raise exception 'Client TRUNCATE regression detected'; end if; end $$;`;
const broken = migration.replace('revoke all on public.xoot_in_app_voice_sessions from public, anon, authenticated, service_role;','');
assert.notEqual(broken,migration);
assert.throws(()=>sql(`begin; ${broken} ${guard} rollback;`),/Command failed/);
sql(`begin; ${migration} ${guard} commit;`);
const actor='11111111-1111-4111-8111-111111111111', worker='11111111-1111-4111-8111-222222222222';
const booking='22222222-2222-4222-8222-222222222222', account=`AC${'a'.repeat(32)}`, conference=`CF${'b'.repeat(32)}`;
const sid = c => `CA${c.repeat(32)}`;
const register = (c,role='client',seconds=240) => `select room_id||'|'||seconds from public.xoot_register_in_app_voice_join('${booking}','${role==='client'?actor:worker}','${account}','${sid(c)}','${role}',${seconds});`;
const event = (room,kind,seq,c=null,cf=conference,acct=account) => `select public.xoot_apply_in_app_voice_event('${room}','${acct}','${cf}',${seq},'${kind}',${c ? `'${sid(c)}'` : 'null'});`;
const clear = () => sql('delete from public.xoot_in_app_voice_rooms;');
const pair = () => { const [room] = sql('set role service_role;'+register('c')).split('|'); assert.ok(room);assert.equal(sql(register('d','contractor')).split('|')[0],room);return room; };
sql(`do $$ declare r text; p text; t text; f text; begin
  foreach t in array array['xoot_in_app_voice_rooms','xoot_in_app_voice_sessions'] loop
    if not (select relrowsecurity from pg_class where oid=('public.'||t)::regclass) then raise exception 'RLS absent'; end if;
    if exists(select from pg_policies where schemaname='public' and tablename=t) then raise exception 'Unexpected client policy'; end if;
    foreach r in array array['anon','authenticated'] loop
      foreach p in array array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'] loop
        if has_table_privilege(r,'public.'||t,p) then raise exception 'Client privilege remains: % % %',r,t,p; end if;
      end loop;
    end loop;
    foreach p in array array['SELECT','INSERT','UPDATE','DELETE'] loop
      if not has_table_privilege('service_role','public.'||t,p) then raise exception 'Server CRUD absent'; end if;
    end loop;
  end loop;
  foreach f in array array['public.xoot_register_in_app_voice_join(uuid,uuid,text,text,text,integer)','public.xoot_apply_in_app_voice_event(uuid,text,text,bigint,text,text)'] loop
    foreach r in array array['anon','authenticated'] loop
      if has_function_privilege(r,f,'EXECUTE') then raise exception 'Client RPC execution remains'; end if;
    end loop;
    if not has_function_privilege('service_role',f,'EXECUTE') then raise exception 'Server RPC absent'; end if;
    if (select prosecdef from pg_proc where oid=f::regprocedure) then raise exception 'RPC must be invoker'; end if;
  end loop;
  foreach r in array array['anon','authenticated'] loop
    if has_table_privilege(r,'public.masked_call_sessions','TRUNCATE') then raise exception 'Legacy TRUNCATE remains'; end if;
  end loop;
end $$;`);
let room = pair();
assert.equal(sql(register('e')),'','Duplicate role must be denied');
const expires = sql(`select expires_at from public.xoot_in_app_voice_rooms where id='${room}';`);
assert.ok(Number(sql(register('c', 'client',300)).split('|')[1])<=240,'Replay cannot renew');
assert.equal(sql(`select expires_at from public.xoot_in_app_voice_rooms where id='${room}';`),expires);
assert.equal(sql(`select count(distinct expires_at) from public.xoot_in_app_voice_sessions where room_id='${room}';`),'1');
assert.equal(sql(event(room,'participant-join',1,'c',`CF${'f'.repeat(32)}`,`AC${'f'.repeat(32)}`)),'f');
assert.equal(sql(event(room,'participant-join',1,'e')),'f','Unregistered participant cannot bind a room');
assert.equal(sql(event(room,'conference-start',1)),'t');
assert.equal(sql(event(room,'conference-end',5)),'t');
assert.equal(sql(event(room,'participant-join',2,'d')),'f');
assert.equal(sql(event(room,'participant-join',8,'d')),'f');
assert.equal(sql(`select count(*) from public.xoot_in_app_voice_sessions where room_id='${room}' and status='completed' and finished_at is not null;`),'2','End closes even queued/unbound participant');
assert.equal(sql(register('c')),'','Completed CallSid cannot reopen');
assert.notEqual(sql(register('e')).split('|')[0],room,'Fresh redial gets an opaque new room immediately');
clear();room=pair();
assert.equal(sql(event(room,'participant-join',9,'d')),'t');
assert.equal(sql(event(room,'participant-leave',3,'c')),'t','A reordered terminal leave wins; endConferenceOnExit is true');
assert.equal(sql(`select count(*) from public.xoot_in_app_voice_sessions where status='completed';`),'2');
clear();room=pair();
sql(`delete from public.xoot_in_app_voice_sessions where call_sid='${sid('c')}';`);
assert.equal(sql(event(room,'participant-leave',4,'d')),'t','A remaining participant never depends on an original anchor call');
console.log('Real PostgreSQL: client table/RPC denial, invoker rights, bounded/replayed leases, shared expiry, terminal ordering and fresh redial passed');

// Actual separate database connections: hold the first RPC transaction and prove the competing
// RPC waits on a lock, then assert the committed result in both delivery orders.
async function awaitState(app,condition) {
  for(let i=0;i<50;i++){if(sql(`select count(*) from pg_stat_activity where application_name='${app}' and ${condition};`)==='1')return;await pause(20);}
  throw new Error('Concurrency barrier not observed: '+app);
}
for(const endFirst of [true,false]) {
  clear();room=pair();
  const first=heldSql(`set application_name='xoot-voice-first'; begin; ${endFirst?event(room,'conference-end',5):event(room,'participant-join',2,'d')}`);
  let second, released=false;
  try {
    let deadline;try{await Promise.race([first.marker,new Promise((_,reject)=>{deadline=setTimeout(()=>reject(new Error('First room-lock marker timed out')),15000);})]);}finally{clearTimeout(deadline);}
    second=sqlAsync(`set application_name='xoot-voice-second'; ${endFirst?event(room,'participant-join',2,'d'):event(room,'conference-end',5)}`);
    second.catch(()=>{});
    await awaitState('xoot-voice-second',"wait_event_type='Lock'");
    first.finish(true);released=true;
    const [,result]=await Promise.all([first.done,second]);
    assert.equal(result,endFirst?'f':'t');
    assert.equal(sql(`select count(*) from public.xoot_in_app_voice_sessions where room_id='${room}' and status='completed';`),'2');
  } finally {
    if(!released)first.finish(false);
    await Promise.allSettled([first.done,second]);
  }
}
console.log('Real concurrent connections: late join waits for end; end waits for join; both leave all legs terminal');
clear();
// Database constraints enforce the same expiry even for a later participant or direct bad writer.
room=sql(register('c','client',60)).split('|')[0];
assert.ok(Number(sql(register('d','contractor',300)).split('|')[1])<=60);
assert.throws(()=>sql(`update public.xoot_in_app_voice_sessions set expires_at=expires_at+interval '1 second';`),/Command failed/);
assert.throws(()=>sql(`update public.xoot_in_app_voice_rooms set expires_at=created_at+interval '6 minutes';`),/Command failed/);
assert.throws(()=>sql(`update public.xoot_in_app_voice_sessions set status='completed';`),/Command failed/);
clear();room=pair();
// Actual scheduler, not a manually invoked DELETE. Cascading children must disappear with room.
sql(`insert into public.xoot_in_app_voice_rooms(id,booking_id,account_sid,created_at,expires_at)
 values('44444444-4444-4444-8444-444444444444','33333333-3333-4333-8333-333333333333','${account}',clock_timestamp()-interval '2 minutes',clock_timestamp()-interval '1 minute');
 insert into public.xoot_in_app_voice_sessions(call_sid,room_id,actor_id,voice_role,created_at,expires_at)
 select '${sid('f')}',id,'${actor}','client',created_at,expires_at from public.xoot_in_app_voice_rooms where id='44444444-4444-4444-8444-444444444444';`);
let purged=false;
for(let i=0;i<40;i++){
  if(sql("select count(*) from public.xoot_in_app_voice_rooms where id='44444444-4444-4444-8444-444444444444';")==='0'){purged=true;break;}await pause(2000);
}
assert.ok(purged,'Actual pg_cron must purge expired room within 80 seconds');
assert.equal(sql(`select count(*) from public.xoot_in_app_voice_sessions where call_sid='${sid('f')}';`),'0','Expired room children must cascade');
assert.equal(sql(`select count(*) from public.xoot_in_app_voice_sessions where room_id='${room}';`),'2','Unexpired participants remain');
console.log('Real pg_cron worker: expired room and participants purged; unexpired room retained');
console.log(sql("select 'PostgreSQL '||current_setting('server_version')||', pg_cron '||extversion from pg_extension where extname='pg_cron';"));
