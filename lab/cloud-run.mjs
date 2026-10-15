import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { runSuite } from './experiments.mjs';
// Logging transports JSON objects as maps. Preserve the exact result bytes so
// their nested trace hashes survive key reordering by log readers/exporters.
export function logEnvelope(result) {
  return { schema_version: 'clw-reliability-log/1', result_base64: Buffer.from(JSON.stringify(result)).toString('base64') };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await runSuite();
  process.stdout.write(JSON.stringify(logEnvelope(result)) + '\n');
  if (!result.pass) process.exitCode = 1;
}
