# vitest-module-graph-reporter

Standalone Vitest plugin that prints each test module's Vite module graph and can warn or fail when the graph grows past a configured threshold.

## Installation

```bash
npm install -D vitest-module-graph-reporter
```

## Usage

```ts
import { defineConfig } from "vitest/config";
import { moduleGraphReporterPlugin } from "vitest-module-graph-reporter";

export default defineConfig({
  plugins: [
    moduleGraphReporterPlugin({
      mode: "error",
      maxModules: 200,
      render: {
        maxDepth: 3,
        maxChildren: 10,
      },
    }),
  ],
});
```

## Options

```ts
type ModuleGraphPluginOptions = {
  mode?: "warn" | "error";
  maxModules?: number;
  render?: {
    maxDepth?: number;
    maxChildren?: number;
  };
};
```

- `mode`: choose whether an oversized graph only logs a warning or fails the test module.
- `maxModules`: maximum traversed module count before the threshold is exceeded.
- `render.maxDepth`: maximum depth rendered in the printed tree.
- `render.maxChildren`: maximum number of children rendered per node.

## Notes

- The implementation relies on Vitest internals for module diagnostics and for mutating the underlying task result when a module must fail. Those integration points may require updates across future Vitest major versions.

## Development

This repository is an npm workspace with two packages:

- `packages/plugin`: the publishable `vitest-module-graph-reporter` package
- `packages/test-harness`: private integration tests and fixture projects

Common commands still run from the repository root:

```bash
npm run build
npm run check
npm test
```
