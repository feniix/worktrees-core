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

export function resolveWorkspaceDirectoryName(
  options: Pick<PrepareWorkspaceOptions, "name" | "directoryName">,
): string {
  return options.directoryName ?? slugifyBranchName(options.name);
}
