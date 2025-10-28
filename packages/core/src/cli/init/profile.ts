import type { CommandModule } from './types';
import { box, keyValue, formatTiming, TimingTracker } from '@kb-labs/shared-cli-ui';
import { initProfile } from '@kb-labs/core-profiles';

export const run: CommandModule['run'] = async (ctx, _argv, flags) => {
  const tracker = new TimingTracker();
  const jsonMode = !!flags.json;
  
  try {
    // Parse flags
    const profileKey = flags['profile-key'] || 'default';
    const scaffoldLocalProfile = !!flags['scaffold-local-profile'];
    
    tracker.checkpoint('init');
    
    // Call API
    const result = await initProfile({
      profileKey: profileKey as string,
      scaffoldLocalProfile,
      cwd: process.cwd()
    });
    
    const totalTime = tracker.total();
    
    // Output
    if (jsonMode) {
      ctx.presenter.json({ 
        ok: true, 
        profileKey,
        scaffoldLocalProfile,
        result,
        timing: totalTime 
      });
    } else {
      const summary = keyValue({
        'Profile Key': profileKey,
        'Scaffold Local': scaffoldLocalProfile ? 'Yes' : 'No',
        'Status': 'Success',
      });
      const output = box('Profile Initialized', [...summary, '', `Time: ${formatTiming(totalTime)}`]);
      ctx.presenter.write(output);
    }
    
    return 0;
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    if (jsonMode) {
      ctx.presenter.json({ ok: false, error: errorMessage, timing: tracker.total() });
    } else {
      ctx.presenter.error(errorMessage);
    }
    return 1;
  }
};

