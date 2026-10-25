import {execFileSync,spawn} from 'node:child_process';import {readFileSync} from 'node:fs';import {randomUUID} from 'node:crypto';import assert from 'node:assert/strict';
if(process.env.XOOT_PG_TEST_INTENT!=='mapbox-budget')throw new Error('Explicit local Mapbox budget test intent required');
const container=process.env.XOOT_VOICE_TEST_CONTAINER;
if(!/^xoot-voice-sql-[0-9]+$/.test(container??''))throw new Error('Owned local test container required');
const info=JSON.parse(execFileSync('docker',['inspect',container],{encoding:'utf8'}))[0];
assert.equal(info.Config.Labels?.['xoot.test.intent'],'in-app-voice-ledger');assert.equal(info.HostConfig.NetworkMode,'none');assert.ok(!info.Mounts.some(m=>m.Type==='bind'));
const database='xoot_mapbox_budget_'+randomUUID().replaceAll('-','');
const args=db=>['exec','-i',container,'psql','-X','-q','-U','postgres','-d',db,'-v','ON_ERROR_STOP=1','-At'];
const sql=(input,db=database)=>execFileSync('docker',args(db),{input,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
const concurrent=input=>new Promise((resolve,reject)=>{const p=spawn('docker',args(database),{stdio:['pipe','pipe','pipe']});let out='',err='';p.stdout.on('data',b=>{out+=b;});p.stderr.on('data',b=>{err+=b;});p.on('error',reject);p.on('close',code=>code===0?resolve(out.trim()):reject(new Error(err)));p.stdin.end(input);});
sql('create database "'+database+'";','postgres');
try{
  sql(`create schema auth;create table auth.users(id uuid primary key);alter default privileges in schema public grant all on tables to anon,authenticated,service_role;`);
  const base=readFileSync(new URL('../../supabase/migrations/20261019185331_xoot_approved_service_zones.sql',import.meta.url),'utf8');
  const migration=readFileSync(new URL('../../supabase/migrations/20261025192502_mapbox_geocoding_global_budget.sql',import.meta.url),'utf8');
  sql(base);sql(migration);
  if(process.env.XOOT_MAPBOX_TEST_PLANT==='per-user-only')sql(base.match(/create or replace function public\.xoot_consume_coverage_query[\s\S]+?\$\$;/i)[0]);
  else if(process.env.XOOT_MAPBOX_TEST_PLANT)throw new Error('Unknown negative control');
  const users=Array.from({length:21},()=>randomUUID());sql('insert into auth.users values '+users.map(id=>`('${id}')`).join(',')+';');
  const consume=id=>`set role service_role;select public.xoot_consume_coverage_query('${id}');`;
  assert.equal(sql(consume(users[0])),'f','Zero global allowance must deny even the first user');
  assert.equal(sql('select count(*) from public.xoot_coverage_query_budget;'),'0');
  sql(`do $$ declare r text;p text;begin
    if not(select relrowsecurity from pg_class where oid='public.xoot_mapbox_geocoding_budget'::regclass) then raise exception 'RLS absent';end if;
    if exists(select from pg_policies where schemaname='public' and tablename='xoot_mapbox_geocoding_budget') then raise exception 'Client policy';end if;
    foreach r in array array['anon','authenticated'] loop
      foreach p in array array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'] loop
        if has_table_privilege(r,'public.xoot_mapbox_geocoding_budget',p) then raise exception 'Client budget privilege';end if;
      end loop;
      if has_function_privilege(r,'public.xoot_consume_coverage_query(uuid)','EXECUTE') then raise exception 'Client RPC';end if;
    end loop;
    if(select prosecdef from pg_proc where oid='public.xoot_consume_coverage_query(uuid)'::regprocedure) then raise exception 'Must be invoker';end if;
  end $$;update public.xoot_mapbox_geocoding_budget set authorized_queries=3;`);
  const replies=await Promise.all(users.slice(0,20).map(id=>concurrent(consume(id))));
  assert.equal(replies.filter(r=>r==='t').length,3,'Only three of twenty distinct concurrent accounts may consume the global allowance');
  assert.equal(sql('select consumed_queries from public.xoot_mapbox_geocoding_budget;'),'3');
  sql("update public.xoot_coverage_query_budget set resets_at=clock_timestamp()-interval '1 day';");
  assert.equal(sql(consume(users[20])),'f','User window reset cannot renew the total allowance');
  sql('update public.xoot_mapbox_geocoding_budget set authorized_queries=30;');
  const perUser=await Promise.all(Array.from({length:20},()=>concurrent(consume(users[20]))));
  assert.equal(perUser.filter(r=>r==='t').length,12,'Existing per-user twelve/hour limit remains');
  assert.equal(sql('select consumed_queries from public.xoot_mapbox_geocoding_budget;'),'15','Denied per-user calls do not consume global allowance');
  assert.throws(()=>sql('update public.xoot_mapbox_geocoding_budget set authorized_queries=14;'),/Command failed/);
  sql('delete from public.xoot_mapbox_geocoding_budget;');
  assert.equal(sql(consume(users[20])),'f','Missing allowance fails closed');
  console.log('Real PostgreSQL: zero/missing default denial, client/RPC denial, exactly3 of20 distinct concurrent accounts, preserved12/hour/user, no auto-renewal and monotonic consumption passed');
}finally{sql('drop database "'+database+'" with (force);','postgres');}
