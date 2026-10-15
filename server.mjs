#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/server';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';

const scenarios = new Set(['healthy','tool-error','transient-error','delay','malformed','disconnect']);
const scenario = process.env.LAB_SCENARIO || 'healthy';
const delayMs = Number(process.env.LAB_DELAY_MS ?? 1000);
const failures = Number(process.env.LAB_FAILURES ?? 2);
if (!scenarios.has(scenario) || !Number.isInteger(delayMs) || delayMs < 0 || delayMs > 10000 ||
    !Number.isInteger(failures) || failures < 0 || failures > 10) {
  console.error('Invalid LAB_SCENARIO, LAB_DELAY_MS (0..10000), or LAB_FAILURES (0..10).');
  process.exit(2);
}
const server = new McpServer({name:'mcp-failure-lab',version:'0.1.0'});
let calls = 0;
server.registerTool('lab_probe', {
  description:'Synthetic failure-lab probe. No external services, filesystem changes or credentials.',
  inputSchema:z.object({message:z.string().max(200).default('probe')})
}, async ({message}) => {
  calls++;
  const failed = scenario === 'tool-error' || (scenario === 'transient-error' && calls <= failures);
  return {content:[{type:'text',text:failed ? 'Injected temporary tool failure' : 'Probe response: ' + message}], ...(failed ? {isError:true} : {})};
});
const transport = new StdioServerTransport();
const originalSend = transport.send.bind(transport);
transport.send = async (message, options) => {
  if (message.result && Array.isArray(message.result.content)) {
    if (scenario === 'delay') await new Promise(r => setTimeout(r, delayMs));
    if (scenario === 'malformed') return originalSend({...message,result:{content:[{type:'text',text:42}]}},options);
    if (scenario === 'disconnect') { process.exit(0); }
  }
  return originalSend(message,options);
};
process.stdin.on('end', () => process.exit(0));
await server.connect(transport);
