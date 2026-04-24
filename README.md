# @feniix/worktrees-core

TypeScript-first library for git worktree primitives, validation, and higher-level workspace workflows.

## Features

- Git worktree primitives for listing, creating, removing, and pruning worktrees
- Higher-level workspace workflows built on top of reusable primitives
- Planning and validation helpers so callers can inspect operations before mutating state
- Typed domain errors for unsafe operations and Git subprocess failures
- Reusable branch naming helpers and policies

## Install

```bash
npm install @feniix/worktrees-core
```

## Requirements

- Node.js `>= 22`
- `git` available on `PATH`

The published package ships compiled ESM in `dist/` plus `.d.ts` declaration files for TypeScript consumers.

## Module format

This package is **ESM-only**.

- ESM consumers can import it normally.
- CommonJS consumers must use dynamic `import()` instead of `require()`.

## Stability and support

This package is now stable.

The semver-stable contract is:
- the curated root export surface
- exported option/result/type shapes
- documented behavior in this README and `docs/api.md`

The following are not part of the stable contract:
- internal modules
- implementation details
- exact error message wording

## Quick start

```ts
import { defaultWorktreeRoot, listWorktrees, prepareWorkspace } from "@feniix/worktrees-core";

const cwd = process.cwd();
const worktrees = listWorktrees(cwd);

const workspace = prepareWorkspace({
  cwd,
  name: "login-flow",
  branchPrefix: "feature",
  from: "main",
  worktreeRoot: defaultWorktreeRoot(cwd),
});

console.log(workspace.directoryName); // "login-flow"
console.log(worktrees);
console.log(workspace);
```

## Plan, validate, then execute

```ts
import { createWorktree, planPrepareWorkspace, validatePrepareWorkspace } from "@feniix/worktrees-core";

const cwd = process.cwd();
const planned = planPrepareWorkspace({
  cwd,
  name: "login-flow",
  branchPrefix: "feature",
  from: "main",
});

const validation = validatePrepareWorkspace({
  cwd,
  name: "login-flow",
  branchPrefix: "feature",
  from: "main",
});

if (!validation.valid) {
  console.error(validation.issues);
} else {
  const worktree = createWorktree({
    cwd,
    path: planned.path,
    branch: planned.branch,
    from: "main",
  });

  console.log(worktree);
}
```

## Core concepts

- **Worktree primitives** expose low-level git/worktree operations.
- **Workspace workflows** compose naming, validation, and worktree creation into higher-level flows.
- **Validation helpers** let callers inspect issues before attempting mutations.
- **Planning helpers** make it easy to preview derived branch names and paths.
- **Error types** expose stable `WorktreesCoreError` codes for validation failures and `GitCommandError` details for unexpected Git subprocess failures.
- **Force compatibility** keeps `force: true` validation-skipping behavior for 1.x, emits a process warning, and offers `validateOnForce: true` to opt into the stricter 2.0 safety behavior now.
- The release gate includes installed-package integration E2E checks against a packed tarball, not just repo-internal tests.

## Documentation

- [API guide](./docs/api.md)
- [Using the library in agents](./docs/agent-usage.md)
- [Development and release guide](./docs/development.md)
- [Changelog](./CHANGELOG.md)

## License

MIT
