# Agent Reliability Lab

An extension of MCP Failure Lab and Agent Trace Clinic. Change one reference-client policy, replay the same synthetic fault, and inspect the before/after evidence.

## Current boundary

Local, isolated Linux reference-client runs and a browser replay are implemented. All four fixture pairs also passed on AWS Lambda ARM64 and Google Cloud Run AMD64; exported trace hashes and outcomes matched the local baseline. Both cloud configurations are included. A configuration validating is **not** a cloud deployment receipt. No model participates. No production agent or cloud-performance ranking is claimed.

The public-facing UI is static. Loading it cannot execute a cloud job, call a model, or upload a trace. Its comparison file is read in the browser. The runtime label inside a result is only a declaration; independently verify a cloud invocation before describing a run as cloud-tested.

## Reproduce

```sh
docker build -t mcp-failure-lab:cross-cloud-20261014 .
docker run --rm --network none --read-only --cap-drop ALL --security-opt no-new-privileges mcp-failure-lab:cross-cloud-20261014 npm test
mkdir -p artifacts
docker run --rm --network none --read-only --cap-drop ALL --security-opt no-new-privileges mcp-failure-lab:cross-cloud-20261014 node lab/experiments.mjs > artifacts/local-suite.json
cp artifacts/local-suite.json lab/web/sample.json
npm run preview
```

Open http://127.0.0.1:8790. Choose a fixture, inspect both traces, or download the full result. The checked-in sample is a recorded local run, not live execution.

| Experiment | Before | After | Acceptance |
| --- | --- | --- | --- |
| transient recovery | one attempt, two injected failures | three attempts | third attempt succeeds |
| permanent failure | five attempts | two attempts | tool still fails, but client stops earlier |
| deadline fit | 100 ms deadline, 400 ms delay | 2000 ms deadline | success within the larger deadline |
| malformed control | one-attempt budget | five-attempt budget | protocol error stays terminal after one call |

The test verifies expected outcomes, attempt counts and trace completeness. The UI verifies trace hashes before comparison. Hashes bind bytes, not truth or origin. Clinic heuristics can flag legitimate retries; that finding is deliberately retained even when the recovery fixture succeeds.

## Portable cloud execution

- **AWS:** `deploy/aws` creates an IAM-invoked Node.js 24 ARM64 Lambda and seven-day log group. No URL, API Gateway, scheduler, VPC or model access. A private AES256 S3 bucket holds only the content-addressed deployment ZIP. Disabled at rest (reserved concurrency zero), 256 MiB, 60-second timeout. `scripts/aws-invoke-once.sh` opens one manual invocation window and restores zero on exit. During that window the account-wide quota applies; this is not a per-function cap of one. The tested account has a ten-execution quota, below the headroom needed for reserved concurrency.
- **Google:** `deploy/gcp` creates a private Cloud Run Job with one task, one parallel task, zero retries, 1 CPU, 512 MiB and 60-second timeout. Its service account gets no application IAM roles. An existing dedicated project and digest-pinned image are inputs. No public service or scheduler.
- **Architecture:** Cloud Run requires a Linux AMD64 image; local Apple Silicon success is not sufficient. Build and test `--platform linux/amd64`. Lambda uses the same pure-JS package on ARM64.
- **Billing:** free-tier entitlement and remaining shared allowances must be checked in the actual account before apply. Neither a budget alert nor a max-instance setting is a monetary hard cap. No paid-plan upgrade is needed or automated here. The application makes no model/API calls.

See [deployment runbook](../deploy/README.md). The UI is published as a free [Hugging Face static Space](https://huggingface.co/spaces/cloudlabworks/agent-reliability-lab); it is independent of cloud runtime deployment.

## Source and maintenance

`vendor/clinic/PROVENANCE.json` pins and hashes the deterministic Clinic modules. Their MIT license is included. Experimental model code, paper-derived taxonomy text and old bake-off outputs are not included.

Owner: Cloud Lab Works / Waku. Runtime entry point: `lab/experiments.mjs`; preview health: `/healthz`; checks: `npm test` inside the pinned container. Stop the loopback preview to undo the local service. Cloud teardown uses a reviewed OpenTofu destroy plan for this dedicated stack, preserving exported result files first.

## Deployment lessons

1. **Test the target architecture.** Apple Silicon's ARM64 success does not establish Cloud Run's AMD64 compatibility.
2. **Treat API quota context as configuration.** Cloud Shell can silently use the selected home project for management API quota. Bootstrap the dedicated project, import it, and point the providers at it explicitly.
3. **Declare API dependencies.** Cloud Run, Artifact Registry, IAM and Logging are explicit bootstrap resources. A valid Terraform schema does not mean those APIs are enabled.
4. **Preserve trace bytes through logging.** `lab/cloud-run.mjs` wraps the result in a base64 JSON envelope. Log-export key ordering then cannot change nested trace hashes. The decoder checks the envelope and the browser still checks each trace hash.
5. **Separate evidence from the verdict.** A successful deployment, a passing fixture, a Clinic heuristic and a production reliability claim are four different things. This project demonstrates the first two only when backed by the corresponding receipt.

Cloud Shell's Docker daemon could not reach Artifact Registry while curl could. The verified image was transported with Google's maintained `crane` client using the existing gcloud credential helper. No credential was copied into the image or public evidence. Do not infer a general network rule from that one environment.
