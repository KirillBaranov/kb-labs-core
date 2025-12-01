import type { CliContext } from '@kb-labs/cli-core';
export interface CommandModule {
  run: (
    ctx: CliContext,
    argv: string[],
    flags: Record<string, unknown>
  ) => Promise<number>;
}
export interface FlagDefinition {
  name: string;
  type: 'string' | 'boolean' | 'number' | 'array';
  alias?: string;
  default?: any;
  description?: string;
  choices?: string[];
  required?: boolean;
}
export interface CommandManifest {
  manifestVersion: '1.0';
  id: string;
  aliases?: string[];
  group: string;
  describe: string;
  longDescription?: string;
  requires?: string[];
  flags?: FlagDefinition[];
  examples?: string[];
  loader: () => Promise<{ run: any }>;
}
