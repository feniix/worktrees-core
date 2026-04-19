import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { execGit, findRepoRoot, type GitOptions } from "./git.js";

export interface WorktreeEntry {
  path: string;
  head: string;
  branch?: string;
  bare: boolean;
  detached: boolean;
  locked: boolean;
  prunable: boolean;
}

export interface CreateWorktreeOptions extends GitOptions {
  path: string;
  branch: string;
  from?: string;
  createBranch?: boolean;
  force?: boolean;
}

export interface RemoveWorktreeOptions extends GitOptions {
  path: string;
  force?: boolean;
}

export function worktreePathExists(path: string): boolean {
  return existsSync(path);
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
  const root = findRepoRoot(startDir, options);
  const worktree = listWorktrees(startDir, options).find((entry) => resolve(entry.path) === resolve(root));
  if (!worktree) {
    throw new Error(`Could not determine main worktree for ${startDir}`);
  }
  return worktree;
}

export function defaultWorktreeRoot(startDir = process.cwd(), options: GitOptions = {}): string {
  return `${findRepoRoot(startDir, options)}.worktrees`;
}

export function resolveWorktreePath(pathName: string, worktreeRoot: string): string {
  return resolve(worktreeRoot, pathName);
}

export function createWorktree(createOptions: CreateWorktreeOptions): WorktreeEntry {
  const { cwd = process.cwd(), gitBin, path, branch, from, createBranch = true, force = false } = createOptions;

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

  const created = listWorktrees(cwd, { cwd, gitBin }).find((entry) => resolve(entry.path) === resolve(path));
  if (!created) {
    throw new Error(`Created worktree at ${path}, but it was not present in git worktree list output`);
  }
  return created;
}

export function removeWorktree(removeOptions: RemoveWorktreeOptions): void {
  const { cwd = process.cwd(), gitBin, path, force = false } = removeOptions;
  const args = ["worktree", "remove"];
  if (force) args.push("--force");
  args.push(path);
  execGit(args, { cwd, gitBin });
}

export function pruneWorktrees(startDir = process.cwd(), options: GitOptions = {}): void {
  execGit(["worktree", "prune"], { ...options, cwd: startDir });
}

export function findCurrentWorktree(startDir = process.cwd(), options: GitOptions = {}): WorktreeEntry | undefined {
  const absoluteStart = resolve(startDir);
  return listWorktrees(startDir, options).find((entry) => {
    const worktreePath = resolve(entry.path);
    return (
      absoluteStart === worktreePath ||
      absoluteStart.startsWith(`${worktreePath}/`) ||
      dirname(absoluteStart) === worktreePath
    );
  });
}
