import type { CommandModule } from '../types';
import { loadBundle, type ProductId } from '@kb-labs/core-bundle';
import { validateProductConfig } from '@kb-labs/core-config';
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
    const cfg = bundle.config;
    const val = validateProductConfig(product, cfg);

    if (flags.json) {
      ctx.presenter.json({ ok: true, product, profileKey, topKeys: Object.keys(cfg || {}), validation: val });
      return 0;
    }

    const lines: string[] = [
      `${safeSymbols.info} ${safeColors.bold(`Product: ${product}`)} (profile: ${profileKey})`,
      `topKeys: ${Object.keys(cfg || {}).join(', ') || 'none'}`,
      `validation: ${val.ok ? 'ok' : `errors=${val.errors?.length ?? 0}`}`,
    ];
    ctx.presenter.write(box('Config Inspect', lines));
    return 0;
  } catch (err: any) {
    return flags.json ? (ctx.presenter.json({ ok: false, error: err?.message || String(err) }), 1)
                      : (ctx.presenter.error(err?.message || String(err)), 1);
  }
};


