import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tempRoot = mkdtempSync(join(tmpdir(), "worktrees-core-e2e-"));
let tarballPath;

try {
  const packJson = execFileSync("npm", ["pack", "--json"], {
    cwd: repoRoot,
    stdio: "pipe",
    encoding: "utf8",
  });
  const packResult = JSON.parse(packJson);
  const [{ filename }] = packResult;
  tarballPath = resolve(repoRoot, filename);

  const consumerDir = join(tempRoot, "consumer");
  mkdirSync(consumerDir, { recursive: true });

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

  execFileSync("npm", ["install", "--no-package-lock", tarballPath], {
    cwd: consumerDir,
    stdio: "pipe",
    encoding: "utf8",
  });

  writeFileSync(
    join(consumerDir, "e2e-check.mjs"),
    `import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, relative } from "node:path";
import {
  branchExists,
  createWorktree,
  listWorktrees,
  planPrepareWorkspace,
  prepareWorkspace,
  removeWorktree,
  validatePrepareWorkspace,
} from "@feniix/worktrees-core";

const sandbox = mkdtempSync(join(tmpdir(), "worktrees-core-published-e2e-"));
const repoDir = join(sandbox, "repo");
const worktreeRoot = join(sandbox, "worktrees");

try {
  mkdirSync(repoDir, { recursive: true });
  execFileSync("git", ["init", "-b", "main"], { cwd: repoDir, stdio: "pipe" });
  execFileSync("git", ["config", "user.email", "test@example.com"], { cwd: repoDir, stdio: "pipe" });
  execFileSync("git", ["config", "user.name", "Test User"], { cwd: repoDir, stdio: "pipe" });

  writeFileSync(join(repoDir, "README.md"), "hello\\n");
  execFileSync("git", ["add", "README.md"], { cwd: repoDir, stdio: "pipe" });
  execFileSync("git", ["commit", "-m", "chore: initial commit"], { cwd: repoDir, stdio: "pipe" });

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
  if (!validation.valid) {
    throw new Error("expected workflow validation to succeed");
  }
  if (validation.path !== planned.path || validation.branch !== planned.branch) {
    throw new Error("planning and validation output diverged");
  }

  const prepared = prepareWorkspace(workflowOptions);
  if (prepared.path !== planned.path || prepared.branch !== planned.branch) {
    throw new Error("prepareWorkspace did not match planned output");
  }
  if (!branchExists(prepared.branch, { cwd: repoDir })) {
    throw new Error("expected workflow branch to exist after prepareWorkspace");
  }
  if (!listWorktrees(repoDir).some((entry) => realpathSync(entry.path) === realpathSync(prepared.path) && entry.branch === prepared.branch)) {
    throw new Error("prepared worktree missing from git worktree list");
  }

  removeWorktree({ cwd: repoDir, path: prepared.path });
  if (listWorktrees(repoDir).some((entry) => entry.path === prepared.path)) {
    throw new Error("prepared worktree was not removed");
  }

  const relativePath = join("..", basename(repoDir) + "-relative", "feature-docs-refresh");
  const created = createWorktree({
    cwd: repoDir,
    path: relativePath,
    branch: "feature/docs-refresh",
    from: "main",
  });
  const expectedRelative = relative(realpathSync(repoDir), realpathSync(created.path));
  if (expectedRelative !== relativePath) {
    throw new Error("relative low-level path did not resolve against cwd as expected");
  }
  if (!listWorktrees(repoDir).some((entry) => realpathSync(entry.path) === realpathSync(created.path) && entry.branch === created.branch)) {
    throw new Error("low-level created worktree missing from git worktree list");
  }

  removeWorktree({ cwd: repoDir, path: relativePath });
  if (listWorktrees(repoDir).some((entry) => entry.path === created.path)) {
    throw new Error("relative-path worktree was not removed");
  }
} finally {
  rmSync(sandbox, { recursive: true, force: true });
}
`,
  );

  execFileSync("node", [join(consumerDir, "e2e-check.mjs")], {
    cwd: consumerDir,
    stdio: "pipe",
    encoding: "utf8",
  });
} finally {
  if (tarballPath) {
    unlinkSync(tarballPath);
  }
  rmSync(tempRoot, { recursive: true, force: true });
}
