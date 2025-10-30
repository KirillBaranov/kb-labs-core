import type { CommandModule } from '../types';
import { loadProfile, normalizeManifest, extractProfileInfo } from '@kb-labs/core-profiles';

export const run: CommandModule['run'] = async (ctx, _argv, flags) => {
  try {
    const profile = await loadProfile({ 
      cwd: (flags.cwd as string) || process.cwd(),
      name: (flags['profile-key'] as string) || 'default'
    });
    
    const manifest = normalizeManifest(profile.profile);
    const profileInfo = extractProfileInfo(manifest, profile.meta.pathAbs);
    
    if (flags.json) {
      ctx.presenter.json({
        name: profileInfo.name,
        version: profileInfo.version,
        manifestPath: profileInfo.manifestPath,
        exports: profileInfo.exports,
        extends: profileInfo.extends,
      });
    } else {
      ctx.presenter.write(`Name: ${profileInfo.name}\n`);
      ctx.presenter.write(`Version: ${profileInfo.version}\n`);
      ctx.presenter.write(`Path: ${profileInfo.manifestPath}\n`);
      if (profileInfo.extends) {
        ctx.presenter.write(`Extends: ${profileInfo.extends.join(', ')}\n`);
      }
    }
    
    return 0;
  } catch (e: unknown) {
    ctx.presenter.error(String(e));
    return 1;
  }
};

