// Real independent PostgreSQL connections on disposable loopback CI only. No JWT/provider proof.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

assert.equal(process.env.XOOT_PG_TEST_INTENT,'geoapify-evaluation');
assert.ok(['127.0.0.1','::1'].includes(process.env.PGHOST),'loopback DB only');
assert.equal(process.env.PGPORT,'5432');assert.equal(process.env.PGUSER,'postgres');
assert.equal(process.env.PGPASSWORD,'xoot-referral-synthetic-test');
assert.ok(!process.env.PGSERVICE && !process.env.PGSERVICEFILE && process.env.XOOT_PG_MODULE);
const { default:pg }=await import(pathToFileURL(resolve(process.env.XOOT_PG_MODULE)).href);
const config={host:process.env.PGHOST,port:Number(process.env.PGPORT),user:process.env.PGUSER,password:process.env.PGPASSWORD,
  database:'postgres',ssl:false,connectionTimeoutMillis:12000,statement_timeout:10000};
const admin=new pg.Client(config), database='xoot_geo_eval_'+randomUUID().replaceAll('-','');
const connections=[],createdRoles=[];let db,created=false;
const sql=path=>readFileSync(new URL('../../'+path,import.meta.url),'utf8').replace(/\r\n/g,'\n');
try {
  await admin.connect();
  for(const role of ['anon','authenticated','service_role']) {
    if(!(await admin.query('select 1 from pg_roles where rolname=$1',[role])).rowCount) {
      await admin.query('create role '+role+' nologin '+(role==='service_role'?'bypassrls':'nobypassrls'));createdRoles.push(role);
    }
  }
  await admin.query('create database "'+database+'"');created=true;
  db=new pg.Client({...config,database});await db.connect();
  const fixture=sql('scripts/testing/geoapify-evaluation-fixture.sql');
  assert.equal([...fixture.matchAll(/^create role (?:anon|authenticated|service_role)(?: bypassrls)?;$/gm)].length,3);
  await db.query(fixture.replace(/^create role (?:anon|authenticated|service_role)(?: bypassrls)?;$/gm,''));
  await db.query(sql('supabase/migrations/20261103180614_geoapify_private_staging_evaluation.sql'));
  await db.query(sql('scripts/testing/geoapify-evaluation-contract.sql'));
  await db.query('update private.geoapify_evaluation_budget set enabled=true,authorized_attempts=2');
  for(let i=0;i<20;i++) {
    const client=new pg.Client({...config,database});await client.connect();await client.query('set role service_role');connections.push(client);
  }
  const fixtureIds=['gcis_head_office','state_theatre','union_buildings'];
  const claims=await Promise.all(connections.map(async (client,index)=>{
    const nonce=randomUUID(),fixtureId=fixtureIds[index%3];
    return {nonce,fixtureId,...(await client.query('select public.claim_geoapify_evaluation($1,$2) receipt',[fixtureId,nonce])).rows[0].receipt};
  }));
  assert.equal(claims.filter(row=>row.state==='claimed').length,1,'only one of20 overlapping claims owns dispatch lease');
  assert.equal((await db.query('select used from private.geoapify_evaluation_budget')).rows[0].used,1);
  const first=claims.find(row=>row.state==='claimed');
  const authorizations=await Promise.all(connections.map(client=>client.query('select public.authorize_geoapify_evaluation($1,$2) receipt',[first.attemptId,first.nonce])));
  assert.equal(authorizations.filter(row=>row.rows[0].receipt.authorized).length,1,'exactly one concurrent authorization succeeds');
  const finishes=await Promise.all(connections.map(client=>client.query("select public.finish_geoapify_evaluation($1,$2,'error','provider_unavailable',null) receipt",[first.attemptId,first.nonce])));
  assert.equal(finishes.filter(row=>row.rows[0].receipt.cached===false).length,1,'only one finish transitions the receipt');
  assert.equal(finishes.filter(row=>row.rows[0].receipt.cached===true).length,19,'all other finishes are idempotent');
  // Move only the synthetic clock slot, never the consumed/authorized counters.
  await db.query("update private.geoapify_evaluation_budget set next_request_at=clock_timestamp()-interval '1 second'");
  const remaining=fixtureIds.filter(id=>id!==first.fixtureId);
  const second=await Promise.all(connections.map(client=>client.query('select public.claim_geoapify_evaluation($1,$2) receipt',[remaining[0],randomUUID()])));
  assert.equal(second.filter(row=>row.rows[0].receipt.state==='claimed').length,1,'second allowance admits exactly one concurrent claim');
  assert.equal((await db.query('select used from private.geoapify_evaluation_budget')).rows[0].used,2);
  const exhausted=await Promise.all(connections.map(client=>client.query('select public.claim_geoapify_evaluation($1,$2) receipt',[remaining[1],randomUUID()])));
  assert.ok(exhausted.every(row=>row.rows[0].receipt.reason==='budget_exhausted'),'all new fixtures fail at the shared ceiling');
  assert.deepEqual((await db.query("select authorized_queries,consumed_queries from public.xoot_mapbox_geocoding_budget where budget_key='paused_sentinel'")).rows,[{authorized_queries:3,consumed_queries:3}]);
  console.log('PASS: actual migration/ACL/lease/nonce/revision/receipt contracts plus20 independent PostgreSQL connections: one claim, one authorization, one finish; shared ceiling2 and no Mapbox change. Provider calls:0.');
} finally {
  await Promise.all(connections.map(client=>client.end().catch(()=>{})));
  if(db)await db.end().catch(()=>{});
  if(created)await admin.query('drop database "'+database+'" with (force)');
  for(const role of createdRoles.reverse())await admin.query('drop role '+role);
  await admin.end();
}
