import { test } from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import { SdkError, SdkErrorCode } from '@modelcontextprotocol/client';
import { parseLabConfig, SCENARIOS, DELAY_MS, FAILURES } from '../config.mjs';
import { classifyError } from '../runner.mjs';

const scenario = fc.constantFrom(...SCENARIOS);
const inRange = ({min,max}) => fc.integer({min,max});
const outOfRange = ({min,max}) => fc.oneof(fc.integer({max:min-1}), fc.integer({min:max+1}));
// Strings that Number() turns into an integer but which are not plain decimal digits.
const lenientInteger = fc.integer({min:0,max:10000}).chain(n => fc.constantFrom(
  ' '+n, n+' ', '0x'+n.toString(16), '0b'+n.toString(2), '0o'+n.toString(8), n+'.0', n+'e0', '+'+n, ' '));
const notDigits = fc.oneof(lenientInteger, fc.string({minLength:1}).filter(s => !/^\d+$/.test(s)));

test('config: every in-range integer is accepted exactly as given', () => {
  fc.assert(fc.property(scenario, inRange(DELAY_MS), inRange(FAILURES), fc.nat(3), (s, d, f, zeros) => {
    const pad = n => '0'.repeat(zeros) + n;
    assert.deepEqual(parseLabConfig({LAB_SCENARIO:s,LAB_DELAY_MS:pad(d),LAB_FAILURES:pad(f)}),
      {ok:true,scenario:s,delayMs:d,failures:f});
  }));
});

test('config: every out-of-range integer is rejected', () => {
  fc.assert(fc.property(scenario, outOfRange(DELAY_MS), inRange(FAILURES), (s, d, f) => {
    assert.equal(parseLabConfig({LAB_SCENARIO:s,LAB_DELAY_MS:String(d),LAB_FAILURES:String(f)}).ok, false);
  }));
  fc.assert(fc.property(scenario, inRange(DELAY_MS), outOfRange(FAILURES), (s, d, f) => {
    assert.equal(parseLabConfig({LAB_SCENARIO:s,LAB_DELAY_MS:String(d),LAB_FAILURES:String(f)}).ok, false);
  }));
});

test('config: values that are not plain decimal digits are rejected', () => {
  fc.assert(fc.property(notDigits, value => {
    assert.equal(parseLabConfig({LAB_DELAY_MS:value}).ok, false, JSON.stringify(value));
    assert.equal(parseLabConfig({LAB_FAILURES:value}).ok, false, JSON.stringify(value));
  }));
});

test('config: unset or empty values fall back to the documented defaults', () => {
  fc.assert(fc.property(fc.constantFrom(undefined, ''), fc.constantFrom(undefined, ''), fc.constantFrom(undefined, ''),
    (s, d, f) => {
      assert.deepEqual(parseLabConfig({LAB_SCENARIO:s,LAB_DELAY_MS:d,LAB_FAILURES:f}),
        {ok:true,scenario:'healthy',delayMs:DELAY_MS.default,failures:FAILURES.default});
    }));
});

test('config: unknown scenario names are rejected', () => {
  fc.assert(fc.property(fc.string({minLength:1}).filter(s => !SCENARIOS.includes(s)), s => {
    assert.equal(parseLabConfig({LAB_SCENARIO:s}).ok, false);
  }));
});

test('config: arbitrary environments never throw and always return a verdict', () => {
  const value = fc.option(fc.oneof(fc.string(), fc.nat().map(String), scenario), {nil:undefined});
  fc.assert(fc.property(fc.record({LAB_SCENARIO:value,LAB_DELAY_MS:value,LAB_FAILURES:value}), env => {
    const r = parseLabConfig(env);
    assert.equal(typeof r.ok, 'boolean');
    if (r.ok) {
      assert(SCENARIOS.includes(r.scenario));
      assert(Number.isInteger(r.delayMs) && r.delayMs >= DELAY_MS.min && r.delayMs <= DELAY_MS.max);
      assert(Number.isInteger(r.failures) && r.failures >= FAILURES.min && r.failures <= FAILURES.max);
    } else assert.equal(typeof r.error, 'string');
  }));
});

const outcomes = ['timeout','disconnected','protocol_error'];
const anyMessage = fc.oneof(fc.string(), fc.constantFrom('Request timed out', 'Connection closed', 'disconnect'));
const otherSdkCodes = Object.values(SdkErrorCode).filter(c =>
  ![SdkErrorCode.RequestTimeout, SdkErrorCode.ConnectionClosed, SdkErrorCode.NotConnected].includes(c));
const anyCase = word => fc.boolean().map(upper => upper ? word.toUpperCase() : word);

test('classifier: SDK timeout and closed codes win over the message text', () => {
  fc.assert(fc.property(anyMessage, message => {
    assert.equal(classifyError(new SdkError(SdkErrorCode.RequestTimeout, message)), 'timeout');
    assert.equal(classifyError(new SdkError(SdkErrorCode.ConnectionClosed, message)), 'disconnected');
    assert.equal(classifyError(new SdkError(SdkErrorCode.NotConnected, message)), 'disconnected');
  }));
});

test('classifier: a REQUEST_TIMEOUT whose message never says "timeout" is still a timeout', () => {
  // Fails on the old check (error.code === -32001 or message match): this was a protocol_error.
  assert.equal(classifyError(new SdkError(SdkErrorCode.RequestTimeout, 'Request exceeded 100ms')), 'timeout');
  assert.equal(classifyError(new SdkError(SdkErrorCode.ConnectionClosed, 'Stream ended')), 'disconnected');
});

test('classifier: other SDK codes are protocol errors whatever the message says', () => {
  fc.assert(fc.property(fc.constantFrom(...otherSdkCodes), anyMessage, (code, message) => {
    assert.equal(classifyError(new SdkError(code, message)), 'protocol_error');
  }));
});

test('classifier: errors without an SDK code fall back to the message', () => {
  const timeoutWord = fc.constantFrom('timed out', 'timeout').chain(anyCase);
  const closedWord = fc.constantFrom('closed', 'disconnect').chain(anyCase);
  const noTimeout = fc.string().filter(s => !/timed out|timeout/i.test(s));
  fc.assert(fc.property(fc.string(), timeoutWord, fc.string(), (pre, word, post) => {
    assert.equal(classifyError(new Error(pre + word + post)), 'timeout');
  }));
  fc.assert(fc.property(noTimeout, closedWord, noTimeout, (pre, word, post) => {
    fc.pre(!/timed out|timeout/i.test(pre + word + post));
    assert.equal(classifyError(new Error(pre + word + post)), 'disconnected');
  }));
  assert.equal(classifyError({code:-32001,message:'x'}), 'timeout');
});

test('classifier: never throws and always returns a known outcome', () => {
  fc.assert(fc.property(fc.anything({withNullPrototype:true,withMap:true,withSet:true}), thrown => {
    assert(outcomes.includes(classifyError(thrown)));
  }));
});
