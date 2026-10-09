import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const { PGlite } = await import(pathToFileURL(resolve(process.argv[2])).href);
const migration = await readFile('supabase/migrations/20261008120000_safe_solo_visit_reviews.sql','utf8');
const followupMigration = await readFile('supabase/migrations/20261009090000_atomic_visit_review_followup.sql','utf8');
const actor = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', other = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const booking = '11111111-1111-4111-8111-111111111111', xooter = '22222222-2222-4222-8222-222222222222', second = '33333333-3333-4333-8333-333333333333';
const setup = async db => db.exec(`create role anon; create role authenticated; create role service_role;
  create table bookings(id uuid primary key,user_id uuid,xooter_id uuid,status text,cancelled_at timestamptz,crew_size smallint default 1);
  create table xooters(id uuid primary key); create table booking_assignees(booking_id uuid,xooter_id uuid);
  create table xooter_jobs(booking_id uuid,xooter_id uuid,state text);
  create table post_job_reviews(id uuid primary key default gen_random_uuid(),booking_id uuid references bookings(id),user_id uuid,xooter_id uuid references xooters(id),rating integer,quality_rating integer,punctuality_rating integer,complaint boolean,notes text);
  create table support_followups(id uuid primary key default gen_random_uuid(),booking_id uuid,user_id uuid,trigger_type text,priority text,notes text,status text default 'open',created_at timestamptz default now());
  create table admin_review_queue(id uuid primary key default gen_random_uuid(),queue_type text,subject_table text,subject_id uuid,user_id uuid,xooter_id uuid,booking_id uuid,priority text,summary text,status text default 'open',created_at timestamptz default now());
  grant select,insert,update on post_job_reviews to authenticated; grant update(notes,rating) on post_job_reviews to authenticated;
  insert into xooters values('${xooter}'),('${second}'); insert into bookings values('${booking}','${actor}','${xooter}','completed',null,1);`);
let groups = 0;
const check = (actual, expected) => { assert.deepEqual(actual,expected); groups++; };
const db = new PGlite();
try {
  await setup(db); await db.exec(migration); await db.exec(migration);
  await db.exec(followupMigration); await db.exec(followupMigration);
  const call = async (owner=actor,rating=4,notes='Recorded opinion') => (await db.query('select save_solo_visit_review($1,$2,$3,$4) result',[owner,booking,rating,notes])).rows[0].result;
  check((await call(other)).code,'not_found');
  for (const rating of [null,0,6]) check((await call(actor,rating)).code,'invalid_request');
  check((await call(actor,4,'x'.repeat(1001))).code,'invalid_request');
  for (const status of ['draft','pending_payment','payment_confirmed','assigned','contractor_accepted','en_route','in_progress','rated','cancelled',null]) {
    await db.query('update bookings set status=$1',[status]); check((await call()).code,'not_eligible');
  }
  await db.exec("update bookings set status='completed',cancelled_at=now()"); check((await call()).code,'not_eligible');
  await db.exec('update bookings set cancelled_at=null,xooter_id=null'); check((await call()).code,'not_eligible');
  await db.query('update bookings set xooter_id=$1,crew_size=2',[xooter]); check((await call()).code,'crew_pending');
  await db.exec('update bookings set crew_size=1');
  await db.query('insert into booking_assignees values($1,$2)',[booking,second]); check((await call()).code,'crew_pending');
  await db.exec('delete from booking_assignees');
  await db.query("insert into xooter_jobs values($1,$2,'completed')",[booking,second]); check((await call()).code,'crew_pending');
  await db.exec('delete from xooter_jobs');
  // This successful transaction's response is deliberately discarded: a transport retry
  // must return the same review even with a different submitted opinion.
  const first = await call(actor,2,'  Needs follow-up  '); check(first.ok,true); check(first.existing,false);
  const retry = await call(actor,5,'Changed opinion'); check(retry.existing,true); check(retry.review,first.review);
  check((await db.query('select count(*)::int n from post_job_reviews')).rows[0].n,1);
  check((await db.query('select xooter_id,complaint,notes from post_job_reviews')).rows[0],{xooter_id:xooter,complaint:true,notes:'Needs follow-up'});
  check((await db.query('select quality_rating,punctuality_rating from post_job_reviews')).rows[0],{quality_rating:null,punctuality_rating:null});
  await assert.rejects(db.query('insert into post_job_reviews(booking_id,user_id,xooter_id,rating) values($1,$2,$3,4)',[booking,actor,xooter]),error => error.code==='23505'); groups++;
  await db.exec("update bookings set status='rated'"); check((await call()).review,first.review);
  for (const role of ['anon','authenticated']) {
    await db.exec(`set role ${role}`);
    await assert.rejects(call(),error=>error.code==='42501'); groups++;
    await assert.rejects(db.exec('update post_job_reviews set rating=5'),error=>error.code==='42501'); groups++;
    await assert.rejects(db.exec('update post_job_reviews set notes=null'),error=>error.code==='42501'); groups++;
    await assert.rejects(db.query('insert into post_job_reviews(booking_id,user_id,xooter_id,rating) values($1,$2,$3,4)',[booking,actor,xooter]),error=>error.code==='42501'); groups++;
    await db.exec('reset role');
  }
  await db.exec('set role service_role'); check((await call()).review,first.review); await db.exec('reset role');
  const followup = async (owner=actor,reviewId=first.review.id) => (await db.query('select queue_visit_review_followup($1,$2) result',[owner,reviewId])).rows[0].result;
  const counts = async () => (await db.query('select (select count(*)::int from support_followups) support,(select count(*)::int from admin_review_queue) queue')).rows[0];
  const opinion = (await db.query('select * from post_job_reviews')).rows[0];
  check((await followup(other)).code,'not_found'); check((await followup(actor,other)).code,'not_found');
  await db.exec('update post_job_reviews set rating=4'); check(await followup(),{queued:false}); check(await counts(),{support:0,queue:0});
  await db.exec('update post_job_reviews set rating=2');
  // Inject real insert failures into each existing table. The function must roll back
  // the first write when the second fails, without changing the saved opinion.
  await db.exec(`create function fail_followup_insert() returns trigger language plpgsql as $$ begin
    if current_setting('xoot.test_fail',true)=TG_TABLE_NAME then raise exception 'Isolated insert failure' using errcode='23514'; end if;
    return NEW; end $$;
    create trigger fail_support before insert on support_followups for each row execute function fail_followup_insert();
    create trigger fail_queue before insert on admin_review_queue for each row execute function fail_followup_insert();`);
  for (const table of ['support_followups','admin_review_queue']) {
    await db.query("select set_config('xoot.test_fail',$1,false)",[table]);
    await assert.rejects(followup(),error=>error.code==='23514'); groups++;
    check(await counts(),{support:0,queue:0});
    check((await db.query('select * from post_job_reviews')).rows[0],opinion);
  }
  await db.query("select set_config('xoot.test_fail','',false)");
  // Successful response discarded, then repeated: both rows and their identities are stable.
  const routed = await followup(); check(routed.queued,true);
  check(await followup(),routed); check(await counts(),{support:1,queue:1});
  await db.exec("update support_followups set status='closed'; update admin_review_queue set status='resolved'");
  check(await followup(),routed);
  check((await db.query('select status from support_followups')).rows[0].status,'closed');
  check((await db.query('select status from admin_review_queue')).rows[0].status,'resolved');
  // Each partial legacy state is preserved; only its missing counterpart is inserted.
  await db.exec('delete from admin_review_queue');
  const partialSupport = await followup(); check(partialSupport.followup_id,routed.followup_id);
  check(await counts(),{support:1,queue:1}); check((await db.query('select status from support_followups')).rows[0].status,'closed');
  await db.exec("update admin_review_queue set status='resolved'; delete from support_followups");
  const partialQueue = await followup(); check(partialQueue.queue_id,partialSupport.queue_id);
  check(await counts(),{support:1,queue:1}); check((await db.query('select status from admin_review_queue')).rows[0].status,'resolved');
  check((await db.query('select * from post_job_reviews')).rows[0],opinion);
  check((await db.query('select status from bookings')).rows[0].status,'rated');
  for (const role of ['anon','authenticated']) {
    await db.exec(`set role ${role}`); await assert.rejects(followup(),error=>error.code==='42501'); groups++;
    await db.exec('reset role');
  }
  await db.exec('set role service_role'); check(await followup(),partialQueue); await db.exec('reset role');
} finally { await db.close(); }
const duplicates = new PGlite();
try {
  await setup(duplicates);
  await duplicates.query('insert into post_job_reviews(booking_id,user_id,xooter_id,rating) values($1,$2,$3,2),($1,$2,$3,3)',[booking,actor,xooter]);
  await assert.rejects(duplicates.exec(migration),error=>error.message.includes('Duplicate historical')); groups++;
  await duplicates.exec('rollback');
  check((await duplicates.query('select count(*)::int n from post_job_reviews')).rows[0].n,2);
} finally { await duplicates.close(); }
console.log(JSON.stringify({ok:true,groups,nonDestructiveDuplicateRefusal:true,immutableRetry:true,atomicFollowupRollback:true,followupRetryReuse:true,hostedWrites:false,concurrentConnections:false}));
