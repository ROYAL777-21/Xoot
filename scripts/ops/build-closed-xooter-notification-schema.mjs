import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const target=process.argv[2];
if(!/^supabase\/migrations\/\d{14}_closed_xooter_notification_schema\.sql$/.test(target??''))throw Error('Pass the CLI-created migration path');
const {PGlite}=await import(pathToFileURL(resolve(process.argv[3])).href);
const sha=s=>createHash('sha256').update(s).digest('hex');
const literal=s=>"'"+s.replaceAll("'","''")+"'";
const expected=[
 ['20261102082500','xooter_notification_journey','82ea0fc77d11c67e2061b2702c0091d84e6d31fe88340a3345a4c1e5ee3419ed'],
 ['20261102082516','xooter_email_delivery_receipts','9592ccc511eff6c40195440de6829e46e9f4999464a53362de90ff409ed0c1da'],
 ['20261102165153','xooter_email_outbox_completion','e6ad261323fc7d1d65efc34e8436c6818031e3c4a138438b6ede01ee0730574a'],
];
const contract="CHECK ((status = ANY (ARRAY['queued'::text, 'needs_approval'::text, 'processing'::text, 'completed'::text, 'failed'::text, 'cancelled'::text])))";
const oldGuard=`  if not exists(select from pg_constraint c where c.conrelid='public.integration_outbox'::regclass
    and c.conname='integration_outbox_status_check' and pg_get_constraintdef(c.oid) like '%''completed''%') then
    raise exception 'Unknown outbox status contract';
  end if;`;
const textContractGuard=`  -- Actual production status is unconstrained text; staging has the exact six-state CHECK.
  -- Validate either reviewed shape without adding/removing a global outbox constraint.
  if not exists(select from pg_attribute a where a.attrelid='public.integration_outbox'::regclass
      and a.attname='status' and not a.attisdropped and a.atttypid='pg_catalog.text'::regtype and a.attgenerated='')
    or exists(select from pg_constraint c join pg_attribute a on a.attrelid=c.conrelid and a.attname='status'
      where c.conrelid='public.integration_outbox'::regclass and c.contype='c' and a.attnum=any(c.conkey)
      and (c.conname<>'integration_outbox_status_check' or pg_get_constraintdef(c.oid)<>${literal(contract)})) then
    raise exception 'Unknown outbox status contract';
  end if;`;
const versions=[];
for(const [version,name,hash] of expected){
 const source=(await readFile(`supabase/migrations/${version}_${name}.sql`,'utf8')).replaceAll('\r\n','\n');
 if(sha(source)!==hash)throw Error(`Applied source changed: ${version}`);
 if((source.match(/^begin;$/gm)??[]).length!==1||(source.match(/^commit;$/gm)??[]).length!==1)throw Error('Unexpected transaction pair');
 let body=source.replace(/^begin;\n/m,'').replace(/^commit;\n/m,'');
 const adaptations=[];
 if(version==='20261102165153'){
  if(body.split(oldGuard).length!==2)throw Error('Reviewed compatibility input changed');
  body=body.replace(oldGuard,textContractGuard);
  adaptations.push('Replace staging-only constraint-name assertion with explicit text-column/exact-existing-status-CHECK validation; no constraint, receipt-function body or grant is changed. Actual production has no status CHECK.');
 }
 versions.push({version,name,sourceSha256:hash,executedSha256:sha(body),body,adaptations});
}
const db=new PGlite();let functions;
try{
 await db.exec((await readFile('scripts/testing/xooter-journey-fixture.sql','utf8')).replaceAll('\r\n','\n'));
 for(const v of versions)await db.exec(v.body);
 functions=(await db.query(`select n.nspname||'.'||p.proname||'('||oidvectortypes(p.proargtypes)||')' as signature,
   encode(sha256(convert_to(p.prosrc,'UTF8')),'hex') as sha,p.prosecdef,
   pg_get_function_result(p.oid) as result,
   has_function_privilege('anon',p.oid,'execute') as anon,
   has_function_privilege('authenticated',p.oid,'execute') as authenticated,
   has_function_privilege('service_role',p.oid,'execute') as service
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where (n.nspname='private' and p.proname in ('xooter_journey_ready','emit_xooter_journey','start_xooter_journey','xooter_application_journey','collect_xooter_journeys','ignore_legacy_xooter_journey_duplicate','xooter_journey_email_eligible'))
   or(n.nspname='public' and p.proname in ('manage_xooter_communications','xooter_email_worker_authorized','claim_xooter_journey_email','authorize_xooter_journey_email','finish_xooter_journey_email'))
  order by signature`)).rows;
 if(functions.length!==12)throw Error('Expected twelve reviewed function bodies');
}finally{await db.close();}
const entries=versions.map(v=>{
 const tag=`$notification_source_${v.version}$`;if(v.body.includes(tag))throw Error('Quote collision');
 return `  -- ${v.version}_${v.name}.sql; immutable source SHA256 ${v.sourceSha256}
  -- Actual executed SHA256 ${v.executedSha256}${v.adaptations.length?' (explicit production compatibility assertion)':''}
  if v_existing=0 then
    v_sql := ${tag}${v.body}${tag};
    execute v_sql;
    insert into supabase_migrations.schema_migrations(version,name,statements) values('${v.version}','${v.name}',array[v_sql]);
  else
    select encode(sha256(convert_to(replace(array_to_string(statements,E'\\n'),E'\\r\\n',E'\\n'),'UTF8')),'hex') into v_history
      from supabase_migrations.schema_migrations where version='${v.version}' and name='${v.name}' and cardinality(statements)=1;
    if v_history is null or v_history not in ('${v.sourceSha256}','${v.executedSha256}') then raise exception 'Unknown notification source history';end if;
  end if;`;
}).join('\n');
const functionValues=functions.map(f=>`    (${literal(f.signature)},${literal(f.sha)},${f.prosecdef},${literal(f.result)},${f.anon},${f.authenticated},${f.service})`).join(',\n');
const sql=`-- Closed notification schema only. No send, schedule, allowlist, budget refill or worker activation.
-- Each canonical history entry records only SQL just executed in this atomic statement.
-- Original staging sources remain immutable; one production outbox assertion adaptation is explicit.
do $closed_xooter_notifications$
declare v_existing integer;v_sql text;v_history text;expected record;role_name text;table_name text;
begin
  perform set_config('lock_timeout','5s',true);
  perform pg_advisory_xact_lock(20261102,108);
  select count(*) into v_existing from supabase_migrations.schema_migrations where version in ('20261102082500','20261102082516','20261102165153');
  if v_existing not in (0,3) then raise exception 'Partial notification history requires explicit review';end if;
  if v_existing=0 and (to_regclass('private.xooter_journeys') is not null or to_regclass('private.xooter_communication_preferences') is not null
    or to_regclass('private.xooter_journey_events') is not null or to_regclass('private.xooter_email_policy') is not null
    or to_regprocedure('public.manage_xooter_communications(text,jsonb,integer)') is not null
    or to_regprocedure('public.claim_xooter_journey_email(text)') is not null) then
    raise exception 'Unrecorded notification objects must not be overwritten or stamped';
  end if;
${entries}
  for expected in select * from (values
${functionValues}
  ) as reviewed(signature,sha,definer,result,anon_exec,auth_exec,service_exec) loop
    if not exists(select from pg_proc p where p.oid=to_regprocedure(expected.signature)
      and encode(sha256(convert_to(replace(p.prosrc,E'\\r\\n',E'\\n'),'UTF8')),'hex')=expected.sha
      and p.prosecdef=expected.definer and p.proconfig=array['search_path=""']::text[]
      and pg_get_function_result(p.oid)=expected.result
      and has_function_privilege('anon',p.oid,'execute')=expected.anon_exec
      and has_function_privilege('authenticated',p.oid,'execute')=expected.auth_exec
      and has_function_privilege('service_role',p.oid,'execute')=expected.service_exec) then
      raise exception 'Notification body or authority drift: %',expected.signature;
    end if;
  end loop;
  foreach table_name in array array['xooter_journeys','xooter_communication_preferences','xooter_journey_events','xooter_email_policy'] loop
    if not exists(select from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='private' and c.relname=table_name and c.relrowsecurity) then raise exception 'Private notification RLS required';end if;
    foreach role_name in array array['anon','authenticated','service_role'] loop
      if has_table_privilege(role_name,'private.'||table_name,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') then raise exception 'Private notification table grants must remain closed';end if;
    end loop;
  end loop;
  if (select count(*) from pg_trigger t where not t.tgisinternal and t.tgenabled='O' and t.tgqual is null and t.tgnargs=0 and t.tgattr::text='' and
    ((t.tgname='xooter_application_journey' and t.tgrelid='public.xooter_applications'::regclass and t.tgtype=21 and t.tgfoid='private.xooter_application_journey()'::regprocedure)
    or(t.tgname='xooter_legacy_notification_bridge' and t.tgrelid='public.notifications'::regclass and t.tgtype=7 and t.tgfoid='private.ignore_legacy_xooter_journey_duplicate()'::regprocedure)
    or(t.tgname='xooter_legacy_email_bridge' and t.tgrelid='public.integration_outbox'::regclass and t.tgtype=7 and t.tgfoid='private.ignore_legacy_xooter_journey_duplicate()'::regprocedure)))<>3 then raise exception 'Notification trigger bindings changed';end if;
  if not exists(select from private.xooter_email_policy where id and not enabled and maximum=20 and used between 0 and maximum)
    or(v_existing=0 and exists(select from private.xooter_email_policy where used<>0 or cardinality(allowed_user_ids)<>0 or project_ref is not null or free_plan_reviewed_at is not null)) then
    raise exception 'Notification sending must remain closed without allowance renewal';
  end if;
end $closed_xooter_notifications$;
`;
await writeFile(target,sql);
const manifest={kind:'closed-xooter-notification-schema',migration:target,wrapperSha256:sha(sql),versions:versions.map(({body,...v})=>v),functions,createsNoSchedule:true,senderEnabled:false,initialAllowanceUsed:0,initialAllowlist:0};
await writeFile('docs/release/evidence/2026-11-02/notification-production-schema-manifest.json',JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({migration:target,wrapperSha256:manifest.wrapperSha256,versions:versions.length,functions:functions.length,explicitOutboxCompatibility:true}));
