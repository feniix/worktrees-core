import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertPrepareWorkspaceAllowed,
  defaultWorktreeRoot,
  listWorktrees,
  planPrepareWorkspace,
  prepareWorkspace,
  validatePrepareWorkspace,
} from "../src/index.js";
import { useTempGitRepo } from "./helpers.js";

describe("workspace workflows", () => {
  const { getRepoDir } = useTempGitRepo();

  it("plans and prepares a higher-level workspace from a name and branch prefix", () => {
    const repoDir = getRepoDir();

    const plannedWorkspace = planPrepareWorkspace({
      cwd: repoDir,
      name: "login-flow",
      branchPrefix: "feature",
      from: "main",
      directoryName: "team\\backend\\login-flow",
    });
    expect(plannedWorkspace.branch).toBe("feature/login-flow");
    expect(plannedWorkspace.directoryName).toBe("team/backend/login-flow");

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

  it("returns planning output consistent with successful validation", () => {
    const repoDir = getRepoDir();
    const options = {
      cwd: repoDir,
      name: "billing-portal",
      branchPrefix: "feature",
      branchSeparator: "-" as const,
      from: "main",
      directoryName: "team\\platform\\billing-portal",
    };

    const planned = planPrepareWorkspace(options);
    const validation = validatePrepareWorkspace(options);

    expect(validation.valid).toBe(true);
    expect(validation.branch).toBe(planned.branch);
    expect(validation.directoryName).toBe(planned.directoryName);
    expect(validation.path).toBe(planned.path);
  });

  it("supports custom worktree roots in planning and execution", () => {
    const repoDir = getRepoDir();
    const customRoot = join(repoDir, "custom-worktrees");

    const planned = planPrepareWorkspace({
      cwd: repoDir,
      name: "docs-refresh",
      branchPrefix: "feature",
      from: "main",
      worktreeRoot: customRoot,
    });
    expect(planned.path).toBe(join(customRoot, "docs-refresh"));

    const prepared = prepareWorkspace({
      cwd: repoDir,
      name: "docs-refresh",
      branchPrefix: "feature",
      from: "main",
      worktreeRoot: customRoot,
    });
    expect(prepared.path).toBe(join(customRoot, "docs-refresh"));
  });
});
