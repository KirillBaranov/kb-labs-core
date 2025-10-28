import type { CommandModule } from './types';
import { box, keyValue, formatTiming, TimingTracker } from '@kb-labs/shared-cli-ui';
import { validateProfile } from '@kb-labs/core-profiles';

export const run: CommandModule['run'] = async (ctx, _argv, flags) => {
  const tracker = new TimingTracker();
  const jsonMode = !!flags.json;
  
  try {
    // Parse flags
    const profileName = flags.name || 'default';
    const strict = flags.strict !== false; // default true
    
    tracker.checkpoint('validate');
    
    // Call API
    const result = await validateProfile({
      name: profileName as string,
      strict,
      cwd: process.cwd()
    });
    
    const totalTime = tracker.total();
    
    // Output
    if (jsonMode) {
      ctx.presenter.json({ 
        ok: result.valid, 
        profile: profileName,
        strict,
        result,
        timing: totalTime 
      });
    } else {
      const summary = keyValue({
        'Profile': profileName,
        'Strict Mode': strict ? 'Yes' : 'No',
        'Valid': result.valid ? 'Yes' : 'No',
        'Errors': result.errors?.length || 0,
      });
      const output = box('Profile Validation', [...summary, '', `Time: ${formatTiming(totalTime)}`]);
      ctx.presenter.write(output);
      
      if (result.errors && result.errors.length > 0) {
        ctx.presenter.write('');
        ctx.presenter.write('Errors:');
        result.errors.forEach(error => 
          ctx.presenter.write(`  • ${error}`)
        );
      }
    }
    
    return result.valid ? 0 : 1;
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

