# Local preview receipt — 2026-10-14

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
