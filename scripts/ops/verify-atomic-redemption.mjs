import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const { PGlite } = await import(process.argv[2] ? pathToFileURL(resolve(process.argv[2])).href : '@electric-sql/pglite');
const read = path => readFile(path, 'utf8');
const setup = [
  "create role anon; create role authenticated; create role service_role;",
  await read('scripts/ops/fixtures/booking-benefit-locks.sql'),
  await read('scripts/testing/atomic-redemption-fixture.sql'),
  await read('supabase/migrations/20260815160000_xootcred_trigger_queries_a_dropped_table.sql'),
  "create trigger zootcred_balance_check before insert on public.xootcred_ledger for each row when(new.amount < 0 or new.direction='debit') execute function public.check_xootcred_balance();",
  await read('supabase/migrations/20260929055022_booking_benefit_account_guards.sql'),
  (await read('supabase/migrations/20261028125915_atomic_booking_cancellation.sql')).split('create or replace function private.settle_booking_payment(')[0],
].join('\n');
const migration = await read('supabase/migrations/20261104045943_atomic_booking_xootcred_redemption.sql');
const contract = await read('scripts/testing/atomic-redemption-contract.sql');
const db = new PGlite();
try {
  await db.exec(setup);
  // Reproduce C2 with real SQL transactions and the existing guard: the old Edge
  // handler ignores the rejected debit, then commits a lower price independently.
  await db.exec(`insert into auth.users(id) values('00000000-0000-4000-8000-000000000001');
    insert into public.bookings(id,user_id) values('00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001');
    insert into public.payment_records(id,user_id,booking_id,amount,payment_kind)
    values('00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002',200,'booking');`);
  await assert.rejects(db.exec(`insert into public.xootcred_ledger(user_id,booking_id,amount,direction,status,reason)
    values('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002',70,'debit','redeemed','redemption')`),
  error => error.code === '23514');
  await db.exec("update public.payment_records set amount=130 where id='00000000-0000-4000-8000-000000000003'");
  assert.equal(Number((await db.query('select amount from public.payment_records')).rows[0].amount), 130);
  assert.equal((await db.query('select count(*)::integer n from public.xootcred_ledger')).rows[0].n, 0);
  console.log('ok - real old debit rejection leaves an independently discounted payment');
  await db.exec(migration);
  await db.exec(contract);
  console.log(JSON.stringify({ check: 'atomic-redemption-contract', assertions: (contract.match(/select public\.(?:assert_atomic|expect_atomic_error)\(/g) ?? []).length, passed: true }));
} catch (error) {
  console.error(JSON.stringify({ check: 'atomic-redemption-contract', passed: false, code: error.code, message: error.message }));
  process.exitCode = 1;
} finally { await db.close(); }
console.log('Isolated real PostgreSQL statements; concurrent independent-session races run in the native PG17 CI job. No hosted writes or provider requests.');
