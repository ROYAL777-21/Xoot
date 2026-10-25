import { execFileSync } from 'node:child_process';
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
const sql = input => execFileSync('docker', ['exec', '-i', container, 'psql', '-X', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1', '-At'],
  { input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
assert.equal(sql("select count(*) from information_schema.tables where table_schema in ('public','auth');").trim(), '0', 'Test requires a pristine local database');
sql(`create extension pg_cron;
  create role anon; create role authenticated; create role service_role bypassrls;
  create schema auth; create table auth.users(id uuid primary key);
  create table public.bookings(id uuid primary key);
  create table public.masked_call_sessions(id uuid primary key);
  alter table public.masked_call_sessions enable row level security;
  grant select,truncate,references,trigger on public.masked_call_sessions to anon,authenticated;
  grant all on public.masked_call_sessions to service_role;
  alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
  insert into auth.users values ('11111111-1111-4111-8111-111111111111');
  insert into public.bookings values ('22222222-2222-4222-8222-222222222222'),('33333333-3333-4333-8333-333333333333');`);
const migration = readFileSync(new URL('../../supabase/migrations/20261025151723_in_app_voice_ephemeral_sessions.sql', import.meta.url), 'utf8');
const guard = `do $$ begin
  if has_table_privilege('anon','public.xoot_in_app_voice_sessions','TRUNCATE') then
    raise exception 'Client TRUNCATE regression detected';
  end if;
end $$;`;
const broken = migration.replace('revoke all on public.xoot_in_app_voice_sessions from public, anon, authenticated, service_role;', '');
assert.notEqual(broken, migration);
assert.throws(() => sql(`begin; ${broken} ${guard} rollback;`), /Command failed/, 'The planted default-grant defect must fail');
console.log('Negative control: planted client TRUNCATE privilege was rejected');
sql(`begin; ${migration} ${guard} commit;`);
const actor = '11111111-1111-4111-8111-111111111111', booking = '22222222-2222-4222-8222-222222222222';
const insert = (call, role = 'client', lease = "now()+interval '4 minutes'", created = 'now()', job = booking) =>
  `insert into public.xoot_in_app_voice_sessions(call_sid,account_sid,booking_id,actor_id,participant_role,created_at,expires_at)
   values ('CA${call.repeat(32)}','AC${'a'.repeat(32)}','${job}','${actor}','${role}',${created},${lease});`;
sql(`do $$ declare r text; p text; begin
  if not (select relrowsecurity from pg_class where oid='public.xoot_in_app_voice_sessions'::regclass) then raise exception 'RLS absent'; end if;
  if exists(select from pg_policies where schemaname='public' and tablename='xoot_in_app_voice_sessions') then raise exception 'Unexpected client policy'; end if;
  foreach r in array array['anon','authenticated'] loop
    foreach p in array array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'] loop
      if has_table_privilege(r,'public.xoot_in_app_voice_sessions',p) then raise exception 'Client privilege remains: % %',r,p; end if;
    end loop;
    if has_table_privilege(r,'public.masked_call_sessions','TRUNCATE') then raise exception 'Legacy TRUNCATE remains'; end if;
  end loop;
  foreach p in array array['SELECT','INSERT','UPDATE','DELETE'] loop
    if not has_table_privilege('service_role','public.xoot_in_app_voice_sessions',p) then raise exception 'Server CRUD absent'; end if;
  end loop;
end $$;
set role service_role; ${insert('b')} reset role;
do $$ begin
  begin ${insert('c')} raise exception 'Duplicate active role accepted'; exception when unique_violation then null; end;
  begin ${insert('d','contractor',"now()+interval '6 minutes'")} raise exception 'Oversized lease accepted'; exception when check_violation then null; end;
  begin update public.xoot_in_app_voice_sessions set status='completed'; raise exception 'Incomplete terminal row accepted'; exception when check_violation then null; end;
end $$;
${insert('e','contractor')}
set role anon;
do $$ begin
  begin perform * from public.xoot_in_app_voice_sessions; raise exception 'Anonymous read accepted'; exception when insufficient_privilege then null; end;
  begin truncate public.xoot_in_app_voice_sessions; raise exception 'Anonymous truncate accepted'; exception when insufficient_privilege then null; end;
end $$;
reset role;
set role authenticated;
do $$ begin
  begin perform * from public.xoot_in_app_voice_sessions; raise exception 'Authenticated read accepted'; exception when insufficient_privilege then null; end;
  begin truncate public.xoot_in_app_voice_sessions; raise exception 'Authenticated truncate accepted'; exception when insufficient_privilege then null; end;
end $$; reset role;
${insert('f','client',"now()-interval '1 minute'","now()-interval '2 minutes'",'33333333-3333-4333-8333-333333333333')}`);
assert.equal(sql("select count(*) from public.xoot_in_app_voice_sessions;").trim(), '3');
assert.equal(sql("select count(*) from cron.job where jobname='purge-xoot-in-app-voice-sessions' and active and schedule='* * * * *';").trim(), '1');
console.log('Real PostgreSQL: RLS, client denial, server CRUD, role uniqueness, bounded leases and terminal constraints passed');
let purged = false;
for (let i = 0; i < 40; i++) {
  if (sql("select count(*) from public.xoot_in_app_voice_sessions where expires_at <= now();").trim() === '0') { purged = true; break; }
  await new Promise(resolve => setTimeout(resolve, 2000));
}
assert.ok(purged, 'The actual pg_cron worker must purge the expired fixture within 80 seconds');
assert.equal(sql("select count(*) from public.xoot_in_app_voice_sessions;").trim(), '2', 'Unexpired calls must remain');
console.log('Real pg_cron worker: expired fixture purged; unexpired fixtures preserved');
console.log(sql("select 'PostgreSQL '||current_setting('server_version')||', pg_cron '||extversion from pg_extension where extname='pg_cron';").trim());
