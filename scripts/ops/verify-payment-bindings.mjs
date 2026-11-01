import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
// Real, isolated PostgreSQL execution. No Supabase token/account/network/provider funds.
const { PGlite } = await import(process.argv[2] ? pathToFileURL(resolve(process.argv[2])).href : '@electric-sql/pglite');
const read = path => readFile(path,'utf8');
const fixture = await read('scripts/testing/payment-binding-fixture.sql');
const initial = await read('supabase/migrations/20261027201017_atomic_booking_payment_settlement.sql');
const cancellation = await read('supabase/migrations/20261028125915_atomic_booking_cancellation.sql');
const lockPrefix = cancellation.split('create table private.booking_cancellations (')[0];
assert.ok(lockPrefix.length > 10_000 && lockPrefix.length < cancellation.length,'Exact later booking settlement prefix found');
const foundation = await read('supabase/migrations/20260929055022_booking_benefit_account_guards.sql');
const migration = await read('supabase/migrations/20261101223000_payfast_cross_kind_transaction_bindings.sql');
const contract = await read('scripts/testing/payment-binding-contract.sql');
const assertionCount = (contract.match(/select public\.(?:assert_binding|expect_binding_error)\(/g)||[]).length;
for (const accountFoundation of [false,true]) {
  const db = new PGlite();
  try {
    await db.exec(fixture);
    if (accountFoundation) await db.exec(foundation);
    await db.exec(initial);
    await db.exec(lockPrefix);
    await db.exec(migration);
    await db.exec(contract);
    console.log(JSON.stringify({check:'payment-transaction-binding-contract',accountFoundation,assertions:assertionCount,passed:true}));
  } finally { await db.close(); }
}

// Execute the existing actual settlement before the forward migration, then verify real receipt
// backfill (including admin-first receipts corroborated by their first late provider callback).
for (const corrupt of [false,true]) {
  const db = new PGlite();
  try {
    await db.exec(fixture);await db.exec(initial);await db.exec(lockPrefix);
    await db.exec(`insert into public.bookings(id,user_id) values('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001');
      insert into public.payment_records(id,user_id,booking_id,amount,provider_reference) values
      ('20000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',289,'synthetic-before-migration');
      insert into public.provider_events(id,event_id,subject_id,payload_hash) values
      ('30000000-0000-4000-8000-000000000001','payfast:synthetic-before-migration','20000000-0000-4000-8000-000000000001',repeat('a',64));
      select public.settle_booking_payment('20000000-0000-4000-8000-000000000001','payfast',28900,'synthetic-before-migration',
      '30000000-0000-4000-8000-000000000001',repeat('a',64),'synthetic-before-migration',null,null,null);`);
    // A source=admin receipt with a late provider transaction must also survive the backfill.
    await db.exec("update private.booking_payment_settlements set source='admin'");
    if (corrupt) {
      await db.exec("update public.provider_events set event_id='payfast:wrong-transaction'");
      await assert.rejects(db.exec(migration),error=>error.code==='22023');
      await db.exec('rollback');
      assert.equal((await db.query("select to_regclass('private.payfast_payment_bindings') as registry")).rows[0].registry,null);
      assert.equal((await db.query('select count(*)::integer as n from private.booking_payment_settlements')).rows[0].n,1);
    } else {
      await db.exec(migration);
      assert.equal((await db.query('select count(*)::integer as n from private.payfast_payment_bindings')).rows[0].n,1);
      assert.equal((await db.query('select source from private.booking_payment_settlements')).rows[0].source,'admin');
    }
    console.log(JSON.stringify({check:'existing-booking-receipt-backfill',corrupt,passed:true}));
  } finally { await db.close(); }
}

// Prove the contract fails when the automatic booking→global binding guard is absent.
const mutant = new PGlite();
try {
  await mutant.exec(fixture);await mutant.exec(initial);await mutant.exec(lockPrefix);await mutant.exec(migration);
  await mutant.exec('drop trigger booking_payfast_transaction_binding on private.booking_payment_settlements');
  await assert.rejects(mutant.exec(contract),error=>error.message.includes('PAYMENT_BINDING_FAILED: first actual booking transaction is bound'));
  console.log(JSON.stringify({check:'missing-guard-mutation-detected',passed:true}));
} finally { await mutant.close(); }
console.log('Not covered: simultaneous hosted connections, a signed provider callback or normal user/admin JWT acceptance.');
