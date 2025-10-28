import type { CommandModule } from './types';
import { box, keyValue, formatTiming, TimingTracker } from '@kb-labs/shared-cli-ui';
import { resolvePolicy } from '@kb-labs/core-policy';

export const run: CommandModule['run'] = async (ctx, _argv, flags) => {
  const tracker = new TimingTracker();
  const jsonMode = !!flags.json;
  
  try {
    tracker.checkpoint('validate');
    
    // Call API
    const result = await resolvePolicy({
      cwd: process.cwd()
    });
    
    const totalTime = tracker.total();
    
    // Output
    if (jsonMode) {
      ctx.presenter.json({ 
        ok: true, 
        policy: result,
        timing: totalTime 
      });
    } else {
      const summary = keyValue({
        'Valid': result.valid ? 'Yes' : 'No',
        'Rules': result.rules?.length || 0,
        'Errors': result.errors?.length || 0,
        'Warnings': result.warnings?.length || 0,
      });
      const output = box('Policy Validation', [...summary, '', `Time: ${formatTiming(totalTime)}`]);
      ctx.presenter.write(output);
      
      if (result.errors && result.errors.length > 0) {
        ctx.presenter.write('');
        ctx.presenter.write('Errors:');
        result.errors.forEach(error => 
          ctx.presenter.write(`  • ${error}`)
        );
      }
      
      if (result.warnings && result.warnings.length > 0) {
        ctx.presenter.write('');
        ctx.presenter.write('Warnings:');
        result.warnings.forEach(warning => 
          ctx.presenter.write(`  • ${warning}`)
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

