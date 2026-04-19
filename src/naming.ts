import type { BranchNamingOptions, PrepareWorkspaceOptions } from "./types.js";

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

export function resolveBranchName(name: string, options: BranchNamingOptions = {}): string {
  return composeBranchName(name, options);
}
