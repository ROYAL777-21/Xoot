import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Disposable PostgreSQL only: no hosted connection, SMTP credential, send or policy change.
const { PGlite } = await import(process.argv[2] ? pathToFileURL(resolve(process.argv[2])).href : '@electric-sql/pglite');
const read = async path => (await readFile(path, 'utf8')).replaceAll('\r\n', '\n');
const sources = await Promise.all([
  'scripts/testing/xooter-journey-fixture.sql',
  'supabase/migrations/20261102082500_xooter_notification_journey.sql',
  'supabase/migrations/20261102082516_xooter_email_delivery_receipts.sql',
  'supabase/migrations/20261102165153_xooter_email_outbox_completion.sql',
].map(read));
const hardening = await read('supabase/migrations/20261103223222_xooter_email_allowlist_null_hardening.sql');
const constraint = 'xooter_email_policy_allowlist_no_nulls';
const first = '00000000-0000-4000-8000-000000000001';
const second = '00000000-0000-4000-8000-000000000002';
const project = 'fxmxyabdjqviqbcxmvlp';
const signature = 'public.authorize_xooter_journey_email(uuid,uuid,text)';
const sha = text => createHash('sha256').update(text.replaceAll('\r\n', '\n')).digest('hex');

async function setup(apply = true) {
  const db = new PGlite();
  for (const source of sources) await db.exec(source);
  if (apply) await db.exec(hardening);
  return db;
}
async function worker(db, run) {
  await db.exec('set role service_role');
  try { return await run(); } finally { await db.exec('reset role'); }
}
async function claim(db, user = first) {
  await db.query('select private.start_xooter_journey($1)', [user]);
  await db.query(`update private.xooter_email_policy set enabled=true,project_ref=$1,
    allowed_user_ids=array[$2::uuid],free_plan_reviewed_at=clock_timestamp(),
    free_plan_review_reference='SYNTHETIC LOCAL PLAN REVIEW' where id`, [project, user]);
  return worker(db, async () => (await db.query('select public.claim_xooter_journey_email($1) as value', [project])).rows[0].value);
}
async function revoke(db, users) {
  await db.query('update private.xooter_email_policy set allowed_user_ids=$1::uuid[] where id', [users]);
}
async function authorize(db, ticket) {
  return worker(db, async () => (await db.query('select public.authorize_xooter_journey_email($1,$2,$3) as value',
    [ticket.id, ticket.nonce, project])).rows[0].value);
}
async function finish(db, ticket) {
  return worker(db, async () => (await db.query("select public.finish_xooter_journey_email($1,$2,'accepted',$3) as value",
    [ticket.id, ticket.nonce, `<xoot-${ticket.id}@xoot.co.za>`])).rows[0].value);
}
async function state(db) {
  const data = {};
  for (const [table, order] of [['private.xooter_email_policy', 'id'], ['private.xooter_journeys', 'user_id'],
    ['private.xooter_communication_preferences', 'user_id'], ['private.xooter_journey_events', 'id'],
    ['public.notifications', 'id'], ['public.integration_outbox', 'id']]) {
    data[table] = (await db.query(`select to_jsonb(t) as row from ${table} t order by ${order}`)).rows;
  }
  return data;
}
async function authority(db) {
  return (await db.query(`select p.oid,p.proowner,p.proacl::text,p.prosecdef,p.proconfig,p.proargtypes::text,
    p.proargnames,p.prorettype,has_function_privilege('anon',p.oid,'execute') as anon,
    has_function_privilege('authenticated',p.oid,'execute') as authenticated,
    has_function_privilege('service_role',p.oid,'execute') as service
    from pg_proc p where p.oid=$1::regprocedure`, [signature])).rows[0];
}
async function source(db) {
  return (await db.query('select prosrc from pg_proc where oid=$1::regprocedure', [signature])).rows[0].prosrc;
}
async function hasConstraint(db) {
  return (await db.query(`select exists(select from pg_constraint where conrelid='private.xooter_email_policy'::regclass
    and conname=$1 and convalidated) as value`, [constraint])).rows[0].value;
}
async function refusedDelivery(mutate, expectedCode = '55000') {
  const db = await setup(false);
  try {
    await mutate(db);
    const before = await state(db), beforeAuthority = await authority(db), beforeSource = await source(db);
    await assert.rejects(db.exec(hardening), error => error.code === expectedCode);
    await db.exec('rollback');
    assert.deepEqual(await state(db), before);
    assert.deepEqual(await authority(db), beforeAuthority);
    assert.equal(await source(db), beforeSource);
    assert.equal(await hasConstraint(db), false);
  } finally { await db.close(); }
}

const cases = [
  ['null-containing-revocation-denied-by-authorization', async () => {
    const db = await setup();
    try {
      // Drop ONLY in this disposable case to independently test the RPC's defense, not its CHECK.
      await db.exec(`alter table private.xooter_email_policy drop constraint if exists ${constraint}`);
      for (const [user, replacement] of [[first, [null]], [second, [first, null]]]) {
        const ticket = await claim(db, user);
        assert(ticket);
        await revoke(db, replacement);
        assert.equal(await authorize(db, ticket), null, 'A NULL-containing replacement allowlist must deny its removed recipient');
      }
      assert.deepEqual((await db.query('select email_state,email_dispatched_at from private.xooter_journey_events order by user_id')).rows,
        [{ email_state: 'suppressed', email_dispatched_at: null }, { email_state: 'suppressed', email_dispatched_at: null }]);
      assert.deepEqual((await db.query('select used,maximum from private.xooter_email_policy')).rows, [{ used: 2, maximum: 20 }]);
    } finally { await db.close(); }
  }],
  ['schema-rejects-null-elements-and-retains-empty-allowlist', async () => {
    const db = await setup();
    try {
      assert.equal(await hasConstraint(db), true);
      const before = await state(db);
      for (const users of [[null], [first, null]]) {
        await assert.rejects(revoke(db, users), error => error.code === '23514');
        assert.deepEqual(await state(db), before);
      }
      await revoke(db, []);
      assert.deepEqual(await state(db), before);
    } finally { await db.close(); }
  }],
  ['empty-and-other-user-revocation-denied', async () => {
    const db = await setup();
    try {
      for (const [user, replacement] of [[first, []], [second, [first]]]) {
        const ticket = await claim(db, user);
        await revoke(db, replacement);
        assert.equal(await authorize(db, ticket), null);
      }
      assert.equal((await db.query('select used from private.xooter_email_policy')).rows[0].used, 2);
    } finally { await db.close(); }
  }],
  ['valid-owner-authorizes-once-and-finishes-own-receipt', async () => {
    const db = await setup();
    try {
      const ticket = await claim(db);
      assert.equal((await authorize(db, ticket)).email, 'synthetic-one@example.test');
      assert.equal(await authorize(db, ticket), null);
      // Synthetic local receipt only; this test never calls SMTP.
      assert.equal(await finish(db, ticket), true);
      assert.equal(await finish(db, ticket), false);
      assert.deepEqual((await db.query('select used,maximum from private.xooter_email_policy')).rows, [{ used: 1, maximum: 20 }]);
      assert.deepEqual((await db.query('select status from public.integration_outbox')).rows, [{ status: 'completed' }]);
      const acl = await authority(db);
      assert(acl.prosecdef && !acl.anon && !acl.authenticated && acl.service);
      assert.equal((await db.query("select has_table_privilege('service_role','private.xooter_email_policy','update') as value")).rows[0].value, false);
    } finally { await db.close(); }
  }],
  ['paused-delivery-preserves-receipts-budgets-abi-owner-and-acl', async () => {
    const db = await setup(false);
    try {
      const ticket = await claim(db);
      assert(await authorize(db, ticket));
      assert.equal(await finish(db, ticket), true);
      await db.query('select private.start_xooter_journey($1)', [second]);
      await db.exec('update private.xooter_email_policy set enabled=false');
      const before = await state(db), beforeAuthority = await authority(db), beforeSource = await source(db);
      assert.equal(sha(beforeSource), '4a94e45ce0dd6ff3892b6788356e0dc0bd48124133af86872b28d425ec55b9e3');
      await db.exec(hardening);
      assert.deepEqual(await state(db), before);
      assert.deepEqual(await authority(db), beforeAuthority);
      assert.equal(await source(db), beforeSource.replace('not(event.user_id=any(policy.allowed_user_ids))', '(event.user_id=any(policy.allowed_user_ids)) is not true'));
      assert.equal(await hasConstraint(db), true);
    } finally { await db.close(); }
  }],
  ['enabled-policy-refuses-delivery-without-data-reset', () => refusedDelivery(db => db.exec('update private.xooter_email_policy set enabled=true'))],
  ['claimed-mail-refuses-delivery-without-reconciliation', () => refusedDelivery(async db => {
    await claim(db); await db.exec('update private.xooter_email_policy set enabled=false');
  })],
  ['unfinished-dispatch-refuses-delivery-even-with-inconsistent-state', () => refusedDelivery(async db => {
    const ticket = await claim(db); assert(await authorize(db, ticket));
    await db.exec("update private.xooter_email_policy set enabled=false;update private.xooter_journey_events set email_state='failed'");
  })],
  ['unknown-source-refuses-replacement', () => refusedDelivery(db => db.exec(`create or replace function ${signature.replace('(uuid,uuid,text)', '(p_id uuid,p_nonce uuid,p_project_ref text)')}
    returns jsonb language plpgsql security definer set search_path='' as $$begin return null;end$$`))],
  ['existing-null-configuration-refuses-and-rolls-back', () => refusedDelivery(db => revoke(db, [null]), '23514')],
  ['old-applied-body-reproduces-null-revocation-leak', async () => {
    const db = await setup(false);
    try {
      const ticket = await claim(db); await revoke(db, [null]);
      assert.notEqual(await authorize(db, ticket), null, 'The immutable predecessor must reproduce the reviewed bug');
    } finally { await db.close(); }
  }],
];
for (const [check, run] of cases) {
  try { await run(); console.log(JSON.stringify({ check, passed: true })); }
  catch (error) { console.error(JSON.stringify({ check, passed: false, code: error.code, error: String(error.message).split('\n')[0] })); process.exitCode = 1; break; }
}
console.log('Actual isolated PostgreSQL only: no hosted apply, sender, quota refill, real receipt or credential access.');
