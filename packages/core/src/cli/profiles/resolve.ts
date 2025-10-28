import type { CommandModule } from './types';
import { box, keyValue, formatTiming, TimingTracker } from '@kb-labs/shared-cli-ui';
import { resolveProfile } from '@kb-labs/core-profiles';

export const run: CommandModule['run'] = async (ctx, _argv, flags) => {
  const tracker = new TimingTracker();
  const jsonMode = !!flags.json;
  
  try {
    // Parse flags
    const profileName = flags.profile || 'default';
    
    tracker.checkpoint('resolve');
    
    // Call API
    const result = await resolveProfile({
      name: profileName as string,
      cwd: process.cwd()
    });
    
    const totalTime = tracker.total();
    
    // Output
    if (jsonMode) {
      ctx.presenter.json({ 
        ok: true, 
        profile: result,
        timing: totalTime 
      });
    } else {
      const summary = keyValue({
        'Name': result.name,
        'Kind': result.kind,
        'Scope': result.scope,
        'Products': Object.keys(result.products || {}).join(', ') || 'none',
        'Files': result.files?.length || 0,
      });
      const output = box('Profile Resolved', [...summary, '', `Time: ${formatTiming(totalTime)}`]);
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

