import type { CommandModule } from '../types';
import { readWorkspaceConfig } from '@kb-labs/core-config';
import { loadProfile, extractProfileInfo } from '@kb-labs/core-profiles';
import { box, safeSymbols, safeColors } from '@kb-labs/shared-cli-ui';

export const run: CommandModule['run'] = async (ctx, _argv, flags) => {
  const cwd = (flags.cwd as string) || process.cwd();
  const profileKey = (flags['profile-key'] as string) || 'default';

  try {
    const ws = await readWorkspaceConfig(cwd);
    const profiles = (ws?.data as any)?.profiles || {};
    const profileRef = profiles[profileKey];
    if (!profileRef) {
      const msg = `Profile key "${profileKey}" not found`;
      return flags.json ? (ctx.presenter.json({ ok: false, error: msg, available: Object.keys(profiles) }), 1)
                        : (ctx.presenter.error(msg), 1);
    }

    const loaded = await loadProfile({ cwd, name: profileRef });
    const info = extractProfileInfo(loaded.profile as any, loaded.meta.pathAbs);

    if (flags.json) {
      ctx.presenter.json({ ok: true, profileKey, profileRef, info });
      return 0;
    }

    const lines: string[] = [
      `${safeSymbols.info} ${safeColors.bold(`${info.name}@${info.version}`)} (${profileKey})`,
      `schema: v1.0`,
      `path: ${loaded.meta.pathAbs}`,
      `overlays: ${info.overlays?.length ? info.overlays.join(', ') : 'none'}`,
      `products: ${Object.keys(info.exports).join(', ') || 'none'}`,
    ];

    ctx.presenter.write(box('Profile Inspect', lines));
    return 0;
  } catch (err: any) {
    return flags.json ? (ctx.presenter.json({ ok: false, error: err?.message || String(err) }), 1)
                      : (ctx.presenter.error(err?.message || String(err)), 1);
  }
};


