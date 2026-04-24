/// <reference types="vitest/config" />

import type { Plugin } from "vite";
import type { Reporter } from "vitest/node";

import {
  normalizeModuleGraphPluginOptions,
  type ModuleGraphPluginMode,
  type ModuleGraphPluginOptions,
  type ModuleGraphRenderOptions,
} from "./options.js";
import { ModuleGraphReporter } from "./reporter.js";

type ReporterConfigEntry = Reporter | string | [string, Record<string, unknown>];

const BUILTIN_DEFAULT_REPORTER = "default";

const isReporter = (value: ReporterConfigEntry): value is Reporter => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const hasReporter = (reporters: ReporterConfigEntry[], targetReporter: Reporter) => {
  return reporters.some((reporterEntry) => {
    if (isReporter(reporterEntry)) {
      return reporterEntry === targetReporter;
    }

    return false;
  });
};

const normalizeConfiguredReporters = (reporters: unknown): ReporterConfigEntry[] => {
  if (!Array.isArray(reporters)) {
    return [BUILTIN_DEFAULT_REPORTER];
  }

  return [...reporters] as ReporterConfigEntry[];
};

export const moduleGraphReporterPlugin = (options: ModuleGraphPluginOptions = {}): Plugin => {
  const moduleGraphReporter = new ModuleGraphReporter(normalizeModuleGraphPluginOptions(options));

  return {
    name: "vitest:module-graph-reporter-plugin",
    configureVitest(context) {
      const reporters = normalizeConfiguredReporters(context.vitest.config.reporters);

      if (!hasReporter(reporters, moduleGraphReporter)) {
        reporters.unshift(moduleGraphReporter);
      }

      context.vitest.config.reporters = reporters as typeof context.vitest.config.reporters;
    },
  };
};

export type { ModuleGraphPluginMode, ModuleGraphPluginOptions, ModuleGraphRenderOptions };
