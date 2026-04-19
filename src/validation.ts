import { resolve } from "node:path";
import { assertValidationResult, validationIssue, validationResult } from "./errors.js";
import { branchExists, type GitOptions, isValidBranchName as gitIsValidBranchName, refExists } from "./git.js";
import { composeBranchName, resolveBranchName, resolveWorkspaceDirectoryName } from "./naming.js";
import type {
  BranchNamingPolicy,
  BranchNamingPolicyValidationResult,
  BranchReferenceValidationResult,
  BranchValidationResult,
  CreateWorktreeOptions,
  CreateWorktreeValidationResult,
  PrepareWorkspaceOptions,
  PrepareWorkspaceValidationResult,
  RemoveWorktreeOptions,
  RemoveWorktreeValidationResult,
  WorktreePathValidationResult,
} from "./types.js";
import {
  defaultWorktreeRoot,
  findCurrentWorktree,
  findWorktreeByPath,
  getMainWorktree,
  resolveWorktreePath,
  worktreePathExists,
} from "./worktrees.js";

function normalizeComparablePath(path: string): string {
  return resolve(path);
}

export function validateWorktreePathName(pathName: string): WorktreePathValidationResult {
  const trimmed = pathName.trim();
  const issues =
    trimmed.length > 0 && trimmed !== "." && trimmed !== ".." && !trimmed.includes("../") && !trimmed.includes("..\\")
      ? []
      : [
          validationIssue("INVALID_WORKTREE_PATH_NAME", `Invalid worktree path name: ${pathName}`, {
            pathName,
          }),
        ];

  return {
    ...validationResult(issues),
    pathName,
  };
}

export function assertWorktreePathName(pathName: string): void {
  assertValidationResult(validateWorktreePathName(pathName));
}

export function isValidWorktreePathName(pathName: string): boolean {
  return validateWorktreePathName(pathName).valid;
}

export function validateBranchName(branch: string, options: GitOptions = {}): BranchValidationResult {
  const valid = gitIsValidBranchName(branch, options);
  const issues = valid
    ? []
    : [
        validationIssue("INVALID_BRANCH_NAME", `Invalid branch name: ${branch}`, {
          branch,
        }),
      ];

  return {
    ...validationResult(issues),
    branch,
  };
}

export function assertValidBranchName(branch: string, options: GitOptions = {}): void {
  assertValidationResult(validateBranchName(branch, options));
}

export function validateBranchReference(ref: string, options: GitOptions = {}): BranchReferenceValidationResult {
  const exists = refExists(ref, options);
  const issues = exists
    ? []
    : [
        validationIssue("BRANCH_NOT_FOUND", `Branch or ref not found: ${ref}`, {
          ref,
        }),
      ];

  return {
    ...validationResult(issues),
    ref,
  };
}

export function assertBranchReferenceExists(ref: string, options: GitOptions = {}): void {
  assertValidationResult(validateBranchReference(ref, options));
}

export function validateCreateWorktree(createOptions: CreateWorktreeOptions): CreateWorktreeValidationResult {
  const { cwd = process.cwd(), gitBin, path, branch, from, createBranch = true } = createOptions;
  const pathAvailable = !worktreePathExists(path);
  const branchNameValidation = validateBranchName(branch, { cwd, gitBin });
  const branchNameValid = branchNameValidation.valid;
  const branchAvailable = createBranch ? !branchExists(branch, { cwd, gitBin }) : true;
  const branchResolvable = createBranch ? true : refExists(branch, { cwd, gitBin });
  const startPointResolvable = from ? refExists(from, { cwd, gitBin }) : true;
  const issues = [
    ...branchNameValidation.issues,
    ...(!pathAvailable
      ? [validationIssue("WORKTREE_PATH_EXISTS", `Worktree path already exists: ${path}`, { path })]
      : []),
    ...(!branchAvailable
      ? [validationIssue("BRANCH_ALREADY_EXISTS", `Branch already exists: ${branch}`, { branch })]
      : []),
    ...(!branchResolvable
      ? [validationIssue("BRANCH_NOT_FOUND", `Branch or ref not found: ${branch}`, { branch })]
      : []),
    ...(!startPointResolvable
      ? [validationIssue("START_POINT_NOT_FOUND", `Start point not found: ${from}`, { from })]
      : []),
  ];

  return {
    ...validationResult(issues),
    path,
    branch,
    pathAvailable,
    branchAvailable,
    branchNameValid,
    branchResolvable,
    startPointResolvable,
  };
}

export function assertCreateWorktreeAllowed(createOptions: CreateWorktreeOptions): void {
  assertValidationResult(validateCreateWorktree(createOptions));
}

export function validateRemoveWorktree(removeOptions: RemoveWorktreeOptions): RemoveWorktreeValidationResult {
  const { cwd = process.cwd(), gitBin, path, force = false } = removeOptions;
  const target = findWorktreeByPath(path, cwd, { cwd, gitBin });
  const exists = Boolean(target);
  const main = exists ? getMainWorktree(cwd, { cwd, gitBin }) : undefined;
  const current = exists ? findCurrentWorktree(cwd, { cwd, gitBin }) : undefined;
  const isMain = Boolean(target && main && normalizeComparablePath(target.path) === normalizeComparablePath(main.path));
  const isCurrent = Boolean(
    target && current && normalizeComparablePath(target.path) === normalizeComparablePath(current.path),
  );
  const issues = [
    ...(!exists ? [validationIssue("WORKTREE_NOT_FOUND", `Worktree not found: ${path}`, { path })] : []),
    ...(isMain
      ? [validationIssue("MAIN_WORKTREE_REMOVE_FORBIDDEN", `Cannot remove main worktree: ${path}`, { path })]
      : []),
    ...(isCurrent && !force
      ? [
          validationIssue(
            "CURRENT_WORKTREE_REMOVE_FORBIDDEN",
            `Cannot remove current worktree without force: ${path}`,
            { path },
          ),
        ]
      : []),
  ];

  return {
    ...validationResult(issues),
    path,
    exists,
    isMainWorktree: isMain,
    isCurrentWorktree: isCurrent,
  };
}

export function assertRemoveWorktreeAllowed(removeOptions: RemoveWorktreeOptions): void {
  assertValidationResult(validateRemoveWorktree(removeOptions));
}

export function validateBranchNamingPolicy(
  name: string,
  policy: BranchNamingPolicy = {},
): BranchNamingPolicyValidationResult {
  const branch = resolveBranchName(name, policy);
  const issues = [
    ...(policy.requirePrefix && !policy.prefix
      ? [validationIssue("INVALID_BRANCH_NAME", "Branch naming policy requires a prefix", { policy })]
      : []),
    ...(name.trim() ? [] : [validationIssue("INVALID_WORKSPACE_NAME", "Workspace name must not be empty", { name })]),
    ...validateBranchName(branch, policy).issues,
  ];

  return {
    ...validationResult(issues),
    name,
    branch,
  };
}

export function assertBranchNamingPolicy(name: string, policy: BranchNamingPolicy = {}): void {
  assertValidationResult(validateBranchNamingPolicy(name, policy));
}

export function validatePrepareWorkspace(options: PrepareWorkspaceOptions): PrepareWorkspaceValidationResult {
  const {
    cwd = process.cwd(),
    gitBin,
    name,
    worktreeRoot = defaultWorktreeRoot(cwd, { cwd, gitBin }),
    branchPrefix,
    from,
    createBranch = true,
    branchSeparator,
    sanitizeBranch = false,
  } = options;

  const directoryName = resolveWorkspaceDirectoryName(options);
  const branch = composeBranchName(name, {
    prefix: branchPrefix,
    separator: branchSeparator,
    sanitize: sanitizeBranch,
  });
  const pathNameValidation = validateWorktreePathName(directoryName);
  const path = pathNameValidation.valid
    ? resolveWorktreePath(directoryName, worktreeRoot)
    : resolve(worktreeRoot, directoryName);
  const hasWorkspaceName = Boolean(name.trim());
  const issues = [
    ...(hasWorkspaceName
      ? []
      : [validationIssue("INVALID_WORKSPACE_NAME", "Workspace name must not be empty", { name })]),
    ...pathNameValidation.issues,
    ...(hasWorkspaceName
      ? validateBranchNamingPolicy(name, {
          cwd,
          gitBin,
          prefix: branchPrefix,
          separator: branchSeparator,
          sanitize: sanitizeBranch,
        }).issues
      : []),
    ...(pathNameValidation.valid && hasWorkspaceName
      ? validateCreateWorktree({
          cwd,
          gitBin,
          path,
          branch,
          from,
          createBranch,
        }).issues
      : []),
  ];

  return {
    ...validationResult(issues),
    name,
    branch,
    directoryName,
    pathName: directoryName,
    path,
  };
}

export function assertPrepareWorkspaceAllowed(options: PrepareWorkspaceOptions): void {
  assertValidationResult(validatePrepareWorkspace(options));
}
