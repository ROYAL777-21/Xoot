import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export function assertCodeqlResults(documents) {
  if (!Array.isArray(documents) || documents.length === 0) throw new Error('CodeQL produced no SARIF evidence.');
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
      findings += run.results.length;
    }
  }
  if (findings > 0) throw new Error(`CodeQL reported ${findings} unresolved security findings. Inspect the retained SARIF; do not suppress the check.`);
  return runs;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const directory = process.argv[2] || 'codeql-results';
    const files = readdirSync(directory).filter(name => name.endsWith('.sarif'));
    const runs = assertCodeqlResults(files.map(name => JSON.parse(readFileSync(join(directory, name), 'utf8'))));
    console.log(`CodeQL completed ${runs} analysis runs with zero returned security findings.`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
