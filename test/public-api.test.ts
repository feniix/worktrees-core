import { describe, expect, it } from "vitest";
import * as api from "../src/index.js";

describe("public root API", () => {
  it("exports the exact intended runtime surface", () => {
    expect(Object.keys(api).sort()).toEqual([
      "WorktreesCoreError",
      "assertBranchNamingPolicy",
      "assertBranchReferenceExists",
      "assertCreateWorktreeAllowed",
      "assertPrepareWorkspaceAllowed",
      "assertRemoveWorktreeAllowed",
      "assertValidBranchName",
      "assertWorktreePathName",
      "branchExists",
      "composeBranchName",
      "createBranchNameStrategy",
      "createWorktree",
      "defaultWorktreeRoot",
      "findCurrentWorktree",
      "findRepoRoot",
      "findWorktreeByBranch",
      "findWorktreeByPath",
      "getMainWorktree",
      "isCurrentWorktree",
      "isGitRepository",
      "isMainWorktree",
      "isValidBranchName",
      "isValidWorktreePathName",
      "listWorktrees",
      "planCreateWorktree",
      "planPrepareWorkspace",
      "prepareWorkspace",
      "pruneWorktrees",
      "refExists",
      "removeWorktree",
      "resolveWorkspaceDirectoryName",
      "resolveWorktreePath",
      "validateBranchName",
      "validateBranchNamingPolicy",
      "validateBranchReference",
      "validateCreateWorktree",
      "validatePrepareWorkspace",
      "validateRemoveWorktree",
      "validateWorktreePathName",
      "worktreePathExists",
    ]);
  });

  it("does not expose internal or intentionally removed helpers", () => {
    expect(api).not.toHaveProperty("execGit");
    expect(api).not.toHaveProperty("findGitDir");
    expect(api).not.toHaveProperty("slugifyBranchName");
    expect(api).not.toHaveProperty("assertValidationResult");
    expect(api).not.toHaveProperty("validationIssue");
    expect(api).not.toHaveProperty("validationResult");
    expect(api).not.toHaveProperty("toWorktreesCoreError");
  });
});
