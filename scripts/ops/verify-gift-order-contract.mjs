import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';

// Isolated PostgreSQL validation; no Supabase credentials, network or customer data.
// Install @electric-sql/pglite@0.5.8 in a tooling directory, then pass its dist/index.js path.
const { PGlite } = await import(process.argv[2] ? pathToFileURL(resolve(process.argv[2])).href : '@electric-sql/pglite');
const db = new PGlite();
try {
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create schema auth; create table auth.users (id uuid primary key);
    create table public.bookings (id uuid primary key); create table public.zooters (id uuid primary key);`);
  const source = await readFile('supabase/migrations/20260518123000_full_word_document_operating_layer.sql', 'utf8');
  for (const table of ['payment_records', 'gift_clean_orders', 'admin_review_queue', 'integration_outbox']) {
    const ddl = source.match(new RegExp(`create table if not exists public\\.${table} \\([\\s\\S]*?\\n\\);`, 'i'))?.[0];
    assert.ok(ddl, `Original ${table} definition exists`);
    await db.exec(ddl);
  }
  // Exercise the current provider constraint too; the original table DDL predates it.
  await db.exec(await readFile('supabase/migrations/20260813200000_payment_records_provider_lifecycle.sql', 'utf8'));
  await db.exec(`grant usage on schema public to authenticated, service_role;
    grant all on all tables in schema public to service_role;
    grant insert, update, delete on public.gift_clean_orders to authenticated;
    grant update(recipient_name, message) on public.gift_clean_orders to authenticated;`);
  await db.exec(await readFile('supabase/migrations/20260920200000_gift_order_contract.sql', 'utf8'));
  const user = randomUUID();
  await db.query('insert into auth.users(id) values ($1)', [user]);
  const definition = { service: 'regular', count: 3, tint: 'blush', delivery: 'email', recipientName: 'Test recipient', recipientEmail: 'gift@example.test', senderName: 'Test sender', note: '', occasion: '' };
  const quote = { version: 'gift-zd037-v1', currency: 'ZAR', service: 'regular', count: 3, hours: 5.5, basePerVisitCents: 29600, feePerVisitCents: 3900, perVisitCents: 33500, totalCents: 100500 };
  const invoke = async (key, draft = definition, current = quote, accepted = quote) => (await db.query(
    'select public.create_reviewed_gift_order($1,$2,$3::jsonb,$4::jsonb,$5::jsonb) as result',
    [user, key, JSON.stringify(draft), JSON.stringify(current), JSON.stringify(accepted)],
  )).rows[0].result;
  await db.exec('set role service_role');
  const key = randomUUID();
  const first = await invoke(key);
  assert.equal(first.status, 'pending_payment');
  assert.equal(first.quote.totalCents, 100500);
  const replay = await invoke(key);
  assert.equal(replay.order_id, first.order_id);
  assert.equal(replay.replayed, true);
  assert.equal((await invoke(key, { ...definition, count: 6 })).error, 'request_key_reused');
  assert.equal((await invoke(randomUUID(), definition, quote, { ...quote, totalCents: 1 })).error, 'quote_changed');
  const changed = { ...quote, totalCents: 101100, perVisitCents: 33700 };
  assert.deepEqual((await invoke(key, definition, changed, changed)).quote, quote, 'A retry returns the original accepted price');
  for (const table of ['gift_clean_orders', 'payment_records', 'admin_review_queue', 'integration_outbox']) {
    assert.equal((await db.query(`select count(*)::int as count from public.${table}`)).rows[0].count, 1, `${table} is written once`);
  }
  const records = (await db.query('select g.amount as gift, p.amount as payment from public.gift_clean_orders g join public.payment_records p on p.id=g.payment_record_id')).rows;
  assert.equal(Number(records[0].gift), 1005);
  assert.equal(Number(records[0].payment), 1005);
  await db.exec('reset role; alter table public.integration_outbox add constraint force_test_failure check (false) not valid; set role service_role;');
  await assert.rejects(invoke(randomUUID()), /force_test_failure/);
  assert.equal((await db.query('select count(*)::int as count from public.payment_records')).rows[0].count, 1, 'Late outbox failure rolls back payment and order');
  await db.exec('reset role; set role authenticated;');
  await assert.rejects(invoke(randomUUID()), /permission denied/);
  await assert.rejects(db.query("update public.gift_clean_orders set message='tampered'"), /permission denied/);
  await db.exec('reset role; set role anon;');
  await assert.rejects(invoke(randomUUID()), /permission denied/);
  console.log('PASS: migration SQL, immutable accepted total, idempotent replay, changed quote/key refusal, four-table rollback and client privilege denial.');
  console.log('Not covered here: concurrent connections, full migration chain, deployed RLS/provider delivery.');
} finally { await db.close(); }
