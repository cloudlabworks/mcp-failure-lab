import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runScenario } from '../runner.mjs';
test('healthy control advertises tool and succeeds without retry',async()=>{
  const r=await runScenario(); assert(r.connected); assert.equal(r.outcome,'success'); assert.equal(r.attempts.length,1);
});
test('tool errors stop at the attempt budget and preserve error evidence',async()=>{
  const r=await runScenario({scenario:'tool-error',maxAttempts:3});
  assert.equal(r.outcome,'tool_error'); assert.equal(r.attempts.length,3);
  assert.equal(r.trace.messages.filter(m=>m.role==='tool' && m.is_error).length,3);
});
test('transient tool failure recovers on the third attempt',async()=>{
  const r=await runScenario({scenario:'transient-error',maxAttempts:3});
  assert.deepEqual(r.attempts.map(a=>a.outcome),['tool_error','tool_error','success']);
});
test('delayed success within deadline',async()=>{
  const r=await runScenario({scenario:'delay',delayMs:40,timeoutMs:2000});
  assert.equal(r.outcome,'success'); assert(r.attempts[0].elapsed_ms>=35);
});
test('timeout stops without retry even when retry budget is available',async()=>{
  const r=await runScenario({scenario:'delay',delayMs:1000,timeoutMs:100,maxAttempts:3});
  assert.equal(r.outcome,'timeout'); assert.equal(r.attempts.length,1);
});
test('malformed result is rejected rather than treated as tool success',async()=>{
  const r=await runScenario({scenario:'malformed',maxAttempts:3});
  assert.equal(r.outcome,'protocol_error'); assert.equal(r.attempts.length,1);
});
test('disconnect is reported and does not masquerade as success',async()=>{
  const r=await runScenario({scenario:'disconnect'});
  assert.equal(r.outcome,'disconnected'); assert.equal(r.attempts.length,1);
});
test('invalid attempt budget is rejected',async()=>{
  await assert.rejects(runScenario({maxAttempts:0}),RangeError);
});
