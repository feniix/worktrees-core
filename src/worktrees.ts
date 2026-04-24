import { resolve } from "node:path";
import { emitForceSkipsValidationWarning } from "./deprecations.js";
import { assertValidationResult } from "./errors.js";
import { execGit, type GitOptions } from "./git.js";
import type { CreateWorktreeOptions, PlannedWorktree, RemoveWorktreeOptions, WorktreeEntry } from "./types.js";
import { assertCreateWorktreeAllowed, assertRemoveWorktreeAllowed, validateWorktreePathName } from "./validation.js";
import { findWorktreeByPath } from "./worktree-query.js";

export {
  defaultWorktreeRoot,
  findCurrentWorktree,
  findWorktreeByBranch,
  findWorktreeByPath,
  getMainWorktree,
  isCurrentWorktree,
  isMainWorktree,
  listWorktrees,
  worktreePathExists,
} from "./worktree-query.js";

export function resolveWorktreePath(pathName: string, worktreeRoot: string): string {
  const validation = validateWorktreePathName(pathName);
  assertValidationResult(validation);
  return resolve(worktreeRoot, validation.pathName);
}

export function planCreateWorktree(createOptions: CreateWorktreeOptions): PlannedWorktree {
  const { path, branch, from, createBranch = true, force = false } = createOptions;
  return {
    path,
    branch,
    from,
    createBranch,
    force,
  };
}

export function createWorktree(createOptions: CreateWorktreeOptions): WorktreeEntry {
  const { cwd = process.cwd(), gitBin, validateOnForce = false } = createOptions;
  const { path, branch, from, createBranch, force } = planCreateWorktree(createOptions);

  if (!force || validateOnForce) {
    assertCreateWorktreeAllowed(createOptions);
  } else {
    emitForceSkipsValidationWarning("createWorktree");
  }

  const args = ["worktree", "add"];
  if (force) args.push("--force");

  if (createBranch) {
    args.push("-b", branch);
  }

  args.push("--", path);

  if (!createBranch) {
    args.push(branch);
  } else if (from) {
    args.push(from);
  }

  execGit(args, { cwd, gitBin });

  const created = findWorktreeByPath(path, cwd, { cwd, gitBin });
  if (!created) {
    throw new Error(`Created worktree at ${path}, but it was not present in git worktree list output`);
  }
  return created;
}

export function removeWorktree(removeOptions: RemoveWorktreeOptions): void {
  const { cwd = process.cwd(), gitBin, path, force = false, validateOnForce = false } = removeOptions;
  if (!force || validateOnForce) {
    assertRemoveWorktreeAllowed(removeOptions);
  } else {
    emitForceSkipsValidationWarning("removeWorktree");
  }

  const args = ["worktree", "remove"];
  if (force) args.push("--force");
  args.push("--", path);
  execGit(args, { cwd, gitBin });
}

export function pruneWorktrees(startDir = process.cwd(), options: GitOptions = {}): void {
  execGit(["worktree", "prune"], { ...options, cwd: startDir });
}
