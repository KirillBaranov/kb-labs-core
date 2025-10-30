import type { CommandModule } from '../types';
import { loadBundle } from '@kb-labs/core-bundle';
import YAML from 'yaml';
import { box, safeSymbols, safeColors } from '@kb-labs/shared-cli-ui';

export const run: CommandModule['run'] = async (ctx, _argv, flags) => {
  try {
    const bundle = await loadBundle({
      cwd: (flags.cwd as string) || process.cwd(),
      product: flags.product as any,
      profileKey: (flags['profile-key'] as string) || 'default',
    });
    
    if (flags.json) {
      ctx.presenter.json(bundle.config);
    } else {
      ctx.presenter.write(
        box('Product Config', [
          `${safeSymbols.success} ${safeColors.bold('Loaded config')} for ${flags.product}`,
        ])
      );
      const output = flags.yaml 
        ? YAML.stringify(bundle.config)
        : JSON.stringify(bundle.config, null, 2);
      ctx.presenter.write(output);
    }
    
    return 0;
  } catch (e: unknown) {
    ctx.presenter.error(String(e));
    return 1;
  }
};

