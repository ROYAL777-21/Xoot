// Synthetic fixtures on disposable loopback PostgreSQL only. Not JWT/device evidence.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

assert.equal(process.env.XOOT_PG_TEST_INTENT, 'service-zones');
assert.ok(['127.0.0.1', '::1'].includes(process.env.PGHOST), 'loopback DB only');
assert.ok(/^\d+$/.test(process.env.PGPORT ?? '') && process.env.PGUSER && process.env.PGPASSWORD);
assert.ok(!process.env.PGSERVICE && !process.env.PGSERVICEFILE && process.env.XOOT_PG_MODULE);
const { default: pg } = await import(pathToFileURL(resolve(process.env.XOOT_PG_MODULE)).href);
const config = { host: process.env.PGHOST, port: Number(process.env.PGPORT), user: process.env.PGUSER,
  password: process.env.PGPASSWORD, database: 'postgres', ssl: false,
  connectionTimeoutMillis: 12000, statement_timeout: 10000 };
const admin = new pg.Client(config);
const name = 'xoot_zones_' + randomUUID().replaceAll('-', '');
const createdRoles = [];
const connections = [];
let db, created = false;
try {
  await admin.connect();
  for (const role of ['anon', 'authenticated', 'service_role']) {
    if (!(await admin.query('select 1 from pg_roles where rolname=$1', [role])).rowCount) {
      await admin.query('create role ' + role + ' nologin ' + (role === 'service_role' ? 'bypassrls' : 'nobypassrls'));
      createdRoles.push(role);
    }
  }
  await admin.query('create database "' + name + '"'); created = true;
  db = new pg.Client({ ...config, database: name }); await db.connect();
  await db.query('create schema auth; create table auth.users (id uuid primary key)');
  await db.query(readFileSync(new URL('../../supabase/migrations/20261019185331_xoot_approved_service_zones.sql', import.meta.url), 'utf8'));
  for (const table of ['xoot_service_zones', 'xoot_coverage_query_budget']) {
    assert.equal((await db.query('select relrowsecurity from pg_class where oid=$1::regclass', ['public.' + table])).rows[0].relrowsecurity, true);
    for (const role of ['anon', 'authenticated']) {
      for (const privilege of ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE']) {
        assert.equal((await db.query('select has_table_privilege($1,$2,$3) as allowed', [role, 'public.' + table, privilege])).rows[0].allowed, false);
      }
    }
  }
  for (const role of ['anon', 'authenticated']) {
    assert.equal((await db.query("select has_function_privilege($1,'public.xoot_consume_coverage_query(uuid)','EXECUTE') as allowed", [role])).rows[0].allowed, false);
  }
  console.log('PASS: both private tables use RLS, client privileges absent, budget RPC service-only');
  const geometry = JSON.parse(readFileSync(new URL('../../data/service-zones/gauteng/gauteng.geojson', import.meta.url), 'utf8')).features[0].geometry;
  await db.query("insert into public.xoot_service_zones(name,geometry,service_types,boundary_source) values('Gauteng test only',$1,array['regular'],'MDB/OCHA validation')", [geometry]);
  assert.equal((await db.query('select count(*)::int as n from public.xoot_service_zones where active')).rows[0].n, 0);
  await assert.rejects(db.query('update public.xoot_service_zones set active=true'), error => error.code === '23514');
  assert.deepEqual((await db.query('select geometry from public.xoot_service_zones')).rows[0].geometry, geometry);
  console.log('PASS: exact polygon round-trip; inactive by default; activation without reviewer rejected');
  const user = randomUUID();
  await db.query('insert into auth.users(id) values($1)', [user]);
  for (let i = 0; i < 20; i++) {
    const client = new pg.Client({ ...config, database: name });
    await client.connect(); connections.push(client); await client.query('set role service_role');
  }
  const replies = await Promise.all(connections.map(client => client.query('select public.xoot_consume_coverage_query($1) as allowed', [user])));
  assert.equal(replies.filter(reply => reply.rows[0].allowed).length, 12);
  await db.query("update public.xoot_coverage_query_budget set resets_at=now()-interval '1 second'");
  assert.equal((await connections[0].query('select public.xoot_consume_coverage_query($1) as allowed', [user])).rows[0].allowed, true);
  assert.equal((await db.query('select requests from public.xoot_coverage_query_budget')).rows[0].requests, 1);
  console.log('PASS: exactly 12 of 20 concurrent requests allowed; expired budget resets atomically');
} finally {
  await Promise.all(connections.map(client => client.end().catch(() => {})));
  if (db) await db.end().catch(() => {});
  if (created) await admin.query('drop database "' + name + '" with (force)');
  for (const role of createdRoles.reverse()) await admin.query('drop role ' + role);
  await admin.end();
}
