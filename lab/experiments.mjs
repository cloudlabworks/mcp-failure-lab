import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { runScenario } from '../runner.mjs';
import { analyse } from './vendor/clinic/analyse.js';

export const fixtures = Object.freeze([
  {id:'transient-recovery', title:'Give a transient failure a bounded recovery window',
    change:'One attempt → three attempts. The same tool fails twice, then succeeds.',
    tradeoff:'Extra attempts help this fixture, not permanent or non-idempotent failures.',
    before:{scenario:'transient-error',failures:2,maxAttempts:1},
    after:{scenario:'transient-error',failures:2,maxAttempts:3},
    expected:{before:['tool_error',1],after:['success',3]}},
  {id:'permanent-failure', title:'Stop wasting retries on a permanently failing tool',
    change:'Five attempts → two attempts. The tool remains broken; the client stops earlier.',
    tradeoff:'This is bounded failure handling, not a repaired downstream service.',
    before:{scenario:'tool-error',maxAttempts:5},after:{scenario:'tool-error',maxAttempts:2},
    expected:{before:['tool_error',5],after:['tool_error',2]}},
  {id:'deadline-fit', title:'Fit the deadline to the declared tool latency',
    change:'100 ms deadline → 2000 ms deadline for a tool with a 400 ms injected delay.',
    tradeoff:'The longer deadline increases the time spent waiting if the tool really hangs.',
    before:{scenario:'delay',delayMs:400,timeoutMs:100},after:{scenario:'delay',delayMs:400,timeoutMs:2000},
    expected:{before:['timeout',1],after:['success',1]}},
  {id:'malformed-control', title:'Keep protocol failures terminal',
    change:'One-attempt budget → five-attempt budget; protocol errors must still stop after one call.',
    tradeoff:'Increasing a retry budget must not cause malformed responses to be accepted.',
    before:{scenario:'malformed',maxAttempts:1},after:{scenario:'malformed',maxAttempts:5},
    expected:{before:['protocol_error',1],after:['protocol_error',1]}}
]);
const digest = text => createHash('sha256').update(text).digest('hex');
export async function sourceDigest() {
  const paths=['server.mjs','runner.mjs','package-lock.json','lab/experiments.mjs',
    'lab/vendor/clinic/analyse.js','lab/vendor/clinic/normalise.js','lab/vendor/clinic/detectors.js','lab/vendor/clinic/usage.js'];
  return digest((await Promise.all(paths.map(async p=>p+'\n'+digest(await readFile(new URL('../'+p,import.meta.url)))))).join('\n'));
}
export function assess(fixture, before, after) {
  const checks=[];
  for (const [phase,result] of [['before',before],['after',after]]) {
    const [outcome,attempts]=fixture.expected[phase];
    checks.push({name:phase+' outcome',pass:result.outcome===outcome,expected:outcome,observed:result.outcome});
    checks.push({name:phase+' attempt count',pass:result.attempts.length===attempts,expected:attempts,observed:result.attempts.length});
    checks.push({name:phase+' trace completeness',pass:result.trace.messages.filter(m=>m.role==='tool').length===result.attempts.length});
  }
  return {pass:checks.every(c=>c.pass),checks};
}
export async function runExperiment(id) {
  const fixture=fixtures.find(f=>f.id===id);
  if (!fixture) throw new RangeError('Unknown fixture id');
  const phases={};
  for (const phase of ['before','after']) {
    const result=await runScenario(fixture[phase]);
    phases[phase]={...result,trace_sha256:digest(JSON.stringify(result.trace)),clinic:analyse(JSON.stringify(result.trace))};
  }
  return {...fixture,...phases,verification:assess(fixture,phases.before,phases.after)};
}
export async function runSuite() {
  const start=performance.now();
  const experiments=[];
  for (const fixture of fixtures) experiments.push(await runExperiment(fixture.id));
  return {schema_version:'clw-reliability-lab/1',fixture_version:'2026-10-14.1',
    generated_at:new Date().toISOString(),source_sha256:await sourceDigest(),
    runtime:{node:process.version,os:process.platform,arch:process.arch,
      platform:process.env.AWS_LAMBDA_FUNCTION_NAME?'aws-lambda':process.env.CLOUD_RUN_JOB?'google-cloud-run-job':'local',
      platform_evidence:'Runtime environment declaration; cloud deployment receipt is required to corroborate it.'},
    scope:'Synthetic official-SDK reference-client experiments. No language model, production agent, network fault injection, or cross-cloud performance ranking.',
    duration_ms:Math.round(performance.now()-start),experiments,
    pass:experiments.every(e=>e.verification.pass)};
}
if (process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const result=await runSuite();
  process.stdout.write(JSON.stringify(result)+'\n');
  if (!result.pass) process.exitCode=1;
}
