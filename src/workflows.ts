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

export function resolveWorkspaceDirectoryName(
  options: Pick<PrepareWorkspaceOptions, "name" | "directoryName" | "pathName">,
): string {
  return options.directoryName ?? options.pathName ?? slugifyBranchName(options.name);
}

export function planPrepareWorkspace(options: PrepareWorkspaceOptions): PreparedWorkspace {
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
    pathName: directoryName,
    path,
  };
}

export function prepareWorkspace(options: PrepareWorkspaceOptions): PreparedWorkspace {
  const { cwd = process.cwd(), gitBin, from, createBranch = true, force = false } = options;
  const planned = planPrepareWorkspace(options);

  if (!force) {
    assertPrepareWorkspaceAllowed(options);
  }

  createWorktree({
    cwd,
    gitBin,
    path: planned.path,
    branch: planned.branch,
    from,
    createBranch,
    force,
  });

  return planned;
}
