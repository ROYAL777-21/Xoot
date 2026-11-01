import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
assert.equal(args.length, 4, 'Use --project-ref <staging-ref> --output <review.sql>');
assert.equal(args[0], '--project-ref');
assert.equal(args[1], 'fxmxyabdjqviqbcxmvlp', 'Only Xoot staging is allowed');
assert.equal(args[2], '--output');
const root = new URL('../../data/service-zones/gauteng/', import.meta.url);
const bytes = readFileSync(new URL('gauteng.geojson', root));
const manifest = JSON.parse(readFileSync(new URL('provenance.json', root), 'utf8'));
assert.equal(createHash('sha256').update(bytes).digest('hex'), manifest.geojsonSha256);
const data = JSON.parse(bytes);
assert.equal(data.features.length, 1);
assert.equal(data.features[0].properties.adm1_pcode, 'ZA7');
const literal = value => "'" + String(value).replaceAll("'", "''") + "'";
const geometry = JSON.stringify(data.features[0].geometry);
const sql = `-- STAGING ONLY: fxmxyabdjqviqbcxmvlp. Generated dormant geography candidate.
-- Exact source SHA-256: ${manifest.geojsonSha256}
-- Source: ${manifest.datasetUrl}; CC BY 3.0 IGO, MDB / OCHA ROSEA / FISS / HDX.
-- No worker availability assertion; service list is the existing normalized booking vocabulary.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '15s';
insert into public.xoot_service_zones
  (name, geometry, service_types, active, approved_at, approved_by, boundary_source)
values (
  'Gauteng Province (MDB / OCHA COD-AB v01)',
  ${literal(geometry)}::jsonb,
  array['regular','express','airbnb','office','moving'],
  false, NULL, NULL,
  ${literal(manifest.datasetUrl + '#ZA7; sha256=' + manifest.geojsonSha256)}
);
commit;
`;
writeFileSync(resolve(args[3]), sql, { flag: 'wx' });
console.log('Prepared inactive Gauteng staging import; no connection or activation performed.');
