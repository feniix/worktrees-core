import { WorktreesCoreError } from "./errors.js";
import { parseWorktreePathName, type WorktreePathNameParseResult } from "./path-names.js";
import type { BranchNamingOptions, PrepareWorkspaceOptions } from "./types.js";

function slugifyBranchName(branch: string): string {
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

export function deriveWorkspaceDirectoryName(name: string): string {
  return slugifyBranchName(name);
}

export function parseWorkspaceDirectoryName(
  options: Pick<PrepareWorkspaceOptions, "name" | "directoryName">,
): WorktreePathNameParseResult {
  return parseWorktreePathName(options.directoryName ?? deriveWorkspaceDirectoryName(options.name));
}

export function resolveWorkspaceDirectoryName(
  options: Pick<PrepareWorkspaceOptions, "name" | "directoryName">,
): string {
  const result = parseWorkspaceDirectoryName(options);
  if (!result.ok) {
    throw new WorktreesCoreError("INVALID_WORKTREE_PATH_NAME", result.message, {
      pathName: options.directoryName ?? deriveWorkspaceDirectoryName(options.name),
    });
  }

  return result.pathName;
}
