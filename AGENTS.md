# Repository Guidelines

## Project Structure & Module Organization
- This repository is a standalone TypeScript library.
- Source files live in `src/`.
- Tests live in `test/` and use `*.test.ts` naming.
- Root config files include `package.json`, `tsconfig.json`, and `vitest.config.ts`.

## Build, Test, and Development Commands
Run these from the repository root:
- `npm install` — install dependencies.
- `npm run typecheck` — run TypeScript type checking.
- `npm run test` — run the Vitest test suite.

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

## Commit & Pull Request Guidelines
- Use Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`.
- PRs should include a short summary, test evidence, and any API or behavior notes.

## Architecture Notes
- This package is a normal library, not a Pi extension.
- Avoid Pi-specific runtime assumptions in the core implementation.
- Keep shelling out to `git` behind reusable helpers so higher-level APIs remain easy to test.
