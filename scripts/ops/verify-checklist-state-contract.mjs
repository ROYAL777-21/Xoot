import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const { PGlite } = await import(pathToFileURL(resolve(process.argv[2])).href);
const db = new PGlite();
const actor = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const other = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const job = '11111111-1111-4111-8111-111111111111';
const booking = '22222222-2222-4222-8222-222222222222';
const xooter = '33333333-3333-4333-8333-333333333333';
let groups = 0;
const check = (actual, expected) => { assert.deepEqual(actual, expected); groups++; };
const call = async (id = actor, key = 'start_work', complete = true) => (await db.query('select public.update_active_xooter_checklist($1,$2,$3,$4) as result', [id, job, key, complete])).rows[0].result;
try {
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql as 'select null::uuid';
    create function public.has_role(uuid,text) returns boolean language sql as 'select false';
    create table public.xooters(id uuid primary key,user_id uuid);
    create table public.bookings(id uuid primary key,user_id uuid,status text,cancelled_at timestamptz);
    create table public.xooter_jobs(id uuid primary key,booking_id uuid,xooter_id uuid,state text);
    create table public.household_profiles(id uuid,user_id uuid,is_default boolean,updated_at timestamptz,created_at timestamptz);
    create table public.saved_addresses(id uuid,user_id uuid,is_default boolean,created_at timestamptz);
    insert into auth.users values ('${actor}'),('${other}');
    insert into public.xooters values ('${xooter}','${actor}');
    insert into public.bookings values ('${booking}','${other}','in_progress',null);
    insert into public.xooter_jobs values ('${job}','${booking}','${xooter}','accepted');`);
  await db.exec(await readFile('supabase/migrations/20261003140000_company_wide_defaults_and_xooter_checklists.sql', 'utf8'));
  const correction = await readFile('supabase/migrations/20261007150000_checklist_active_job_mutation.sql','utf8');
  await db.exec(correction);
  await db.exec(correction);
  check((await db.query('select count(*)::int as n from public.xooter_job_checklist')).rows[0].n,4);
  await db.exec('set role service_role');
  for (const status of ['contractor_accepted','en_route','in_progress','confirmed','enroute','arrived']) {
    await db.exec('reset role'); await db.query('update bookings set status=$1', [status]); await db.exec('set role service_role');
    check((await call()).ok,true);
    check((await call(actor,'start_work',false)).ok,true);
  }
  for (const status of ['draft','pending','pending_payment','payment_confirmed','awaiting_assignment','assigned','completed','rated','cancelled','replacement_required','replacement_offered','reassigned','unknown',null]) {
    await db.exec('reset role'); await db.query('update bookings set status=$1', [status]); await db.exec('set role service_role');
    check((await call()).code,'not_active');
  }
  await db.exec("reset role; update bookings set status='in_progress'");
  for (const state of ['offered','declined','expired','cancelled','completed','unknown',null]) {
    await db.query('update xooter_jobs set state=$1', [state]); await db.exec('set role service_role');
    check((await call()).code,'not_active'); await db.exec('reset role');
  }
  await db.exec("update xooter_jobs set state='accepted'; set role service_role");
  check((await call(other)).code,'not_found');
  check((await call(null)).code,'invalid_request');
  check((await call(actor,'invalid')).code,'invalid_request');
  check((await call(actor,'start_work',null)).code,'invalid_request');
  await db.exec('reset role');
  await db.query('update xooters set user_id=$1', [other]); await db.exec('set role service_role');
  check((await call()).code,'not_found');
  await db.exec('reset role'); await db.query('update xooters set user_id=$1', [actor]);
  await db.query('insert into bookings values ($1,$2,$3,null)', [other,other,'in_progress']);
  await db.query("update xooter_job_checklist set booking_id=$1 where task_key='start_work'", [other]);
  await db.exec('set role service_role');
  check((await call()).code,'not_found');
  await db.exec('reset role'); await db.query("update xooter_job_checklist set booking_id=$1 where task_key='start_work'", [booking]);
  await db.exec("reset role; update bookings set cancelled_at=now(); set role service_role");
  check((await call()).code,'not_active');
  await db.exec('reset role; update bookings set cancelled_at=null; set role service_role');
  check((await call()).ok,true);
  await db.exec('reset role');
  check((await db.query("select completed_by from xooter_job_checklist where task_key='start_work'")).rows[0].completed_by,actor);
  // Simulate a formerly read active state becoming cancelled before mutation.
  await db.exec("update bookings set status='cancelled'; set role service_role");
  check((await call(actor,'start_work',false)).code,'not_active');
  await db.exec('reset role');
  check((await db.query("select completed_by from xooter_job_checklist where task_key='start_work'")).rows[0].completed_by,actor);
  await db.exec("update bookings set status='in_progress'; delete from xooter_job_checklist where task_key='start_work'; set role service_role");
  check((await call()).code,'not_found');
  await db.exec('reset role');
  for (const role of ['anon','authenticated']) {
    await db.exec(`set role ${role}`);
    await assert.rejects(call(), error => error.code === '42501'); groups++;
    await assert.rejects(db.exec('update public.xooter_job_checklist set completed_at=now()'), error => error.code === '42501'); groups++;
    await db.exec('reset role');
  }
  console.log(JSON.stringify({ ok:true,groups,cleanIncomingMigration:true,correctionReplay:true,hostedWrites:false,concurrentConnections:false }));
} finally { await db.close(); }
