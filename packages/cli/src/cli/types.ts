import type { CliContext } from '@kb-labs/shared-cli-ui';

export interface CommandModule {
  run: (
    ctx: CliContext,
    argv: string[],
    flags: Record<string, unknown>
  ) => Promise<number>;
}

