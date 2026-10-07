#!/usr/bin/env node
// Real PostgreSQL 17 assertions, synthetic data only. Never connect off loopback.
// Required intent/PG settings follow test-booking-benefit-locks.mjs. Passwords
// are read in process; no credential values or connection strings are logged.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

assert.equal(process.env.XOOT_PG_TEST_INTENT, 'notifications-realtime-permissions', 'Explicit local test intent required');
assert.ok(['127.0.0.1', '::1'].includes(process.env.PGHOST), 'Literal loopback PGHOST required');
assert.ok(/^\d+$/.test(process.env.PGPORT ?? '') && Number(process.env.PGPORT) > 0
  && Number(process.env.PGPORT) <= 65535 && process.env.PGUSER, 'Explicit valid PGPORT and PGUSER required');
assert.ok(!process.env.PGSERVICE && !process.env.PGSERVICEFILE, 'PG service overrides prohibited');
const { default: pg } = await import(process.env.XOOT_PG_MODULE
  ? pathToFileURL(resolve(process.env.XOOT_PG_MODULE)).href : 'pg');
const settings = {
  host: process.env.PGHOST, port: Number(process.env.PGPORT), user: process.env.PGUSER,
  password: process.env.XOOT_PG_PASSWORD_FILE
    ? readFileSync(process.env.XOOT_PG_PASSWORD_FILE, 'utf8').trim() : process.env.PGPASSWORD,
  database: 'postgres', ssl: false, connectionTimeoutMillis: 15000,
  statement_timeout: 10000, lock_timeout: 5000, query_timeout: 12000,
  application_name: 'xoot_synthetic_notifications_test',
};
assert.ok(settings.password, 'Explicit test password required');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const source = path => readFileSync(resolve(root, path), 'utf8');
function section(path, start, end) {
  const text = source(`supabase/migrations/${path}`);
  const first = text.indexOf(start), last = text.indexOf(end, first + start.length);
  assert.ok(first >= 0 && last > first, `Source migration section missing: ${path}`);
  assert.equal(text.indexOf(start, first + start.length), -1, `Ambiguous source section: ${path}`);
  return text.slice(first, last);
}
const migration = source('supabase/migrations/20261002000000_notifications_realtime_permissions.sql');
const suffix = randomUUID().replaceAll('-', '');
const database = `xoot_test_notifications_${suffix}`;
const inheritedRole = `xoot_test_inherited_${suffix}`;
const admin = new pg.Client(settings);
const createdRoles = [];
const clients = [];
let connected = false, created = false, passed = false, version, count = 0, denialCount = 0;
const log = name => { count++; console.log(`ok ${count} - ${name}`); };
const apiRoles = ['anon', 'authenticated', 'service_role'];
const tables = ['notifications', 'push_tokens'];
const forbidden = ['TRUNCATE', 'TRIGGER'];
const roleState = async () => (await admin.query(`select rolname, rolsuper, rolinherit, rolcreaterole,
  rolcreatedb, rolcanlogin, rolreplication, rolbypassrls, rolconfig from pg_roles
  where rolname = any($1::text[]) order by rolname`, [apiRoles])).rows;
const membershipState = async () => (await admin.query(`select m.* from pg_auth_members m
  where m.member in (select oid from pg_roles where rolname = any($1::text[]))
     or m.roleid in (select oid from pg_roles where rolname = any($1::text[]))
  order by roleid, member, grantor`, [apiRoles])).rows;
let originalRoles, originalMemberships;

try {
  console.log('# Connecting to explicitly selected loopback PostgreSQL; no hosted writes');
  await admin.connect(); connected = true;
  version = Number((await admin.query('show server_version_num')).rows[0].server_version_num);
  assert.ok(version >= 170000 && version < 180000, 'PostgreSQL 17 required');
  originalRoles = await roleState(); originalMemberships = await membershipState();
  for (const role of apiRoles) {
    if (!originalRoles.some(row => row.rolname === role)) {
      await admin.query(`create role ${role} nologin ${role === 'service_role' ? 'bypassrls' : 'nobypassrls'}`);
      createdRoles.push(role);
    }
  }
  const roles = await roleState();
  for (const role of ['anon', 'authenticated']) {
    const row = roles.find(value => value.rolname === role);
    assert.ok(!row.rolsuper && !row.rolbypassrls, `${role} must exercise RLS as a non-bypass client`);
  }
  assert.ok(roles.find(row => row.rolname === 'service_role').rolbypassrls,
    'Existing service_role must have Supabase BYPASSRLS semantics; existing roles are never altered');
  await admin.query(`create database "${database}"`); created = true;
  for (let i = 0; i < 2; i++) {
    const client = new pg.Client({ ...settings, database });
    clients.push(client); await client.connect();
  }
  const [system, client] = clients;
  const rejects = async (connection, sql, params = [], code = '42501', message = null) => {
    await assert.rejects(connection.query(sql, params), error => {
      assert.equal(error.code, code);
      if (message) assert.match(error.message, message);
      return true;
    });
    denialCount++;
  };
  const as = async (role, owner = '') => {
    assert.ok(apiRoles.includes(role));
    await client.query(`set role ${role}`);
    await client.query("select set_config('request.jwt.claim.sub',$1,false)", [owner]);
  };
  const rows = async (connection, sql, params = []) => (await connection.query(sql, params)).rows;
  const effective = async (role, table, privilege) => (await rows(system,
    'select has_table_privilege($1,$2,$3) permitted', [role, `public.${table}`, privilege]))[0].permitted;
  const publication = async () => ({
    options: await rows(system, "select * from pg_publication where pubname='supabase_realtime'"),
    tables: await rows(system, `select schemaname,tablename,attnames,rowfilter from pg_publication_tables
      where pubname='supabase_realtime' order by schemaname,tablename`),
  });
  const policies = async () => rows(system, `select * from pg_policies where schemaname='public'
    and tablename in ('notifications','push_tokens') order by tablename,policyname`);
  const grants = async () => ({
    tables: await rows(system, `select c.relname, a.grantor, a.grantee, a.privilege_type, a.is_grantable
      from pg_class c cross join lateral aclexplode(c.relacl) a
      where c.oid in ('public.notifications'::regclass,'public.push_tokens'::regclass,'public.synthetic_published'::regclass)
        and not (a.privilege_type in ('TRUNCATE','TRIGGER') and (a.grantee=0
          or a.grantee in (select oid from pg_roles where rolname in ('anon','authenticated'))))
      order by c.relname,a.grantor,a.grantee,a.privilege_type`),
    columns: await rows(system, `select * from information_schema.column_privileges
      where table_schema='public' and table_name in ('notifications','push_tokens','synthetic_published')
        and privilege_type not in ('TRUNCATE','TRIGGER')
      order by table_name,column_name,grantee,grantor,privilege_type`),
  });
  const identity = async () => rows(system, `select c.relname,c.relreplident,i.indexrelid,i.indisprimary
    from pg_class c join pg_index i on i.indrelid=c.oid and i.indisprimary
    where c.oid in ('public.notifications'::regclass,'public.push_tokens'::regclass) order by c.relname`);
  await system.query(source('scripts/ops/fixtures/notifications-realtime-permissions.sql'));
  await system.query(section('20260423023359_05a7f962-54af-4dd0-bfd7-855789be1c67.sql',
    '-- 2. Notifications', '-- 3.'));
  await system.query(section('20260624114953_booking_policy_and_sensitive_access_notifications.sql',
    'alter table public.notifications enable row level security;', 'drop view if exists public.booking_sensitive_access;'));
  await system.query(section('20260624121516_policy_performance_hardening.sql',
    'drop policy if exists "notifications_select_own"', 'drop policy if exists "users view own native push subscriptions"'));
  await system.query(source('supabase/migrations/20260605000000_push_tokens.sql'));
  await system.query(section('20260627113000_performance_advisor_cleanup.sql',
    'alter table if exists public.push_tokens enable row level security;', 'alter table if exists public.twilio_webhook_events'));
  const owner = randomUUID(), other = randomUUID();
  await system.query('insert into auth.users(id) values($1),($2)', [owner, other]);
  const notification = (await rows(system, `insert into public.notifications(user_id,kind,title,body)
    values($1,'booking','Synthetic owner notification','Synthetic body') returning id`, [owner]))[0].id;
  const otherNotification = (await rows(system, `insert into public.notifications(user_id,kind,title)
    values($1,'booking','Synthetic other notification') returning id`, [other]))[0].id;
  const otherToken = (await rows(system, `insert into public.push_tokens(user_id,token,platform)
    values($1,'synthetic-other-token','ios') returning id`, [other]))[0].id;
  const beforePolicies = await policies(), beforeGrants = await grants(), beforeIdentity = await identity();
  const beforePublication = await publication();
  assert.deepEqual(beforePublication.tables.map(row => row.tablename), ['synthetic_published']);
  log('fixture loads actual source schema/grants/final RLS, with notifications absent from publication');

  for (const role of ['anon', 'authenticated']) {
    await as(role, owner);
    for (const table of tables) {
      assert.equal(await effective(role, table, 'TRUNCATE'), true);
      await client.query('begin');
      await client.query(`truncate public.${table}`);
      // Use the same session: another session would wait on TRUNCATE's lock.
      assert.equal((await rows(client, `select count(*) n from public.${table}`))[0].n, '0');
      await client.query('rollback');
      assert.ok(Number((await rows(system, `select count(*) n from public.${table}`))[0].n) > 0);
      log(`original ${role} TRUNCATE on ${table} succeeds despite owner RLS (rolled back)`);
      await client.query('begin');
      await client.query(`create trigger synthetic_client_trigger before insert on public.${table}
        for each row execute function public.synthetic_notification_trigger()`);
      await client.query('rollback');
      assert.equal(await effective(role, table, 'TRIGGER'), true);
    }
  }
  await system.query(migration);
  for (const role of ['anon', 'authenticated']) {
    await as(role, owner);
    for (const table of tables) {
      for (const privilege of forbidden) assert.equal(await effective(role, table, privilege), false);
      await rejects(client, `truncate public.${table}`);
      await rejects(client, `create trigger synthetic_client_trigger before insert on public.${table}
        for each row execute function public.synthetic_notification_trigger()`);
    }
    log(`${role} effective TRUNCATE/TRIGGER false on both tables; actual operations denied`);
  }
  assert.equal((await rows(system, `select count(*) n from pg_class c cross join lateral aclexplode(c.relacl) a
    where c.oid in ('public.notifications'::regclass,'public.push_tokens'::regclass)
      and a.grantee=0 and a.privilege_type in ('TRUNCATE','TRIGGER')`))[0].n, '0');
  log('PUBLIC has no target TRUNCATE/TRIGGER ACL entries');
  await as('authenticated', owner);
  assert.deepEqual((await rows(client, 'select id from public.notifications')).map(row => row.id), [notification]);
  assert.equal((await client.query('update public.notifications set read=true where id=$1', [notification])).rowCount, 1);
  assert.equal((await rows(system, 'select read from public.notifications where id=$1', [notification]))[0].read, true);
  log('authenticated owner SELECT and UPDATE(read) remain usable');
  assert.equal((await rows(client, 'select id from public.notifications where id=$1', [otherNotification])).length, 0);
  assert.equal((await client.query('update public.notifications set read=true where id=$1', [otherNotification])).rowCount, 0);
  assert.equal((await rows(system, 'select read from public.notifications where id=$1', [otherNotification]))[0].read, false);
  log('cross-owner notification SELECT/UPDATE(read) expose/change zero rows');
  for (const [column, value] of Object.entries({ id: randomUUID(), user_id: other, kind: 'rewrite',
    title: 'rewrite', body: 'rewrite', link: '/rewrite', created_at: '2000-01-01' })) {
    await rejects(client, `update public.notifications set ${column}=$1 where id=$2`, [value, notification]);
  }
  log('all seven non-read notification columns reject client rewrites');
  for (const role of ['anon', 'authenticated']) {
    await as(role, owner);
    await rejects(client, "insert into public.notifications(user_id,kind,title) values($1,'booking','forged')", [owner]);
    await rejects(client, 'delete from public.notifications where id=$1', [notification]);
  }
  log('both client roles reject notification INSERT/DELETE');
  await as('anon');
  assert.equal((await rows(client, 'select id from public.notifications')).length, 0);
  assert.equal((await rows(client, 'select id from public.push_tokens')).length, 0);
  log('anonymous notification and push-token SELECT return no rows');
  await as('authenticated', owner);
  const ownToken = (await rows(client, `insert into public.push_tokens(user_id,token,platform)
    values($1,'synthetic-owner-token','android') returning id`, [owner]))[0].id;
  assert.deepEqual((await rows(client, 'select id from public.push_tokens')).map(row => row.id), [ownToken]);
  assert.equal((await client.query("update public.push_tokens set token='synthetic-refresh' where id=$1", [ownToken])).rowCount, 1);
  assert.equal((await rows(client, 'select token from public.push_tokens where id=$1', [ownToken]))[0].token, 'synthetic-refresh');
  log('owner push-token INSERT/SELECT/UPDATE remain usable');
  assert.equal((await rows(client, 'select id from public.push_tokens where id=$1', [otherToken])).length, 0);
  assert.equal((await client.query("update public.push_tokens set token='forged' where id=$1", [otherToken])).rowCount, 0);
  assert.equal((await client.query('delete from public.push_tokens where id=$1', [otherToken])).rowCount, 0);
  await rejects(client, "insert into public.push_tokens(user_id,token,platform) values($1,'forged','web')", [other]);
  await rejects(client, 'update public.push_tokens set user_id=$1 where id=$2', [other, ownToken]);
  assert.equal((await rows(system, 'select token from public.push_tokens where id=$1', [otherToken]))[0].token, 'synthetic-other-token');
  log('cross-owner token read/update/delete/insert/owner-transfer denied without changing other token');
  assert.equal((await client.query('delete from public.push_tokens where id=$1', [ownToken])).rowCount, 1);
  assert.equal((await rows(system, 'select id from public.push_tokens where id=$1', [ownToken])).length, 0);
  log('owner push-token DELETE remains usable');
  await as('service_role');
  assert.equal((await client.query("insert into public.notifications(user_id,kind,title) values($1,'booking','service synthetic')", [owner])).rowCount, 1);
  assert.equal((await system.query("insert into public.notifications(user_id,kind,title) values($1,'booking','system synthetic')", [other])).rowCount, 1);
  log('BYPASSRLS service-role and table-owner system notification INSERT remain usable');
  assert.deepEqual(await policies(), beforePolicies); assert.deepEqual(await grants(), beforeGrants);
  assert.deepEqual(await identity(), beforeIdentity); assert.ok(beforeIdentity.every(row => row.relreplident === 'd'));
  log('all existing policies, other table/column grants and primary-key replica identities preserved');
  const afterPublication = await publication();
  assert.deepEqual(afterPublication.options, beforePublication.options);
  assert.deepEqual(afterPublication.tables.map(row => row.tablename), ['notifications', 'synthetic_published']);
  assert.deepEqual(afterPublication.tables.find(row => row.tablename === 'synthetic_published'), beforePublication.tables[0]);
  log('catalog publishes notifications; preserves existing filtered table/options; excludes push_tokens');
  await system.query(migration);
  assert.deepEqual(await publication(), afterPublication); assert.deepEqual(await policies(), beforePolicies);
  assert.deepEqual(await grants(), beforeGrants); assert.deepEqual(await identity(), beforeIdentity);
  log('repeated migration apply preserves catalog state');
  await system.query('begin');
  try {
    await system.query('grant truncate, trigger on public.notifications, public.push_tokens to public');
    for (const role of ['anon', 'authenticated']) for (const table of tables)
      for (const privilege of forbidden) assert.equal(await effective(role, table, privilege), true);
    await system.query(migration);
    for (const role of ['anon', 'authenticated']) for (const table of tables)
      for (const privilege of forbidden) assert.equal(await effective(role, table, privilege), false);
  } finally { await system.query('rollback'); }
  log('PUBLIC-only excess grants also lose effective client privileges');
  for (const role of ['anon', 'authenticated']) for (const table of tables) for (const privilege of forbidden) {
    await system.query('begin');
    try {
      // Transactional role/membership changes never commit or alter existing roles.
      await system.query(`create role ${inheritedRole} nologin`);
      await system.query(`grant ${inheritedRole} to ${role} with inherit true`);
      await system.query(`grant ${privilege} on public.${table} to ${inheritedRole}`);
      await system.query('grant truncate,trigger on public.notifications,public.push_tokens to anon,authenticated');
      await system.query('alter publication supabase_realtime drop table public.notifications');
      const failedPublication = await publication();
      assert.equal(await effective(role, table, privilege), true);
      await system.query('savepoint migration_failure');
      await rejects(system, migration, [], '42501', /Effective .* privilege remains/);
      await system.query('rollback to savepoint migration_failure');
      assert.equal(await effective(role, table, privilege), true);
      // A direct grant without the inherited path must also survive the failed DO.
      const otherRole = role === 'anon' ? 'authenticated' : 'anon';
      for (const target of tables) for (const deniedPrivilege of forbidden)
        assert.equal(await effective(otherRole, target, deniedPrivilege), true);
      assert.deepEqual(await publication(), failedPublication);
    } finally { await system.query('rollback'); }
  }
  log('all eight inherited client/table/privilege combinations fail clearly and atomically');
  await system.query('begin');
  try {
    await system.query('drop publication supabase_realtime');
    await system.query('grant truncate,trigger on public.notifications to authenticated');
    await system.query('savepoint missing_publication');
    await rejects(system, migration, [], '55000', /Required publication supabase_realtime is missing/);
    await system.query('rollback to savepoint missing_publication');
    assert.equal(await effective('authenticated', 'notifications', 'TRUNCATE'), true);
    assert.equal((await publication()).options.length, 0);
  } finally { await system.query('rollback'); }
  assert.deepEqual(await publication(), afterPublication);
  assert.equal((await rows(system, 'select 1 from pg_roles where rolname=$1', [inheritedRole])).length, 0);
  log('missing required publication fails clearly without partial revocations; test rollback restores publication');
  assert.equal(count, 23, 'Every required assertion group must execute');
  assert.equal(denialCount, 30, 'Every expected SQL rejection must execute');
  passed = true;
} finally {
  for (const client of clients) {
    await client.query('rollback').catch(() => {});
    await client.end();
  }
  if (created && /^xoot_test_notifications_[0-9a-f]{32}$/.test(database)) {
    await admin.query(`drop database "${database}"`);
    assert.equal((await admin.query('select 1 from pg_database where datname=$1', [database])).rowCount, 0);
  }
  for (const role of createdRoles.reverse()) await admin.query(`drop role ${role}`);
  if (connected && originalRoles) {
    assert.deepEqual(await roleState(), originalRoles);
    assert.deepEqual(await membershipState(), originalMemberships);
    await admin.end();
  }
  if (passed) console.log(JSON.stringify({ status: 'passed', postgresVersion: version, tests: count,
    expectedSqlRejections: denialCount, syntheticOnly: true, disposableDatabaseRemoved: true,
    existingRolesAndMembershipsPreserved: true, hostedWebSocketDeliveryVerified: false }));
}
