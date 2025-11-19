import type { CommandModule } from '../types';
import { initWorkspaceConfig } from '@kb-labs/core-config';
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
          type: ANALYTICS_EVENTS.INIT_WORKSPACE_STARTED,
          payload: {
            format: (flags.format as string) || 'yaml',
            force: !!flags.force,
          },
        });
        const result = await initWorkspaceConfig({
          format: (flags.format as 'yaml' | 'json') || 'yaml',
          force: !!flags.force,
          cwd
        });
        
        const totalTime = Date.now() - startTime;

        if (flags.json) {
          ctx.presenter.json(result);
        } else {
          ctx.presenter.write('Workspace configuration initialized successfully.\n');
        }

        // Track command completion
        await emit({
          type: ANALYTICS_EVENTS.INIT_WORKSPACE_FINISHED,
          payload: {
            format: (flags.format as string) || 'yaml',
            force: !!flags.force,
            durationMs: totalTime,
            result: 'success',
          },
        });
        
        return 0;
      } catch (e: unknown) {
        const totalTime = Date.now() - startTime;

        // Track command failure
        await emit({
          type: ANALYTICS_EVENTS.INIT_WORKSPACE_FINISHED,
          payload: {
            format: (flags.format as string) || 'yaml',
            force: !!flags.force,
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

