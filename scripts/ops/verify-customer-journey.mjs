import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const { PGlite } = await import(process.argv[2] ? pathToFileURL(resolve(process.argv[2])).href : '@electric-sql/pglite');
const read = async file => (await readFile(file, 'utf8')).replaceAll('\r\n', '\n');
const fixture = await read('scripts/testing/customer-journey-fixture.sql');
const source = await read('supabase/migrations/20261103070921_customer_notification_journey.sql');
const contract = await read('scripts/testing/customer-journey-contract.sql');
const setup = async () => { const db = new PGlite(); await db.exec(fixture); await db.exec(source); return db; };
const cases = [
  ['customer-journey-owner-consent-event-and-receipt-contract', async db => {
    await db.exec(contract);
    return { assertions: (contract.match(/select public\.(?:assert_customer|expect_customer_error)\(/g) || []).length };
  }],
  ['legacy-welcome-adoption-mutation-is-detected', async db => {
    const definition = (await db.query("select pg_get_functiondef('private.emit_customer_journey(uuid,text,text,timestamptz)'::regprocedure) as source")).rows[0].source;
    await db.exec(definition.replace('select count(*) into legacy_count', 'select 0::integer into legacy_count'));
    await assert.rejects(db.exec(contract), error => error.message.includes('CUSTOMER_FAILED: owner sees only one adopted welcome'));
  }],
  ['null-allowlist-authorization-mutation-is-detected', async db => {
    const definition = (await db.query("select pg_get_functiondef('public.authorize_customer_journey_email(uuid,uuid,text)'::regprocedure) as source")).rows[0].source;
    await db.exec(definition.replace('(event.user_id=any(policy.allowed_user_ids)) is not true', 'not(event.user_id=any(policy.allowed_user_ids))'));
    await assert.rejects(db.exec(contract), error => error.message.includes('CUSTOMER_FAILED: NULL-containing replacement allowlist cannot authorize a removed recipient'));
  }],
  ['outbox-failure-rolls-back-customer-event-and-legacy-adoption', async db => {
    await db.exec("insert into auth.users(id,email,email_confirmed_at) values('00000000-0000-4000-8000-000000000099','rollback@example.test',clock_timestamp())");
    await db.exec('alter table public.integration_outbox add constraint synthetic_customer_delivery_failure check(false)');
    await db.exec("set role authenticated;select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000099',false)");
    await assert.rejects(db.exec("select public.manage_customer_communications('enter')"), error => error.code === '23514');
    await db.exec('reset role');
    for (const table of ['private.customer_journeys','private.customer_communication_preferences','private.customer_journey_events']) {
      assert.equal((await db.query(`select count(*)::integer as n from ${table}`)).rows[0].n, 0);
    }
    assert.equal((await db.query("select kind from public.notifications where user_id='00000000-0000-4000-8000-000000000099'")).rows[0].kind, 'welcome');
    assert.equal((await db.query('select used from private.customer_email_policy')).rows[0].used, 0);
    assert.equal((await db.query('select used from private.xooter_email_policy')).rows[0].used, 1);
  }],
  ['unconstrained-production-outbox-status-is-supported', async db => {
    await db.exec('alter table public.integration_outbox drop constraint integration_outbox_status_check');
    await db.exec(contract);
  }],
];
try {
  for (const [check, run] of cases) {
    const db = await setup();
    try { console.log(JSON.stringify({ check, ...(await run(db) || {}), passed: true })); }
    finally { await db.close(); }
  }
  console.log('Isolated PostgreSQL only: no hosted schema, provider send, account backfill, schedule or production enablement.');
} catch (error) { console.error(JSON.stringify({ check: 'customer-journey', passed: false, error: String(error.message).slice(0, 400) })); process.exitCode = 1; }
