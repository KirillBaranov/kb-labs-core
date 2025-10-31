import type { CommandModule } from '../types';
import { loadBundle, type ProductId } from '@kb-labs/core-bundle';
import { box, safeSymbols, safeColors } from '@kb-labs/shared-cli-ui';
import { runScope, type AnalyticsEventV1, type EmitResult } from '@kb-labs/analytics-sdk-node';
import { ANALYTICS_EVENTS, ANALYTICS_ACTOR } from '../../analytics/events';

export const run: CommandModule['run'] = async (ctx, _argv, flags): Promise<number> => {
  const startTime = Date.now();
  const cwd = (flags.cwd as string) || process.cwd();
  const profileKey = (flags['profile-key'] as string) || 'default';
  const product = flags.product as ProductId;

  return (await runScope(
    {
      actor: ANALYTICS_ACTOR,
      ctx: { workspace: cwd },
    },
    async (emit: (event: Partial<AnalyticsEventV1>) => Promise<EmitResult>): Promise<number> => {
      try {
        if (!product) {
          const totalTime = Date.now() - startTime;
          await emit({
            type: ANALYTICS_EVENTS.BUNDLE_INSPECT_FINISHED,
            payload: {
              durationMs: totalTime,
              result: 'failed',
              error: 'Missing --product',
            },
          });

          const msg = 'Missing --product';
          return flags.json ? (ctx.presenter.json({ ok: false, error: msg }), 1) : (ctx.presenter.error(msg), 1);
        }

        // Track command start
        await emit({
          type: ANALYTICS_EVENTS.BUNDLE_INSPECT_STARTED,
          payload: {
            product,
            profileKey,
            trace: !!flags.trace,
          },
        });
        const bundle = await loadBundle({ cwd, product, profileKey });
        const trace = (flags.trace as boolean) ? bundle.trace : undefined;

        const totalTime = Date.now() - startTime;

        if (flags.json) {
          ctx.presenter.json({ ok: true, product, profile: bundle.profile, artifacts: bundle.artifacts.summary, trace });
        } else {
          const lines: string[] = [
            `${safeSymbols.info} ${safeColors.bold(`Bundle for ${product}`)} (profile: ${bundle.profile.name}@${bundle.profile.version})`,
            `artifacts keys: ${Object.keys(bundle.artifacts.summary).join(', ') || 'none'}`,
          ];
          ctx.presenter.write(box('Bundle Inspect', lines));
        }

        // Track command completion
        await emit({
          type: ANALYTICS_EVENTS.BUNDLE_INSPECT_FINISHED,
          payload: {
            product,
            profileKey,
            trace: !!flags.trace,
            artifactsCount: Object.keys(bundle.artifacts.summary).length,
            durationMs: totalTime,
            result: 'success',
          },
        });

        return 0;
      } catch (err: any) {
        const totalTime = Date.now() - startTime;

        // Track command failure
        await emit({
          type: ANALYTICS_EVENTS.BUNDLE_INSPECT_FINISHED,
          payload: {
            product,
            profileKey,
            durationMs: totalTime,
            result: 'error',
            error: err?.message || String(err),
          },
        });

        return flags.json ? (ctx.presenter.json({ ok: false, error: err?.message || String(err) }), 1)
                          : (ctx.presenter.error(err?.message || String(err)), 1);
      }
    }
  )) as number;
};


