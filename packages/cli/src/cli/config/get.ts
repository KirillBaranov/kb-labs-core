import type { CommandModule } from '../types';
import { loadBundle } from '@kb-labs/core-bundle';
import YAML from 'yaml';
import { box, safeSymbols, safeColors } from '@kb-labs/shared-cli-ui';
import { runScope, type AnalyticsEventV1, type EmitResult } from '@kb-labs/analytics-sdk-node';
import { ANALYTICS_EVENTS, ANALYTICS_ACTOR } from '../../analytics/events';

export const run: CommandModule['run'] = async (ctx, _argv, flags): Promise<number> => {
  const startTime = Date.now();
  const cwd = (flags.cwd as string) || process.cwd();

  return (await runScope(
    {
      actor: ANALYTICS_ACTOR,
      ctx: { workspace: cwd },
    },
    async (emit: (event: Partial<AnalyticsEventV1>) => Promise<EmitResult>): Promise<number> => {
      try {
        // Track command start
        await emit({
          type: ANALYTICS_EVENTS.CONFIG_GET_STARTED,
          payload: {
            product: flags.product as string | undefined,
            profileKey: (flags['profile-key'] as string) || 'default',
            format: flags.yaml ? 'yaml' : 'json',
          },
        });
        const bundle = await loadBundle({
          cwd,
          product: flags.product as any,
          profileKey: (flags['profile-key'] as string) || 'default',
        });
        
        const totalTime = Date.now() - startTime;

        if (flags.json) {
          ctx.presenter.json(bundle.config);
        } else {
          ctx.presenter.write(
            box('Product Config', [
              `${safeSymbols.success} ${safeColors.bold('Loaded config')} for ${flags.product}`,
            ])
          );
          const output = flags.yaml 
            ? YAML.stringify(bundle.config)
            : JSON.stringify(bundle.config, null, 2);
          ctx.presenter.write(output);
        }

        // Track command completion
        await emit({
          type: ANALYTICS_EVENTS.CONFIG_GET_FINISHED,
          payload: {
            product: flags.product as string | undefined,
            profileKey: (flags['profile-key'] as string) || 'default',
            format: flags.yaml ? 'yaml' : 'json',
            durationMs: totalTime,
            result: 'success',
          },
        });
        
        return 0;
      } catch (e: unknown) {
        const totalTime = Date.now() - startTime;

        // Track command failure
        await emit({
          type: ANALYTICS_EVENTS.CONFIG_GET_FINISHED,
          payload: {
            product: flags.product as string | undefined,
            profileKey: (flags['profile-key'] as string) || 'default',
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

