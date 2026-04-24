import path from "node:path";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";

import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const vitestBin = require.resolve("vitest/vitest.mjs");
const repositoryRoot = path.resolve(import.meta.dirname, "..");

const runFixture = (fixtureName: string) => {
  const fixtureRoot = path.join(repositoryRoot, "test", "fixtures", fixtureName);
  const result = spawnSync(process.execPath, [vitestBin, "run", "--config", "vitest.config.ts"], {
    cwd: fixtureRoot,
    encoding: "utf8",
  });

  return {
    ...result,
    output: `${result.stdout}\n${result.stderr}`,
  };
};

describe("moduleGraphReporterPlugin", () => {
  it("prints the graph and warns without failing in warn mode", () => {
    const result = runFixture("warn");

    expect(result.status).toBe(0);
    expect(result.output).toContain("✓ tests/large.warn.test.ts");
    expect(result.output).toContain("Warning: Module graph size threshold exceeded");
    expect(result.output).toContain("`- src/entry.ts");
  });

  it("fails the affected test module and surfaces a red test in error mode", () => {
    const result = runFixture("error");

    expect(result.status).not.toBe(0);
    expect(result.output).toContain("❯ tests/large.error.test.ts");
    expect(result.output).toContain("× error fixture > fails the module when the graph is too large");
    expect(result.output).toContain("Module graph size threshold exceeded");
    expect(result.output).toContain("Failed Tests 1");
    expect(result.output).toContain("Failed Suites 1");
    expect(result.output).toContain("tests/small.ok.test.ts");
  });
});
