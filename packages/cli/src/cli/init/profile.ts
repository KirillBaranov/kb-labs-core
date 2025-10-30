import type { CommandModule } from '../types';
import { initProfile } from '@kb-labs/core-profiles';

export const run: CommandModule['run'] = async (ctx, _argv, flags) => {
  try {
    const result = await initProfile({
      profileKey: (flags['profile-key'] as string) || 'default',
      profileRef: flags['profile-ref'] as string | undefined,
      scaffoldLocalProfile: !!flags['scaffold-local-profile'],
      cwd: (flags.cwd as string) || process.cwd()
    });
    
    if (flags.json) {
      ctx.presenter.json(result);
    } else {
      ctx.presenter.write('Profile initialized successfully.\n');
    }
    
    return 0;
  } catch (e: unknown) {
    ctx.presenter.error(String(e));
    return 1;
  }
};

