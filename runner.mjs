#!/usr/bin/env node
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
const serverPath = fileURLToPath(new URL('./server.mjs',import.meta.url));
export async function runScenario({scenario='healthy',timeoutMs=2000,maxAttempts=1,delayMs=1000,failures=2}={}) {
  if (!Number.isInteger(timeoutMs) || timeoutMs < 10 || timeoutMs > 10000 ||
      !Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 5) throw new RangeError('Invalid deadline or attempt budget');
  const client = new Client({name:'failure-lab-reference-client',version:'0.1.0'});
  const transport = new StdioClientTransport({command:process.execPath,args:[serverPath],
    env:{LAB_SCENARIO:scenario,LAB_DELAY_MS:String(delayMs),LAB_FAILURES:String(failures)},stderr:'pipe'});
  const messages = [{role:'user',content:'Synthetic reference-client probe. No language model participated.'}];
  const attempts = [];
  // Transport errors are captured without printing untrusted payloads.
  let transportErrors = 0;
  client.onerror = () => { transportErrors++; };
  let outcome = 'not_run';
  let connected = false;
  try {
    await client.connect(transport); connected = true;
    const listed = await client.listTools();
    if (!listed.tools.some(t => t.name === 'lab_probe')) throw new Error('Probe tool not advertised');
    for (let attempt=1;attempt<=maxAttempts;attempt++) {
      const id = 'probe-' + attempt;
      messages.push({role:'assistant',content:null,tool_calls:[{id,type:'function',function:{name:'lab_probe',arguments:'{"message":"probe"}'}}]});
      const start = performance.now();
      try {
        const result = await client.callTool({name:'lab_probe',arguments:{message:'probe'}},{timeout:timeoutMs});
        outcome = result.isError ? 'tool_error' : 'success';
        attempts.push({attempt,outcome,elapsed_ms:Math.round(performance.now()-start)});
        messages.push({role:'tool',tool_call_id:id,content:result.content.filter(c=>c.type==='text').map(c=>c.text).join('\n'),is_error:!!result.isError});
        if (!result.isError) break;
        // Only explicit tool-level failures are eligible for bounded retry.
      } catch (error) {
        outcome = error.code === -32001 || /timed out|timeout/i.test(error.message) ? 'timeout' :
          /closed|disconnect/i.test(error.message) ? 'disconnected' : 'protocol_error';
        attempts.push({attempt,outcome,elapsed_ms:Math.round(performance.now()-start),error_code:error.code ?? null});
        messages.push({role:'tool',tool_call_id:id,content:'Error: reference client observed ' + outcome,is_error:true});
        break;
      }
    }
  } finally { await client.close(); }
  return {schema_version:'1.0',scenario,client:'official-sdk-reference-client',connected,outcome,
    policy:{timeout_ms:timeoutMs,max_attempts:maxAttempts,retry:'tool_error_only'},
    attempts,transport_errors:transportErrors,
    trace:{messages}};
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const scenarios = [
    {scenario:'healthy'},
    {scenario:'tool-error',maxAttempts:3},
    {scenario:'transient-error',maxAttempts:3,failures:2},
    {scenario:'delay',delayMs:40,timeoutMs:2000},
    {scenario:'delay',delayMs:1000,timeoutMs:100},
    {scenario:'malformed'},
    {scenario:'disconnect'}
  ];
  const results = [];
  for (const config of scenarios) results.push(await runScenario(config));
  console.log(JSON.stringify({schema_version:'1.0',scope:'Reference client only; not an MCP conformance certification or an agent recovery score.',results},null,2));
}
