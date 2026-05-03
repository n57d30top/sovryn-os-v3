import { pathToFileURL } from "node:url";
import { isAbsolute, join } from "node:path";
import { readJson } from "../shared/fs.js";
import { AppError } from "../shared/errors.js";
import type { SovrynPlugin } from "./types.js";

export function loadBuiltinPlugins(): SovrynPlugin[] {
  return [samplePlugin()];
}

export type PluginConfig = {
  plugins: Array<{
    name: string;
    module: string;
    export?: string;
  }>;
};

export async function loadPlugins(root: string): Promise<SovrynPlugin[]> {
  return [...loadBuiltinPlugins(), ...(await loadConfiguredPlugins(root))];
}

export async function loadConfiguredPlugins(
  root: string,
): Promise<SovrynPlugin[]> {
  let config: PluginConfig;
  try {
    config = await readJson<PluginConfig>(await pluginConfigPath(root));
  } catch {
    return [];
  }
  const plugins = [];
  for (const entry of config.plugins ?? []) {
    plugins.push(await loadPlugin(entry, root));
  }
  return plugins;
}

async function loadPlugin(
  entry: PluginConfig["plugins"][number],
  root: string,
): Promise<SovrynPlugin> {
  const modulePath = resolveModule(entry.module, root);
  const mod = await import(modulePath);
  const exported = entry.export
    ? mod[entry.export]
    : (mod.default ?? mod.plugin ?? mod.createPlugin);
  const plugin = typeof exported === "function" ? await exported() : exported;
  if (!plugin?.name || !plugin?.version) {
    throw new AppError(
      "PLUGIN_INVALID",
      `Plugin module did not return a Sovryn plugin: ${entry.name}`,
      {
        name: entry.name,
        module: entry.module,
        export: entry.export ?? null,
      },
    );
  }
  return plugin as SovrynPlugin;
}

function resolveModule(specifier: string, root: string): string {
  if (
    specifier.startsWith(".") ||
    specifier.startsWith("/") ||
    specifier.startsWith("..")
  ) {
    const absolute = isAbsolute(specifier) ? specifier : join(root, specifier);
    return pathToFileURL(absolute).href;
  }
  return specifier;
}

async function pluginConfigPath(root: string): Promise<string> {
  try {
    const config = await readJson<{ plugins?: { configFile?: string } }>(
      join(root, ".sovryn", "config.json"),
    );
    const configured = config.plugins?.configFile ?? ".sovryn/plugins.json";
    return isAbsolute(configured) ? configured : join(root, configured);
  } catch {
    return join(root, ".sovryn", "plugins.json");
  }
}

export function samplePlugin(): SovrynPlugin {
  return {
    name: "sample",
    version: "0.0.0",
    commands: [
      {
        name: "sample.echo",
        description: "Echoes plugin loader health.",
        async run(args) {
          return { args, loaded: true };
        },
      },
    ],
  };
}
