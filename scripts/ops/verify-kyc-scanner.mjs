import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
// Actual disposable PostgreSQL only. No account, key, hosted database or provider request.
const { PGlite } = await import(process.argv[2] ? pathToFileURL(resolve(process.argv[2])).href : '@electric-sql/pglite');
const db=new PGlite();
try {
  for(const path of ['scripts/testing/kyc-quarantine-fixture.sql',
    'supabase/migrations/20261027032349_kyc_private_quarantine_interlock.sql',
    'supabase/migrations/20261101155855_kyc_scanner_evaluation_receipts.sql',
    'supabase/migrations/20261101220212_kyc_scanner_service_authority.sql','scripts/testing/kyc-scan-contract.sql',
    'supabase/migrations/20261102001000_kyc_scanner_versioned_policy_claims.sql','scripts/testing/kyc-scan-policy-contract.sql']) {
    const source=await readFile(path,'utf8');
    if(path.endsWith('_kyc_scanner_versioned_policy_claims.sql')) {
      // Disposable lease-conflict rehearsal only; this process never connects to hosted data.
      await db.exec("update private.kyc_scan_budget set active_attempt_id=gen_random_uuid(),lease_expires_at=clock_timestamp()+interval '1 minute'");
      await assert.rejects(db.exec(source),error=>error.code==='55000');await db.exec('rollback');
      assert.equal((await db.query("select to_regprocedure('public.claim_kyc_scan_v2(uuid,text)') as rpc")).rows[0].rpc,null);
      assert.equal((await db.query('select used from private.kyc_scan_budget')).rows[0].used,3);
      await db.exec('update private.kyc_scan_budget set active_attempt_id=null,lease_expires_at=null');
      console.log(JSON.stringify({check:'active-lease-policy-delivery-refused-and-rolled-back',passed:true}));
    }
    await db.exec(source);
    console.log(JSON.stringify({path,assertions:(source.match(/select public\.assert_/g)||[]).length,passed:true}));
  }
} finally {await db.close();}
console.log('Not covered: genuine provider calls, normal user JWT/device acceptance or production processing permission.');
