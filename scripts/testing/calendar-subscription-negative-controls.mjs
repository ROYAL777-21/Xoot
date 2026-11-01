// Deliberate local-only transaction mutations. Each must fail at its specific assertion.
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const migration=readFileSync('supabase/migrations/20261026203430_private_calendar_subscription.sql','utf8');
const contract=readFileSync('scripts/testing/calendar-subscription-contract.sql','utf8');
const start=migration.indexOf('create function public.xoot_read_calendar_feed');
const fn=migration.slice(start,migration.indexOf('revoke all on function public.xoot_read_calendar_feed',start)).replace('create function','create or replace function');
const run=input=>spawnSync('docker',['exec','-i','xoot-calendar-contract-20261026','psql','-q','-U','postgres','-d','calendar_v2','-v','ON_ERROR_STOP=1'],{input,encoding:'utf8'});
for(const [mutation,label] of [
  [fn.replace('where user_id=subscription.user_id and status<>','where status<>'),'only exact owner minimal fields returned'],
  [fn.replace('and expires_at>now()',''),'expired link denied'],
  ['alter table public.bookings disable trigger xoot_calendar_revision;','caller cannot forge revision on unrelated update'],
]){
  const result=run(contract.replace('begin;',()=>`begin;\n${mutation}`));
  assert.notEqual(result.status,0,`Negative control unexpectedly passed: ${label}`);
  assert.ok(result.stderr.includes(`ASSERTION FAILED: ${label}`),result.stderr);
  console.log(`Expected failure: ${label}; connection rollback restores original.`);
}
const restored=run(contract);assert.equal(restored.status,0,restored.stderr);
console.log('Original exact calendar contract passes after all three negative controls.');
