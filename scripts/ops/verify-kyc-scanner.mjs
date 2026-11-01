import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
// Actual disposable PostgreSQL only. No account, key, hosted database or provider request.
const { PGlite } = await import(process.argv[2] ? pathToFileURL(resolve(process.argv[2])).href : '@electric-sql/pglite');
const db=new PGlite();
try {
  for(const path of ['scripts/testing/kyc-quarantine-fixture.sql',
    'supabase/migrations/20261027032349_kyc_private_quarantine_interlock.sql',
    'supabase/migrations/20261101155855_kyc_scanner_evaluation_receipts.sql',
    'supabase/migrations/20261101223500_kyc_scanner_service_authority.sql','scripts/testing/kyc-scan-contract.sql']) {
    const source=await readFile(path,'utf8');await db.exec(source);
    console.log(JSON.stringify({path,assertions:(source.match(/select public\.assert_/g)||[]).length,passed:true}));
  }
} finally {await db.close();}
console.log('Not covered: genuine provider calls, normal user JWT/device acceptance or production processing permission.');
