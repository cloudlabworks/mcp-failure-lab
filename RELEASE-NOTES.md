# Release notes

## v0.1.2, 2026-11-02

- Signed releases: the `publish-mcp` workflow now records GitHub artifact attestations (Sigstore-signed SLSA build provenance) for the container image, pushed to ghcr.io beside it, and for a source tarball. Each version tag creates a GitHub Release with `mcp-failure-lab-<version>.tar.gz` and its provenance bundle `mcp-failure-lab-<version>.tar.gz.intoto.jsonl`. See "Verifying a release" in the README.
- Property-based tests (`test/property.test.js`, fast-check 4.10.2) for configuration parsing and error classification.
- Fix: `LAB_DELAY_MS` and `LAB_FAILURES` accepted strings such as `0x10`, `1e3` and ` 7 `, and an empty value became 0 instead of the default. Parsing now lives in `config.mjs`: plain decimal digits only, empty means default.
- Fix: the reference client classifies timeouts and disconnects by the SDK 2.x error code (`REQUEST_TIMEOUT`, `CONNECTION_CLOSED`, `NOT_CONNECTED`) before falling back to message matching. A timeout whose message did not contain "timeout" was reported as `protocol_error`.

## v0.1.1, 2026-11-02

- Listed in the Official MCP Registry as `io.github.cloudlabworks/mcp-failure-lab`; `server.json` added.
- Container image published to `ghcr.io/cloudlabworks/mcp-failure-lab:0.1.1` (linux/amd64, linux/arm64) by the `publish-mcp` workflow on version tags, with the `io.modelcontextprotocol.server.name` ownership label.
- No server or harness behavior changes.

## v0.1.0 — public release, 2026-10-25

- Published at https://github.com/cloudlabworks/mcp-failure-lab under MIT.
- zod pinned to 4.6.7 (was 4.1.12) to clear a high-severity npm advisory (memory exhaustion on oversized constrained collections); the official SDK 2.3.1 already resolves 4.6.7. `npm audit --omit=dev`: 0 vulnerabilities on 2026-10-25; 12/12 tests pass.
- Vendored Clinic provenance now cites the published Agent Trace Clinic commit `ca20b8f` (same file hashes; the Clinic history was re-authored before publication).
- The GCP bootstrap no longer defaults `project_id`; pass your own.
- Pre-publication checks: two secret scanners over full history (pattern grep and gitleaks) clean; CI runs on GitHub-hosted runners with read-only permissions.

## Local preview receipt — 2026-10-14

Status: local development release only. No public remote or cloud job.
Self-review: first local commit; no claim of independent review.

- Official server/client SDK 2.3.1; pinned lockfile; Node 24 Alpine at pinned base digest.
- 8/8 integration tests inside a no-network, read-only, non-root container.
- Seven reference runs: healthy success; persistent tool-error stops after 3 attempts; transient-error recovers on attempt 3; delay succeeds within deadline; delay times out beyond deadline; malformed result rejected; disconnect reported.
- First test run exposed misplaced SDK v2 timeout options (the API changed from three arguments to two). Corrected; regression test now enforces timeout and a single attempt.
- npm audit: zero reported advisories on this date. This is not a guarantee against unknown vulnerabilities.
- Three-failure trace diagnosed by Agent Trace Clinic with three expected finding types.

Evidence: ignored artifacts/reference-run.json and artifacts/npm-audit.json.
GitHub workflow is prepared but has not run remotely.
Only this reference client is measured. Third-party clients, HTTP transport and upstream conformance integration remain unverified.
