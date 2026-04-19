# Using `@feniix/worktrees-core` in agents

This library is useful when an LLM or automation agent needs to work with git worktrees repeatedly and safely.

## Why use the library instead of raw shell commands?

Letting an LLM issue `git worktree` commands directly is flexible, but it pushes important behavior into prompts and command parsing:

- branch naming conventions
- workspace directory derivation
- repo and current worktree detection
- path validation and normalization
- duplicate branch or path handling
- safety checks before removal or creation
- stderr parsing and retry behavior

`@feniix/worktrees-core` moves those concerns into a tested, typed API.

## Side-by-side example

Assume an agent receives this task:

> Create a worktree for `login-flow` from `main` using the `feature/` branch prefix, but first tell me whether the operation is safe.

### Approach 1: raw commands from the LLM

```ts
import { execFileSync } from "node:child_process";
import path from "node:path";

const cwd = process.cwd();
const branch = "feature/login-flow";
const worktreeRoot = path.join(cwd, "..", "worktrees");
const worktreePath = path.join(worktreeRoot, "login-flow");

try {
  execFileSync("git", ["rev-parse", "--show-toplevel"], { cwd, stdio: "pipe" });
  execFileSync("git", ["show-ref", "--verify", "--quiet", `refs/heads/${branch}`], {
    cwd,
    stdio: "pipe",
  });

  throw new Error(`Branch already exists: ${branch}`);
} catch {
  // Was that "branch missing" or some other git error?
}

execFileSync("git", ["rev-parse", "--verify", "--quiet", "main"], {
  cwd,
  stdio: "pipe",
});

execFileSync("git", ["worktree", "add", "-b", branch, worktreePath, "main"], {
  cwd,
  stdio: "inherit",
});
```

### Problems with the raw-command approach

- the agent has to derive branch and path conventions itself
- it has to distinguish expected git failures from unexpected ones
- path validation and canonicalization are ad hoc
- the preflight check and the mutation path can drift apart
- safe removal and duplicate handling need separate command logic
- the result is mostly stdout/stderr parsing, not typed state

### Approach 2: plan, validate, and execute with `@feniix/worktrees-core`

```ts
import {
  planPrepareWorkspace,
  prepareWorkspace,
  validatePrepareWorkspace,
} from "@feniix/worktrees-core";

const cwd = process.cwd();

const planned = planPrepareWorkspace({
  cwd,
  name: "login-flow",
  branchPrefix: "feature",
  from: "main",
});

const validation = validatePrepareWorkspace({
  cwd,
  name: "login-flow",
  branchPrefix: "feature",
  from: "main",
});

console.log(planned.branch); // feature/login-flow
console.log(planned.directoryName); // login-flow
console.log(planned.path); // derived full path

if (!validation.valid) {
  console.error(validation.issues);
} else {
  const workspace = prepareWorkspace({
    cwd,
    name: "login-flow",
    branchPrefix: "feature",
    from: "main",
  });

  console.log(workspace.path);
}
```

## What the library buys you

### 1. Intent-level API

The agent can express what it wants:

- plan a workspace
- validate it
- prepare it
- remove it

instead of reconstructing `git` command syntax every time.

### 2. Typed validation before mutation

You can inspect structured issues before doing anything destructive.
That is easier for agents, UIs, and CLIs than parsing stderr.

### 3. Stable policy

Branch naming, workspace directory semantics, and validation rules live in code instead of prompt text.
That makes agent behavior more consistent over time.

### 4. Safety rails

The library rejects common unsafe operations before shelling out, including:

- invalid branch names
- invalid workspace path names
- duplicate branch-backed worktrees
- missing start points or missing refs
- removing the main worktree
- removing the current worktree without `force`

### 5. Cross-platform path handling

The library already handles path validation and normalization rules that are easy to get wrong in ad hoc agent code.

## When raw commands are still fine

Direct commands are reasonable when:

- you are prototyping quickly
- you only need a one-off workflow
- you do not care about reusable policy or structured validation

## When the library is a better fit

Use `@feniix/worktrees-core` when you want:

- repeatable agent behavior
- plan/validate/execute flows
- typed results and validation issues
- reusable branch and workspace policy
- tested worktree behavior rather than prompt-only behavior
