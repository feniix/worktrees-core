# @feniix/worktrees-core

Shared TypeScript library for Git worktree management primitives and higher-level workspace workflows.

## Features

- Execute `git` commands through a small typed helper
- Detect repository roots and git directories
- List and parse `git worktree list --porcelain` output
- Create, remove, and prune worktrees
- Validate branch/path availability before mutations
- Expose typed domain errors for unsafe operations
- Build reusable branch naming strategies and policy validators
- Build higher-level workspace flows on top of reusable primitives

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

## Usage

### Quick start

```ts
import {
  defaultWorktreeRoot,
  listWorktrees,
  prepareWorkspace,
} from "@feniix/worktrees-core";

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

### Plan, validate, then execute

```ts
import {
  createWorktree,
  planPrepareWorkspace,
  validatePrepareWorkspace,
} from "@feniix/worktrees-core";

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

### Compose branch naming strategies

```ts
import {
  composeBranchName,
  createBranchNameStrategy,
  validateBranchNamingPolicy,
} from "@feniix/worktrees-core";

const branch = composeBranchName("Login Flow", {
  prefix: "feature",
  sanitize: true,
});

const strategy = createBranchNameStrategy("feature", "/", true);
const branchFromStrategy = strategy("Billing Portal");

const policy = validateBranchNamingPolicy("login-flow", {
  prefix: "feature",
  sanitize: true,
});

console.log({ branch, branchFromStrategy, policy });
```

## API overview

### Git helpers

- `execGit(args, options)`
- `findRepoRoot(startDir, options)`
- `findGitDir(startDir, options)`
- `isGitRepository(startDir, options)`
- `branchExists(branch, options)`
- `refExists(ref, options)`
- `isValidBranchName(branch, options)`

### Shared types

- `WorktreeEntry`
- `CreateWorktreeOptions`
- `RemoveWorktreeOptions`
- `PrepareWorkspaceOptions`
- `PreparedWorkspace`
- `PlannedWorktree`
- `BranchNamingOptions`
- `BranchNamingPolicy`

### Error model

- `WorktreesCoreError`
- `ValidationIssue`
- `ValidationResult`
- `toWorktreesCoreError(issue)`
- `assertValidationResult(result)`

### Validation helpers

- `validateBranchName(branch, options)`
- `assertValidBranchName(branch, options)`
- `validateBranchReference(ref, options)`
- `assertBranchReferenceExists(ref, options)`
- `validateWorktreePathName(pathName)`
- `assertWorktreePathName(pathName)`
- `isValidWorktreePathName(pathName)`
- `validateCreateWorktree(options)`
- `assertCreateWorktreeAllowed(options)`
- `validateRemoveWorktree(options)`
- `assertRemoveWorktreeAllowed(options)`
- `validateBranchNamingPolicy(name, policy)`
- `assertBranchNamingPolicy(name, policy)`
- `validatePrepareWorkspace(options)`
- `assertPrepareWorkspaceAllowed(options)`

### Worktree primitives

- `listWorktrees(startDir, options)`
- `getMainWorktree(startDir, options)`
- `findWorktreeByPath(path, startDir, options)`
- `findWorktreeByBranch(branch, startDir, options)`
- `findCurrentWorktree(startDir, options)`
- `isMainWorktree(path, startDir, options)`
- `isCurrentWorktree(path, startDir, options)`
- `defaultWorktreeRoot(startDir, options)`
- `resolveWorktreePath(pathName, worktreeRoot)`
- `worktreePathExists(path)`
- `planCreateWorktree(options)`
- `createWorktree(options)`
- `removeWorktree(options)`
- `pruneWorktrees(startDir, options)`

### Higher-level workflows

- `slugifyBranchName(branch)`
- `composeBranchName(name, options)`
- `createBranchNameStrategy(prefix?, separator?, sanitize?)`
- `branchNameStrategy(prefix?, separator?, sanitize?)` (alias)
- `resolveWorkspaceDirectoryName(options)`
- `planPrepareWorkspace(options)`
- `prepareWorkspace(options)`

## Safety behavior

By default the library rejects a few unsafe operations before shelling out to `git`.
You can also inspect the typed validation helpers first and decide how to surface issues in your own UI or CLI:

- invalid branch names
- invalid worktree path names like `..` or `../escape`
- creating a worktree when the target path already exists
- creating a branch-backed worktree when the branch already exists
- creating from a missing start point
- attaching to a missing existing branch when `createBranch: false`
- removing the main worktree
- removing the current worktree without `force`

## Release checklist

Before publishing:

```bash
npm install
npm run check
npm run test
npm run build
npm pack --dry-run
```

`npm publish` will also run `prepublishOnly`.

## Development

```bash
npm install
npm run typecheck
npm run test
```

## License

MIT
