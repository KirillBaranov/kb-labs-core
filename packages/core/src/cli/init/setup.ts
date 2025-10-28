import type { CommandModule } from './types';
import { box, keyValue, formatTiming, TimingTracker } from '@kb-labs/shared-cli-ui';
import { initWorkspace } from '@kb-labs/core-config';
import { initProfile } from '@kb-labs/core-profiles';
import { initPolicy } from '@kb-labs/core-policy';

export const run: CommandModule['run'] = async (ctx, _argv, flags) => {
  const tracker = new TimingTracker();
  const jsonMode = !!flags.json;
  
  try {
    // Parse flags
    const _yes = !!flags.yes;
    const dryRun = !!flags['dry-run'];
    const force = !!flags.force;
    const format = flags.format || 'yaml';
    const profileKey = flags['profile-key'] || 'default';
    const products = flags.products ? (flags.products as string).split(',') : ['aiReview'];
    
    tracker.checkpoint('setup');
    
    const results: any = {};
    
    // Initialize workspace config
    if (!dryRun) {
      results.workspace = await initWorkspace({
        format: format as 'yaml' | 'json',
        force,
        cwd: process.cwd()
      });
    }
    
    // Initialize profile
    if (!dryRun) {
      results.profile = await initProfile({
        profileKey,
        scaffoldLocalProfile: true,
        cwd: process.cwd()
      });
    }
    
    // Initialize policy
    if (!dryRun) {
      results.policy = await initPolicy({
        bundleName: 'default',
        cwd: process.cwd()
      });
    }
    
    const totalTime = tracker.total();
    
    // Output
    if (jsonMode) {
      ctx.presenter.json({ 
        ok: true, 
        dryRun,
        format,
        profileKey,
        products,
        results,
        timing: totalTime 
      });
    } else {
      const summary = keyValue({
        'Mode': dryRun ? 'Dry Run' : 'Execute',
        'Format': format,
        'Profile Key': profileKey,
        'Products': products.join(', '),
        'Force': force ? 'Yes' : 'No',
        'Status': 'Success',
      });
      const output = box('KB Labs Setup Complete', [...summary, '', `Time: ${formatTiming(totalTime)}`]);
      ctx.presenter.write(output);
      
      if (dryRun) {
        ctx.presenter.write('');
        ctx.presenter.write('This was a dry run. Use --force to actually create files.');
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

