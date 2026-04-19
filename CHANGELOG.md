# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2026-04-19

First stable release.

### Highlights

- The curated root export surface is now the semver-stable public API contract
- Exported option, result, and shared type shapes are now treated as stable
- Documented behavior in `README.md` and `docs/api.md` is now part of the stable contract
- The release gate includes tarball smoke testing and installed-package integration E2E checks

### Support policy

- ESM-only package
- Node.js `>= 22`
- `git` must be available on `PATH`

### Stability note

The stable contract covers the curated root exports, exported types, and documented behavior.
Internal modules, implementation details, and exact error message wording remain outside the stable contract.

## [0.9.0] - 2026-04-19

Final hardening release before `1.0.0`.

### Highlights

- Curated and tightened the public root API surface
- Strengthened validation and typed error behavior
- Added planning helpers for worktree and workspace flows
- Hardened path handling for strict workspace directory semantics and low-level git-like path resolution
- Reorganized and expanded the test suite by domain
- Added a tarball smoke test and integrated it into the release gate
- Restructured docs into a shorter README plus dedicated API and development guides

### Support policy

- ESM-only package
- Node.js `>= 22`
- `git` must be available on `PATH`

### Stability note

This release is intended as the final hardening release before `1.0.0`.
The intended stable contract for `1.0.0` is the curated root export surface, exported types, and documented behavior.
