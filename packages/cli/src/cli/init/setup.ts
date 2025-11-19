import type { CommandModule } from '../types';
import { box, keyValue, formatTiming, TimingTracker } from '@kb-labs/shared-cli-ui';
import { initAll } from '@kb-labs/core-bundle';
import type { TelemetryEvent, TelemetryEmitResult } from '@kb-labs/core-types';
import { runWithOptionalAnalytics } from '../../infra/analytics/telemetry-wrapper.js';
import { ANALYTICS_EVENTS, ANALYTICS_ACTOR } from '../../infra/analytics/events.js';

export const run: CommandModule['run'] = async (ctx, _argv, flags): Promise<number> => {
  const startTime = Date.now();
  const tracker = new TimingTracker();
  const jsonMode = !!flags.json;
  const cwd = (flags.cwd as string) || process.cwd();

  return (await runWithOptionalAnalytics(
    {
      actor: ANALYTICS_ACTOR,
      ctx: { workspace: cwd },
    },
    async (emit: (event: Partial<TelemetryEvent>) => Promise<TelemetryEmitResult>): Promise<number> => {
      try {
        // Track command start
        await emit({
          type: ANALYTICS_EVENTS.INIT_SETUP_STARTED,
          payload: {
            format: (flags.format as string) || 'yaml',
            products: flags.products ? (flags.products as string).split(',') : ['aiReview'],
            presetRef: flags['preset-ref'] as string | undefined,
            policyBundle: flags['policy-bundle'] as string | undefined,
            dryRun: !!flags['dry-run'],
            force: !!flags.force,
            yes: !!flags.yes,
          },
        });
        const result = await initAll({
          cwd,
          format: (flags.format as 'yaml' | 'json') || 'yaml',
          products: flags.products ? (flags.products as string).split(',') as any[] : ['aiReview'],
          presetRef: flags['preset-ref'] as string | undefined,
          policyBundle: flags['policy-bundle'] as string | undefined,
          dryRun: !!flags['dry-run'],
          force: !!flags.force,
        });
        
        const totalTime = Date.now() - startTime;

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

        // Track command completion
        await emit({
          type: ANALYTICS_EVENTS.INIT_SETUP_FINISHED,
          payload: {
            format: (flags.format as string) || 'yaml',
            productsCount: flags.products ? (flags.products as string).split(',').length : 1,
            dryRun: !!flags['dry-run'],
            force: !!flags.force,
            created: result.stats.created,
            updated: result.stats.updated,
            skipped: result.stats.skipped,
            durationMs: totalTime,
            result: 'success',
          },
        });
        
        return 0;
      } catch (e: unknown) {
        const totalTime = Date.now() - startTime;

        // Track command failure
        await emit({
          type: ANALYTICS_EVENTS.INIT_SETUP_FINISHED,
          payload: {
            format: (flags.format as string) || 'yaml',
            productsCount: flags.products ? (flags.products as string).split(',').length : 1,
            dryRun: !!flags['dry-run'],
            force: !!flags.force,
            durationMs: totalTime,
            result: 'error',
            error: String(e),
          },
        });

        if (jsonMode) {
          ctx.presenter.json({ ok: false, error: String(e), timing: tracker.total() });
        } else {
          ctx.presenter.error(String(e));
        }
        return 1;
      }
    }
  )) as number;
};

