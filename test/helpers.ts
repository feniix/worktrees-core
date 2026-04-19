import { execSync } from "node:child_process";
import { existsSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach } from "vitest";

export function canonicalPath(path: string): string {
  return realpathSync(path);
}

export function useTempGitRepo(): { getRepoDir: () => string } {
  let repoDir = "";

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

  return {
    getRepoDir: () => repoDir,
  };
}
