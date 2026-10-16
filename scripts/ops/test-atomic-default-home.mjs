import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
assert.equal(process.env.XOOT_PG_TEST_INTENT,'atomic-default-home');
assert.ok(['127.0.0.1','::1'].includes(process.env.PGHOST));
assert.ok(process.env.PGUSER && process.env.PGPORT && !process.env.PGSERVICE && !process.env.PGSERVICEFILE);
const {default:pg}=await import(process.env.XOOT_PG_MODULE?pathToFileURL(resolve(process.env.XOOT_PG_MODULE)).href:'pg');
const config={host:process.env.PGHOST,port:Number(process.env.PGPORT),user:process.env.PGUSER,password:process.env.XOOT_PG_PASSWORD_FILE?readFileSync(process.env.XOOT_PG_PASSWORD_FILE,'utf8').trim():process.env.PGPASSWORD,database:'postgres',ssl:false,connectionTimeoutMillis:10000,statement_timeout:12000,query_timeout:15000,application_name:'xoot_atomic_home_test'};
assert.ok(config.password);
const admin=new pg.Client(config),clients=[],roles=[],database=`xoot_test_homes_${randomUUID().replaceAll('-','')}`;
let created=false,initialRoles,count=0,barriers=0,passed=false;
const snapshot=async()=> (await admin.query(`select oid,rolname,rolsuper,rolinherit,rolcreaterole,rolcreatedb,rolcanlogin,rolreplication,rolbypassrls from pg_roles where rolname=any($1) order by rolname`,[['anon','authenticated','service_role',config.user]])).rows;
const log=name=>console.log(`ok ${++count} - ${name}`);
const pending=p=>p.then(value=>({value}),error=>({error}));
const success=r=>{if(r.error) throw r.error;return r.value;};
try {
 await admin.connect();initialRoles=await snapshot();const version=Number((await admin.query('show server_version_num')).rows[0].server_version_num);assert.ok(version>=170000 && version<180000);
 for(const role of ['anon','authenticated','service_role'])if(!(await admin.query('select 1 from pg_roles where rolname=$1',[role])).rowCount){await admin.query(`create role ${role} nologin`);roles.push(role);}
 await admin.query(`create database "${database}"`);created=true;
 for(let i=0;i<4;i++){const c=new pg.Client({...config,database});await c.connect();clients.push(c);}
 const [db,first,second,other]=clients;
 await db.query(readFileSync('scripts/ops/fixtures/atomic-default-home.sql','utf8'));
 // Apply the actual prerequisite default normalization/index SQL (before unrelated checklists).
 const prerequisite=readFileSync('supabase/migrations/20261003140000_company_wide_defaults_and_xooter_checklists.sql','utf8');
 await db.query(prerequisite.slice(0,prerequisite.indexOf('create table if not exists public.xooter_job_checklist')));
 const fresh=async()=>{const u=randomUUID();await db.query('insert into auth.users values($1)',[u]);return u;};
 const u=await fresh(),v=await fresh(),w=await fresh(),a=randomUUID(),legacy=randomUUID(),legacyV=randomUUID();
 await db.query("insert into household_profiles(id,user_id,label,address,is_default) values($1,$2,'Home','100 Synthetic Road',true)",[a,u]);
 await db.query("insert into saved_addresses(id,user_id,label,address,city,postal_code,is_default) values($1,$2,'Office','100 Synthetic Road','Test city','1000',true),($3,$4,'Second','200 Synthetic Road',null,null,true)",[legacy,u,legacyV,v]);
 await db.query('insert into bookings(household_profile_id) values($1)',[a]);
 await db.query(readFileSync('supabase/migrations/20261015153244_atomic_default_home.sql','utf8'));
 assert.equal((await db.query("select column_default from information_schema.columns where table_schema='public' and table_name='household_profiles' and column_name='is_default'")).rows[0].column_default,'false');
 const imported=(await db.query('select * from household_profiles where source_saved_address_id=$1',[legacy])).rows[0];
 assert.notEqual(imported.id,a);assert.equal(imported.is_default,false);assert.equal(imported.city,'Test city');assert.equal(imported.postal_code,'1000');
 assert.equal((await db.query('select is_default from household_profiles where source_saved_address_id=$1',[legacyV])).rows[0].is_default,true);
 assert.equal((await db.query('select count(*) n from saved_addresses where is_default')).rows[0].n,'0');
 assert.equal((await db.query('select count(*) n from saved_addresses where legacy_default_at_cutover')).rows[0].n,'2');
 log('explicit import preserves duplicate-looking distinct places, metadata and household-first/legacy-second precedence');
 const auth=async(c,user,role='authenticated')=>{await c.query('reset role');await c.query("select set_config('request.jwt.claim.sub',$1,false)",[user??'']);await c.query(`set role ${role}`);};
 await auth(first,u);await auth(second,u);await auth(other,w);
 const save=async(c,owner,id,selected=null,details={label:'Office',address:'300 Synthetic Road'})=>(await c.query('select public.save_home($1,$2,$3,$4) r',[owner,id,details,selected])).rows[0].r;
 const select=async(c,owner,id,selected=true)=>(await c.query('select public.set_default_home($1,$2,$3) r',[owner,id,selected])).rows[0].r;
 const remove=async(c,owner,id)=>(await c.query('select public.delete_home($1,$2) r',[owner,id])).rows[0].r;
 const chosen=async owner=>(await db.query('select id from household_profiles where user_id=$1 and is_default',[owner])).rows.map(r=>r.id);
 const reject=async(p,code='42501')=>assert.equal((await pending(p)).error?.code,code);
 assert.deepEqual(await chosen(w),[]);log('owner without a marked home has no fabricated default');
 const b=randomUUID();await save(first,u,b);assert.deepEqual(await chosen(u),[a]);log('ordinary new save does not overwrite the selected home');
 await select(first,u,b);assert.deepEqual(await chosen(u),[b]);await select(first,u,b);assert.deepEqual(await chosen(u),[b]);log('atomic switch and retry confirm a single canonical home');
 await reject(select(first,v,imported.id));await reject(select(first,u,randomUUID()),'22023');await reject(select(first,u,(await db.query('select id from household_profiles where user_id=$1',[v])).rows[0].id),'22023');assert.deepEqual(await chosen(u),[b]);
 await first.query("select set_config('test.admin','true',false)");await reject(select(first,u,(await db.query('select id from household_profiles where user_id=$1',[v])).rows[0].id),'22023');await first.query("select set_config('test.admin','false',false)");log('expected owner is only an auth guard; unrelated targets denied even with broad admin RLS');
 for(const sql of ["update household_profiles set is_default=true where id=$1","update household_profiles set user_id=user_id where id=$1","delete from household_profiles where id=$1","insert into household_profiles(id,user_id,is_default) values($1,auth.uid(),true)","update saved_addresses set is_default=true where id=$1"]){await reject(first.query(sql,[a]));}await reject(first.query('select * from saved_addresses'));log('direct table/historical column writes and incompatible legacy reads fail closed');
 await auth(other,null,'anon');await reject(select(other,u,b));await auth(other,null);await reject(select(other,u,b));await auth(other,w);log('anonymous and missing authenticated identity denied');
 await db.query("create function public.fail_default() returns trigger language plpgsql as $$begin if new.is_default then raise exception 'Synthetic mandatory failure';end if;return new;end$$;create trigger synthetic_fail before update on household_profiles for each row execute function public.fail_default()");
 await reject(select(first,u,a),'P0001');assert.deepEqual(await chosen(u),[b]);const failedId=randomUUID();await reject(save(first,u,failedId,true),'P0001');assert.equal((await db.query('select count(*) n from household_profiles where id=$1',[failedId])).rows[0].n,'0');
 await db.query('drop trigger synthetic_fail on household_profiles');await save(first,u,failedId,true);assert.deepEqual(await chosen(u),[failedId]);log('mandatory failure rolls back clearing and creation; retry succeeds');
 const p1=Number((await first.query('select pg_backend_pid() p')).rows[0].p),p2=Number((await second.query('select pg_backend_pid() p')).rows[0].p);
 const blocked=async()=>{const end=Date.now()+6000;while(Date.now()<end){const r=(await db.query('select state,wait_event_type,pg_blocking_pids(pid) blockers from pg_stat_activity where pid=$1',[p2])).rows[0];if(r?.state==='active'&&r.wait_event_type==='Lock'&&r.blockers.includes(p1)){barriers++;console.log(JSON.stringify({barrier:barriers,waitingPid:p2,blockingPid:p1,observed:r}));return;}await delay(20);}throw Error('Real lock barrier missing');};
 await first.query('begin');await select(first,u,a);await second.query('begin');let work=pending(select(second,u,b));await blocked();const independent=randomUUID();await save(other,w,independent,true);assert.deepEqual(await chosen(w),[independent]);await first.query('commit');success(await work);await second.query('commit');assert.deepEqual(await chosen(u),[b]);log('simultaneous different-home switches block per owner while unrelated owner progresses');
 const firstOwner=await fresh(),one=randomUUID(),two=randomUUID();await auth(first,firstOwner);await auth(second,firstOwner);await first.query('begin');await save(first,firstOwner,one,true);await second.query('begin');work=pending(save(second,firstOwner,two,true));await blocked();await first.query('commit');success(await work);await second.query('commit');assert.deepEqual(await chosen(firstOwner),[two]);log('concurrent first-default creations serialize before any home exists');
 await auth(first,u);await auth(second,u);await first.query('begin');await select(first,u,a);await second.query('begin');work=pending(remove(second,u,a));await blocked();await first.query('commit');success(await work);await second.query('commit');assert.deepEqual(await chosen(u),[]);assert.equal((await db.query('select household_profile_id from bookings')).rows[0].household_profile_id,a);log('switch then delete archives selected place, leaves no fabricated default, preserves booking FK');
 await first.query('begin');await remove(first,u,b);await second.query('begin');work=pending(select(second,u,b));await blocked();await first.query('commit');assert.equal((await work).error?.code,'22023');await second.query('rollback');log('delete then switch rejects archived target after observed lock barrier');
 // Ownership update holds the tuple first; the switch waits, then observes a rejected immutable move.
 await auth(first,u,'service_role');await first.query('begin');await first.query('select id from household_profiles where id=$1 for update',[imported.id]);await second.query('begin');work=pending(select(second,u,imported.id));await blocked();await reject(first.query('update household_profiles set user_id=$1 where id=$2',[v,imported.id]));await first.query('rollback');success(await work);await second.query('commit');assert.deepEqual(await chosen(u),[imported.id]);log('ownership-move race cannot transfer a selected home or authorize another owner');
 await reject(first.query('update household_profiles set is_default=false where id=$1',[imported.id]));await reject(first.query('delete from household_profiles where id=$1',[imported.id]));await reject(first.query('update saved_addresses set is_default=true where id=$1',[legacy]));log('service direct default/deletion and legacy mutation also fail closed');
 await auth(first,u);await first.query('begin');await select(first,u,failedId);await second.query('begin');work=pending(save(second,u,imported.id,null,{label:'Office edited',address:'100 Synthetic Road'}));await blocked();await first.query('commit');success(await work);await second.query('commit');assert.deepEqual(await chosen(u),[failedId]);log('detail edits preserve concurrent default changes');
 await first.query('begin');await select(first,u,imported.id);await auth(second,u,'service_role');await second.query('begin');work=pending(second.query('update household_profiles set user_id=$1 where id=$2',[v,imported.id]));await blocked();await first.query('commit');assert.equal((await work).error?.code,'42501');await second.query('rollback');assert.deepEqual(await chosen(u),[imported.id]);log('switch-first ownership race waits then rejects transfer');
 await auth(second,u);await first.query('begin');await select(first,u,failedId);await second.query('begin');work=pending(select(second,u,imported.id));await blocked();await first.query('rollback');success(await work);await second.query('commit');assert.deepEqual(await chosen(u),[imported.id]);log('rolled-back competing switch leaves prior committed selection intact for waiting retry');
 await select(first,u,imported.id,false);assert.deepEqual(await chosen(u),[]);await select(first,u,failedId);log('explicit deselection leaves no default and next selection restores it');
 const retryId=randomUUID();const createReply=await save(first,u,retryId,true);assert.deepEqual(await save(first,u,retryId,true),createReply);assert.equal((await db.query('select count(*) n from household_profiles where id=$1',[retryId])).rows[0].n,'1');log('lost creation reply retry with caller-stable UUID does not duplicate the home');

 await db.query('begin');await reject(db.query('update household_profiles set is_default=true where id=$1',[imported.id]),'23505');await db.query('rollback');log('partial unique index remains a database backstop even for table owner');
 const reply=await save(first,u,randomUUID(),null,{label:'Safe response',address:'400 Synthetic Road',gate_code:'synthetic-private',access_notes:'synthetic-private'});assert.deepEqual(Object.keys(reply).sort(),['id','is_default']);log('save/default replies contain no gate, alarm or access values');
 const cascadeOwner=await fresh(),cascadeLegacy=randomUUID();
 // Auth deletion must still execute the installed FK cascade without a legacy mapping FK ordering failure.
 await db.query('alter table saved_addresses disable trigger saved_addresses_read_only');
 await db.query("insert into saved_addresses(id,user_id,label,address) values($1,$2,'Cascade','500 Synthetic Road')",[cascadeLegacy,cascadeOwner]);
 await db.query('alter table saved_addresses enable trigger saved_addresses_read_only');
 await db.query("insert into household_profiles(user_id,label,address,source_saved_address_id) values($1,'Cascade','500 Synthetic Road',$2)",[cascadeOwner,cascadeLegacy]);
 await db.query('delete from auth.users where id=$1',[cascadeOwner]);assert.equal((await db.query('select count(*) n from household_profiles where user_id=$1',[cascadeOwner])).rows[0].n,'0');log('auth-user cascade remains compatible with additive legacy FK and archival controls');
 assert.ok(barriers>=8);passed=true;console.log(JSON.stringify({status:'passed',postgresVersion:version,tests:count,observedBlockingBarriers:barriers,syntheticOnly:true}));
}finally{
 await Promise.all(clients.map(async c=>{await c.query('rollback').catch(()=>{});await c.end();}));
 if(created&&/^xoot_test_homes_[0-9a-f]{32}$/.test(database))await admin.query(`drop database "${database}"`);
 for(const role of roles.reverse())await admin.query(`drop role ${role}`);
 if(initialRoles)assert.deepEqual(await snapshot(),initialRoles);
 if(created){assert.equal((await admin.query('select count(*) n from pg_database where datname=$1',[database])).rows[0].n,'0');console.log(JSON.stringify({cleanup:'verified',ownedDatabaseRemoved:true,preexistingRolesPreserved:true,passed}));}await admin.end();
}
