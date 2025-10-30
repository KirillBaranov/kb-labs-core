import type { CommandModule } from '../types';
import { explainBundle } from '@kb-labs/core-bundle';
import { box, safeColors } from '@kb-labs/shared-cli-ui';

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
      const lines = [
        ...trace.map(step => `${step.layer}: ${step.source}`)
      ];
      ctx.presenter.write(box('Config Explain', lines.map(l => `  ${l}`)));
    }
    
    return 0;
  } catch (e: unknown) {
    ctx.presenter.error(String(e));
    return 1;
  }
};

