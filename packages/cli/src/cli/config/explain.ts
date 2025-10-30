import type { CommandModule } from '../types';
import { explainBundle } from '@kb-labs/core-bundle';

export const run: CommandModule['run'] = async (ctx, _argv, flags) => {
  try {
    const trace = await explainBundle({
      cwd: (flags.cwd as string) || process.cwd(),
      product: flags.product as any,
      profileKey: (flags['profile-key'] as string) || 'default',
    });
    
    if (flags.json) {
      ctx.presenter.json({ trace });
    } else {
      ctx.presenter.write('Configuration layers:\n');
      for (const step of trace) {
        ctx.presenter.write(`  ${step.layer}: ${step.source}`);
      }
    }
    
    return 0;
  } catch (e: unknown) {
    ctx.presenter.error(String(e));
    return 1;
  }
};

