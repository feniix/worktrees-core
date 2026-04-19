import { execSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { assertValidationResult, toWorktreesCoreError } from "../src/errors.js";
import { execGit, findGitDir } from "../src/git.js";
import {
  assertBranchNamingPolicy,
  assertBranchReferenceExists,
  assertCreateWorktreeAllowed,
  assertPrepareWorkspaceAllowed,
  assertRemoveWorktreeAllowed,
  assertValidBranchName,
  assertWorktreePathName,
  branchExists,
  composeBranchName,
  createBranchNameStrategy,
  createWorktree,
  defaultWorktreeRoot,
  findCurrentWorktree,
  findRepoRoot,
  findWorktreeByBranch,
  findWorktreeByPath,
  getMainWorktree,
  isCurrentWorktree,
  isGitRepository,
  isMainWorktree,
  isValidBranchName,
  isValidWorktreePathName,
  listWorktrees,
  planCreateWorktree,
  planPrepareWorkspace,
  prepareWorkspace,
  pruneWorktrees,
  removeWorktree,
  resolveWorkspaceDirectoryName,
  resolveWorktreePath,
  validateBranchName,
  validateBranchNamingPolicy,
  validateBranchReference,
  validateCreateWorktree,
  validatePrepareWorkspace,
  validateRemoveWorktree,
  validateWorktreePathName,
  WorktreesCoreError,
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

  it("validates branch names and resolves default worktree paths", () => {
    expect(resolveWorkspaceDirectoryName({ name: "feature/auth-flow" })).toBe("feature-auth-flow");
    expect(resolveWorkspaceDirectoryName({ name: "ignored", directoryName: "team\\backend\\fix" })).toBe(
      "team/backend/fix",
    );
    expect(defaultWorktreeRoot(repoDir)).toBe(`${canonicalPath(repoDir)}.worktrees`);
    expect(isValidBranchName("feature/auth-flow", { cwd: repoDir })).toBe(true);
    expect(isValidBranchName("feature..auth", { cwd: repoDir })).toBe(false);
    expect(isValidWorktreePathName("feature-auth-flow")).toBe(true);
    expect(isValidWorktreePathName("team\\backend\\fix")).toBe(true);
    expect(isValidWorktreePathName("../escape")).toBe(false);
    expect(isValidWorktreePathName("a/./b")).toBe(false);
    expect(isValidWorktreePathName("a\\..\\b")).toBe(false);
    expect(isValidWorktreePathName("\\rooted")).toBe(false);
    expect(isValidWorktreePathName("C:\\temp\\workspace")).toBe(false);

    const invalidBranchResult = validateBranchName("feature..auth", { cwd: repoDir });
    expect(invalidBranchResult.valid).toBe(false);
    expect(invalidBranchResult.issues[0]?.code).toBe("INVALID_BRANCH_NAME");
    expect(() => assertValidBranchName("feature..auth", { cwd: repoDir })).toThrow(WorktreesCoreError);

    const validPathResult = validateWorktreePathName("team\\backend\\fix");
    expect(validPathResult.valid).toBe(true);
    expect(validPathResult.pathName).toBe("team/backend/fix");

    const invalidPathResult = validateWorktreePathName("../escape");
    expect(invalidPathResult.valid).toBe(false);
    expect(invalidPathResult.pathName).toBe("../escape");
    const firstInvalidPathIssue = invalidPathResult.issues[0];
    expect(firstInvalidPathIssue?.code).toBe("INVALID_WORKTREE_PATH_NAME");
    expect(firstInvalidPathIssue && toWorktreesCoreError(firstInvalidPathIssue)).toBeInstanceOf(WorktreesCoreError);

    const worktreeRoot = join(tmpdir(), "worktrees-core-paths");
    expect(resolveWorktreePath("team\\backend\\fix", worktreeRoot)).toBe(resolve(worktreeRoot, "team/backend/fix"));
    expect(() => resolveWorktreePath("../escape", worktreeRoot)).toThrow(WorktreesCoreError);
    expect(() => resolveWorkspaceDirectoryName({ name: "ignored", directoryName: "/tmp/workspace" })).toThrow(
      WorktreesCoreError,
    );
    expect(() => assertWorktreePathName("../escape")).toThrow(WorktreesCoreError);
    expect(() => assertValidationResult(invalidPathResult)).toThrow(WorktreesCoreError);
  });

  it("supports branch naming strategies and workspace planning helpers", () => {
    expect(composeBranchName("login-flow", { prefix: "feature" })).toBe("feature/login-flow");
    expect(composeBranchName("Login Flow", { prefix: "feature", sanitize: true })).toBe("feature/Login-Flow");
    expect(composeBranchName("login-flow", { prefix: "feature", separator: "-" })).toBe("feature-login-flow");

    const strategy = createBranchNameStrategy("feature", "/", true);
    expect(strategy("Login Flow")).toBe("feature/Login-Flow");

    expect(resolveWorkspaceDirectoryName({ name: "Login Flow" })).toBe("Login-Flow");
    expect(resolveWorkspaceDirectoryName({ name: "ignored", directoryName: "custom-dir" })).toBe("custom-dir");
    expect(resolveWorkspaceDirectoryName({ name: "ignored", directoryName: "team\\backend\\portal" })).toBe(
      "team/backend/portal",
    );

    const validPolicy = validateBranchNamingPolicy("login-flow", {
      cwd: repoDir,
      prefix: "feature",
      sanitize: true,
    });
    expect(validPolicy.valid).toBe(true);
    expect(validPolicy.branch).toBe("feature/login-flow");
    expect(() => assertBranchNamingPolicy("login-flow", { cwd: repoDir, prefix: "feature" })).not.toThrow();

    const invalidPolicy = validateBranchNamingPolicy("", {
      cwd: repoDir,
      requirePrefix: true,
    });
    expect(invalidPolicy.valid).toBe(false);
    expect(invalidPolicy.issues.map((issue) => issue.code)).toEqual([
      "INVALID_BRANCH_NAME",
      "INVALID_WORKSPACE_NAME",
      "INVALID_BRANCH_NAME",
    ]);
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
    expect(isMainWorktree(repoDir)).toBe(true);
    expect(isCurrentWorktree(repoDir)).toBe(true);
  });

  it("creates and removes a worktree", () => {
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

    removeWorktree({ cwd: repoDir, path: relativePath });
    expect(findWorktreeByPath(relativePath, repoDir)).toBeUndefined();
  });

  it("prepares a higher-level workspace from a name and branch prefix", () => {
    const plannedWorkspace = planPrepareWorkspace({
      cwd: repoDir,
      name: "login-flow",
      branchPrefix: "feature",
      from: "main",
      directoryName: "team\\backend\\login-flow",
    });
    expect(plannedWorkspace.branch).toBe("feature/login-flow");
    expect(plannedWorkspace.directoryName).toBe("team/backend/login-flow");

    const prepareValidation = validatePrepareWorkspace({
      cwd: repoDir,
      name: "login-flow",
      branchPrefix: "feature",
      from: "main",
      directoryName: "team\\backend\\login-flow",
    });
    expect(prepareValidation.valid).toBe(true);
    expect(prepareValidation.branch).toBe("feature/login-flow");
    expect(prepareValidation.directoryName).toBe("team/backend/login-flow");
    expect(() =>
      assertPrepareWorkspaceAllowed({
        cwd: repoDir,
        name: "login-flow",
        branchPrefix: "feature",
        from: "main",
        directoryName: "team\\backend\\login-flow",
      }),
    ).not.toThrow();

    const prepared = prepareWorkspace({
      cwd: repoDir,
      name: "login-flow",
      branchPrefix: "feature",
      from: "main",
      directoryName: "team\\backend\\login-flow",
    });

    expect(prepared.branch).toBe("feature/login-flow");
    expect(prepared.directoryName).toBe("team/backend/login-flow");
    expect(prepared.path).toBe(join(defaultWorktreeRoot(repoDir), "team", "backend", "login-flow"));

    const worktrees = listWorktrees(repoDir);
    expect(worktrees.some((entry) => entry.path === prepared.path && entry.branch === prepared.branch)).toBe(true);
  });

  it("rejects unsafe create and remove operations with typed errors", () => {
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

    execSync("git tag v1", { cwd: repoDir, stdio: "pipe" });

    const existingRefValidation = validateCreateWorktree({
      cwd: repoDir,
      path: join(defaultWorktreeRoot(repoDir), "from-tag"),
      branch: "v1",
      createBranch: false,
    });
    expect(existingRefValidation.valid).toBe(true);
    expect(existingRefValidation.branchNameValid).toBe(true);
    expect(existingRefValidation.branchResolvable).toBe(true);

    const existingBranchValidation = validateCreateWorktree({
      cwd: repoDir,
      path: join(defaultWorktreeRoot(repoDir), "missing-existing-branch"),
      branch: "missing-branch",
      createBranch: false,
    });
    expect(existingBranchValidation.valid).toBe(false);
    expect(existingBranchValidation.branchResolvable).toBe(false);
    expect(existingBranchValidation.issues.map((issue) => issue.code)).toEqual(["BRANCH_NOT_FOUND"]);

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

  it("validates existing branch refs", () => {
    const mainRef = validateBranchReference("main", { cwd: repoDir });
    expect(mainRef.valid).toBe(true);
    expect(mainRef.ref).toBe("main");

    const missingRef = validateBranchReference("missing-ref", { cwd: repoDir });
    expect(missingRef.valid).toBe(false);
    expect(missingRef.ref).toBe("missing-ref");
    expect(missingRef.issues[0]?.code).toBe("BRANCH_NOT_FOUND");
    expect(() => assertBranchReferenceExists("missing-ref", { cwd: repoDir })).toThrow(WorktreesCoreError);
  });

  it("returns typed validation issues for invalid workspace preparation", () => {
    const validation = validatePrepareWorkspace({
      cwd: repoDir,
      name: "   ",
      directoryName: "../escape",
      branchPrefix: "feature",
      from: "main",
    });

    expect(validation.valid).toBe(false);
    expect(validation.issues.map((issue) => issue.code)).toEqual([
      "INVALID_WORKSPACE_NAME",
      "INVALID_WORKTREE_PATH_NAME",
    ]);

    const invalidBranchWorkspaceValidation = validatePrepareWorkspace({
      cwd: repoDir,
      name: "bad branch",
      branchPrefix: "feature.",
      from: "main",
    });
    expect(invalidBranchWorkspaceValidation.valid).toBe(false);
    expect(invalidBranchWorkspaceValidation.issues.map((issue) => issue.code)).toContain("INVALID_BRANCH_NAME");

    const rootedPathWorkspaceValidation = validatePrepareWorkspace({
      cwd: repoDir,
      name: "login-flow",
      directoryName: "/tmp/escape",
      branchPrefix: "feature",
      from: "main",
    });
    expect(rootedPathWorkspaceValidation.valid).toBe(false);
    expect(rootedPathWorkspaceValidation.directoryName).toBe("/tmp/escape");
    expect(rootedPathWorkspaceValidation.path).toBe(resolve(defaultWorktreeRoot(repoDir), "/tmp/escape"));
    expect(rootedPathWorkspaceValidation.issues.map((issue) => issue.code)).toContain("INVALID_WORKTREE_PATH_NAME");
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
