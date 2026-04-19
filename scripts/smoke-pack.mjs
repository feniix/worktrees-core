import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tempRoot = mkdtempSync(join(tmpdir(), "worktrees-core-smoke-"));
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
        name: "worktrees-core-smoke-consumer",
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
    join(consumerDir, "runtime-check.mjs"),
    `import {
  composeBranchName,
  resolveWorkspaceDirectoryName,
  validateWorktreePathName,
} from "@feniix/worktrees-core";

const branch = composeBranchName("billing-portal", { prefix: "feature" });
if (branch !== "feature/billing-portal") {
  throw new Error(\`Unexpected branch output: \${branch}\`);
}

const directoryName = resolveWorkspaceDirectoryName({
  name: "ignored",
  directoryName: "team\\\\platform\\\\billing-portal",
});
if (directoryName !== "team/platform/billing-portal") {
  throw new Error(\`Unexpected directory name: \${directoryName}\`);
}

const validation = validateWorktreePathName("team\\\\platform\\\\billing-portal");
if (!validation.valid || validation.pathName !== "team/platform/billing-portal") {
  throw new Error("Validation output did not match expected canonical form");
}
`,
  );

  execFileSync("node", [join(consumerDir, "runtime-check.mjs")], {
    cwd: consumerDir,
    stdio: "pipe",
    encoding: "utf8",
  });

  writeFileSync(
    join(consumerDir, "tsconfig.json"),
    JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          module: "Node16",
          moduleResolution: "Node16",
          strict: true,
          noEmit: true,
        },
        include: ["consumer-check.ts"],
      },
      null,
      2,
    ) + "\n",
  );

  writeFileSync(
    join(consumerDir, "consumer-check.ts"),
    `import {
  type PrepareWorkspaceOptions,
  type ValidationResult,
  composeBranchName,
  validateWorktreePathName,
} from "@feniix/worktrees-core";

const options: PrepareWorkspaceOptions = {
  name: "billing-portal",
  branchPrefix: "feature",
};

const branch: string = composeBranchName(options.name, { prefix: options.branchPrefix });
const result: ValidationResult = validateWorktreePathName("team/platform/billing-portal");

if (!branch || !result.valid) {
  throw new Error("unexpected typecheck smoke failure");
}
`,
  );

  const tscBin = resolve(repoRoot, "node_modules", "typescript", "bin", "tsc");
  execFileSync("node", [tscBin, "-p", join(consumerDir, "tsconfig.json")], {
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
