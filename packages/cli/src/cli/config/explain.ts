import type { CommandModule } from '../types';
import { explainBundle } from '@kb-labs/core-bundle';
import { box } from '@kb-labs/shared-cli-ui';
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
          type: ANALYTICS_EVENTS.CONFIG_EXPLAIN_STARTED,
          payload: {
            product: flags.product as string | undefined,
            profileId: flags.profile as string | undefined,
            scopeId: flags.scope as string | undefined,
          },
        });
        const trace = await explainBundle({
          cwd,
          product: flags.product as any,
          profileId: flags.profile as string | undefined,
          scopeId: flags.scope as string | undefined,
        });
        
        const totalTime = Date.now() - startTime;

        if (flags.json) {
          ctx.presenter.json({ trace });
        } else {
          const lines = [
            ...trace.map(step => `${step.layer}: ${step.source}`)
          ];
          ctx.presenter.write(box('Config Explain', lines.map(l => `  ${l}`)));
        }

        // Track command completion
        await emit({
          type: ANALYTICS_EVENTS.CONFIG_EXPLAIN_FINISHED,
          payload: {
            product: flags.product as string | undefined,
            profileId: flags.profile as string | undefined,
            scopeId: flags.scope as string | undefined,
            traceStepsCount: trace.length,
            durationMs: totalTime,
            result: 'success',
          },
        });
        
        return 0;
      } catch (e: unknown) {
        const totalTime = Date.now() - startTime;

        // Track command failure
        await emit({
          type: ANALYTICS_EVENTS.CONFIG_EXPLAIN_FINISHED,
          payload: {
            product: flags.product as string | undefined,
            profileId: flags.profile as string | undefined,
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

