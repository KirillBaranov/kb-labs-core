import type { CommandModule } from '../types';
import { box, keyValue, formatTiming, TimingTracker } from '@kb-labs/shared-cli-ui';
import { initAll } from '@kb-labs/core-bundle';

export const run: CommandModule['run'] = async (ctx, _argv, flags) => {
  const tracker = new TimingTracker();
  const jsonMode = !!flags.json;
  
  try {
    const result = await initAll({
      cwd: (flags.cwd as string) || process.cwd(),
      format: (flags.format as 'yaml' | 'json') || 'yaml',
      products: flags.products ? (flags.products as string).split(',') as any[] : ['aiReview'],
      profileKey: (flags['profile-key'] as string) || 'default',
      profileRef: flags['profile-ref'] as string | undefined,
      scaffoldLocalProfile: !!flags['scaffold-local-profile'],
      presetRef: flags['preset-ref'] as string | undefined,
      policyBundle: flags['policy-bundle'] as string | undefined,
      dryRun: !!flags['dry-run'],
      force: !!flags.force,
    });
    
    if (jsonMode) {
      ctx.presenter.json({ ok: true, result, timing: tracker.total() });
    } else {
      const summary = keyValue({
        'Created': result.stats.created.toString(),
        'Updated': result.stats.updated.toString(),
        'Skipped': result.stats.skipped.toString(),
        'Status': 'Success',
      });
      ctx.presenter.write(box('KB Labs Setup Complete', [...summary, '', `Time: ${formatTiming(tracker.total())}`]));
    }
    
    return 0;
  } catch (e: unknown) {
    if (jsonMode) {
      ctx.presenter.json({ ok: false, error: String(e), timing: tracker.total() });
    } else {
      ctx.presenter.error(String(e));
    }
    return 1;
  }
};

