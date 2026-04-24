export type ModuleGraphPluginMode = "warn" | "error";

export type ModuleGraphRenderOptions = {
  maxDepth?: number;
  maxChildren?: number;
};

export type ModuleGraphPluginOptions = {
  mode?: ModuleGraphPluginMode;
  maxModules?: number;
  render?: ModuleGraphRenderOptions;
};

export type NormalizedModuleGraphPluginOptions = {
  mode: ModuleGraphPluginMode;
  maxModules: number;
  render: Required<ModuleGraphRenderOptions>;
};

export const DEFAULT_MODULE_GRAPH_PLUGIN_OPTIONS: NormalizedModuleGraphPluginOptions = {
  mode: "error",
  maxModules: 200,
  render: {
    maxDepth: 3,
    maxChildren: 10,
  },
};

export const normalizeModuleGraphPluginOptions = (
  options: ModuleGraphPluginOptions = {},
): NormalizedModuleGraphPluginOptions => {
  return {
    mode: options.mode ?? DEFAULT_MODULE_GRAPH_PLUGIN_OPTIONS.mode,
    maxModules: options.maxModules ?? DEFAULT_MODULE_GRAPH_PLUGIN_OPTIONS.maxModules,
    render: {
      maxDepth: options.render?.maxDepth ?? DEFAULT_MODULE_GRAPH_PLUGIN_OPTIONS.render.maxDepth,
      maxChildren:
        options.render?.maxChildren ?? DEFAULT_MODULE_GRAPH_PLUGIN_OPTIONS.render.maxChildren,
    },
  };
};
