import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const target=process.argv[2];
if(!/^supabase\/migrations\/\d{14}_worker_destination_source_delivery\.sql$/.test(target??''))throw Error('Pass the CLI-created delivery path');
const canonical='20261102191938',name='current_accepted_worker_destinations';
const source=readFileSync(`supabase/migrations/${canonical}_${name}.sql`,'utf8').replaceAll('\r\n','\n');
const sha=s=>createHash('sha256').update(s).digest('hex');
if(sha(source)!=='e1bc246a545ee7868aa89431a85313277c2db2a5012c85335498014e1b51a58d')throw Error('Reviewed immutable source changed');
if((source.match(/^begin;$/gm)??[]).length!==1||(source.match(/^commit;$/gm)??[]).length!==1)throw Error('Unexpected transaction shape');
const body=source.replace(/^begin;\n/m,'').replace(/^commit;\n/m,'');
if(body.includes('$worker_destination_source$'))throw Error('Quote collision');
const sql=`-- Atomic delivery of the already rehearsed staging source. No history repair or ledger deletion.
-- Record the canonical version ONLY after its exact DDL executes in this same statement.
-- The hosting runner records this wrapper's own actual version separately.
do $worker_destination_delivery$
declare v_sql text;v_history_hash text;
begin
  perform pg_advisory_xact_lock(20261102,110);
  perform set_config('lock_timeout','5s',true);
  if exists(select from supabase_migrations.schema_migrations where version='${canonical}') then
    select encode(sha256(convert_to(replace(array_to_string(statements,E'\\n'),E'\\r\\n',E'\\n'),'UTF8')),'hex') into v_history_hash
      from supabase_migrations.schema_migrations where version='${canonical}' and name='${name}' and cardinality(statements)=1;
    if v_history_hash is null or v_history_hash not in ('${sha(source)}','${sha(body)}') then
      raise exception 'Unknown existing destination source history; explicit review required';
    end if;
  else
    v_sql := $worker_destination_source$${body}$worker_destination_source$;
    execute v_sql;
    insert into supabase_migrations.schema_migrations(version,name,statements)
      values('${canonical}','${name}',array[v_sql]);
  end if;
  if not exists(select from pg_proc p where p.oid='public.get_xooter_job_cards_for_user(uuid)'::regprocedure
    and encode(sha256(convert_to(replace(p.prosrc,E'\\r\\n',E'\\n'),'UTF8')),'hex')='c58fdc2c7d5a7235c23bdeb41110fcf3032d14764a370f40dce723472fe918c0'
    and p.prosecdef=false and p.proconfig=array['search_path=""']::text[]
    and not has_function_privilege('anon',p.oid,'execute')
    and not has_function_privilege('authenticated',p.oid,'execute')
    and has_function_privilege('service_role',p.oid,'execute')) then
    raise exception 'Destination source or service-only invoker privileges changed';
  end if;
end $worker_destination_delivery$;
`;
writeFileSync(target,sql);
console.log(JSON.stringify({path:target,sourceSha:sha(source),executedSha:sha(body),wrapperSha:sha(sql)}));
