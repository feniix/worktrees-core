export {
  GitCommandError,
  type GitCommandErrorDetails,
  type ValidationIssue,
  type ValidationResult,
  WorktreesCoreError,
  type WorktreesCoreErrorCode,
} from "./errors.js";
export {
  branchExists,
  findRepoRoot,
  type GitOptions,
  isGitRepository,
  isValidBranchName,
  refExists,
} from "./git.js";
export {
  composeBranchName,
  createBranchNameStrategy,
  resolveWorkspaceDirectoryName,
} from "./naming.js";
export * from "./types.js";
export {
  assertBranchNamingPolicy,
  assertBranchReferenceExists,
  assertCreateWorktreeAllowed,
  assertPrepareWorkspaceAllowed,
  assertRemoveWorktreeAllowed,
  assertValidBranchName,
  assertWorktreePathName,
  isValidWorktreePathName,
  validateBranchName,
  validateBranchNamingPolicy,
  validateBranchReference,
  validateCreateWorktree,
  validatePrepareWorkspace,
  validateRemoveWorktree,
  validateWorktreePathName,
} from "./validation.js";
export { planPrepareWorkspace, prepareWorkspace } from "./workflows.js";
export {
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
  resolveWorktreePath,
  worktreePathExists,
} from "./worktrees.js";
