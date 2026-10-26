# NVIDIA hosted NIM: probe before trust

`GET /v1/models` lists models the account cannot call. Probe each model with one chat call before using it,
log the date and status here, and probe again at the start of every lab run.

- 404 "Function not found for account": a per-account entitlement; the model is listed but not callable.
- 410 "reached its end of life": a dead catalog entry.

| Date (PT) | Model | HTTP | Note |
|---|---|---|---|
| 2026-10-26 | nvidia/nemotron-3.5-lightning-30b-a3b | 200 | 2.09 s; 160 of 165 completion tokens were reasoning |
| 2026-10-26 | nvidia/nemotron-3-super-120b-a12b | 404 | not entitled |
| 2026-10-26 | nvidia/nemotron-nano-3-30b-a3b | 404 | not entitled |
| 2026-10-26 | meta/llama-3.1-8b-instruct | 410 | end of life 2026-08-26 |
| 2026-10-26 | nvidia/llama-3.3-nemotron-super-49b-v1.5 | 410 | end of life 2026-08-26 |

## What each NIM run records (feedback from Gherkin, 2026-10-26)

- Exact model ID and run date on every trace.
- Latency p50 and p95.
- Reasoning-token overhead.
- Empty or truncated `content` when reasoning uses up `max_tokens` (the likely worst failure).
- Tool-call schema validity.
- Failures by class: 404, 410, 429 and timeout.
- Variance across repeats at a pinned temperature.

Allowed claim: "evaluated on NVIDIA-hosted NIM", never "runs on our GPUs".
