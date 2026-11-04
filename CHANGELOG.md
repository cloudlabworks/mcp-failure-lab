# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.2] - 2026-11-02

### Added

- Signed releases: the `publish-mcp` workflow now records GitHub artifact attestations (Sigstore-signed SLSA build provenance) for the container image, pushed to ghcr.io beside it, and for a source tarball. Each version tag creates a GitHub Release with `mcp-failure-lab-<version>.tar.gz` and its provenance bundle `mcp-failure-lab-<version>.tar.gz.intoto.jsonl`. See "Verifying a release" in the README.
- Property-based tests (`test/property.test.js`, fast-check 4.10.2) for configuration parsing and error classification.

### Fixed

- `LAB_DELAY_MS` and `LAB_FAILURES` accepted strings such as `0x10`, `1e3` and ` 7 `, and an empty value became 0 instead of the default. Parsing now lives in `config.mjs`: plain decimal digits only, empty means default.
- The reference client classifies timeouts and disconnects by the SDK 2.x error code (`REQUEST_TIMEOUT`, `CONNECTION_CLOSED`, `NOT_CONNECTED`) before falling back to message matching. A timeout whose message did not contain "timeout" was reported as `protocol_error`.

## [0.1.1] - 2026-11-02

No server or harness behavior changes.

### Added

- Listed in the Official MCP Registry as `io.github.cloudlabworks/mcp-failure-lab`; `server.json` added.
- Container image published to `ghcr.io/cloudlabworks/mcp-failure-lab:0.1.1` (linux/amd64, linux/arm64) by the `publish-mcp` workflow on version tags, with the `io.modelcontextprotocol.server.name` ownership label.

## [0.1.0] - 2026-10-25

Public release.

### Added

- Published at https://github.com/cloudlabworks/mcp-failure-lab under MIT.

### Changed

- Vendored Clinic provenance now cites the published Agent Trace Clinic commit `ca20b8f` (same file hashes; the Clinic history was re-authored before publication).
- The GCP bootstrap no longer defaults `project_id`; pass your own.

### Security

- zod pinned to 4.6.7 (was 4.1.12) to clear a high-severity npm advisory (memory exhaustion on oversized constrained collections); the official SDK 2.3.1 already resolves 4.6.7. `npm audit --omit=dev`: 0 vulnerabilities on 2026-10-25; 12/12 tests pass.
- Pre-publication checks: two secret scanners over full history (pattern grep and gitleaks) clean; CI runs on GitHub-hosted runners with read-only permissions.

## Local preview - 2026-10-14

A local development release before the public repository existed; not a versioned release. The first local commit, reviewed by its author only. The GitHub workflow was prepared but had not run remotely. Only this reference client is measured; third-party clients, HTTP transport and upstream conformance integration remain unverified. Evidence was kept as untracked local artifacts (the reference run and the npm audit output).

### Added

- Official server/client SDK 2.3.1; pinned lockfile; Node 24 Alpine at pinned base digest.
- 8/8 integration tests inside a no-network, read-only, non-root container.
- Seven reference runs: healthy success; persistent tool-error stops after 3 attempts; transient-error recovers on attempt 3; delay succeeds within deadline; delay times out beyond deadline; malformed result rejected; disconnect reported.
- Three-failure trace diagnosed by Agent Trace Clinic with three expected finding types.

### Fixed

- First test run exposed misplaced SDK v2 timeout options (the API changed from three arguments to two). Corrected; regression test now enforces timeout and a single attempt.

### Security

- npm audit: zero reported advisories on this date. This is not a guarantee against unknown vulnerabilities.

[Unreleased]: https://github.com/cloudlabworks/mcp-failure-lab/compare/v0.1.2...HEAD
[0.1.2]: https://github.com/cloudlabworks/mcp-failure-lab/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/cloudlabworks/mcp-failure-lab/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/cloudlabworks/mcp-failure-lab/releases/tag/v0.1.0
