# MCP Failure Lab

A deliberately faulty MCP server and a bounded reference-client harness.
Local preview v0.1.0. Built on the official MCP TypeScript SDK **2.3.1**, not a replacement protocol implementation.

## Try it

Requires Docker. The image uses Node 24 and pinned npm dependencies.

```sh
docker build -t mcp-failure-lab:local .
docker run --rm --network none --read-only --cap-drop ALL --security-opt no-new-privileges mcp-failure-lab:local npm test
docker run --rm --network none --read-only --cap-drop ALL --security-opt no-new-privileges mcp-failure-lab:local node runner.mjs
```

The last command prints JSON results and OpenAI-message-shaped traces from seven deterministic runs.
No language model participates. Timings are observed elapsed milliseconds, not benchmarks.
The test command exits nonzero on a regression; the demo command emits observations, not a grading verdict.

For local development: `npm ci --ignore-scripts`, then `npm test`.

## Faults

| LAB_SCENARIO | Injected behavior | Reference-client expectation |
| --- | --- | --- |
| healthy | Normal tool response | One success |
| tool-error | Valid result with isError=true | Stop at configured attempt budget |
| transient-error | First LAB_FAILURES calls fail | Recover if the attempt budget permits |
| delay | Wait LAB_DELAY_MS before tool response | Succeed within deadline or time out |
| malformed | Valid JSON-RPC envelope, invalid text-block value | Reject the tool result |
| disconnect | Exit during a tool response | Report closed connection, not success |

Only the advertised `lab_probe` tool is affected. Initialization and discovery use the official SDK.
The transport wrapper corrupts **result shape**, not JSON framing; truncated frames, bad IDs, HTTP failures and authentication faults are not implemented.

Configuration is read at process startup. Scenarios reset per process.
`LAB_DELAY_MS`: integer 0–10000 (default 1000).
`LAB_FAILURES`: integer 0–10 (default 2).
The reference client retries only explicit tool errors, at most five attempts; protocol errors, timeouts and disconnects stop immediately.
The harness's tool-call deadline is 10–10000 ms; SDK connection/discovery deadlines are separate.
Retries intentionally have no backoff so the generated fixture exposes repeated calls; this is not recommended production retry policy.

## Attach your own MCP client

Configure a **test** MCP connection to run this command, with stdin/stdout attached:

```sh
docker run --rm -i --network none --read-only --cap-drop ALL --security-opt no-new-privileges -e LAB_SCENARIO=transient-error -e LAB_FAILURES=2 mcp-failure-lab:local
```

Call `lab_probe` with `{"message":"probe"}`.
There are no real downstream services, credentials, file-writing tools or listening network ports.
Client integrations beyond the included reference client are **unverified**.

## Feed a failure into Agent Trace Clinic

From this repository, with Clinic checked out next to it:

```sh
mkdir -p artifacts
docker run --rm --network none --read-only mcp-failure-lab:local node runner.mjs > artifacts/run.json
node --input-type=module -e 'import fs from "node:fs"; const r=JSON.parse(fs.readFileSync("artifacts/run.json","utf8")); console.log(JSON.stringify(r.results.find(x=>x.scenario==="tool-error").trace));' > artifacts/tool-error.json
node ../agent-trace-clinic/cli.mjs artifacts/tool-error.json --html > artifacts/clinic-report.html
```

Clinic should identify tool_loop, retry_storm and unhandled_tool_error on this fixture.
These are heuristic leads: deliberate bounded retries can also trigger them. No token counts are invented.

## Relationship to upstream

[MCP conformance](https://github.com/modelcontextprotocol/conformance) is the upstream authority for protocol tests.
This project contributes a small fault surface for recovery experiments; it does **not** claim conformance certification.
The official framework currently documents HTTP-based client/server scenario runners. This first release is stdio-only;
an upstream scenario adapter and a Streamable HTTP target are next, not shipped capabilities.

Sources checked 2026-10-14:
- [SDK v2 documentation](https://ts.sdk.modelcontextprotocol.io/v2/)
- [SDK source and examples](https://github.com/modelcontextprotocol/typescript-sdk)
- [Conformance framework](https://github.com/modelcontextprotocol/conformance)

## Maintenance contract

One transport, one tool, six fault modes, one reference client. Pin SDK upgrades and rerun every fault test.
Owner: Cloud Lab Works / Waku. Gherkin review has not been assigned or completed.
Before public release: source/dependency review, an independent test pass, and publication approval.
Before cloud execution: bounded job budget, teardown, and measured runtime. No cloud account is required for this release.
No telemetry or remote reporting. Generated reports stay in ignored `artifacts/`.

## Agent Reliability Lab

[Open the public demo](https://huggingface.co/spaces/cloudlabworks/agent-reliability-lab) or read the [experiment guide](lab/README.md). Four controlled before/after cases connect the official MCP reference client to deterministic Clinic inspection. The public sample is recorded local evidence, not a live cloud execution. [Cloud adapters and runbook](deploy/README.md) are included.
