export type WorktreesCoreErrorCode =
  | "GIT_COMMAND_FAILED"
  | "INVALID_WORKTREE_PATH_NAME"
  | "INVALID_WORKSPACE_NAME"
  | "INVALID_BRANCH_NAME"
  | "BRANCH_ALREADY_EXISTS"
  | "BRANCH_NOT_FOUND"
  | "START_POINT_NOT_FOUND"
  | "WORKTREE_PATH_EXISTS"
  | "WORKTREE_NOT_FOUND"
  | "MAIN_WORKTREE_REMOVE_FORBIDDEN"
  | "CURRENT_WORKTREE_REMOVE_FORBIDDEN";

export class WorktreesCoreError extends Error {
  readonly code: WorktreesCoreErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(code: WorktreesCoreErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "WorktreesCoreError";
    this.code = code;
    this.details = details;
  }
}

export interface GitCommandErrorDetails extends Record<string, unknown> {
  gitBin: string;
  args: string[];
  cwd?: string;
  status?: number;
  signal?: string;
  stdout?: string;
  stderr?: string;
}

export class GitCommandError extends WorktreesCoreError {
  readonly details: GitCommandErrorDetails;
  readonly cause?: unknown;

  constructor(details: GitCommandErrorDetails, cause?: unknown) {
    super("GIT_COMMAND_FAILED", "Git command failed", details);
    this.name = "GitCommandError";
    this.details = details;
    this.cause = cause;
  }
}

export interface ValidationIssue {
  code: WorktreesCoreErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

export function validationIssue(
  code: WorktreesCoreErrorCode,
  message: string,
  details?: Record<string, unknown>,
): ValidationIssue {
  return { code, message, details };
}

export function validationResult(issues: ValidationIssue[] = []): ValidationResult {
  return {
    valid: issues.length === 0,
    issues,
  };
}

export function toWorktreesCoreError(issue: ValidationIssue): WorktreesCoreError {
  return new WorktreesCoreError(issue.code, issue.message, issue.details);
}

export function assertValidationResult(result: ValidationResult): void {
  const [issue] = result.issues;
  if (issue) {
    throw toWorktreesCoreError(issue);
  }
}
