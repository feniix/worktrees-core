import type { BranchNamingOptions, PreparedWorkspace, PrepareWorkspaceOptions } from "./types.js";
import { assertPrepareWorkspaceAllowed } from "./validation.js";
import { createWorktree, defaultWorktreeRoot, resolveWorktreePath } from "./worktrees.js";

export function slugifyBranchName(branch: string): string {
  return branch
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .replace(/[^A-Za-z0-9._/-]+/g, "-")
    .replace(/\//g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function composeBranchName(name: string, options: BranchNamingOptions = {}): string {
  const { prefix, separator = "/", sanitize = false } = options;
  const base = sanitize ? slugifyBranchName(name) : name.trim();
  return prefix ? `${prefix}${separator}${base}` : base;
}

export function createBranchNameStrategy(prefix?: string, separator: "/" | "-" = "/", sanitize = false) {
  return (name: string): string => composeBranchName(name, { prefix, separator, sanitize });
}

export const branchNameStrategy = createBranchNameStrategy;

export function prepareWorkspace(options: PrepareWorkspaceOptions): PreparedWorkspace {
  const {
    cwd = process.cwd(),
    gitBin,
    name,
    worktreeRoot = defaultWorktreeRoot(cwd, { cwd, gitBin }),
    branchPrefix,
    branchSeparator,
    sanitizeBranch = false,
    from,
    pathName = slugifyBranchName(name),
    createBranch = true,
    force = false,
  } = options;

  const branch = composeBranchName(name, {
    prefix: branchPrefix,
    separator: branchSeparator,
    sanitize: sanitizeBranch,
  });
  const path = resolveWorktreePath(pathName, worktreeRoot);

  if (!force) {
    assertPrepareWorkspaceAllowed(options);
  }

  createWorktree({
    cwd,
    gitBin,
    path,
    branch,
    from,
    createBranch,
    force,
  });

  return { branch, pathName, path };
}
