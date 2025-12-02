import type { PluginDiscovery, CliCommand } from '../framework';
import { CliError, CLI_ERROR_CODES } from '../framework';

/** Use when you want to hardcode a plugin list in CLI. */
export function createStaticDiscovery(
  pkgs: string[],
  loader?: (name: string) => Promise<CliCommand[]>,
): PluginDiscovery {
  return {
    async find() {
      return pkgs.slice();
    },
    async load(name: string) {
      if (loader) {
        return loader(name);
      }
      // default: ESM dynamic import; expect plugin to export `commands: CliCommand[]`
      try {
        const mod = await import(name);
        const cmds: CliCommand[] = mod.commands || mod.default || [];
        return Array.isArray(cmds) ? cmds : [];
      } catch (e) {
        throw new CliError(
          CLI_ERROR_CODES.E_DISCOVERY_CONFIG,
          `Failed to load plugin ${name}`,
          e,
        );
      }
    },
  };
}
