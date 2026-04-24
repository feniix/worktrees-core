---
title: Non-fatal compatibility warnings and public API docs
date: 2026-04-24
category: docs/solutions/developer-experience/
module: "@feniix/worktrees-core"
problem_type: developer_experience
component: development_workflow
severity: medium
applies_when:
  - "Adding compatibility warnings to library code"
  - "Changing public error types, option semantics, or root exports"
  - "Wrapping subprocess failures from caught unknown errors"
tags:
  - node-warnings
  - public-api
  - documentation
  - git-command-errors
  - validate-on-force
---

# Non-fatal compatibility warnings and public API docs

## Context

A code review of `@feniix/worktrees-core` PR #2 found three related developer-experience hazards after the package added safer worktree APIs:

- `force: true` compatibility behavior emitted a Node `DeprecationWarning`. Under `node --throw-deprecation` or `NODE_OPTIONS=--throw-deprecation`, that warning can become an exception and abort the very operation it was supposed to allow for 1.x compatibility.
- The new public `GitCommandError` error model and `validateOnForce` option were documented in `docs/api.md`, but not in `README.md`, even though this repo treats README-visible behavior and the curated root export surface as part of the semver-stable contract.
- `gitFailureDetails` cast a caught `unknown` directly to a child-process-like shape before reading `status`, `signal`, `stdout`, and `stderr`.

The fix landed in commit `c16d082` (`fix: address code review safety findings`) after the review artifacts identified the warning policy, documentation, and type-safety gaps. Session history search found no directly relevant prior sessions.

## Guidance

### Use non-fatal warning types for compatibility notices

Compatibility warnings should inform consumers without changing whether an operation succeeds. In Node, `DeprecationWarning` has special runtime handling and can be promoted to a thrown exception. For compatibility paths that should continue executing, prefer a regular warning with a stable `code`.

Before:

```ts
process.emitWarning(
  `${apiName}({ force: true }) currently preserves 1.x behavior by skipping preflight validation. ` +
    "This compatibility behavior is deprecated and will change in 2.0. " +
    "Pass validateOnForce: true to opt into the 2.0 safety behavior now.",
  {
    type: "DeprecationWarning",
    code: "WORKTREES_CORE_FORCE_SKIPS_VALIDATION",
  },
);
```

After:

```ts
process.emitWarning(
  `${apiName}({ force: true }) currently preserves 1.x behavior by skipping preflight validation. ` +
    "This compatibility behavior is deprecated and will change in 2.0. " +
    "Pass validateOnForce: true to opt into the 2.0 safety behavior now.",
  {
    type: "Warning",
    code: "WORKTREES_CORE_FORCE_SKIPS_VALIDATION",
  },
);
```

Keep the warning code stable so callers can filter, assert, or silence this specific warning without depending on message text.

### Update README when public behavior changes

When a change adds public exports, public option semantics, or public error behavior, update both detailed API docs and README-level conceptual docs. In this case, the README needed to surface that:

- `GitCommandError` reports unexpected Git subprocess failures with structured details.
- `force: true` preserves 1.x validation-skipping compatibility behavior.
- `validateOnForce: true` opts into the stricter 2.0 safety semantics while still forwarding Git `--force`.

This keeps the stable contract discoverable from the package entry documentation, not only from source code or generated declarations.

### Narrow caught unknown values before reading fields

JavaScript can throw any value. Error detail extraction should tolerate non-object throws and unexpected field types.

Before:

```ts
const childError = error as {
  status?: number;
  signal?: string;
  stdout?: Buffer | string;
  stderr?: Buffer | string;
};

return {
  ...(typeof childError.status === "number" ? { status: childError.status } : {}),
  ...(childError.signal ? { signal: childError.signal } : {}),
  ...(childError.stdout ? { stdout: childError.stdout.toString() } : {}),
  ...(childError.stderr ? { stderr: childError.stderr.toString() } : {}),
};
```

After:

```ts
const childError = error && typeof error === "object" ? (error as Record<string, unknown>) : {};
const stdout = childError.stdout;
const stderr = childError.stderr;

return {
  ...(typeof childError.status === "number" ? { status: childError.status } : {}),
  ...(typeof childError.signal === "string" ? { signal: childError.signal } : {}),
  ...(stdout instanceof Buffer || typeof stdout === "string" ? { stdout: stdout.toString() } : {}),
  ...(stderr instanceof Buffer || typeof stderr === "string" ? { stderr: stderr.toString() } : {}),
};
```

### Add regression coverage for warning contracts

If the warning `type` and `code` matter, test them directly. The review fix added a Vitest assertion that the force-validation compatibility warning is a regular `Warning` with the expected code.

```ts
const emitWarning = vi.spyOn(process, "emitWarning").mockImplementation(() => undefined);

try {
  emitForceSkipsValidationWarning("createWorktree");
  expect(emitWarning).toHaveBeenCalledWith(expect.stringContaining("validateOnForce: true"), {
    type: "Warning",
    code: "WORKTREES_CORE_FORCE_SKIPS_VALIDATION",
  });
} finally {
  emitWarning.mockRestore();
}
```

## Why This Matters

A compatibility path is supposed to preserve old behavior while giving users a migration signal. If that path emits `DeprecationWarning`, environments that enforce deprecations can turn a successful operation into a thrown error. That is especially surprising for operational APIs like worktree creation/removal, where `force: true` is often used for cleanup or recovery.

Public error and option semantics also need public documentation. Consumers should not have to read implementation code to learn which error class to catch, which details are available, or how `force` interacts with validation.

Finally, subprocess wrappers often sit on error boundaries. If the wrapper itself can fail while trying to build a structured error, it obscures the original failure and makes recovery harder for both humans and agents.

## When to Apply

- When emitting warnings from a library package.
- When adding a compatibility warning that should not affect control flow.
- When adding or changing public root exports, public options, public errors, or documented behavior.
- When wrapping failed `git`, shell, or subprocess calls.
- When reading properties from values caught as `unknown`.
- When review feedback identifies a behavior that is technically correct but surprising under stricter runtime policies.

## Examples

### Compatibility warning policy

Use `Warning` plus a stable `code` for migration guidance that should not abort execution:

```ts
process.emitWarning(message, {
  type: "Warning",
  code: "WORKTREES_CORE_FORCE_SKIPS_VALIDATION",
});
```

Reserve `DeprecationWarning` for cases where the API really is deprecated and it is acceptable for Node deprecation flags to change runtime behavior.

### README-level public API summary

A concise README entry is enough when detailed docs live elsewhere:

```md
- **Error types** expose stable `WorktreesCoreError` codes for validation failures and `GitCommandError` details for unexpected Git subprocess failures.
- **Force compatibility** keeps `force: true` validation-skipping behavior for 1.x, emits a process warning, and offers `validateOnForce: true` to opt into the stricter 2.0 safety behavior now.
```

### Structured Git failure extraction

The wrapper should return whatever reliable details exist without assuming the caught value shape:

```ts
const childError = error && typeof error === "object" ? (error as Record<string, unknown>) : {};
const stderr = childError.stderr;

return {
  gitBin,
  args,
  ...(typeof childError.status === "number" ? { status: childError.status } : {}),
  ...(stderr instanceof Buffer || typeof stderr === "string" ? { stderr: stderr.toString() } : {}),
};
```

## Related

- PR: https://github.com/feniix/worktrees-core/pull/2
- Commit: `c16d082 fix: address code review safety findings`
- Review artifact: `.context/compound-engineering/ce-code-review/20260424-183936-d48e86af/synthesis.json`
- Project policy: `AGENTS.md` requires README examples/API documentation updates for public API or behavior changes.
