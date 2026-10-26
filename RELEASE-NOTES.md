# Release notes

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
