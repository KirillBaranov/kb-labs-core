import type { CommandModule } from './types';
import { box, keyValue, formatTiming, TimingTracker } from '@kb-labs/shared-cli-ui';
import { initWorkspace } from '@kb-labs/core-config';

export const run: CommandModule['run'] = async (ctx, _argv, flags) => {
  const tracker = new TimingTracker();
  const jsonMode = !!flags.json;
  
  try {
    // Parse flags
    const format = flags.format || 'yaml';
    const force = !!flags.force;
    
    tracker.checkpoint('init');
    
    // Call API
    const result = await initWorkspace({
      format: format as 'yaml' | 'json',
      force,
      cwd: process.cwd()
    });
    
    const totalTime = tracker.total();
    
    // Output
    if (jsonMode) {
      ctx.presenter.json({ 
        ok: true, 
        format,
        force,
        result,
        timing: totalTime 
      });
    } else {
      const summary = keyValue({
        'Format': format,
        'Force': force ? 'Yes' : 'No',
        'Config File': result.configFile,
        'Status': 'Success',
      });
      const output = box('Workspace Initialized', [...summary, '', `Time: ${formatTiming(totalTime)}`]);
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

