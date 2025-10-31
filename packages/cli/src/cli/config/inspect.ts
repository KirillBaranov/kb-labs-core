import type { CommandModule } from '../types';
import { loadBundle, type ProductId } from '@kb-labs/core-bundle';
import { validateProductConfig } from '@kb-labs/core-config';
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
            type: ANALYTICS_EVENTS.CONFIG_INSPECT_FINISHED,
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
          type: ANALYTICS_EVENTS.CONFIG_INSPECT_STARTED,
          payload: {
            product,
            profileKey,
          },
        });
        const bundle = await loadBundle({ cwd, product, profileKey });
        const cfg = bundle.config;
        const val = validateProductConfig(product, cfg);

        const totalTime = Date.now() - startTime;

        if (flags.json) {
          ctx.presenter.json({ ok: true, product, profileKey, topKeys: Object.keys(cfg || {}), validation: val });
        } else {
          const lines: string[] = [
            `${safeSymbols.info} ${safeColors.bold(`Product: ${product}`)} (profile: ${profileKey})`,
            `topKeys: ${Object.keys(cfg || {}).join(', ') || 'none'}`,
            `validation: ${val.ok ? 'ok' : `errors=${val.errors?.length ?? 0}`}`,
          ];
          ctx.presenter.write(box('Config Inspect', lines));
        }

        // Track command completion
        await emit({
          type: ANALYTICS_EVENTS.CONFIG_INSPECT_FINISHED,
          payload: {
            product,
            profileKey,
            validationOk: val.ok,
            errorsCount: val.errors?.length || 0,
            topKeysCount: Object.keys(cfg || {}).length,
            durationMs: totalTime,
            result: 'success',
          },
        });

        return 0;
      } catch (err: any) {
        const totalTime = Date.now() - startTime;

        // Track command failure
        await emit({
          type: ANALYTICS_EVENTS.CONFIG_INSPECT_FINISHED,
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


