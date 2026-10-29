import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

// Actual SQL and search implementation; no credentials, real addresses or provider calls.
const { PGlite } = await import(process.argv[2] ? pathToFileURL(resolve(process.argv[2])).href : '@electric-sql/pglite');
const db = new PGlite();
const migration = name => readFile(`supabase/migrations/${name}.sql`, 'utf8');
const actor = '11111111-1111-4111-8111-111111111111';
let providerCalls = 0;
try {
  await db.exec(`create schema auth; create schema private;
    create role anon; create role authenticated; create role service_role bypassrls;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql as $$select null::uuid$$;
    create function private.has_role(uuid,text) returns boolean language sql as $$select false$$;
    grant usage on schema public,private to service_role;
    insert into auth.users values ('${actor}');`);
  await db.exec(await migration('20261019185331_xoot_approved_service_zones'));
  await db.exec(await migration('20261025195100_mapbox_geocoding_global_budget'));
  await db.exec(await migration('20261026153738_address_lookup_server_allowances'));
  const source = await readFile('supabase/functions/search-addresses/search.ts', 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  const { searchAddresses } = await import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'));
  const rpc = async (_name, { p_mode }) => ({ data: (await db.query('select public.xoot_consume_address_lookup($1) allowed', [p_mode])).rows[0].allowed, error: null });
  const invalidConfirmation = () => searchAddresses({ mode: 'confirm', query: '10 Public Road Sandton', selectedId: 'unissued-selection',
    db: { rpc }, token: 'pk.synthetic-fixture-token', fetcher: async () => { providerCalls++; return new Response(JSON.stringify({ features: [] })); } });
  const consumeCoverage = () => db.query('select public.xoot_consume_coverage_query($1) allowed', [actor]).then(result => result.rows[0].allowed);
  const counters = () => db.query(`select b.consumed_queries as global, a.consumed_queries as public
    from public.xoot_mapbox_geocoding_budget b cross join public.xoot_address_lookup_allowances a where a.mode='confirm'`).then(r => r.rows[0]);
  await db.exec('set role service_role');
  assert.equal((await invalidConfirmation()).state, 'limited');
  assert.equal(providerCalls, 0, 'zero defaults refuse before the provider');
  await db.exec(`reset role;
    update public.xoot_mapbox_geocoding_budget set authorized_queries=20;
    update public.xoot_address_lookup_allowances set authorized_queries=20;
    set role service_role;`);
  for (let i = 0; i < 20; i++) assert.equal((await invalidConfirmation()).state, 'invalid');
  assert.equal(await consumeCoverage(), false, 'negative control reproduces anonymous denial of an unrelated signed-in actor');
  assert.deepEqual(await counters(), { global: 20, public: 20 });
  await db.exec(`reset role;
    update public.xoot_mapbox_geocoding_budget set consumed_queries=0;
    update public.xoot_address_lookup_allowances set consumed_queries=0;`);
  await db.exec(await migration('20261029112730_protect_authenticated_coverage_allowance'));
  await db.exec('set role service_role');
  providerCalls = 0;
  for (let i = 0; i < 20; i++) assert.equal((await invalidConfirmation()).state, i < 10 ? 'invalid' : 'limited');
  assert.equal(providerCalls, 10, 'public confirmation cannot consume the reserved attempts');
  assert.deepEqual(await counters(), { global: 10, public: 10 });
  for (let i = 0; i < 10; i++) assert.equal(await consumeCoverage(), true);
  assert.equal(await consumeCoverage(), false, 'the unchanged total ceiling still wins');
  assert.deepEqual(await counters(), { global: 20, public: 10 });
  await db.exec('reset role');
  assert.equal((await db.query('select protected_remaining from private.xoot_coverage_allowance_reserve')).rows[0].protected_remaining, 0);
  await db.exec(`update public.xoot_mapbox_geocoding_budget set authorized_queries=100,consumed_queries=0;
    update public.xoot_coverage_query_budget set requests=0;
    set role service_role;`);
  for (let i = 0; i < 12; i++) assert.equal(await consumeCoverage(), true);
  const beforeDenied = await counters();
  assert.equal(await consumeCoverage(), false, '12/hour/actor is preserved');
  assert.deepEqual(await counters(), beforeDenied, 'denial does not debit the shared ceiling');
  await db.exec(`reset role; update public.xoot_coverage_query_budget set requests=0; set role service_role; begin;`);
  assert.equal(await consumeCoverage(), true);
  await db.exec('rollback');
  assert.deepEqual(await counters(), beforeDenied, 'transaction rollback restores allowance consumption');
  for (const role of ['anon', 'authenticated']) {
    await db.exec(`reset role; set role ${role}`);
    await assert.rejects(consumeCoverage(), /permission denied/);
    await assert.rejects(db.query("select public.xoot_consume_address_lookup('confirm')"), /permission denied/);
    await assert.rejects(db.query('select * from private.xoot_coverage_allowance_reserve'), /permission denied/);
  }
  console.log('PASS: vulnerable baseline reproduced; unchanged total cap, authenticated reserve, public denial, per-user limit, rollback and client RPC/table denial. No provider calls.');
  console.log('Not a hosted JWT or independent PostgreSQL session concurrency test.');
} finally { await db.close(); }
