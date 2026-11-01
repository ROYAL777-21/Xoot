import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

export function assertCodeqlResults(documents, reviewed = [], readSource = path => readFileSync(join(process.cwd(), path))) {
  if (!Array.isArray(documents) || documents.length === 0) throw new Error('CodeQL produced no SARIF evidence.');
  const keys = new Set();
  for (const entry of reviewed) {
    if (!entry || !/^js\/[a-z0-9/-]+$/i.test(entry.ruleId ?? '') ||
        !/^(src|scripts)\/[A-Za-z0-9_./-]+$/.test(entry.path ?? '') || entry.path.split('/').includes('..') ||
        !/^[a-f0-9]{64}$/.test(entry.sourceSha256 ?? '') || typeof entry.lineHash !== 'string' || !entry.lineHash ||
        typeof entry.reason !== 'string' || entry.reason.length < 40) throw new Error('Invalid reviewed CodeQL decision.');
    const key = `${entry.ruleId}:${entry.path}:${entry.lineHash}`;
    if (keys.has(key)) throw new Error('Duplicate reviewed CodeQL decision.');
    keys.add(key);
    if (createHash('sha256').update(readSource(entry.path).toString().replaceAll('\r\n', '\n')).digest('hex') !== entry.sourceSha256) {
      throw new Error(`Reviewed CodeQL source changed: ${entry.path}. Re-review its evidence.`);
    }
  }
  let runs = 0;
  let findings = 0;
  for (const document of documents) {
    if (document?.version !== '2.1.0' || !Array.isArray(document.runs) || document.runs.length === 0) {
      throw new Error('CodeQL evidence is not a completed SARIF analysis.');
    }
    for (const run of document.runs) {
      // The pinned action groups query metadata by pack. In real output the
      // driver may have no rules: they live under tool.extensions instead.
      const components = [run.tool?.driver, ...(run.tool?.extensions ?? [])].filter(Boolean);
      const rules = components.flatMap(component => component.rules ?? []);
      if (!/codeql/i.test(run.tool?.driver?.name ?? '') || rules.length === 0 ||
          rules.some(rule => typeof rule.id !== 'string' || !rule.id) || !Array.isArray(run.results)) {
        throw new Error('CodeQL evidence is missing its analyzer, rules or results.');
      }
      if (run.invocations !== undefined && !Array.isArray(run.invocations)) throw new Error('CodeQL invocation evidence is invalid.');
      // The preceding analyze action must itself succeed. SARIF invocations are
      // optional, but any supplied invocation must affirm successful execution.
      for (const invocation of run.invocations ?? []) {
        if (invocation.executionSuccessful !== true ||
            [...(invocation.toolExecutionNotifications ?? []), ...(invocation.toolConfigurationNotifications ?? [])]
              .some(notification => notification.level === 'error')) {
          throw new Error('CodeQL reported an execution/configuration error; this is not a clean result.');
        }
      }
      runs += 1;
      findings += run.results.filter(result => !reviewed.some(entry =>
        result.ruleId === entry.ruleId && result.locations?.length === 1 &&
        result.locations[0].physicalLocation?.artifactLocation?.uri === entry.path &&
        result.partialFingerprints?.primaryLocationLineHash === entry.lineHash)).length;
    }
  }
  if (findings > 0) throw new Error(`CodeQL reported ${findings} unresolved security findings. Inspect the retained SARIF; do not suppress the check.`);
  return runs;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const directory = process.argv[2] || 'codeql-results';
    const files = readdirSync(directory).filter(name => name.endsWith('.sarif'));
    const documents = files.map(name => JSON.parse(readFileSync(join(directory, name), 'utf8')));
    const decisions = process.argv[3] ? JSON.parse(readFileSync(process.argv[3], 'utf8')) : { schemaVersion: 1, reviewed: [] };
    if (decisions.schemaVersion !== 1 || !Array.isArray(decisions.reviewed)) throw new Error('Invalid CodeQL review decision document.');
    const runs = assertCodeqlResults(documents, decisions.reviewed);
    const count = documents.flatMap(document => document.runs.flatMap(run => run.results)).length;
    console.log(`CodeQL completed ${runs} analysis runs with zero unresolved security findings; ${count} exact reviewed matches. Retain the original SARIF.`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
