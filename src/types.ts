import type { ValidationResult } from "./errors.js";
import type { GitOptions } from "./git.js";

export interface WorktreeEntry {
  path: string;
  head: string;
  branch?: string;
  bare: boolean;
  detached: boolean;
  locked: boolean;
  prunable: boolean;
}

export interface CreateWorktreeOptions extends GitOptions {
  path: string;
  branch: string;
  from?: string;
  createBranch?: boolean;
  force?: boolean;
}

export interface RemoveWorktreeOptions extends GitOptions {
  path: string;
  force?: boolean;
}

export interface BranchNamingOptions {
  prefix?: string;
  separator?: "/" | "-";
  sanitize?: boolean;
}

export interface PrepareWorkspaceOptions extends GitOptions {
  name: string;
  worktreeRoot?: string;
  branchPrefix?: string;
  branchSeparator?: "/" | "-";
  sanitizeBranch?: boolean;
  from?: string;
  directoryName?: string;
  /** @deprecated Use directoryName instead. */
  pathName?: string;
  createBranch?: boolean;
  force?: boolean;
}

export interface PlannedWorktree {
  path: string;
  branch: string;
  from?: string;
  createBranch: boolean;
  force: boolean;
}

export interface PlannedWorkspace {
  branch: string;
  directoryName: string;
  /** @deprecated Use directoryName instead. */
  pathName: string;
  path: string;
}

export interface PreparedWorkspace extends PlannedWorkspace {}

export interface WorktreePathValidationResult extends ValidationResult {
  pathName: string;
}

export interface BranchValidationResult extends ValidationResult {
  branch: string;
}

export interface BranchReferenceValidationResult extends ValidationResult {
  ref: string;
}

export interface CreateWorktreeValidationResult extends ValidationResult {
  path: string;
  branch: string;
  pathAvailable: boolean;
  branchAvailable: boolean;
  branchNameValid: boolean;
  branchResolvable: boolean;
  startPointResolvable: boolean;
}

export interface RemoveWorktreeValidationResult extends ValidationResult {
  path: string;
  exists: boolean;
  isMainWorktree: boolean;
  isCurrentWorktree: boolean;
}

export interface PrepareWorkspaceValidationResult extends ValidationResult {
  name: string;
  branch: string;
  directoryName: string;
  /** @deprecated Use directoryName instead. */
  pathName: string;
  path: string;
}

export interface BranchNamingPolicy extends GitOptions {
  prefix?: string;
  separator?: "/" | "-";
  sanitize?: boolean;
  requirePrefix?: boolean;
}

export interface BranchNamingPolicyValidationResult extends ValidationResult {
  name: string;
  branch: string;
}
