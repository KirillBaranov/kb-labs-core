/**
 * CLI command types for @kb-labs/core
 */

export interface CommandModule {
  run: (ctx: any, argv: string[], flags: Record<string, any>) => Promise<number | void>;
}

