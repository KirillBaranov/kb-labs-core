import type { CommandModule } from '../types';
import { loadBundle } from '@kb-labs/core-bundle';
import type { ProductId } from '@kb-labs/core-bundle';
import { box, safeSymbols, safeColors } from '@kb-labs/shared-cli-ui';

export const run: CommandModule['run'] = async (ctx, _argv, flags) => {
  const cwd = (flags.cwd as string) || process.cwd();
  const profileKey = (flags['profile-key'] as string) || 'default';
  const noFail = Boolean(flags['no-fail']);

  try {
    await loadBundle({
      cwd,
      product: flags.product as ProductId,
      profileKey,
      validate: noFail ? 'warn' : true,
    });

    if (flags.json) {
      ctx.presenter.json({ ok: true, product: flags.product });
    } else {
      ctx.presenter.write(
        box('Config Validation', [
          `${safeSymbols.success} ${safeColors.bold('Valid config')} for ${flags.product}`,
        ])
      );
    }
    return 0;
  } catch (err: any) {
    const details = err?.details || null;
    if (flags.json) {
      ctx.presenter.json({ ok: false, errors: details });
    } else {
      const lines: string[] = [
        `${safeSymbols.error} ${safeColors.bold('Invalid config')} for ${flags.product}`,
      ];
      if (Array.isArray(details)) {
        lines.push('', safeColors.bold('Errors:'));
        for (const e of details) {
          const instancePath = e.instancePath || e.instance || '';
          const msg = e.message || 'Validation error';
          lines.push(`  - ${instancePath ? instancePath + ': ' : ''}${msg}`);
        }
      }
      ctx.presenter.write(box('Config Validation', lines));
    }
    return noFail ? 0 : 1;
  }
};


