import type { CommandModule } from '../types';
import { readWorkspaceConfig } from '@kb-labs/core-config';
import { loadProfile, validateProfile as validateProfileApi } from '@kb-labs/core-profiles';
import { box, safeSymbols, safeColors } from '@kb-labs/shared-cli-ui';

export const run: CommandModule['run'] = async (ctx, _argv, flags) => {
  const cwd = (flags.cwd as string) || process.cwd();
  const profileKey = (flags['profile-key'] as string) || 'default';

  try {
    const ws = await readWorkspaceConfig(cwd);
    if (!ws?.data) {
      const msg = 'No workspace configuration found';
      if (flags.json) { ctx.presenter.json({ ok: false, error: msg }); return 1; }
      ctx.presenter.error(msg);
      return 1;
    }

    const profiles = (ws.data as any).profiles || {};
    const profileRef = profiles[profileKey];
    if (!profileRef) {
      const msg = `Profile key "${profileKey}" not found`;
      if (flags.json) { ctx.presenter.json({ ok: false, error: msg, available: Object.keys(profiles) }); return 1; }
      ctx.presenter.error(msg);
      return 1;
    }

    // Load profile manifest and validate
    const loaded = await loadProfile({ cwd, name: profileRef });
    const validation = validateProfileApi(loaded.profile as any);

    if (flags.json) {
      ctx.presenter.json({ ok: validation.ok, errors: validation.errors || null, profileKey, profileRef });
      return validation.ok ? 0 : 1;
    }

    if (validation.ok) {
      ctx.presenter.write(
        box('Profile Validation', [
          `${safeSymbols.success} ${safeColors.bold('Valid profile')} for key ${profileKey} (${profileRef})`
        ])
      );
      return 0;
    }

    const lines: string[] = [
      `${safeSymbols.error} ${safeColors.bold('Invalid profile')} for key ${profileKey} (${profileRef})`,
    ];
    if (Array.isArray(validation.errors)) {
      lines.push('', safeColors.bold('Errors:'));
      for (const e of validation.errors) {
        const path = (e as any).instancePath || '';
        const msg = (e as any).message || 'Validation error';
        lines.push(`  - ${path ? path + ': ' : ''}${msg}`);
      }
    }
    ctx.presenter.write(box('Profile Validation', lines));
    return 1;
  } catch (err: any) {
    if (flags.json) {
      ctx.presenter.json({ ok: false, error: err?.message || String(err) });
    } else {
      ctx.presenter.error(err?.message || String(err));
    }
    return 1;
  }
};


