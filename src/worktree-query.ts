import { existsSync, realpathSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { execGit, findRepoRoot, type GitOptions } from "./git.js";
import type { WorktreeEntry } from "./types.js";

export function worktreePathExists(path: string, baseDir = process.cwd()): boolean {
  return existsSync(normalizePath(path, baseDir));
}

export function normalizePath(path: string, baseDir = process.cwd()): string {
  const resolved = resolve(baseDir, path);
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
  const worktree = listWorktrees(startDir, options).find(
    (entry) => normalizePath(entry.path, startDir) === normalizePath(root, startDir),
  );
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
  const target = normalizePath(path, startDir);
  return listWorktrees(startDir, options).find((entry) => normalizePath(entry.path, startDir) === target);
}

export function findWorktreeByBranch(
  branch: string,
  startDir = process.cwd(),
  options: GitOptions = {},
): WorktreeEntry | undefined {
  return listWorktrees(startDir, options).find((entry) => entry.branch === branch);
}

export function isMainWorktree(path: string, startDir = path, options: GitOptions = {}): boolean {
  return normalizePath(getMainWorktree(startDir, options).path, startDir) === normalizePath(path, startDir);
}

export function defaultWorktreeRoot(startDir = process.cwd(), options: GitOptions = {}): string {
  return `${findRepoRoot(startDir, options)}.worktrees`;
}

export function findCurrentWorktree(startDir = process.cwd(), options: GitOptions = {}): WorktreeEntry | undefined {
  const absoluteStart = normalizePath(startDir, startDir);
  return listWorktrees(startDir, options).find((entry) => {
    const worktreePath = normalizePath(entry.path, startDir);
    const relativePath = relative(worktreePath, absoluteStart);
    return relativePath === "" || (!relativePath.startsWith("..") && !isAbsolute(relativePath));
  });
}

export function isCurrentWorktree(path: string, startDir = path, options: GitOptions = {}): boolean {
  const current = findCurrentWorktree(startDir, options);
  return current ? normalizePath(current.path, startDir) === normalizePath(path, startDir) : false;
}
