import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function assertCompletedSecurityReview(result) {
  if (!result || typeof result !== 'object' || Array.isArray(result) || result.error != null || !Array.isArray(result.findings)) {
    throw new Error('Claude security review did not complete. Check the scan log, API access and available credits. This is not a clean security result.');
  }
  return result.findings.length;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const count = assertCompletedSecurityReview(JSON.parse(readFileSync(process.argv[2] || 'claudecode-results.json', 'utf8')));
    console.log(`Claude security review completed with ${count} findings; review any reported findings separately.`);
  } catch (error) {
    console.error(error instanceof SyntaxError ? 'Claude security review returned invalid JSON.' : error.message);
    process.exitCode = 1;
  }
}
