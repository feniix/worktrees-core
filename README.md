# @feniix/worktrees-core

TypeScript-first library for git worktree primitives, validation, and higher-level workspace workflows.

## Features

- Git worktree primitives for listing, creating, removing, and pruning worktrees
- Higher-level workspace workflows built on top of reusable primitives
- Planning and validation helpers so callers can inspect operations before mutating state
- Typed domain errors for unsafe operations
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

## Documentation

- [API guide](./docs/api.md)
- [Development and release guide](./docs/development.md)

## License

MIT
