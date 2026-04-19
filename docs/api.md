# API guide

The root export is intentionally curated to expose the stable, task-oriented API surface for the library.

## Stability contract

For the upcoming `1.0.0` release, the intended semver-stable contract is:
- the curated root export surface
- exported option, result, and shared type shapes
- behavior documented in `README.md` and this API guide

The following are intentionally not part of the stable contract:
- internal modules
- implementation details
- exact error message wording

## Recommended API

These are the primary entry points most consumers should use.
- Prefer `planPrepareWorkspace()` / `prepareWorkspace()` for higher-level workspace flows.
- Use `createWorktree()` / `removeWorktree()` when you want lower-level git-like control.
- `directoryName` is the strict high-level workspace path input.
- low-level `path` inputs follow git semantics and may be relative to `cwd`.

### Worktree planning and workflows

- `planPrepareWorkspace(options)`
- `prepareWorkspace(options)`
- `planCreateWorktree(options)`
- `createWorktree(options)`
- `removeWorktree(options)`
- `pruneWorktrees(startDir, options)`

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

### Naming helpers

- `composeBranchName(name, options)`
- `createBranchNameStrategy(prefix?, separator?, sanitize?)`
- `resolveWorkspaceDirectoryName(options)`

### Worktree discovery helpers

- `listWorktrees(startDir, options)`
- `getMainWorktree(startDir, options)`
- `findCurrentWorktree(startDir, options)`
- `findWorktreeByPath(path, startDir, options)`
- `findWorktreeByBranch(branch, startDir, options)`
- `isMainWorktree(path, startDir, options)`
- `isCurrentWorktree(path, startDir, options)`
- `defaultWorktreeRoot(startDir, options)`
- `resolveWorktreePath(pathName, worktreeRoot)`
- `worktreePathExists(path)`

## Advanced root exports

These are intentionally kept available at the root, but are lower-level than the recommended workflow APIs.

- `findRepoRoot(startDir, options)`
- `isGitRepository(startDir, options)`
- `branchExists(branch, options)`
- `refExists(ref, options)`
- `isValidBranchName(branch, options)`
- `WorktreesCoreError`

## Shared types

- `WorktreeEntry`
- `CreateWorktreeOptions`
- `RemoveWorktreeOptions`
- `PrepareWorkspaceOptions`
- `PlannedWorkspace`
- `PreparedWorkspace`
- `PlannedWorktree`
- `BranchNamingOptions`
- `BranchNamingPolicy`
- `ValidationIssue`
- `ValidationResult`

## Error model

- `WorktreesCoreError`
- `ValidationIssue`
- `ValidationResult`

## Workspace path semantics

`directoryName` is treated as a safe relative workspace path under `worktreeRoot`.

### Allowed

- nested relative paths such as `team/backend/login-flow`
- input separators using either `/` or `\\`

### Rejected

- empty values
- rooted or absolute paths
- UNC paths
- `.` segments
- `..` segments

### Canonicalization behavior

- successful path-like outputs are normalized to `/`
- `validateWorktreePathName(pathName)` returns canonicalized `pathName` on valid input
- `validateWorktreePathName(pathName)` returns the original input on invalid input
- `resolveWorkspaceDirectoryName(options)` is strict and throws on invalid explicit `directoryName`
- `resolveWorktreePath(pathName, worktreeRoot)` validates and canonicalizes before resolving

## Safety behavior

By default the library rejects a few unsafe operations before shelling out to `git`.
You can also inspect the typed validation helpers first and decide how to surface issues in your own UI or CLI.

- invalid branch names
- invalid worktree path names like `..`, `../escape`, `a/./b`, absolute paths, or UNC paths
- creating a worktree when the target path already exists
- creating a branch-backed worktree when the branch already exists
- creating from a missing start point
- attaching to a missing existing branch when `createBranch: false`
- removing the main worktree
- removing the current worktree without `force`
