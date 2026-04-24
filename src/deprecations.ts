const emittedWarnings = new Set<string>();

export function emitForceSkipsValidationWarning(apiName: string): void {
  const code = "WORKTREES_CORE_FORCE_SKIPS_VALIDATION";
  if (emittedWarnings.has(code)) return;
  emittedWarnings.add(code);

  process.emitWarning(
    `${apiName}({ force: true }) currently preserves 1.x behavior by skipping preflight validation. ` +
      "This compatibility behavior is deprecated and will change in 2.0. " +
      "Pass validateOnForce: true to opt into the 2.0 safety behavior now.",
    {
      type: "Warning",
      code,
    },
  );
}
