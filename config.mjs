export const SCENARIOS = Object.freeze(['healthy','tool-error','transient-error','delay','malformed','disconnect']);
export const DELAY_MS = Object.freeze({min:0,max:10000,default:1000});
export const FAILURES = Object.freeze({min:0,max:10,default:2});

// Unset or empty means "use the default", as for LAB_SCENARIO; anything else must be plain
// decimal digits. Number() alone would accept '0x10', '1e3', ' 7 ' and turn '' into 0.
function parseInteger(raw, {min,max,default:fallback}) {
  if (raw === undefined || raw === '') return fallback;
  if (typeof raw !== 'string' || !/^\d+$/.test(raw)) return undefined;
  const value = Number(raw);
  return value >= min && value <= max ? value : undefined;
}

export function parseLabConfig(env = {}) {
  const scenario = env.LAB_SCENARIO || 'healthy';
  const delayMs = parseInteger(env.LAB_DELAY_MS, DELAY_MS);
  const failures = parseInteger(env.LAB_FAILURES, FAILURES);
  if (!SCENARIOS.includes(scenario) || delayMs === undefined || failures === undefined) {
    return {ok:false,error:'Invalid LAB_SCENARIO, LAB_DELAY_MS (0..10000), or LAB_FAILURES (0..10).'};
  }
  return {ok:true,scenario,delayMs,failures};
}
