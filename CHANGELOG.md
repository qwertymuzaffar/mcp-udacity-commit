# Changelog

## 1.2.3

### Patch Changes

- e8eda7d: Releases are now automated with Changesets and published from GitHub Actions with provenance.

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.2] - 2026-07-31

### Changed

- Include `CHANGELOG.md` in the published npm package so the release
  history ships alongside the code.

## [1.2.1] - 2026-07-31

### Changed

- Renamed terse single-letter locals across the server and lint core to
  descriptive names — a pure readability pass with functionally identical
  compiled output. (#4)

### Security

- Ignore `.mcpregistry_*` so the MCP publisher's GitHub token can never be
  committed; also ignore `.idea/` project settings and `*.tgz` pack
  artifacts. (#5)

## [1.2.0] - 2026-07-28

### Added

- `validate_branch_name` tool and `udacity://branch-naming` resource
  enforcing the companion `type/kebab-case` branch-naming convention. (#2)
- `release/` recognized as a typed branch that accepts version-style
  descriptions (e.g. `release/1.2.0`, `release/2024-q1`). (#3)

## [1.0.2] - 2026-07-28

### Fixed

- Hardened the commit linter — CRLF handling, code-point length counting,
  imperative-mood hints, and footer issue-reference checks — and added a
  unit-test suite plus CI. (#1)
- Pointed `node --test` at explicit test files so CI runs the suite
  reliably. (#1)

## [1.0.1] - 2026-07-28

### Changed

- Synced the published npm README and dropped maintainer-only publish
  steps from it.

## [1.0.0] - 2026-07-28

### Added

- Initial release: the Udacity commit-message MCP server with the
  `validate_commit_message` and `format_commit_message` tools and the
  `udacity://commit-styleguide` resource.

[1.2.2]: https://github.com/qwertymuzaffar/mcp-udacity-commit/compare/v1.2.1...v1.2.2
[1.2.1]: https://github.com/qwertymuzaffar/mcp-udacity-commit/compare/v1.2.0...v1.2.1
[1.2.0]: https://github.com/qwertymuzaffar/mcp-udacity-commit/releases/tag/v1.2.0
