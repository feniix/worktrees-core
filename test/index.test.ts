import { execSync } from "node:child_process";
import { existsSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  branchExists,
  createWorktree,
  defaultWorktreeRoot,
  execGit,
  findCurrentWorktree,
  findGitDir,
  findRepoRoot,
  getMainWorktree,
  isGitRepository,
  listWorktrees,
  prepareWorkspace,
  pruneWorktrees,
  removeWorktree,
  resolveWorktreePath,
  slugifyBranchName,
} from "../src/index.js";

describe("@feniix/worktrees-core", () => {
  let repoDir: string;

  function canonicalPath(path: string): string {
    return realpathSync(path);
  }

  beforeEach(() => {
    repoDir = mkdtempSync(join(tmpdir(), "worktrees-core-"));
    execSync("git init -b main", { cwd: repoDir, stdio: "pipe" });
    execSync("git config user.email 'test@example.com'", { cwd: repoDir, stdio: "pipe" });
    execSync("git config user.name 'Test User'", { cwd: repoDir, stdio: "pipe" });

    writeFileSync(join(repoDir, "README.md"), "hello\n");
    execSync("git add README.md", { cwd: repoDir, stdio: "pipe" });
    execSync("git commit -m 'chore: initial commit'", { cwd: repoDir, stdio: "pipe" });
  });

  afterEach(() => {
    if (repoDir && existsSync(repoDir)) {
      rmSync(repoDir, { recursive: true, force: true });
    }
  });

  it("executes git commands and discovers repository metadata", () => {
    expect(isGitRepository(repoDir)).toBe(true);
    expect(findRepoRoot(repoDir)).toBe(canonicalPath(repoDir));
    expect(findGitDir(repoDir)).toContain(".git");
    expect(execGit(["rev-parse", "--abbrev-ref", "HEAD"], { cwd: repoDir })).toBe("main");
  });

  it("slugifies branch names and resolves default worktree paths", () => {
    expect(slugifyBranchName("feature/auth-flow")).toBe("feature-auth-flow");
    expect(defaultWorktreeRoot(repoDir)).toBe(`${canonicalPath(repoDir)}.worktrees`);
    expect(resolveWorktreePath("feature-auth-flow", "/tmp/worktrees")).toBe("/tmp/worktrees/feature-auth-flow");
  });

  it("lists main worktree metadata", () => {
    const worktrees = listWorktrees(repoDir);
    expect(worktrees).toHaveLength(1);
    expect(worktrees[0]?.path).toBe(canonicalPath(repoDir));
    expect(worktrees[0]?.branch).toBe("main");
    expect(worktrees[0]?.bare).toBe(false);
    expect(worktrees[0]?.detached).toBe(false);

    const main = getMainWorktree(repoDir);
    expect(main.path).toBe(canonicalPath(repoDir));
  });

  it("creates and removes a worktree", () => {
    const path = join(defaultWorktreeRoot(repoDir), "feature-auth-flow");
    const created = createWorktree({
      cwd: repoDir,
      path,
      branch: "feature/auth-flow",
      from: "main",
    });

    expect(created.path).toBe(path);
    expect(created.branch).toBe("feature/auth-flow");
    expect(branchExists("feature/auth-flow", { cwd: repoDir })).toBe(true);

    const current = findCurrentWorktree(path);
    expect(current?.path).toBe(path);

    removeWorktree({ cwd: repoDir, path });
    expect(listWorktrees(repoDir)).toHaveLength(1);
  });

  it("prepares a higher-level workspace from a name and branch prefix", () => {
    const prepared = prepareWorkspace({
      cwd: repoDir,
      name: "login-flow",
      branchPrefix: "feature",
      from: "main",
    });

    expect(prepared.branch).toBe("feature/login-flow");
    expect(prepared.pathName).toBe("login-flow");
    expect(prepared.path).toContain(".worktrees/login-flow");

    const worktrees = listWorktrees(repoDir);
    expect(worktrees.some((entry) => entry.path === prepared.path && entry.branch === prepared.branch)).toBe(true);
  });

  it("prunes stale worktree metadata after a worktree directory is deleted manually", () => {
    const prepared = prepareWorkspace({
      cwd: repoDir,
      name: "cleanup-test",
      branchPrefix: "feature",
      from: "main",
    });

    expect(listWorktrees(repoDir).some((entry) => entry.path === prepared.path)).toBe(true);
    rmSync(prepared.path, { recursive: true, force: true });

    pruneWorktrees(repoDir);
    expect(listWorktrees(repoDir).some((entry) => entry.path === prepared.path)).toBe(false);
  });
});
