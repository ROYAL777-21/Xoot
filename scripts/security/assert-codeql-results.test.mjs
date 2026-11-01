import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { assertCodeqlResults } from './assert-codeql-results.mjs';

const clean = () => ({ version: '2.1.0', runs: [{ tool: { driver: { name: 'CodeQL', rules: [{ id: 'js/xss' }] } }, results: [] }] });

test('accepts an actual-shaped completed zero-finding analysis', () => {
  assert.equal(assertCodeqlResults([clean()]), 1);
});

test('accepts rules grouped by pack, as emitted by the pinned CodeQL action', () => {
  const grouped = clean();
  delete grouped.runs[0].tool.driver.rules;
  grouped.runs[0].tool.extensions = [{ name: 'codeql/javascript-queries', rules: [{ id: 'js/xss' }] }];
  assert.equal(assertCodeqlResults([grouped]), 1);
  grouped.runs[0].results = [{ ruleId: 'js/xss' }];
  assert.throws(() => assertCodeqlResults([grouped]), /1 unresolved/);
  grouped.runs[0].results = [];
  grouped.runs[0].tool.extensions[0].rules = [];
  assert.throws(() => assertCodeqlResults([grouped]), /missing/);
});

test('refuses absent, empty, wrong-tool or incomplete analysis evidence', () => {
  for (const documents of [[], null, [{}], [{ version: '2.1.0', runs: [] }]]) {
    assert.throws(() => assertCodeqlResults(documents));
  }
  const wrong = clean(); wrong.runs[0].tool.driver.name = 'placeholder';
  assert.throws(() => assertCodeqlResults([wrong]));
  const empty = clean(); empty.runs[0].tool.driver.rules = [];
  assert.throws(() => assertCodeqlResults([empty]));
  const missing = clean(); delete missing.runs[0].results;
  assert.throws(() => assertCodeqlResults([missing]));
});

test('refuses tool errors even when the findings array is empty', () => {
  for (const invocation of [{}, { executionSuccessful: false }, { executionSuccessful: 'true' },
    { executionSuccessful: true, toolExecutionNotifications: [{ level: 'error' }] },
    { executionSuccessful: true, toolConfigurationNotifications: [{ level: 'error' }] }]) {
    const result = clean(); result.runs[0].invocations = [invocation];
    assert.throws(() => assertCodeqlResults([result]), /error/);
  }
});

test('the real command fails on findings and does not print source or finding messages', () => {
  const directory = mkdtempSync(join(tmpdir(), 'xoot-codeql-control-'));
  try {
    const result = clean(); result.runs[0].results = [{ ruleId: 'js/xss', message: { text: 'private fixture content' } }];
    writeFileSync(join(directory, 'javascript.sarif'), JSON.stringify(result));
    const failed = spawnSync(process.execPath, ['scripts/security/assert-codeql-results.mjs', directory], { encoding: 'utf8' });
    assert.equal(failed.status, 1);
    assert.match(failed.stderr, /1 unresolved/);
    assert.doesNotMatch(failed.stderr + failed.stdout, /private fixture content/);
    writeFileSync(join(directory, 'javascript.sarif'), JSON.stringify(clean()));
    const passed = spawnSync(process.execPath, ['scripts/security/assert-codeql-results.mjs', directory], { encoding: 'utf8' });
    assert.equal(passed.status, 0, passed.stderr);
    assert.match(passed.stdout, /zero unresolved/);
    writeFileSync(join(directory, 'javascript.sarif'), '{invalid');
    assert.equal(spawnSync(process.execPath, ['scripts/security/assert-codeql-results.mjs', directory]).status, 1);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('a false-positive decision binds the exact rule, path, fingerprint and source bytes', () => {
  const source = 'synthetic fixture source';
  const review = { ruleId: 'js/xss', path: 'src/synthetic.test.ts', lineHash: 'fixture-hash:1',
    sourceSha256: createHash('sha256').update(source).digest('hex'),
    reason: 'Synthetic reviewer fixture; this exact result is tested with unchanged source bytes.' };
  const document = clean();
  const result = { ruleId: review.ruleId, partialFingerprints: { primaryLocationLineHash: review.lineHash },
    locations: [{ physicalLocation: { artifactLocation: { uri: review.path } } }] };
  document.runs[0].results = [result];
  assert.equal(assertCodeqlResults([document], [review], () => source), 1);
  assert.throws(() => assertCodeqlResults([document], [review], () => source + ' changed'), /source changed/);
  for (const changed of [{ ...result, ruleId: 'js/other' },
    { ...result, partialFingerprints: { primaryLocationLineHash: 'new-hash' } },
    { ...result, locations: [{ physicalLocation: { artifactLocation: { uri: 'src/new.ts' } } }] },
    { ...result, locations: [...result.locations, ...result.locations] }]) {
    document.runs[0].results = [changed];
    assert.throws(() => assertCodeqlResults([document], [review], () => source), /unresolved/);
  }
  assert.throws(() => assertCodeqlResults([clean()], [{ ...review, path: 'src/../outside' }], () => source), /Invalid/);
});
