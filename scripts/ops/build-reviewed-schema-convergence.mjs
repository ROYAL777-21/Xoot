import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

// One-off, reviewable delivery from the explicit rehearsal manifest. This does
// not discover or execute SQL from the network, database rows or a handoff bundle.
const target = process.argv[2];
if (!/^supabase\/migrations\/\d{14}_reviewed_website_schema_convergence\.sql$/.test(target ?? '')) throw new Error('Pass the CLI-created convergence migration path.');
const rehearsal = JSON.parse(readFileSync('.render-check/production-schema-rehearsal-20261029.json', 'utf8'));
if (rehearsal.failure || rehearsal.applied.length !== 25) throw new Error('The explicit 25-body production rehearsal must pass first.');
const digest = source => createHash('sha256').update(source).digest('hex');
const manifest = [];
const blocks = [];
for (const entry of rehearsal.applied) {
  if (!/^\d{14}_[a-z0-9_]+\.sql$/.test(entry.file)) throw new Error('Invalid manifest path.');
  const source = readFileSync(resolve('supabase/migrations', entry.file), 'utf8');
  if (digest(source) !== entry.sha256) throw new Error(`Source changed after rehearsal: ${entry.file}`);
  const version = entry.file.slice(0,14);
  const name = entry.file.slice(15,-4);
  // These inspected files use at most one standalone transaction pair. Keep
  // PL/pgSQL block BEGIN/END and every actual schema/data/privilege statement.
  const begins = source.match(/^\s*begin;\s*$/gim) ?? [];
  const commits = source.match(/^\s*commit;\s*$/gim) ?? [];
  if (begins.length !== commits.length || begins.length > 1) throw new Error(`Unexpected transaction shape: ${entry.file}`);
  const body = source.replace(/^\s*begin;\s*$/im, '').replace(/^\s*commit;\s*$/im, '');
  const tag = `$xoot_body_${version}$`;
  if (body.includes(tag) || body.includes('$xoot_convergence$')) throw new Error('SQL quote delimiter collision.');
  manifest.push({version,name,sourceSha256:entry.sha256,executedSha256:digest(body),transactionPairRemoved:begins.length === 1});
  blocks.push(`  -- ${entry.file}; original SHA256 ${entry.sha256}\n  if not exists (select from supabase_migrations.schema_migrations where version='${version}') then\n    v_sql := ${tag}${body}${tag};\n    execute v_sql;\n    -- Record only SQL that has JUST executed in this SAME transaction.\n    insert into supabase_migrations.schema_migrations(version,name,statements)\n      values('${version}','${name}',array[v_sql]);\n  end if;`);
}
const sql = `-- Reviewed forward delivery of the 25 explicitly rehearsed missing/forward versions.\n-- Historical sources are unchanged. Existing ledger rows are neither deleted nor invented.\n-- ONE DO statement makes DDL plus its original-version records all-or-nothing.\n-- The hosting migration runner records this wrapper's own actual delivery version.\n-- No provider capability, operational switch, paid allowance or approved worker is enabled.\ndo $xoot_convergence$\ndeclare v_sql text;\nbegin\n  perform pg_advisory_xact_lock(20261029, 101);\n  perform set_config('lock_timeout','5s',true);\n${blocks.join('\n')}\nend;\n$xoot_convergence$;\n`;
writeFileSync(target,sql);
writeFileSync('docs/release/evidence/2026-10-29/production-schema-manifest.json',JSON.stringify({
  kind:'reviewed-schema-delivery',migration:target,sha256:digest(sql),
  preservedProductionVersion:'20261008011821',noOperationalEnablement:true,
  rehearsalOmissions:rehearsal.omissions,versions:manifest,
},null,2)+'\n');
console.log(JSON.stringify({migration:target,versions:manifest.length,bytes:Buffer.byteLength(sql),sha256:digest(sql)}));
