# Repository Guidelines

## Project Structure & Module Organization
- This repository is a standalone TypeScript library.
- Source files live in `src/`.
- Tests live in `test/` and use `*.test.ts` naming.
- Documented solutions live in `docs/solutions/`, organized by category with YAML frontmatter fields such as `module`, `tags`, and `problem_type`; relevant when implementing or debugging in documented areas.
- Root config files include `package.json`, `tsconfig.json`, and `vitest.config.ts`.

## Build, Test, and Development Commands
Run these from the repository root:
- `npm install` — install dependencies.
- `npm run typecheck` — run TypeScript type checking.
- `npm run test` — run the Vitest test suite.
- `npm run check` — run lint + typecheck.
- `npm run build` — emit compiled package artifacts to `dist/`.
- `npm run lint:pkg` — run package export/package metadata checks with `publint`.
- `npm run lint:types:advisory` — run package type compatibility checks with `attw` as an advisory ESM-only compatibility signal.
- `npm run release:check` — run the full release gate: check, test, build, pack dry-run, and package lint.

## Coding Style & Naming Conventions
- Language: TypeScript.
- Prefer small, composable, side-effect-light functions.
- Keep the public API focused on reusable git/worktree primitives and higher-level workspace workflows.
- Use explicit types for exported interfaces and return values.

## Testing Guidelines
- Framework: Vitest.
- Prefer fast integration-style tests using temporary git repositories.
- Test both low-level primitives and higher-level workflow helpers.
- Keep tests isolated and clean up temporary directories after each run.
- Exported API changes must include or update tests.
- Public API or behavior changes must also update `README.md` examples and API documentation.
- Raise coverage expectations gradually over time, especially for validation, planning, and exported workflow APIs.

## Commit & Pull Request Guidelines
- Use Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`.
- PRs should include a short summary, test evidence, and any API or behavior notes.

## Architecture Notes
- This package is a normal library, not a Pi extension.
- Avoid Pi-specific runtime assumptions in the core implementation.
- Keep shelling out to `git` behind reusable helpers so higher-level APIs remain easy to test.
- Treat the root export surface as a deliberate public contract; new exports should be reviewed for naming, layering, tests, and README coverage.
- Packaging or export changes must be validated with `npm pack --dry-run` and `publint` before release.
- Run `attw` as an advisory check when changing packaging or exports; ESM-only warnings should be interpreted in the context of the package support policy.
