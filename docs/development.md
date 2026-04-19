# Development and release guide

## Development

Run these commands from the repository root:

```bash
npm install
npm run check
npm run test
npm run build
```

## Common commands

- `npm run typecheck` — run TypeScript type checking
- `npm run lint` — run Biome checks
- `npm run test` — run the Vitest test suite
- `npm run test:coverage` — run tests with coverage
- `npm run build` — emit compiled package artifacts to `dist/`
- `npm run lint:pkg` — run `publint` against package metadata and exports
- `npm run lint:types:advisory` — run `attw` as an advisory ESM-only compatibility signal
- `npm run release:check` — run the full release gate

## Release checklist

Before publishing:

```bash
npm install
npm run check
npm run test
npm run build
npm pack --dry-run
npm run lint:pkg
```

`npm publish` also runs `prepublishOnly`, which currently executes `npm run release:check`.

## Packaging notes

- The package is published from compiled output in `dist/`.
- The package is intentionally ESM-only.
- `attw` warnings about CommonJS dynamic import usage are advisory in the context of this package's support policy.
- Packaging or export changes should be validated with `npm pack --dry-run` and `publint` before release.
