import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { logEnvelope } from '../cloud-run.mjs';
test('cloud log transport preserves trace hashes after JSON-map key reordering', async () => {
  const sample = JSON.parse(await readFile(new URL('../web/sample.json', import.meta.url), 'utf8'));
  const envelope = logEnvelope(sample);
  const reordered = Object.fromEntries(Object.entries(envelope).sort(([a],[b])=>a.localeCompare(b)));
  const transported = JSON.parse(JSON.stringify(reordered));
  const result = JSON.parse(Buffer.from(transported.result_base64, 'base64').toString('utf8'));
  assert.deepEqual(result, sample);
  for (const e of result.experiments) for (const phase of ['before','after']) {
    assert.equal(createHash('sha256').update(JSON.stringify(e[phase].trace)).digest('hex'), e[phase].trace_sha256);
  }
  assert(Buffer.byteLength(JSON.stringify(envelope)) < 256 * 1024);
});
