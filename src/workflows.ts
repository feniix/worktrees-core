import { emitForceSkipsValidationWarning } from "./deprecations.js";
import { composeBranchName, resolveWorkspaceDirectoryName } from "./naming.js";
import type { PlannedWorkspace, PreparedWorkspace, PrepareWorkspaceOptions } from "./types.js";
import { assertPrepareWorkspaceAllowed } from "./validation.js";
import { createWorktree, defaultWorktreeRoot, resolveWorktreePath } from "./worktrees.js";

export function planPrepareWorkspace(options: PrepareWorkspaceOptions): PlannedWorkspace {
  const {
    cwd = process.cwd(),
    gitBin,
    name,
    worktreeRoot = defaultWorktreeRoot(cwd, { cwd, gitBin }),
    branchPrefix,
    branchSeparator,
    sanitizeBranch = false,
  } = options;

  const directoryName = resolveWorkspaceDirectoryName(options);
  const branch = composeBranchName(name, {
    prefix: branchPrefix,
    separator: branchSeparator,
    sanitize: sanitizeBranch,
  });
  const path = resolveWorktreePath(directoryName, worktreeRoot);

  return {
    branch,
    directoryName,
    path,
  };
}

export function prepareWorkspace(options: PrepareWorkspaceOptions): PreparedWorkspace {
  const { cwd = process.cwd(), gitBin, from, createBranch = true, force = false, validateOnForce = false } = options;
  const planned = planPrepareWorkspace(options);

  if (!force || validateOnForce) {
    assertPrepareWorkspaceAllowed(options);
  } else {
    emitForceSkipsValidationWarning("prepareWorkspace");
  }

  createWorktree({
    cwd,
    gitBin,
    path: planned.path,
    branch: planned.branch,
    from,
    createBranch,
    force,
    validateOnForce,
  });

  return planned;
}
