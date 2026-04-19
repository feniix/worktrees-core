import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

export interface GitOptions {
  cwd?: string;
  gitBin?: string;
}

export interface ExecGitOptions extends GitOptions {
  trim?: boolean;
}

export function execGit(args: string[], options: ExecGitOptions = {}): string {
  const { cwd, gitBin = "git", trim = true } = options;

  try {
    const output = execFileSync(gitBin, args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return trim ? output.trim() : output;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Git command failed (${gitBin} ${args.join(" ")}): ${message}`);
  }
}

export function findRepoRoot(startDir = process.cwd(), options: GitOptions = {}): string {
  const output = execGit(["rev-parse", "--show-toplevel"], { ...options, cwd: startDir });
  return resolve(startDir, output);
}

export function findGitDir(startDir = process.cwd(), options: GitOptions = {}): string {
  const output = execGit(["rev-parse", "--absolute-git-dir"], { ...options, cwd: startDir });
  return resolve(startDir, output);
}

export function isGitRepository(startDir = process.cwd(), options: GitOptions = {}): boolean {
  try {
    return execGit(["rev-parse", "--is-inside-work-tree"], { ...options, cwd: startDir }) === "true";
  } catch {
    return false;
  }
}

export function branchExists(branch: string, options: GitOptions = {}): boolean {
  try {
    execGit(["show-ref", "--verify", "--quiet", `refs/heads/${branch}`], options);
    return true;
  } catch {
    return false;
  }
}
