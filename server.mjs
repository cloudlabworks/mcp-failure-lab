#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/server';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';
import { parseLabConfig } from './config.mjs';

const config = parseLabConfig(process.env);
if (!config.ok) {
  console.error(config.error);
  process.exit(2);
}
const {scenario,delayMs,failures} = config;
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
