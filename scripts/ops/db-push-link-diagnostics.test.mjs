import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const workflow = readFileSync(new URL('../../.github/workflows/db-push.yml', import.meta.url), 'utf8');
const begin = workflow.indexOf('          # A Supabase Management API authorization error');
const end = workflow.indexOf('          say "##', begin);
assert.ok(begin !== -1 && end > begin, 'Supabase link preflight is present');
// Exercise the exact workflow shell code against fake CLI errors: never call a live project.
const script = workflow.slice(begin, end).split('\n')
  .map((line) => line.startsWith('          ') ? line.slice(10) : line).join('\n');

function runLinkCliOutput(message, exitCode = 1) {
  const header = [
    'PROJECT_REF=synthetic-staging-ref',
    'both() { cat; }',
    'supabase() { printf "%s\\n" "$FAKE_LINK_MESSAGE"; return "$FAKE_EXIT_CODE"; }',
  ].join('\n');
  return spawnSync('bash', ['-c', header + '\n' + script], {
    encoding: 'utf8',
    env: { ...process.env, FAKE_LINK_MESSAGE: message, FAKE_EXIT_CODE: String(exitCode) },
  });
}

test('missing management scopes are classified as PAT failure, not a password failure', () => {
  const outcome = runLinkCliOutput('Authorization failed for the access token and project ref pair: Your account does not have the necessary privileges to access this endpoint.');
  assert.equal(outcome.status, 1);
  assert.match(outcome.stdout, /management-token authorization failed/);
  assert.match(outcome.stdout, /BEFORE checking the database password/);
  assert.match(outcome.stdout, /API Key Secrets read permissions/);
  assert.doesNotMatch(outcome.stdout, /Database password authentication failed/);
});

test('Postgres 28P01 is classified as an environment-specific password failure', () => {
  const outcome = runLinkCliOutput('FATAL: password authentication failed for user postgres (SQLSTATE 28P01)');
  assert.equal(outcome.status, 1);
  assert.match(outcome.stdout, /Database password authentication failed/);
  assert.match(outcome.stdout, /SUPABASE_DB_PASSWORD_STAGING/);
  assert.doesNotMatch(outcome.stdout, /management-token authorization failed/);
});

test('unrecognised errors fail closed and successful link continues', () => {
  const unknown = runLinkCliOutput('upstream network timeout');
  assert.equal(unknown.status, 1);
  assert.match(unknown.stdout, /Review the Supabase CLI output above/);
  assert.doesNotMatch(unknown.stdout, /management-token authorization failed|Database password authentication failed/);
  const good = runLinkCliOutput('Finished supabase link.', 0);
  assert.equal(good.status, 0);
  assert.match(good.stdout, /Finished supabase link/);
  assert.doesNotMatch(good.stdout, /::error::/);
});
