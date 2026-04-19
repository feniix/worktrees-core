import { execSync } from "node:child_process";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { assertValidationResult, toWorktreesCoreError } from "../src/errors.js";
import {
  assertBranchNamingPolicy,
  assertBranchReferenceExists,
  assertPrepareWorkspaceAllowed,
  assertValidBranchName,
  assertWorktreePathName,
  composeBranchName,
  createBranchNameStrategy,
  defaultWorktreeRoot,
  isValidBranchName,
  isValidWorktreePathName,
  resolveWorkspaceDirectoryName,
  resolveWorktreePath,
  validateBranchName,
  validateBranchNamingPolicy,
  validateBranchReference,
  validateCreateWorktree,
  validatePrepareWorkspace,
  validateWorktreePathName,
  WorktreesCoreError,
} from "../src/index.js";
import { useTempGitRepo } from "./helpers.js";

describe("naming and validation", () => {
  const { getRepoDir } = useTempGitRepo();

  it("validates branch names and worktree path names", () => {
    const repoDir = getRepoDir();

    expect(resolveWorkspaceDirectoryName({ name: "feature/auth-flow" })).toBe("feature-auth-flow");
    expect(resolveWorkspaceDirectoryName({ name: "ignored", directoryName: "team\\backend\\fix" })).toBe(
      "team/backend/fix",
    );
    expect(defaultWorktreeRoot(repoDir)).toContain(".worktrees");
    expect(isValidBranchName("feature/auth-flow", { cwd: repoDir })).toBe(true);
    expect(isValidBranchName("feature..auth", { cwd: repoDir })).toBe(false);
    expect(isValidWorktreePathName("feature-auth-flow")).toBe(true);
    expect(isValidWorktreePathName("team\\backend\\fix")).toBe(true);
    expect(isValidWorktreePathName("../escape")).toBe(false);
    expect(isValidWorktreePathName("a/./b")).toBe(false);
    expect(isValidWorktreePathName("a\\..\\b")).toBe(false);
    expect(isValidWorktreePathName("\\rooted")).toBe(false);
    expect(isValidWorktreePathName("C:\\temp\\workspace")).toBe(false);
    expect(isValidWorktreePathName("//server/share/workspace")).toBe(false);

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

    const dotSegmentResult = validateWorktreePathName("team/./backend");
    expect(dotSegmentResult.valid).toBe(false);
    expect(dotSegmentResult.pathName).toBe("team/./backend");

    const worktreeRoot = join(repoDir, ".tmp-worktrees");
    expect(resolveWorktreePath("team\\backend\\fix", worktreeRoot)).toBe(resolve(worktreeRoot, "team/backend/fix"));
    expect(() => resolveWorktreePath("../escape", worktreeRoot)).toThrow(WorktreesCoreError);
    expect(() => resolveWorkspaceDirectoryName({ name: "ignored", directoryName: "/tmp/workspace" })).toThrow(
      WorktreesCoreError,
    );
    expect(() => assertWorktreePathName("../escape")).toThrow(WorktreesCoreError);
    expect(() => assertValidationResult(invalidPathResult)).toThrow(WorktreesCoreError);
  });

  it("supports branch naming strategies and workspace planning validation", () => {
    const repoDir = getRepoDir();

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

    const requiredPrefixPolicy = validateBranchNamingPolicy("login-flow", {
      cwd: repoDir,
      prefix: "feature",
      requirePrefix: true,
    });
    expect(requiredPrefixPolicy.valid).toBe(true);
    expect(requiredPrefixPolicy.branch).toBe("feature/login-flow");

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

    const sanitizedPrepareValidation = validatePrepareWorkspace({
      cwd: repoDir,
      name: "Billing Portal",
      branchPrefix: "feature",
      sanitizeBranch: true,
      from: "main",
    });
    expect(sanitizedPrepareValidation.valid).toBe(true);
    expect(sanitizedPrepareValidation.branch).toBe("feature/Billing-Portal");
    expect(sanitizedPrepareValidation.directoryName).toBe("Billing-Portal");

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
  });

  it("validates existing refs and workspace preparation edge cases", () => {
    const repoDir = getRepoDir();

    const mainRef = validateBranchReference("main", { cwd: repoDir });
    expect(mainRef.valid).toBe(true);
    expect(mainRef.ref).toBe("main");

    const missingRef = validateBranchReference("missing-ref", { cwd: repoDir });
    expect(missingRef.valid).toBe(false);
    expect(missingRef.ref).toBe("missing-ref");
    expect(missingRef.issues[0]?.code).toBe("BRANCH_NOT_FOUND");
    expect(() => assertBranchReferenceExists("missing-ref", { cwd: repoDir })).toThrow(WorktreesCoreError);

    execSync("git tag v1", { cwd: repoDir, stdio: "pipe" });

    const shaRef = execSync("git rev-parse HEAD", { cwd: repoDir, stdio: "pipe", encoding: "utf8" }).trim();

    const existingRefValidation = validateCreateWorktree({
      cwd: repoDir,
      path: join(defaultWorktreeRoot(repoDir), "from-tag"),
      branch: "v1",
      createBranch: false,
    });
    expect(existingRefValidation.valid).toBe(true);
    expect(existingRefValidation.branchNameValid).toBe(true);
    expect(existingRefValidation.branchResolvable).toBe(true);

    const shaRefValidation = validateCreateWorktree({
      cwd: repoDir,
      path: join(defaultWorktreeRoot(repoDir), "from-sha"),
      branch: shaRef,
      createBranch: false,
    });
    expect(shaRefValidation.valid).toBe(true);
    expect(shaRefValidation.branchNameValid).toBe(true);
    expect(shaRefValidation.branchResolvable).toBe(true);

    const missingExistingRefValidation = validateCreateWorktree({
      cwd: repoDir,
      path: join(defaultWorktreeRoot(repoDir), "missing-existing-ref"),
      branch: "missing-ref",
      createBranch: false,
    });
    expect(missingExistingRefValidation.valid).toBe(false);
    expect(missingExistingRefValidation.branchResolvable).toBe(false);
    expect(missingExistingRefValidation.issues.map((issue) => issue.code)).toEqual(["BRANCH_NOT_FOUND"]);

    const invalidWorkspaceValidation = validatePrepareWorkspace({
      cwd: repoDir,
      name: "   ",
      directoryName: "../escape",
      branchPrefix: "feature",
      from: "main",
    });
    expect(invalidWorkspaceValidation.valid).toBe(false);
    expect(invalidWorkspaceValidation.issues.map((issue) => issue.code)).toEqual([
      "INVALID_WORKSPACE_NAME",
      "INVALID_WORKTREE_PATH_NAME",
    ]);
    expect(invalidWorkspaceValidation.directoryName).toBe("../escape");
    expect(invalidWorkspaceValidation.path).toBe(resolve(defaultWorktreeRoot(repoDir), "../escape"));

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

    const unsanitizedWorkspaceValidation = validatePrepareWorkspace({
      cwd: repoDir,
      name: "bad branch",
      branchPrefix: "feature",
      sanitizeBranch: false,
      from: "main",
    });
    expect(unsanitizedWorkspaceValidation.valid).toBe(false);
    expect(unsanitizedWorkspaceValidation.issues.map((issue) => issue.code)).toContain("INVALID_BRANCH_NAME");
  });
});
