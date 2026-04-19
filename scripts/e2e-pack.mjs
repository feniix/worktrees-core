import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tempRoot = mkdtempSync(join(tmpdir(), "worktrees-core-e2e-"));
let tarballPath;

function logStep(message) {
  console.log(`[test:e2e] ${message}`);
}

function run(command, args, options = {}) {
  const { echoStdout = false, ...execOptions } = options;

  try {
    const output = execFileSync(command, args, {
      cwd: repoRoot,
      stdio: "pipe",
      encoding: "utf8",
      ...execOptions,
    });
    if (echoStdout && output.trim()) {
      process.stdout.write(output);
      if (!output.endsWith("\n")) {
        process.stdout.write("\n");
      }
    }
    return output;
  } catch (error) {
    console.error(`[test:e2e] Command failed: ${command} ${args.join(" ")}`);
    if (error && typeof error === "object") {
      const stdout = "stdout" in error && typeof error.stdout === "string" ? error.stdout : "";
      const stderr = "stderr" in error && typeof error.stderr === "string" ? error.stderr : "";
      if (stdout.trim()) {
        console.error("[test:e2e] stdout:\n" + stdout.trim());
      }
      if (stderr.trim()) {
        console.error("[test:e2e] stderr:\n" + stderr.trim());
      }
    }
    throw error;
  }
}

try {
  logStep("Packing tarball");
  const packJson = run("npm", ["pack", "--json"]);
  const packResult = JSON.parse(packJson);
  const [{ filename }] = packResult;
  tarballPath = resolve(repoRoot, filename);

  const consumerDir = join(tempRoot, "consumer");
  mkdirSync(consumerDir, { recursive: true });

  logStep("Creating temp consumer project");
  writeFileSync(
    join(consumerDir, "package.json"),
    JSON.stringify(
      {
        name: "worktrees-core-e2e-consumer",
        private: true,
        type: "module",
      },
      null,
      2,
    ) + "\n",
  );

  logStep("Installing packed tarball");
  run("npm", ["install", "--no-package-lock", tarballPath], { cwd: consumerDir });

  logStep("Running installed-package integration E2E workflow checks");
  writeFileSync(
    join(consumerDir, "e2e-check.mjs"),
    `import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, relative, resolve } from "node:path";
import {
  branchExists,
  createWorktree,
  listWorktrees,
  planPrepareWorkspace,
  prepareWorkspace,
  removeWorktree,
  validateCreateWorktree,
  validatePrepareWorkspace,
  WorktreesCoreError,
} from "@feniix/worktrees-core";

function expect(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function logStep(message) {
  console.log("[test:e2e] [consumer] " + message);
}

const sandbox = mkdtempSync(join(tmpdir(), "worktrees-core-published-e2e-"));
const repoDir = join(sandbox, "repo");
const worktreeRoot = join(sandbox, "worktrees");

try {
  logStep("Initializing temp git repository");
  mkdirSync(repoDir, { recursive: true });
  execFileSync("git", ["init", "-b", "main"], { cwd: repoDir, stdio: "pipe" });
  execFileSync("git", ["config", "user.email", "test@example.com"], { cwd: repoDir, stdio: "pipe" });
  execFileSync("git", ["config", "user.name", "Test User"], { cwd: repoDir, stdio: "pipe" });

  logStep("Creating initial commit");
  writeFileSync(join(repoDir, "README.md"), "hello\\n");
  execFileSync("git", ["add", "README.md"], { cwd: repoDir, stdio: "pipe" });
  execFileSync("git", ["commit", "-m", "chore: initial commit"], { cwd: repoDir, stdio: "pipe" });

  logStep("Tagging repository with v1");
  execFileSync("git", ["tag", "v1"], { cwd: repoDir, stdio: "pipe" });

  logStep("Running high-level workspace planning and validation flow");
  const workflowOptions = {
    cwd: repoDir,
    name: "login-flow",
    branchPrefix: "feature",
    from: "main",
    worktreeRoot,
    directoryName: "team\\\\backend\\\\login-flow",
  };

  const planned = planPrepareWorkspace(workflowOptions);
  const validation = validatePrepareWorkspace(workflowOptions);
  expect(validation.valid, "expected workflow validation to succeed");
  expect(validation.path === planned.path, "planning and validation path diverged");
  expect(validation.branch === planned.branch, "planning and validation branch diverged");
  expect(validation.directoryName === planned.directoryName, "planning and validation directory name diverged");

  logStep("Running high-level workspace creation flow");
  const prepared = prepareWorkspace(workflowOptions);
  expect(prepared.path === planned.path, "prepareWorkspace path did not match planned output");
  expect(prepared.branch === planned.branch, "prepareWorkspace branch did not match planned output");
  expect(branchExists(prepared.branch, { cwd: repoDir }), "expected workflow branch to exist after prepareWorkspace");
  expect(
    listWorktrees(repoDir).some(
      (entry) => realpathSync(entry.path) === realpathSync(prepared.path) && entry.branch === prepared.branch,
    ),
    "prepared worktree missing from git worktree list",
  );

  logStep("Verifying duplicate workspace validation failure");
  const duplicateWorkflowValidation = validatePrepareWorkspace(workflowOptions);
  expect(!duplicateWorkflowValidation.valid, "expected duplicate workflow validation to fail after creation");
  expect(
    duplicateWorkflowValidation.issues.some((issue) => issue.code === "WORKTREE_PATH_EXISTS"),
    "expected duplicate workflow validation to report WORKTREE_PATH_EXISTS",
  );
  expect(
    duplicateWorkflowValidation.issues.some((issue) => issue.code === "BRANCH_ALREADY_EXISTS"),
    "expected duplicate workflow validation to report BRANCH_ALREADY_EXISTS",
  );

  logStep("Verifying invalid workspace validation behavior");
  const invalidWorkflowValidation = validatePrepareWorkspace({
    cwd: repoDir,
    name: "   ",
    directoryName: "../escape",
    branchPrefix: "feature",
    from: "main",
    worktreeRoot,
  });
  expect(!invalidWorkflowValidation.valid, "expected invalid workflow validation to fail");
  expect(invalidWorkflowValidation.directoryName === "../escape", "invalid workflow should preserve raw directoryName");
  expect(
    invalidWorkflowValidation.path === resolve(worktreeRoot, invalidWorkflowValidation.directoryName),
    "invalid workflow path should remain consistent with invalid directoryName",
  );

  logStep("Removing prepared workspace worktree");
  removeWorktree({ cwd: repoDir, path: prepared.path });
  expect(
    !listWorktrees(repoDir).some((entry) => entry.path === prepared.path),
    "prepared worktree was not removed",
  );

  logStep("Running low-level relative path worktree flow");
  const relativePath = join("..", basename(repoDir) + "-relative", "feature-docs-refresh");
  const created = createWorktree({
    cwd: repoDir,
    path: relativePath,
    branch: "feature/docs-refresh",
    from: "main",
  });
  const expectedRelative = relative(realpathSync(repoDir), realpathSync(created.path));
  expect(expectedRelative === relativePath, "relative low-level path did not resolve against cwd as expected");
  expect(
    listWorktrees(repoDir).some(
      (entry) => realpathSync(entry.path) === realpathSync(created.path) && entry.branch === created.branch,
    ),
    "low-level created worktree missing from git worktree list",
  );
  removeWorktree({ cwd: repoDir, path: relativePath });
  expect(
    !listWorktrees(repoDir).some((entry) => entry.path === created.path),
    "relative-path worktree was not removed",
  );

  logStep("Running existing-ref attach flow");
  const tagPath = join(worktreeRoot, "from-tag");
  const tagValidation = validateCreateWorktree({
    cwd: repoDir,
    path: tagPath,
    branch: "v1",
    createBranch: false,
  });
  expect(tagValidation.valid, "expected tag-based create validation to succeed");
  const tagAttached = createWorktree({
    cwd: repoDir,
    path: tagPath,
    branch: "v1",
    createBranch: false,
  });
  expect(tagAttached.detached, "expected tag-attached worktree to be detached");
  removeWorktree({ cwd: repoDir, path: tagPath });

  logStep("Verifying missing ref validation failure");
  const missingRefValidation = validateCreateWorktree({
    cwd: repoDir,
    path: join(worktreeRoot, "missing-ref"),
    branch: "does-not-exist",
    createBranch: false,
  });
  expect(!missingRefValidation.valid, "expected missing ref validation to fail");
  expect(
    missingRefValidation.issues.some((issue) => issue.code === "BRANCH_NOT_FOUND"),
    "expected missing ref validation to report BRANCH_NOT_FOUND",
  );

  logStep("Verifying main worktree removal protection");
  try {
    removeWorktree({ cwd: repoDir, path: repoDir });
    throw new Error("expected removing main worktree to throw");
  } catch (error) {
    expect(error instanceof WorktreesCoreError, "expected main worktree removal to throw WorktreesCoreError");
    expect(error.code === "MAIN_WORKTREE_REMOVE_FORBIDDEN", "expected MAIN_WORKTREE_REMOVE_FORBIDDEN");
  }
} finally {
  rmSync(sandbox, { recursive: true, force: true });
}
`,
  );

  run("node", [join(consumerDir, "e2e-check.mjs")], { cwd: consumerDir, echoStdout: true });
  logStep("Installed-package integration E2E passed");
} finally {
  if (tarballPath) {
    unlinkSync(tarballPath);
  }
  rmSync(tempRoot, { recursive: true, force: true });
}
