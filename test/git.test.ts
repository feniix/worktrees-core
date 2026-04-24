import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { execGit, findGitDir } from "../src/git.js";
import { branchExists, findRepoRoot, GitCommandError, isGitRepository, refExists } from "../src/index.js";
import { canonicalPath, useTempGitRepo } from "./helpers.js";

describe("git helpers", () => {
  const { getRepoDir } = useTempGitRepo();

  it("executes git commands and discovers repository metadata", () => {
    const repoDir = getRepoDir();

    expect(isGitRepository(repoDir)).toBe(true);
    expect(findRepoRoot(repoDir)).toBe(canonicalPath(repoDir));
    expect(findGitDir(repoDir)).toContain(".git");
    expect(execGit(["rev-parse", "--abbrev-ref", "HEAD"], { cwd: repoDir })).toBe("main");
  });

  it("reports repository and git command failures predictably", () => {
    const repoDir = getRepoDir();
    const nonRepoDir = mkdtempSync(join(tmpdir(), "worktrees-core-nonrepo-"));

    expect(isGitRepository(nonRepoDir)).toBe(false);
    expect(refExists("--help", { cwd: repoDir })).toBe(false);
    expect(refExists("missing-ref", { cwd: repoDir })).toBe(false);
    expect(branchExists("missing-branch", { cwd: repoDir })).toBe(false);

    expect(refExists("main", { cwd: nonRepoDir })).toBe(false);
    expect(branchExists("main", { cwd: nonRepoDir })).toBe(false);

    try {
      execGit(["definitely-not-a-command"], { cwd: repoDir });
      throw new Error("expected execGit to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(GitCommandError);
      expect((error as GitCommandError).code).toBe("GIT_COMMAND_FAILED");
      expect((error as GitCommandError).details.args).toEqual(["definitely-not-a-command"]);
    }

    expect(execGit(["rev-parse", "--abbrev-ref", "HEAD"], { cwd: repoDir, trim: false })).toBe("main\n");
  });
});
