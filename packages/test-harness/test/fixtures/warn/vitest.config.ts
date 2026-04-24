import { defineConfig } from "vitest/config";

import { moduleGraphReporterPlugin } from "vitest-module-graph-reporter";

export default defineConfig({
  plugins: [
    moduleGraphReporterPlugin({
      mode: "warn",
      maxModules: 1,
      render: {
        maxDepth: 4,
        maxChildren: 10,
      },
    }),
  ],
  test: {
    include: ["tests/**/*.test.ts"],
    watch: false,
  },
});
