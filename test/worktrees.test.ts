import { mkdirSync, rmSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertCreateWorktreeAllowed,
  assertRemoveWorktreeAllowed,
  branchExists,
  createWorktree,
  defaultWorktreeRoot,
  findCurrentWorktree,
  findWorktreeByBranch,
  findWorktreeByPath,
  getMainWorktree,
  isCurrentWorktree,
  isMainWorktree,
  listWorktrees,
  planCreateWorktree,
  pruneWorktrees,
  removeWorktree,
  validateCreateWorktree,
  validateRemoveWorktree,
  WorktreesCoreError,
  worktreePathExists,
} from "../src/index.js";
import { canonicalPath, useTempGitRepo } from "./helpers.js";

describe("worktree primitives", () => {
  const { getRepoDir } = useTempGitRepo();

  it("lists main worktree metadata", () => {
    const repoDir = getRepoDir();

    const worktrees = listWorktrees(repoDir);
    expect(worktrees).toHaveLength(1);
    expect(worktrees[0]?.path).toBe(canonicalPath(repoDir));
    expect(worktrees[0]?.branch).toBe("main");
    expect(worktrees[0]?.bare).toBe(false);
    expect(worktrees[0]?.detached).toBe(false);

    const main = getMainWorktree(repoDir);
    expect(main.path).toBe(canonicalPath(repoDir));
    expect(isMainWorktree(repoDir)).toBe(true);
    expect(isCurrentWorktree(repoDir)).toBe(true);
  });

  it("creates and removes a worktree", () => {
    const repoDir = getRepoDir();
    const path = join(defaultWorktreeRoot(repoDir), "feature-auth-flow");

    const validation = validateCreateWorktree({
      cwd: repoDir,
      path,
      branch: "feature/auth-flow",
      from: "main",
    });
    expect(validation.valid).toBe(true);
    expect(validation.pathAvailable).toBe(true);
    expect(validation.branchAvailable).toBe(true);
    expect(validation.branchNameValid).toBe(true);
    expect(validation.branchResolvable).toBe(true);
    expect(validation.startPointResolvable).toBe(true);
    expect(() =>
      assertCreateWorktreeAllowed({ cwd: repoDir, path, branch: "feature/auth-flow", from: "main" }),
    ).not.toThrow();

    const plannedCreate = planCreateWorktree({
      cwd: repoDir,
      path,
      branch: "feature/auth-flow",
      from: "main",
    });
    expect(plannedCreate.path).toBe(path);
    expect(plannedCreate.branch).toBe("feature/auth-flow");

    const created = createWorktree({
      cwd: repoDir,
      path,
      branch: "feature/auth-flow",
      from: "main",
    });
    expect(created.path).toBe(path);
    expect(created.branch).toBe("feature/auth-flow");
    expect(branchExists("feature/auth-flow", { cwd: repoDir })).toBe(true);
    expect(findWorktreeByPath(path, repoDir)?.path).toBe(path);
    expect(findWorktreeByBranch("feature/auth-flow", repoDir)?.path).toBe(path);

    const current = findCurrentWorktree(path);
    expect(current?.path).toBe(path);
    expect(isCurrentWorktree(path, path)).toBe(true);

    const nestedDir = join(path, "src", "features");
    mkdirSync(nestedDir, { recursive: true });
    expect(findCurrentWorktree(nestedDir)?.path).toBe(path);
    expect(isCurrentWorktree(path, nestedDir)).toBe(true);

    removeWorktree({ cwd: repoDir, path });
    expect(listWorktrees(repoDir)).toHaveLength(1);
  });

  it("resolves relative low-level worktree paths against cwd like git does", () => {
    const repoDir = getRepoDir();
    const relativePath = join("..", `${basename(repoDir)}-relative`, "feature-auth-flow");
    const expectedPath = resolve(repoDir, relativePath);

    const validation = validateCreateWorktree({
      cwd: repoDir,
      path: relativePath,
      branch: "feature/auth-flow",
      from: "main",
    });
    expect(validation.valid).toBe(true);
    expect(validation.pathAvailable).toBe(true);

    const created = createWorktree({
      cwd: repoDir,
      path: relativePath,
      branch: "feature/auth-flow",
      from: "main",
    });
    expect(canonicalPath(created.path)).toBe(canonicalPath(expectedPath));
    expect(canonicalPath(findWorktreeByPath(relativePath, repoDir)?.path ?? "")).toBe(canonicalPath(expectedPath));
    expect(canonicalPath(findCurrentWorktree(expectedPath)?.path ?? "")).toBe(canonicalPath(expectedPath));
    expect(isCurrentWorktree(expectedPath, expectedPath)).toBe(true);

    const removeValidation = validateRemoveWorktree({ cwd: repoDir, path: relativePath });
    expect(removeValidation.exists).toBe(true);

    expect(worktreePathExists(relativePath, repoDir)).toBe(true);

    removeWorktree({ cwd: repoDir, path: relativePath });
    expect(findWorktreeByPath(relativePath, repoDir)).toBeUndefined();
    expect(worktreePathExists(relativePath, repoDir)).toBe(false);
  });

  it("can attach a worktree to an existing ref without creating a branch", () => {
    const repoDir = getRepoDir();
    const path = join(defaultWorktreeRoot(repoDir), "from-head");

    const validation = validateCreateWorktree({
      cwd: repoDir,
      path,
      branch: "HEAD",
      createBranch: false,
    });
    expect(validation.valid).toBe(true);
    expect(validation.branchAvailable).toBe(true);
    expect(validation.branchResolvable).toBe(true);

    const created = createWorktree({
      cwd: repoDir,
      path,
      branch: "HEAD",
      createBranch: false,
    });
    expect(created.path).toBe(path);
    expect(created.detached).toBe(true);
    expect(created.branch).toBeUndefined();

    removeWorktree({ cwd: repoDir, path });
    expect(findWorktreeByPath(path, repoDir)).toBeUndefined();
  });

  it("rejects unsafe create and remove operations with typed errors", () => {
    const repoDir = getRepoDir();
    const path = join(defaultWorktreeRoot(repoDir), "feature-auth-flow");

    createWorktree({
      cwd: repoDir,
      path,
      branch: "feature/auth-flow",
      from: "main",
    });

    const postCreateValidation = validateCreateWorktree({
      cwd: repoDir,
      path,
      branch: "feature/auth-flow",
      from: "main",
    });
    expect(postCreateValidation.valid).toBe(false);
    expect(postCreateValidation.pathAvailable).toBe(false);
    expect(postCreateValidation.branchAvailable).toBe(false);
    expect(postCreateValidation.issues.map((issue) => issue.code)).toEqual([
      "WORKTREE_PATH_EXISTS",
      "BRANCH_ALREADY_EXISTS",
    ]);

    const invalidBranchValidation = validateCreateWorktree({
      cwd: repoDir,
      path: join(defaultWorktreeRoot(repoDir), "bad-branch"),
      branch: "feature..auth",
      from: "missing-start-point",
    });
    expect(invalidBranchValidation.valid).toBe(false);
    expect(invalidBranchValidation.branchNameValid).toBe(false);
    expect(invalidBranchValidation.startPointResolvable).toBe(false);
    expect(invalidBranchValidation.issues.map((issue) => issue.code)).toEqual([
      "INVALID_BRANCH_NAME",
      "START_POINT_NOT_FOUND",
    ]);

    try {
      createWorktree({
        cwd: repoDir,
        path: join(defaultWorktreeRoot(repoDir), "other"),
        branch: "feature/auth-flow",
        from: "main",
      });
      throw new Error("expected createWorktree to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(WorktreesCoreError);
      expect((error as WorktreesCoreError).code).toBe("BRANCH_ALREADY_EXISTS");
    }

    const mainRemoveValidation = validateRemoveWorktree({ cwd: repoDir, path: repoDir });
    expect(mainRemoveValidation.valid).toBe(false);
    expect(mainRemoveValidation.isMainWorktree).toBe(true);
    expect(mainRemoveValidation.issues[0]?.code).toBe("MAIN_WORKTREE_REMOVE_FORBIDDEN");

    try {
      assertRemoveWorktreeAllowed({ cwd: repoDir, path: repoDir });
      throw new Error("expected assertRemoveWorktreeAllowed to throw for main worktree");
    } catch (error) {
      expect(error).toBeInstanceOf(WorktreesCoreError);
      expect((error as WorktreesCoreError).code).toBe("MAIN_WORKTREE_REMOVE_FORBIDDEN");
    }

    try {
      removeWorktree({ cwd: repoDir, path: repoDir });
      throw new Error("expected removeWorktree to throw for main worktree");
    } catch (error) {
      expect(error).toBeInstanceOf(WorktreesCoreError);
      expect((error as WorktreesCoreError).code).toBe("MAIN_WORKTREE_REMOVE_FORBIDDEN");
    }

    try {
      removeWorktree({ cwd: path, path });
      throw new Error("expected removeWorktree to throw for current worktree");
    } catch (error) {
      expect(error).toBeInstanceOf(WorktreesCoreError);
      expect((error as WorktreesCoreError).code).toBe("CURRENT_WORKTREE_REMOVE_FORBIDDEN");
    }
  });

  it("reports missing worktrees consistently", () => {
    const repoDir = getRepoDir();
    const missingPath = join(defaultWorktreeRoot(repoDir), "missing-worktree");

    const validation = validateRemoveWorktree({ cwd: repoDir, path: missingPath });
    expect(validation.valid).toBe(false);
    expect(validation.exists).toBe(false);
    expect(validation.issues.map((issue) => issue.code)).toEqual(["WORKTREE_NOT_FOUND"]);
  });

  it("prunes stale worktree metadata after manual deletion", () => {
    const repoDir = getRepoDir();
    const preparedPath = join(defaultWorktreeRoot(repoDir), "cleanup-test");

    createWorktree({
      cwd: repoDir,
      path: preparedPath,
      branch: "feature/cleanup-test",
      from: "main",
    });

    expect(listWorktrees(repoDir).some((entry) => entry.path === preparedPath)).toBe(true);
    rmSync(preparedPath, { recursive: true, force: true });
    pruneWorktrees(repoDir);
    expect(listWorktrees(repoDir).some((entry) => entry.path === preparedPath)).toBe(false);
  });
});
