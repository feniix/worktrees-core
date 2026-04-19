import { existsSync, realpathSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { assertValidationResult } from "./errors.js";
import { execGit, findRepoRoot, type GitOptions } from "./git.js";
import type { CreateWorktreeOptions, PlannedWorktree, RemoveWorktreeOptions, WorktreeEntry } from "./types.js";
import { assertCreateWorktreeAllowed, assertRemoveWorktreeAllowed, validateWorktreePathName } from "./validation.js";

export function worktreePathExists(path: string): boolean {
  return existsSync(path);
}

function normalizePath(path: string): string {
  const resolved = resolve(path);
  return existsSync(resolved) ? realpathSync(resolved) : resolved;
}

export function listWorktrees(startDir = process.cwd(), options: GitOptions = {}): WorktreeEntry[] {
  const output = execGit(["worktree", "list", "--porcelain"], { ...options, cwd: startDir, trim: true });
  if (!output) return [];

  const blocks = output.split(/\n\n+/).filter(Boolean);
  return blocks.map(parseWorktreeBlock);
}

function parseWorktreeBlock(block: string): WorktreeEntry {
  const lines = block.split("\n").filter(Boolean);
  const pathLine = lines.find((line) => line.startsWith("worktree "));
  const headLine = lines.find((line) => line.startsWith("HEAD "));
  const branchLine = lines.find((line) => line.startsWith("branch "));

  if (!pathLine || !headLine) {
    throw new Error(`Invalid git worktree porcelain block: ${block}`);
  }

  return {
    path: pathLine.slice("worktree ".length),
    head: headLine.slice("HEAD ".length),
    branch: branchLine ? branchLine.slice("branch refs/heads/".length) : undefined,
    bare: lines.includes("bare"),
    detached: lines.includes("detached"),
    locked: lines.some((line) => line === "locked" || line.startsWith("locked ")),
    prunable: lines.some((line) => line === "prunable" || line.startsWith("prunable ")),
  };
}

export function getMainWorktree(startDir = process.cwd(), options: GitOptions = {}): WorktreeEntry {
  const commonGitDir = execGit(["rev-parse", "--git-common-dir"], { ...options, cwd: startDir });
  const root = dirname(resolve(startDir, commonGitDir));
  const worktree = listWorktrees(startDir, options).find((entry) => normalizePath(entry.path) === normalizePath(root));
  if (!worktree) {
    throw new Error(`Could not determine main worktree for ${startDir}`);
  }
  return worktree;
}

export function findWorktreeByPath(
  path: string,
  startDir = process.cwd(),
  options: GitOptions = {},
): WorktreeEntry | undefined {
  const target = normalizePath(path);
  return listWorktrees(startDir, options).find((entry) => normalizePath(entry.path) === target);
}

export function findWorktreeByBranch(
  branch: string,
  startDir = process.cwd(),
  options: GitOptions = {},
): WorktreeEntry | undefined {
  return listWorktrees(startDir, options).find((entry) => entry.branch === branch);
}

export function isMainWorktree(path: string, startDir = path, options: GitOptions = {}): boolean {
  return normalizePath(getMainWorktree(startDir, options).path) === normalizePath(path);
}

export function defaultWorktreeRoot(startDir = process.cwd(), options: GitOptions = {}): string {
  return `${findRepoRoot(startDir, options)}.worktrees`;
}

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
  const { cwd = process.cwd(), gitBin } = createOptions;
  const { path, branch, from, createBranch, force } = planCreateWorktree(createOptions);

  if (!force) {
    assertCreateWorktreeAllowed(createOptions);
  }

  const args = ["worktree", "add"];
  if (force) args.push("--force");

  if (createBranch) {
    args.push("-b", branch);
  }

  args.push(path);

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
  const { cwd = process.cwd(), gitBin, path, force = false } = removeOptions;
  if (!force) {
    assertRemoveWorktreeAllowed(removeOptions);
  }

  const args = ["worktree", "remove"];
  if (force) args.push("--force");
  args.push(path);
  execGit(args, { cwd, gitBin });
}

export function pruneWorktrees(startDir = process.cwd(), options: GitOptions = {}): void {
  execGit(["worktree", "prune"], { ...options, cwd: startDir });
}

export function findCurrentWorktree(startDir = process.cwd(), options: GitOptions = {}): WorktreeEntry | undefined {
  const absoluteStart = normalizePath(startDir);
  return listWorktrees(startDir, options).find((entry) => {
    const worktreePath = normalizePath(entry.path);
    const relativePath = relative(worktreePath, absoluteStart);
    return relativePath === "" || (!relativePath.startsWith("..") && !isAbsolute(relativePath));
  });
}

export function isCurrentWorktree(path: string, startDir = path, options: GitOptions = {}): boolean {
  const current = findCurrentWorktree(startDir, options);
  return current ? normalizePath(current.path) === normalizePath(path) : false;
}
