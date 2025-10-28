import type { CommandModule } from './types';
import { box, keyValue, formatTiming, TimingTracker } from '@kb-labs/shared-cli-ui';
import { resolvePolicy } from '@kb-labs/core-policy';

export const run: CommandModule['run'] = async (ctx, _argv, flags) => {
  const tracker = new TimingTracker();
  const jsonMode = !!flags.json;
  
  try {
    // Parse flags
    const rule = flags.rule;
    
    tracker.checkpoint('explain');
    
    // Call API
    const result = await resolvePolicy({
      cwd: process.cwd(),
      explain: true,
      rule: rule as string | undefined
    });
    
    const totalTime = tracker.total();
    
    // Output
    if (jsonMode) {
      ctx.presenter.json({ 
        ok: true, 
        rule,
        explanation: result,
        timing: totalTime 
      });
    } else {
      const summary = keyValue({
        'Rule': rule || 'All rules',
        'Resolution Path': result.resolutionPath?.join(' → ') || 'default',
        'Sources': result.sources?.length || 0,
        'Overrides': result.overrides?.length || 0,
      });
      const output = box('Policy Explanation', [...summary, '', `Time: ${formatTiming(totalTime)}`]);
      ctx.presenter.write(output);
      
      if (result.sources && result.sources.length > 0) {
        ctx.presenter.write('');
        ctx.presenter.write('Sources:');
        result.sources.forEach(source => 
          ctx.presenter.write(`  • ${source}`)
        );
      }
      
      if (result.rules && result.rules.length > 0) {
        ctx.presenter.write('');
        ctx.presenter.write('Rules:');
        result.rules.forEach(rule => 
          ctx.presenter.write(`  • ${rule.name}: ${rule.description}`)
        );
      }
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

