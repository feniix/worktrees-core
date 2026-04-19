import { isAbsolute } from "node:path";

export interface ParsedWorktreePathName {
  ok: true;
  pathName: string;
}

export interface InvalidWorktreePathName {
  ok: false;
  message: string;
}

export type WorktreePathNameParseResult = ParsedWorktreePathName | InvalidWorktreePathName;

function isRootedPath(pathName: string): boolean {
  return isAbsolute(pathName) || pathName.startsWith("\\") || /^[A-Za-z]:/.test(pathName);
}

export function parseWorktreePathName(pathName: string): WorktreePathNameParseResult {
  const trimmed = pathName.trim();
  if (!trimmed) {
    return { ok: false, message: `Invalid worktree path name: ${pathName}` };
  }

  if (isRootedPath(trimmed)) {
    return { ok: false, message: `Invalid worktree path name: ${pathName}` };
  }

  const segments = trimmed.split(/[\\/]+/).filter((segment) => segment.length > 0);
  if (segments.some((segment) => segment === "." || segment === "..")) {
    return { ok: false, message: `Invalid worktree path name: ${pathName}` };
  }

  return {
    ok: true,
    pathName: segments.join("/"),
  };
}
