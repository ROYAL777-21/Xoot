import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const { PGlite }=await import(process.argv[2] ? pathToFileURL(resolve(process.argv[2])).href : '@electric-sql/pglite');
const fixture=await readFile('scripts/testing/xooter-journey-fixture.sql','utf8');
const migration=await readFile('supabase/migrations/20261102082500_xooter_notification_journey.sql','utf8');
const contract=await readFile('scripts/testing/xooter-journey-contract.sql','utf8');
const db=new PGlite();
try {
  await db.exec(fixture);await db.exec(migration);await db.exec(contract);
  console.log(JSON.stringify({check:'xooter-journey-notifications-preferences-isolation',assertions:(contract.match(/select public\.(?:assert_journey|expect_journey_error)\(/g)||[]).length,passed:true}));
} finally {await db.close();}
const mutant=new PGlite();
try {
  await mutant.exec(fixture);await mutant.exec(migration);
  await mutant.exec('drop trigger xooter_application_journey on public.xooter_applications');
  await assert.rejects(mutant.exec(contract),error=>error.message.includes('JOURNEY_FAILED: actual submission emits status atomically'));
  console.log(JSON.stringify({check:'missing-application-trigger-mutation-detected',passed:true}));
} finally {await mutant.close();}
const rollback=new PGlite();
try {
  await rollback.exec(fixture);await rollback.exec(migration);
  await rollback.exec('alter table public.integration_outbox add constraint synthetic_delivery_failure check(false)');
  await assert.rejects(rollback.exec("insert into public.xooter_applications(user_id) values('00000000-0000-4000-8000-000000000001')"),error=>error.code==='23514');
  for(const table of ['public.xooter_applications','private.xooter_journeys','private.xooter_journey_events','public.notifications']) {
    assert.equal((await rollback.query(`select count(*)::integer as n from ${table}`)).rows[0].n,0);
  }
  console.log(JSON.stringify({check:'outbox-failure-rolls-back-application-and-all-notification-effects',passed:true}));
} finally {await rollback.close();}
const mail=new PGlite();
const receiptMigration=await readFile('supabase/migrations/20261102082516_xooter_email_delivery_receipts.sql','utf8');
const receiptFix=await readFile('supabase/migrations/20261102165153_xooter_email_outbox_completion.sql','utf8');
const emailContract=await readFile('scripts/testing/xooter-email-contract.sql','utf8');
try {
  await mail.exec(fixture);await mail.exec(migration);
  await mail.exec(receiptMigration);await mail.exec(receiptFix);
  await mail.exec(emailContract);
  console.log(JSON.stringify({check:'email-worker-state-consent-and-authority',assertions:(emailContract.match(/select public\.(?:assert_journey|expect_journey_error)\(/g)||[]).length,passed:true}));
} finally {await mail.close();}
const oldReceipt=new PGlite();
try {
  await oldReceipt.exec(fixture);await oldReceipt.exec(migration);await oldReceipt.exec(receiptMigration);
  await assert.rejects(oldReceipt.exec(emailContract),error=>error.code==='23514' && error.message.includes('integration_outbox_status_check'));
  console.log(JSON.stringify({check:'old-receipt-refused-by-real-outbox-constraint',passed:true}));
} finally {await oldReceipt.close();}
console.log('Actual isolated PostgreSQL only: no provider send, hosted migration, genuine JWT or device acceptance.');
