import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// In-memory PostgreSQL only. Same pinned isolated runtime as the gift SQL proof.
const { PGlite } = await import(process.argv[2] ? pathToFileURL(resolve(process.argv[2])).href : '@electric-sql/pglite');
const db = new PGlite();
const A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const C = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const ADMIN = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const BOOKING = '11111111-1111-1111-1111-111111111111';
const OTHER_BOOKING = '22222222-2222-2222-2222-222222222222';
const fixedPolicies = new Set([
  'xooter_avatars_owner_write', 'xooter_avatars_owner_update', 'kyc_docs_owner_insert',
  'kyc_docs_owner_update_delete', 'booking_completion_photos_booking_participant_insert',
]);
let assertions = 0;
let rejections = 0;
let serial = 0;
const check = (actual, expected, message) => { assert.deepEqual(actual, expected, message); assertions++; };
const source = file => readFile(file, 'utf8');
const actor = async (role, id = '') => {
  assert.ok(['anon', 'authenticated', 'service_role'].includes(role));
  await db.exec(`reset role; set role ${role}`);
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
};
const insert = (bucket, path) => db.query('insert into storage.objects(bucket_id,name) values ($1,$2)', [bucket, path]);
const rejectInsert = async (bucket, path) => {
  await assert.rejects(insert(bucket, path), error => error.code === '42501');
  rejections++;
};
const policies = async () => (await db.query(`select policyname, roles, cmd, qual, with_check
  from pg_policies where schemaname = 'storage' order by policyname`)).rows;
const unchangedParts = rows => rows.map(row => fixedPolicies.has(row.policyname) ? { ...row, with_check: 'corrected-only' } : row);
const surface = async () => ({
  buckets: (await db.query('select * from storage.buckets order by id')).rows,
  grants: (await db.query(`select table_name,grantee,privilege_type from information_schema.table_privileges
    where table_schema='storage' order by table_name,grantee,privilege_type`)).rows,
});

try {
  await db.exec(await source('scripts/ops/fixtures/storage-path-contract.sql'));
  // Execute unedited historical storage DDL; apply the actual bucket rename. The table/column
  // rename stands in for the unrelated full ZD-029 migration and is explicitly bounded here.
  await db.exec(await source('supabase/migrations/20260620000000_storage_buckets_and_policies.sql'));
  await db.exec('alter table public.zooters rename to xooters; alter table public.bookings rename column zooter_id to xooter_id;');
  await db.exec(await source('supabase/migrations/20260814103000_rename_zooter_avatars_bucket.sql'));
  await db.exec(await source('supabase/migrations/20261004160000_backend_rls_and_storage_hardening.sql'));
  check((await db.query("select storage.foldername($1) as folders", [`${A}/avatar.png`])).rows[0].folders, [A], 'Supabase helper excludes filename');

  await actor('authenticated', A);
  for (const [bucket, prefix, extension] of [
    ['xooter-avatars', A, 'png'], ['kyc-docs', A, 'pdf'], ['booking-completion-photos', BOOKING, 'jpg'],
  ]) {
    await rejectInsert(bucket, `${prefix}/valid-before.${extension}`);
    // Reproduce the opposite defect: the incoming policy admits an unwanted extra folder.
    await insert(bucket, `${prefix}/extra/before.${extension}`);
  }
  await db.exec('reset role');
  const beforePolicies = await policies();
  const beforeSurface = await surface();
  const correction = await source('supabase/migrations/20261007140000_storage_upload_path_contract.sql');
  await db.exec(correction);
  const afterPolicies = await policies();
  check(unchangedParts(afterPolicies), unchangedParts(beforePolicies), 'Only five WITH CHECK predicates change');
  check(await surface(), beforeSurface, 'Bucket controls and role grants stay unchanged');
  for (const name of fixedPolicies) {
    check(afterPolicies.find(row => row.policyname === name).with_check.includes('= 1'), true, `${name} requires one folder`);
  }
  await db.exec(correction);
  check(await policies(), afterPolicies, 'Additive correction replays without policy loss');
  check(await surface(), beforeSurface, 'Replay preserves bucket controls and grants');

  for (const [bucket, prefix, extension] of [
    ['xooter-avatars', A, 'png'], ['kyc-docs', A, 'pdf'], ['booking-completion-photos', BOOKING, 'jpg'],
  ]) {
    await actor('authenticated', A);
    await insert(bucket, `${prefix}/owner-${++serial}.${extension}`);
    for (const path of [
      `root-${serial}.${extension}`, `/${prefix}/leading.${extension}`, `${prefix}//empty.${extension}`,
      `${prefix}/extra/nested.${extension}`, `${prefix}/../traversal.${extension}`,
      `${prefix}/`, `${prefix}/wrong.exe`, `${prefix}/no-extension`,
    ]) await rejectInsert(bucket, path);
    await rejectInsert(bucket, `${bucket === 'booking-completion-photos' ? OTHER_BOOKING : B}/cross-${serial}.${extension}`);
    await actor('authenticated', B);
    await rejectInsert(bucket, `${prefix}/other-owner-${serial}.${extension}`);
  }

  await actor('authenticated', C);
  await insert('booking-completion-photos', `${BOOKING}/worker-photo.webp`);
  await rejectInsert('booking-completion-photos', `${OTHER_BOOKING}/cross-worker.webp`);
  check((await db.query('select name from storage.objects where bucket_id=$1 and name=$2', ['booking-completion-photos', `${BOOKING}/worker-photo.webp`])).rows.length, 1, 'Assigned worker can read evidence');
  await actor('authenticated', B);
  check((await db.query('select name from storage.objects where bucket_id=$1', ['booking-completion-photos'])).rows.length, 0, 'Unrelated customer cannot read booking evidence');
  check((await db.query('select name from storage.objects where bucket_id=$1', ['kyc-docs'])).rows.length, 0, 'Other user cannot read KYC');

  await actor('authenticated', A);
  await db.query('update storage.objects set metadata=$1 where bucket_id=$2 and name=$3', [JSON.stringify({ verified: false }), 'kyc-docs', `${A}/owner-2.pdf`]);
  check((await db.query('select metadata from storage.objects where bucket_id=$1 and name=$2', ['kyc-docs', `${A}/owner-2.pdf`])).rows[0].metadata, { verified: false }, 'Owner KYC update still works');
  await assert.rejects(db.query('update storage.objects set name=$1 where bucket_id=$2 and name=$3', [`${B}/transferred.pdf`, 'kyc-docs', `${A}/owner-2.pdf`]), error => error.code === '42501');
  rejections++;
  for (const statement of [
    "update storage.objects set metadata='{}' where bucket_id='booking-completion-photos' returning id",
    "delete from storage.objects where bucket_id='booking-completion-photos' returning id",
  ]) check((await db.query(statement)).rows.length, 0, 'Client cannot overwrite/delete completion evidence');

  await actor('authenticated', ADMIN);
  check((await db.query('select name from storage.objects where bucket_id=$1', ['kyc-docs'])).rows.length > 0, true, 'Admin KYC read remains available');
  await actor('anon');
  await rejectInsert('kyc-docs', `${A}/anonymous.pdf`);
  await assert.rejects(db.query('select * from storage.objects'), error => error.code === '42501');
  rejections++;
  await actor('service_role');
  await insert('kyc-docs', `${B}/service.pdf`);
  check((await db.query('select name from storage.objects where bucket_id=$1 and name=$2', ['kyc-docs', `${B}/service.pdf`])).rows.length, 1, 'Service role retains bypass/read behavior');
  check((await db.query('delete from storage.objects where bucket_id=$1 and name=$2 returning id', ['kyc-docs', `${B}/service.pdf`])).rows.length, 1, 'Service role retains managed removal');

  // A missing prerequisite must roll back earlier alterations, rather than partially repair.
  await db.exec('reset role; drop policy "booking_completion_photos_booking_participant_insert" on storage.objects;');
  await db.exec("alter policy xooter_avatars_owner_write on storage.objects with check (false)");
  await assert.rejects(db.exec(correction), error => error.code === '42704');
  await db.exec('rollback');
  check((await policies()).find(row => row.policyname === 'xooter_avatars_owner_write').with_check, 'false', 'Missing prerequisite fails atomically');

  console.log(`PASS: ${assertions} SQL assertion groups; ${rejections} expected permission rejections; clean historical/incoming sequence, defect reproduction, additive replay, owner/member isolation and service behavior.`);
  console.log('Isolated PGlite SQL/RLS proof only: not full Supabase history, Storage HTTP MIME/size enforcement, public-avatar delivery, concurrency or hosted evidence.');
} finally { await db.close(); }
