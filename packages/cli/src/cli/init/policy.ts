import type { CommandModule } from '../types';
import { initPolicy } from '@kb-labs/core-policy';
import type { TelemetryEvent, TelemetryEmitResult } from '@kb-labs/core-types';
import { runWithOptionalAnalytics } from '../../infra/analytics/telemetry-wrapper.js';
import { ANALYTICS_EVENTS, ANALYTICS_ACTOR } from '../../infra/analytics/events.js';

export const run: CommandModule['run'] = async (ctx, _argv, flags): Promise<number> => {
  const startTime = Date.now();
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
          type: ANALYTICS_EVENTS.INIT_POLICY_STARTED,
          payload: {
            bundleName: (flags['bundle-name'] as string) || 'default',
          },
        });
        const result = await initPolicy({
          bundleName: (flags['bundle-name'] as string) || 'default',
          cwd
        });
        
        const totalTime = Date.now() - startTime;

        if (flags.json) {
          ctx.presenter.json(result);
        } else {
          ctx.presenter.write('Policy initialized successfully.\n');
        }

        // Track command completion
        await emit({
          type: ANALYTICS_EVENTS.INIT_POLICY_FINISHED,
          payload: {
            bundleName: (flags['bundle-name'] as string) || 'default',
            durationMs: totalTime,
            result: 'success',
          },
        });
        
        return 0;
      } catch (e: unknown) {
        const totalTime = Date.now() - startTime;

        // Track command failure
        await emit({
          type: ANALYTICS_EVENTS.INIT_POLICY_FINISHED,
          payload: {
            bundleName: (flags['bundle-name'] as string) || 'default',
            durationMs: totalTime,
            result: 'error',
            error: String(e),
          },
        });

        ctx.presenter.error(String(e));
        return 1;
      }
    }
  )) as number;
};

