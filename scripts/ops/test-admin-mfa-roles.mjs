// Real PostgreSQL 17, disposable loopback-only database and synthetic identities.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

assert.equal(process.env.XOOT_PG_TEST_INTENT, 'admin-mfa-roles');
assert.ok(['127.0.0.1', '::1'].includes(process.env.PGHOST), 'Loopback only');
assert.ok(process.env.XOOT_PG_MODULE && process.env.PGUSER && process.env.PGPASSWORD);
assert.ok(!process.env.PGSERVICE && !process.env.PGSERVICEFILE);
const { default: pg } = await import(pathToFileURL(resolve(process.env.XOOT_PG_MODULE)).href);
const settings = { host: process.env.PGHOST, port: Number(process.env.PGPORT), user: process.env.PGUSER,
  password: process.env.PGPASSWORD, database: 'postgres', ssl: false, connectionTimeoutMillis: 12000, statement_timeout: 10000 };
const migration = readFileSync(new URL('../../supabase/migrations/20261022153000_admin_roles_require_aal2.sql', import.meta.url), 'utf8');
const database = 'xoot_admin_mfa_' + randomUUID().replaceAll('-', '');
const admin = new pg.Client(settings);
const ownedRoles = [];
let db, created = false, tests = 0;
const pass = name => console.log('ok ' + (++tests) + ' - ' + name);
const owner = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const customer = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const original = `create or replace function private.has_role(_user_id uuid,_role public.app_role)
  returns boolean language sql stable security definer set search_path='' as $$
    select exists (select 1 from public.user_roles where user_id=_user_id and role=_role)
  $$`;
async function asClient(id, aal, query) {
  await db.query('begin');
  try {
    await db.query('set local role authenticated');
    await db.query("select set_config('request.jwt.claims',$1,true)", [JSON.stringify({ sub: id, role: 'authenticated', ...(aal ? { aal } : {}) })]);
    return await db.query(query);
  } finally { await db.query('rollback'); }
}
try {
  await admin.connect();
  const version = Number((await admin.query('show server_version_num')).rows[0].server_version_num);
  assert.ok(version >= 170000 && version < 180000, 'PostgreSQL 17 required');
  for (const role of ['anon', 'authenticated', 'service_role']) {
    if (!(await admin.query('select 1 from pg_roles where rolname=$1', [role])).rowCount) {
      await admin.query('create role ' + role + ' nologin ' + (role === 'service_role' ? 'bypassrls' : 'nobypassrls')); ownedRoles.push(role);
    }
  }
  await admin.query('create database "' + database + '"'); created = true;
  db = new pg.Client({ ...settings, database }); await db.connect();
  await db.query(`create schema auth; create schema private; create type public.app_role as enum ('user','xooter','admin');
    create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
    create function auth.uid() returns uuid language sql stable as $$ select (auth.jwt()->>'sub')::uuid $$;
    create table public.user_roles(user_id uuid,role public.app_role,unique(user_id,role));
    insert into public.user_roles values ('${owner}','admin'),('${owner}','xooter'),('${customer}','user');
    create table public.private_admin_queue(id integer); insert into public.private_admin_queue values(1);
    alter table public.private_admin_queue enable row level security;
    grant usage on schema private,auth to authenticated; grant select on public.private_admin_queue to authenticated;`);
  await db.query(original);
  await db.query("create policy admin_only on public.private_admin_queue for select to authenticated using (private.has_role(auth.uid(),'admin'))");
  assert.equal((await asClient(owner, 'aal1', 'select * from public.private_admin_queue')).rowCount, 1);
  pass('negative control reproduces first-factor-only admin data exposure');
  const before = (await db.query("select proowner,proacl from pg_proc where oid='private.has_role(uuid,public.app_role)'::regprocedure")).rows[0];
  await db.query(migration);
  const after = (await db.query("select proowner,proacl from pg_proc where oid='private.has_role(uuid,public.app_role)'::regprocedure")).rows[0];
  assert.deepEqual(after, before); pass('migration preserves predicate ownership and EXECUTE ACL');
  assert.equal((await asClient(owner, 'aal1', 'select * from public.private_admin_queue')).rowCount, 0);
  pass('admin at aal1 cannot read the sensitive queue under RLS');
  assert.equal((await asClient(owner, null, 'select * from public.private_admin_queue')).rowCount, 0);
  pass('missing assurance denies admin access');
  assert.equal((await asClient(owner, 'aal2', 'select * from public.private_admin_queue')).rowCount, 1);
  pass('verified admin at aal2 retains access');
  assert.equal((await asClient(customer, 'aal2', 'select * from public.private_admin_queue')).rowCount, 0);
  pass('aal2 does not turn a customer into an admin');
  assert.equal((await asClient(owner, 'aal1', "select private.has_role(auth.uid(),'xooter') as allowed")).rows[0].allowed, true);
  assert.equal((await asClient(customer, 'aal1', "select private.has_role(auth.uid(),'user') as allowed")).rows[0].allowed, true);
  pass('ordinary customer and worker role semantics are unchanged');
  await db.query(migration);
  assert.equal((await asClient(owner, 'aal1', 'select * from public.private_admin_queue')).rowCount, 0);
  pass('repeat migration remains safe');
  await db.query("create or replace function private.has_role(_user_id uuid,_role public.app_role) returns boolean language sql stable security definer set search_path='' as $$select true$$");
  await assert.rejects(() => db.query(migration), /unexpected role predicate body/);
  pass('unknown predecessor refuses migration rather than overwriting it');
  console.log(JSON.stringify({ status: 'passed', postgresVersion: version, tests, syntheticOnly: true, actualJwtAcceptance: false }));
} finally {
  if (db) await db.end();
  if (created) await admin.query('drop database if exists "' + database + '" with (force)');
  for (const role of ownedRoles.reverse()) await admin.query('drop role ' + role);
  await admin.end();
}
