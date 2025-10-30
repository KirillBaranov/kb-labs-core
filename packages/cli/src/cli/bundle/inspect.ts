import type { CommandModule } from '../types';
import { loadBundle, type ProductId } from '@kb-labs/core-bundle';
import { box, safeSymbols, safeColors } from '@kb-labs/shared-cli-ui';

export const run: CommandModule['run'] = async (ctx, _argv, flags) => {
  const cwd = (flags.cwd as string) || process.cwd();
  const profileKey = (flags['profile-key'] as string) || 'default';
  const product = flags.product as ProductId;

  if (!product) {
    const msg = 'Missing --product';
    return flags.json ? (ctx.presenter.json({ ok: false, error: msg }), 1) : (ctx.presenter.error(msg), 1);
  }

  try {
    const bundle = await loadBundle({ cwd, product, profileKey });
    const trace = (flags.trace as boolean) ? bundle.trace : undefined;

    if (flags.json) {
      ctx.presenter.json({ ok: true, product, profile: bundle.profile, artifacts: bundle.artifacts.summary, trace });
      return 0;
    }

    const lines: string[] = [
      `${safeSymbols.info} ${safeColors.bold(`Bundle for ${product}`)} (profile: ${bundle.profile.name}@${bundle.profile.version})`,
      `artifacts keys: ${Object.keys(bundle.artifacts.summary).join(', ') || 'none'}`,
    ];
    ctx.presenter.write(box('Bundle Inspect', lines));
    return 0;
  } catch (err: any) {
    return flags.json ? (ctx.presenter.json({ ok: false, error: err?.message || String(err) }), 1)
                      : (ctx.presenter.error(err?.message || String(err)), 1);
  }
};


