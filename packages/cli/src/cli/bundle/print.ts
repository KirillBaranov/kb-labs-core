import type { CommandModule } from '../types';
import { loadBundle } from '@kb-labs/core-bundle';
import type { TelemetryEvent, TelemetryEmitResult } from '@kb-labs/core-types';
import { runWithOptionalAnalytics } from '../../infra/analytics/telemetry-wrapper.js';
import { ANALYTICS_EVENTS, ANALYTICS_ACTOR } from '../../infra/analytics/events.js';

export const run: CommandModule['run'] = async (ctx, _argv, flags): Promise<number> => {
  const startTime = Date.now();
  const cwd = (flags.cwd as string) || process.cwd();
  const profileId = flags.profile as string | undefined;
  const scopeId = flags.scope as string | undefined;

  return (await runWithOptionalAnalytics(
    {
      actor: ANALYTICS_ACTOR,
      ctx: { workspace: cwd },
    },
    async (emit: (event: Partial<TelemetryEvent>) => Promise<TelemetryEmitResult>): Promise<number> => {
      try {
        // Track command start
        await emit({
          type: ANALYTICS_EVENTS.BUNDLE_PRINT_STARTED,
          payload: {
            product: flags.product as string | undefined,
            profileId,
            scopeId,
            withTrace: !!flags['with-trace'],
          },
        });
        const bundle = await loadBundle({
          cwd,
          product: flags.product as any,
          profileId,
          scopeId,
        });
        
        const totalTime = Date.now() - startTime;

        if (flags.json) {
          ctx.presenter.json(bundle);
        } else {
          ctx.presenter.write(`Product: ${bundle.product}\n`);
          const profileSummary = bundle.profile
            ? `${bundle.profile.name ?? bundle.profile.id}${bundle.profile.version ? '@' + bundle.profile.version : ''}`
            : 'none';
          ctx.presenter.write(`Profile: ${profileSummary}\n`);
          if (bundle.profile?.activeScopeId) {
            ctx.presenter.write(`Scope: ${bundle.profile.activeScopeId} (${bundle.profile.scopeSelection?.strategy ?? 'auto'})\n`);
          }
          ctx.presenter.write(`Config: ${JSON.stringify(bundle.config, null, 2)}\n`);
          
          if (flags['with-trace']) {
            ctx.presenter.write('\nTrace:\n');
            for (const step of bundle.trace) {
              ctx.presenter.write(`  ${step.layer}: ${step.source}\n`);
            }
          }
        }

        // Track command completion
        await emit({
          type: ANALYTICS_EVENTS.BUNDLE_PRINT_FINISHED,
          payload: {
            product: flags.product as string | undefined,
            profileId: bundle.profile?.id,
            scopeId: bundle.profile?.activeScopeId,
            durationMs: totalTime,
            result: 'success',
          },
        });
        
        return 0;
      } catch (e: unknown) {
        const totalTime = Date.now() - startTime;

        // Track command failure
        await emit({
          type: ANALYTICS_EVENTS.BUNDLE_PRINT_FINISHED,
          payload: {
            product: flags.product as string | undefined,
            profileId: profileId || undefined,
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

