---
title: Agent Reliability Lab
sdk: static
app_file: index.html
license: mit
short_description: Replay tool failures and inspect recovery evidence
tags:
  - agent-reliability
  - mcp
  - evaluation
---
# Agent Reliability Lab · Cloud Lab Works

Four controlled tool failures, before/after policy changes, and inspectable evidence. The app replays recorded runs; it does not start cloud jobs, call a model, or upload your comparison file.

## Try it

Choose a fixture. Inspect both traces. Download [Google Cloud Run evidence](google-suite.json) or [AWS Lambda evidence](aws-suite.json), then use **Compare a cloud run**. The app verifies the trace hashes and checks source version, policy, outcomes, and attempt counts.

| Fixture | Before → after | AWS / Google |
|---|---|---|
| Transient failure | tool error → success; 1 → 3 attempts | pass / pass |
| Permanent failure | tool error remains; 5 → 2 attempts | pass / pass |
| Deadline fit | timeout → success; 100 → 2000 ms deadline | pass / pass |
| Malformed response | protocol error remains terminal after one call | pass / pass |

## Evidence and limits

One synthetic suite ran on AWS Lambda ARM64 and one on Google Cloud Run AMD64. Their four fixture pairs matched the local baseline; all 16 cloud trace hashes were checked after export. Operator readback confirmed the deployed code/configuration and successful execution. The latest test suite passed 12 tests on local ARM64 and Google Cloud Shell AMD64, with four additional mock tests for the AWS re-disable guard.

These are fixed official-MCP-SDK **reference-client** experiments, not an evaluation of an LLM or production agent. Clinic findings are inspection leads, not the acceptance oracle. Legitimate retries may still trigger its loop detector. Timings are observations, not a cross-cloud performance ranking. A hash protects bytes, not truth or origin; raw account records and infrastructure state remain private.

The displayed baseline is a recorded local Linux ARM64 run. Cloud Run is a private manual job with one task, no retries and a 60-second timeout. Lambda is disabled at rest, briefly enabled for one manual invocation, then disabled again. Neither has a public trigger or scheduler. Static hosting is independent of both cloud runtimes.

## Source and reproduction

[Download the source snapshot](source.tar.gz), extract it, and follow `lab/README.md`. Snapshot revision: `SOURCE_COMMIT`. It includes fixed fixtures, pinned dependencies, cloud result files, tests and AWS/Google infrastructure configurations, but no git history, credentials, private state or account-specific variables. [File checksums](manifest.json).

The same runs (local, AWS and Google, before and after each policy change) as a Hugging Face dataset: [cloudlabworks/mcp-failure-lab-traces](https://huggingface.co/datasets/cloudlabworks/mcp-failure-lab-traces), 24 rows with traces and Clinic finding ids.

Built by [Cloud Lab Works](https://cloudlabworks.dev). MIT license. Deterministic Clinic modules retain their license and pinned provenance. Deployment lessons are in the source guide.
