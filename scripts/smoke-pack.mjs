import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tempRoot = mkdtempSync(join(tmpdir(), "worktrees-core-smoke-"));
let tarballPath;

function logStep(message) {
  console.log(`[smoke:pack] ${message}`);
}

function run(command, args, options = {}) {
  try {
    return execFileSync(command, args, {
      cwd: repoRoot,
      stdio: "pipe",
      encoding: "utf8",
      ...options,
    });
  } catch (error) {
    console.error(`[smoke:pack] Command failed: ${command} ${args.join(" ")}`);
    if (error && typeof error === "object") {
      const stdout = "stdout" in error && typeof error.stdout === "string" ? error.stdout : "";
      const stderr = "stderr" in error && typeof error.stderr === "string" ? error.stderr : "";
      if (stdout.trim()) {
        console.error("[smoke:pack] stdout:\n" + stdout.trim());
      }
      if (stderr.trim()) {
        console.error("[smoke:pack] stderr:\n" + stderr.trim());
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
        name: "worktrees-core-smoke-consumer",
        private: true,
        type: "module",
      },
      null,
      2,
    ) + "\n",
  );

  logStep("Installing packed tarball");
  run("npm", ["install", "--no-package-lock", tarballPath], { cwd: consumerDir });

  logStep("Running runtime import check");
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
  run("node", [join(consumerDir, "runtime-check.mjs")], { cwd: consumerDir });

  logStep("Running TypeScript consumer check");
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
  run("node", [tscBin, "-p", join(consumerDir, "tsconfig.json")], { cwd: consumerDir });

  logStep("Smoke test passed");
} finally {
  if (tarballPath) {
    unlinkSync(tarballPath);
  }
  rmSync(tempRoot, { recursive: true, force: true });
}
