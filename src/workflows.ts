import type { GitOptions } from "./git.js";
import { createWorktree, defaultWorktreeRoot, resolveWorktreePath } from "./worktrees.js";

export interface PrepareWorkspaceOptions extends GitOptions {
  name: string;
  worktreeRoot?: string;
  branchPrefix?: string;
  from?: string;
  pathName?: string;
  createBranch?: boolean;
  force?: boolean;
}

export interface PreparedWorkspace {
  branch: string;
  pathName: string;
  path: string;
}

export function slugifyBranchName(branch: string): string {
  return branch
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .replace(/[^A-Za-z0-9._/-]+/g, "-")
    .replace(/\//g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function prepareWorkspace(options: PrepareWorkspaceOptions): PreparedWorkspace {
  const {
    cwd = process.cwd(),
    gitBin,
    name,
    worktreeRoot = defaultWorktreeRoot(cwd, { cwd, gitBin }),
    branchPrefix,
    from,
    pathName = slugifyBranchName(name),
    createBranch = true,
    force = false,
  } = options;

  const branch = branchPrefix ? `${branchPrefix}/${name}` : name;
  const path = resolveWorktreePath(pathName, worktreeRoot);

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
