import type { CommandModule } from './types';
import { box, keyValue, formatTiming, TimingTracker } from '@kb-labs/shared-cli-ui';
import { loadBundle } from '@kb-labs/core-bundle';

export const run: CommandModule['run'] = async (ctx, _argv, flags) => {
  const tracker = new TimingTracker();
  const jsonMode = !!flags.json;
  
  try {
    // Parse flags
    const product = flags.product;
    if (!product) {
      throw new Error('Product name is required');
    }
    
    tracker.checkpoint('load');
    
    // Call API
    const result = await loadBundle({
      product: product as string,
      cwd: process.cwd()
    });
    
    const totalTime = tracker.total();
    
    // Output
    if (jsonMode) {
      ctx.presenter.json({ 
        ok: true, 
        product,
        bundle: result,
        timing: totalTime 
      });
    } else {
      const summary = keyValue({
        'Product': product,
        'Bundle': result.name,
        'Version': result.version,
        'Rules': result.rules?.length || 0,
        'Prompts': result.prompts?.length || 0,
      });
      const output = box('Bundle Configuration', [...summary, '', `Time: ${formatTiming(totalTime)}`]);
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

