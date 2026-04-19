import { describe, expect, it } from "vitest";
import { execGit, findGitDir } from "../src/git.js";
import { findRepoRoot, isGitRepository } from "../src/index.js";
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
});
