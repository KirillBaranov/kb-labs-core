import type { CommandModule } from '../types';
import { initPolicy } from '@kb-labs/core-policy';

export const run: CommandModule['run'] = async (ctx, _argv, flags) => {
  try {
    const result = await initPolicy({
      bundleName: (flags['bundle-name'] as string) || 'default',
      cwd: (flags.cwd as string) || process.cwd()
    });
    
    if (flags.json) {
      ctx.presenter.json(result);
    } else {
      ctx.presenter.write('Policy initialized successfully.\n');
    }
    
    return 0;
  } catch (e: unknown) {
    ctx.presenter.error(String(e));
    return 1;
  }
};

