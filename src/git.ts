import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { GitCommandError } from "./errors.js";

export interface GitOptions {
  cwd?: string;
  gitBin?: string;
}

export interface ExecGitOptions extends GitOptions {
  trim?: boolean;
}

function gitFailureDetails(
  gitBin: string,
  args: string[],
  cwd: string | undefined,
  error: unknown,
): {
  gitBin: string;
  args: string[];
  cwd?: string;
  status?: number;
  signal?: string;
  stdout?: string;
  stderr?: string;
} {
  const childError = error as {
    status?: number;
    signal?: string;
    stdout?: Buffer | string;
    stderr?: Buffer | string;
  };

  return {
    gitBin,
    args,
    ...(cwd ? { cwd } : {}),
    ...(typeof childError.status === "number" ? { status: childError.status } : {}),
    ...(childError.signal ? { signal: childError.signal } : {}),
    ...(childError.stdout ? { stdout: childError.stdout.toString() } : {}),
    ...(childError.stderr ? { stderr: childError.stderr.toString() } : {}),
  };
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
    throw new GitCommandError(gitFailureDetails(gitBin, args, cwd, error), error);
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

export function refExists(ref: string, options: GitOptions = {}): boolean {
  try {
    execGit(["rev-parse", "--verify", "--quiet", "--end-of-options", ref], options);
    return true;
  } catch {
    return false;
  }
}

export function isValidBranchName(branch: string, options: GitOptions = {}): boolean {
  try {
    const trimmed = branch.trim();
    if (!trimmed) return false;
    execGit(["check-ref-format", "--branch", trimmed], options);
    return true;
  } catch {
    return false;
  }
}
