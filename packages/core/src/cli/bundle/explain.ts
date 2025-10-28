import type { CommandModule } from './types';
import { box, keyValue, formatTiming, TimingTracker } from '@kb-labs/shared-cli-ui';
import { explainBundle } from '@kb-labs/core-bundle';

export const run: CommandModule['run'] = async (ctx, _argv, flags) => {
  const tracker = new TimingTracker();
  const jsonMode = !!flags.json;
  
  try {
    // Parse flags
    const product = flags.product;
    if (!product) {
      throw new Error('Product name is required');
    }
    
    tracker.checkpoint('explain');
    
    // Call API
    const result = await explainBundle({
      product: product as string,
      cwd: process.cwd()
    });
    
    const totalTime = tracker.total();
    
    // Output
    if (jsonMode) {
      ctx.presenter.json({ 
        ok: true, 
        product,
        explanation: result,
        timing: totalTime 
      });
    } else {
      const summary = keyValue({
        'Product': product,
        'Resolution Path': result.resolutionPath?.join(' → ') || 'default',
        'Sources': result.sources?.length || 0,
        'Overrides': result.overrides?.length || 0,
      });
      const output = box('Bundle Resolution', [...summary, '', `Time: ${formatTiming(totalTime)}`]);
      ctx.presenter.write(output);
      
      if (result.sources && result.sources.length > 0) {
        ctx.presenter.write('');
        ctx.presenter.write('Sources:');
        result.sources.forEach(source => 
          ctx.presenter.write(`  • ${source}`)
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

