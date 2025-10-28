import type { CommandModule } from './types';
import { box, keyValue, formatTiming, TimingTracker } from '@kb-labs/shared-cli-ui';
import { initPolicy } from '@kb-labs/core-policy';

export const run: CommandModule['run'] = async (ctx, _argv, flags) => {
  const tracker = new TimingTracker();
  const jsonMode = !!flags.json;
  
  try {
    // Parse flags
    const bundleName = flags['bundle-name'] || 'default';
    
    tracker.checkpoint('init');
    
    // Call API
    const result = await initPolicy({
      bundleName: bundleName as string,
      cwd: process.cwd()
    });
    
    const totalTime = tracker.total();
    
    // Output
    if (jsonMode) {
      ctx.presenter.json({ 
        ok: true, 
        bundleName,
        result,
        timing: totalTime 
      });
    } else {
      const summary = keyValue({
        'Bundle Name': bundleName,
        'Policy File': result.policyFile,
        'Status': 'Success',
      });
      const output = box('Policy Initialized', [...summary, '', `Time: ${formatTiming(totalTime)}`]);
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

