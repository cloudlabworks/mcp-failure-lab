import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { runSuite, runExperiment, fixtures, assess } from '../experiments.mjs';
import { handler } from '../lambda.mjs';
test('actual SDK before/after experiments satisfy outcomes and preserve traces',async()=>{
  const r=await runSuite();
  assert(r.pass);assert.equal(r.experiments.length,4);
  for (const e of r.experiments) for(const phase of ['before','after']) {
    assert.equal(e[phase].trace_sha256,createHash('sha256').update(JSON.stringify(e[phase].trace)).digest('hex'));
    assert.equal(e[phase].clinic.format,'openai');
    assert(e[phase].clinic.steps.length>=3);
  }
  const transient=r.experiments[0];
  // Legitimate bounded retries can still trip Clinic's loop heuristic.
  assert(transient.after.clinic.findings.some(f=>f.id==='tool_loop'));
  const permanent=r.experiments[1];
  assert.equal(permanent.after.outcome,'tool_error');
});
test('an unexpected success cannot pass a permanent-failure fixture',()=>{
  const f=fixtures[1];const fake={outcome:'success',attempts:[{}],trace:{messages:[{role:'tool'}]}};
  assert.equal(assess(f,fake,fake).pass,false);
});
test('unknown fixture and unrestricted Lambda event are rejected',async()=>{
  await assert.rejects(runExperiment('../../secret'),RangeError);
  await assert.rejects(handler({action:'run-suite',command:'anything'}));
  await assert.rejects(handler({requestContext:{http:{method:'POST'}}}));
});
