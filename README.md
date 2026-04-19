# @feniix/worktrees-core

Shared TypeScript library for Git worktree management primitives and higher-level workspace workflows.

## Features

- Execute `git` commands through a small typed helper
- Detect repository roots and git directories
- List and parse `git worktree list --porcelain` output
- Create, remove, and prune worktrees
- Build higher-level workspace flows on top of reusable primitives

## Install

```bash
npm install @feniix/worktrees-core
```

## Usage

```ts
import {
  defaultWorktreeRoot,
  listWorktrees,
  prepareWorkspace,
} from "@feniix/worktrees-core";

const worktrees = listWorktrees(process.cwd());

const workspace = prepareWorkspace({
  cwd: process.cwd(),
  name: "login-flow",
  branchPrefix: "feature",
  from: "main",
  worktreeRoot: defaultWorktreeRoot(process.cwd()),
});

console.log(worktrees);
console.log(workspace);
```

## API overview

### Git helpers

- `execGit(args, options)`
- `findRepoRoot(startDir, options)`
- `findGitDir(startDir, options)`
- `isGitRepository(startDir, options)`
- `branchExists(branch, options)`

### Worktree primitives

- `listWorktrees(startDir, options)`
- `getMainWorktree(startDir, options)`
- `defaultWorktreeRoot(startDir, options)`
- `resolveWorktreePath(pathName, worktreeRoot)`
- `worktreePathExists(path)`
- `createWorktree(options)`
- `removeWorktree(options)`
- `pruneWorktrees(startDir, options)`
- `findCurrentWorktree(startDir, options)`

### Higher-level workflows

- `slugifyBranchName(branch)`
- `prepareWorkspace(options)`

## Development

```bash
npm install
npm run typecheck
npm run test
```

## License

MIT
