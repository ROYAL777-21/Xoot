import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Local, ephemeral SQL only. No hosted database, provider key, address input or HTTP client.
const { PGlite } = await import(process.argv[2] ? pathToFileURL(resolve(process.argv[2])).href : '@electric-sql/pglite');
const db = new PGlite();
const sql = async path => (await readFile(path,'utf8')).replace(/\r\n/g,'\n');
try {
  await db.exec(await sql('scripts/testing/geoapify-evaluation-fixture.sql'));
  const migration = await sql('supabase/migrations/20261103065737_geoapify_private_staging_evaluation.sql');
  assert.doesNotMatch(migration,/\b(?:xoot_mapbox_geocoding_budget|xoot_address_lookup_allowances|xoot_consume_coverage_query|xooter_availability)\b/);
  await db.exec(migration);
  await db.exec(await sql('scripts/testing/geoapify-evaluation-contract.sql'));
  console.log('Actual migration/SQL passed: disabled/zero, max20 lifetime, client and refill denial, RLS/ACLs, nonce/lease/revision binding, replay denial, monotonic usage, bounded receipts, unchanged Mapbox sentinel. Provider calls:0. PGlite is serialized; live multi-connection concurrency is not claimed.');
} catch(error) {
  // PGlite errors also contain the whole submitted SQL; keep failure output concise/synthetic.
  console.error('Geoapify SQL contract failed: '+String(error.message ?? 'unknown SQL failure').slice(0,250));process.exitCode=1;
} finally { await db.close(); }
