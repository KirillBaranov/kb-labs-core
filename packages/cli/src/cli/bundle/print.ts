import type { CommandModule } from '../types';
import { loadBundle } from '@kb-labs/core-bundle';

export const run: CommandModule['run'] = async (ctx, _argv, flags) => {
  try {
    const bundle = await loadBundle({
      cwd: (flags.cwd as string) || process.cwd(),
      product: flags.product as any,
      profileKey: (flags['profile-key'] as string) || 'default',
    });
    
    if (flags.json) {
      ctx.presenter.json(bundle);
    } else {
      ctx.presenter.write(`Product: ${bundle.product}\n`);
      ctx.presenter.write(`Profile: ${bundle.profile.name}@${bundle.profile.version}\n`);
      ctx.presenter.write(`Config: ${JSON.stringify(bundle.config, null, 2)}\n`);
      
      if (flags['with-trace']) {
        ctx.presenter.write('\nTrace:\n');
        for (const step of bundle.trace) {
          ctx.presenter.write(`  ${step.layer}: ${step.source}\n`);
        }
      }
    }
    
    return 0;
  } catch (e: unknown) {
    ctx.presenter.error(String(e));
    return 1;
  }
};

