import { runSuite } from './experiments.mjs';
// IAM-authenticated Lambda Invoke only. No function URL or API Gateway.
export async function handler(event) {
  if (!event || event.action!=='run-suite' || Object.keys(event).some(k=>k!=='action')) {
    throw new Error('Expected exactly {"action":"run-suite"}');
  }
  return runSuite();
}
