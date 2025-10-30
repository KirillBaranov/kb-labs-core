import type { CommandModule } from '../types';
import { initWorkspaceConfig } from '@kb-labs/core-config';

export const run: CommandModule['run'] = async (ctx, _argv, flags) => {
  try {
    const result = await initWorkspaceConfig({
      format: (flags.format as 'yaml' | 'json') || 'yaml',
      force: !!flags.force,
      cwd: (flags.cwd as string) || process.cwd()
    });
    
    if (flags.json) {
      ctx.presenter.json(result);
    } else {
      ctx.presenter.write('Workspace configuration initialized successfully.\n');
    }
    
    return 0;
  } catch (e: unknown) {
    ctx.presenter.error(String(e));
    return 1;
  }
};

