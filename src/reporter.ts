import path from "node:path";

import type { ModuleNode } from "vite";
import type { Reporter, TestModule, Vitest } from "vitest/node";

import type { NormalizedModuleGraphPluginOptions } from "./options";

type ImportDuration = {
  selfTime: number;
  totalTime: number;
};

type ImportDurationMap = Record<string, ImportDuration>;

type InternalTaskError = Error & {
  type?: string;
};

type InternalTaskResult = {
  state?: string;
  errors?: InternalTaskError[];
};

type TestModuleWithTask = TestModule & {
  task: {
    result?: InternalTaskResult;
  };
};

type MutableModuleGraph = {
  getModuleById: (id: string) => ModuleNode | undefined;
  idToModuleMap?: Map<string, ModuleNode>;
  fileToModulesMap?: Map<string, Set<ModuleNode>>;
};

const normalizePath = (value: string) => {
  let normalizedValue = value.replace(/\\/g, "/");

  if (normalizedValue.startsWith("file://")) {
    try {
      normalizedValue = new URL(normalizedValue).pathname;
    } catch {
      return normalizedValue;
    }
  }

  normalizedValue = normalizedValue.replace(/^\/@fs\//, "/");

  return normalizedValue.split("?")[0]!.split("#")[0]!;
};

const formatDuration = (duration: number) => {
  return `${duration.toFixed(2)}ms`;
};

const getModuleNodeKey = (moduleNode: ModuleNode) => {
  const key = moduleNode.id ?? moduleNode.file ?? moduleNode.url;

  return key ? normalizePath(key) : null;
};

const getModuleNodeLabel = (moduleNode: ModuleNode, root: string) => {
  const filePath = moduleNode.file ?? moduleNode.id ?? moduleNode.url;
  const normalizedRoot = normalizePath(root);
  const normalizedFilePath = normalizePath(filePath);

  if (normalizedFilePath.startsWith(`${normalizedRoot}/`)) {
    return path.posix.relative(normalizedRoot, normalizedFilePath);
  }

  return normalizedFilePath;
};

const getImportDurationCandidates = (moduleNode: ModuleNode) => {
  const candidates = [moduleNode.id, moduleNode.file, moduleNode.url].filter(
    (candidate): candidate is string => Boolean(candidate),
  );

  return [...new Set(candidates.map(normalizePath))];
};

const getImportDuration = (importDurations: ImportDurationMap, moduleNode: ModuleNode) => {
  for (const candidate of getImportDurationCandidates(moduleNode)) {
    const duration = importDurations[candidate] ?? importDurations[candidate.replace(/^\//, "file:///")];

    if (duration) {
      return duration;
    }
  }

  return null;
};

const getTreeConnector = (prefix: string, isLast: boolean) => {
  return prefix ? `${prefix}${isLast ? "`- " : "|- "}` : "";
};

const buildModuleGraphLines = (
  moduleNode: ModuleNode,
  importDurations: ImportDurationMap,
  root: string,
  options: NormalizedModuleGraphPluginOptions,
  visited: Set<string>,
  depth = 0,
  prefix = "",
  isLast = true,
): string[] => {
  const visitKey = getModuleNodeKey(moduleNode);

  if (!visitKey) {
    return [];
  }

  if (visited.has(visitKey)) {
    return [`${prefix}${isLast ? "`- " : "|- "}${getModuleNodeLabel(moduleNode, root)} (cycle)`];
  }

  visited.add(visitKey);

  const connector = getTreeConnector(prefix, isLast);
  const importDuration = getImportDuration(importDurations, moduleNode);
  const totalDuration = importDuration?.totalTime ?? 0;
  const lines = [`${connector}${getModuleNodeLabel(moduleNode, root)} (${formatDuration(totalDuration)})`];
  const childNodes = [...moduleNode.importedModules]
    .filter((childModuleNode) => getModuleNodeKey(childModuleNode))
    .sort((left, right) => {
      return getModuleNodeLabel(left, root).localeCompare(getModuleNodeLabel(right, root));
    });

  if (depth >= options.render.maxDepth && childNodes.length > 0) {
    lines.push(`${getTreeConnector(`${prefix}${isLast ? "   " : "|  "}`, true)}... max depth reached`);

    return lines;
  }

  const visibleChildNodes = childNodes.slice(0, options.render.maxChildren);
  const omittedChildCount = childNodes.length - visibleChildNodes.length;
  const childPrefix = `${prefix}${isLast ? "   " : "|  "}`;

  visibleChildNodes.forEach((childModuleNode, index) => {
    const isLastVisibleChild = index === visibleChildNodes.length - 1 && omittedChildCount === 0;

    lines.push(
      ...buildModuleGraphLines(
        childModuleNode,
        importDurations,
        root,
        options,
        visited,
        depth + 1,
        childPrefix,
        isLastVisibleChild,
      ),
    );
  });

  if (omittedChildCount > 0) {
    lines.push(
      `${getTreeConnector(childPrefix, true)}... ${omittedChildCount} more children omitted`,
    );
  }

  return lines;
};

const getModuleGraphSize = (rootModuleNode: ModuleNode) => {
  const visited = new Set<string>();
  const stack = [rootModuleNode];

  while (stack.length > 0) {
    const moduleNode = stack.pop();

    if (!moduleNode) {
      continue;
    }

    const visitKey = getModuleNodeKey(moduleNode);

    if (!visitKey || visited.has(visitKey)) {
      continue;
    }

    visited.add(visitKey);

    for (const importedModuleNode of moduleNode.importedModules) {
      if (!getModuleNodeKey(importedModuleNode)) {
        continue;
      }

      stack.push(importedModuleNode);
    }
  }

  return visited.size;
};

const matchesModuleIdentifier = (candidate: string, target: string) => {
  const normalizedCandidate = normalizePath(candidate);
  const normalizedTarget = normalizePath(target);

  return (
    normalizedCandidate === normalizedTarget ||
    normalizedCandidate.startsWith(`${normalizedTarget}?`) ||
    normalizedCandidate.includes(normalizedTarget)
  );
};

const resolveModuleFromGraph = (moduleGraph: MutableModuleGraph, moduleId: string) => {
  const exactMatch = moduleGraph.getModuleById(moduleId);

  if (exactMatch) {
    return exactMatch;
  }

  for (const [candidateId, moduleNode] of moduleGraph.idToModuleMap ?? []) {
    if (matchesModuleIdentifier(candidateId, moduleId)) {
      return moduleNode;
    }
  }

  const fileModules = moduleGraph.fileToModulesMap?.get(moduleId);

  if (fileModules && fileModules.size > 0) {
    return fileModules.values().next().value ?? null;
  }

  return null;
};

const resolveRootModuleNode = (vitest: Vitest, moduleId: string) => {
  const viteServers = [
    vitest.vite,
    ...vitest.projects.map((project) => project.vite),
  ].filter((server): server is Vitest["vite"] => Boolean(server));

  for (const viteServer of viteServers) {
    const rootModuleNode = resolveModuleFromGraph(viteServer.moduleGraph as MutableModuleGraph, moduleId);

    if (rootModuleNode) {
      return rootModuleNode;
    }
  }

  return null;
};

const createThresholdExceededError = (
  rootLabel: string,
  moduleGraphSize: number,
  maxModules: number,
  lines: string[],
): InternalTaskError => {
  const error = new Error(
    `Module graph size threshold exceeded for ${rootLabel}: ${moduleGraphSize} modules (max ${maxModules})`,
  ) as InternalTaskError;

  error.type = "Module Graph Size Threshold Exceeded";
  error.message = `${error.message}\n\nModule graph:\n${lines.join("\n")}`;

  return error;
};

export class ModuleGraphReporter implements Reporter {
  constructor(private readonly options: NormalizedModuleGraphPluginOptions) {}

  private vitest: Vitest | null = null;

  private log(message: string) {
    this.vitest?.logger.log(message);
  }

  private warn(message: string) {
    this.vitest?.logger.warn(message);
  }

  private failModule(testModule: TestModule, error: InternalTaskError) {
    const moduleTask = (testModule as TestModuleWithTask).task;

    moduleTask.result ??= {};
    moduleTask.result.state = "fail";
    moduleTask.result.errors = [...(moduleTask.result.errors ?? []), error];
  }

  onInit(vitest: Vitest) {
    this.vitest = vitest;
  }

  onTestModuleEnd(testModule: TestModule) {
    if (!this.vitest) {
      return;
    }

    const rootModuleNode = resolveRootModuleNode(this.vitest, testModule.moduleId);

    if (!rootModuleNode) {
      this.log(`Module graph for ${testModule.moduleId} could not be resolved.`);

      return;
    }

    const rootLabel = getModuleNodeLabel(rootModuleNode, this.vitest.config.root);
    const moduleGraphSize = getModuleGraphSize(rootModuleNode);
    const diagnostic = testModule.diagnostic();
    const importDurations = (diagnostic.importDurations ?? {}) as ImportDurationMap;
    const lines = buildModuleGraphLines(
      rootModuleNode,
      importDurations,
      this.vitest.config.root,
      this.options,
      new Set<string>(),
    );


    if (moduleGraphSize <= this.options.maxModules) {
      return;
    }

    const error = createThresholdExceededError(rootLabel, moduleGraphSize, this.options.maxModules, lines);

    if (this.options.mode === "warn") {
      this.warn(error.message);

      return;
    }

    this.failModule(testModule, error);
  }
}
