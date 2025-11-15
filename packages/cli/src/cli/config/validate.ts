import type { CommandModule } from '../types';
import { loadBundle } from '@kb-labs/core-bundle';
import type { ProductId } from '@kb-labs/core-bundle';
import { box, safeSymbols, safeColors } from '@kb-labs/shared-cli-ui';
import { runScope, type AnalyticsEventV1, type EmitResult } from '@kb-labs/analytics-sdk-node';
import { ANALYTICS_EVENTS, ANALYTICS_ACTOR } from '../../analytics/events';

export const run: CommandModule['run'] = async (ctx, _argv, flags): Promise<number> => {
  const startTime = Date.now();
  const cwd = (flags.cwd as string) || process.cwd();
  const profileId = flags.profile as string | undefined;
  const scopeId = flags.scope as string | undefined;
  const noFail = Boolean(flags['no-fail']);

  return (await runScope(
    {
      actor: ANALYTICS_ACTOR,
      ctx: { workspace: cwd },
    },
    async (emit: (event: Partial<AnalyticsEventV1>) => Promise<EmitResult>): Promise<number> => {
      try {
        // Track command start
        await emit({
          type: ANALYTICS_EVENTS.CONFIG_VALIDATE_STARTED,
          payload: {
            product: flags.product as string | undefined,
            profileId,
            scopeId,
            noFail,
          },
        });
        await loadBundle({
          cwd,
          product: flags.product as ProductId,
          profileId,
          scopeId,
          validate: noFail ? 'warn' : true,
        });

        const totalTime = Date.now() - startTime;

        if (flags.json) {
          ctx.presenter.json({ ok: true, product: flags.product });
        } else {
          ctx.presenter.write(
            box('Config Validation', [
              `${safeSymbols.success} ${safeColors.bold('Valid config')} for ${flags.product}`,
            ])
          );
        }

        // Track command completion
        await emit({
          type: ANALYTICS_EVENTS.CONFIG_VALIDATE_FINISHED,
          payload: {
            product: flags.product as string | undefined,
            profileId,
            scopeId,
            noFail,
            validationOk: true,
            durationMs: totalTime,
            result: 'success',
          },
        });

        return 0;
      } catch (err: any) {
        const totalTime = Date.now() - startTime;
        const details = err?.details || null;
        const errorsArray = Array.isArray(details) ? details : [];

        // Track command completion with failure
        await emit({
          type: ANALYTICS_EVENTS.CONFIG_VALIDATE_FINISHED,
          payload: {
            product: flags.product as string | undefined,
            profileId,
            scopeId,
            noFail,
            validationOk: false,
            errorsCount: errorsArray.length,
            durationMs: totalTime,
            result: 'failed',
          },
        });

        if (flags.json) {
          ctx.presenter.json({ ok: false, errors: details });
        } else {
          const lines: string[] = [
            `${safeSymbols.error} ${safeColors.bold('Invalid config')} for ${flags.product}`,
          ];
          if (Array.isArray(details)) {
            lines.push('', safeColors.bold('Errors:'));
            for (const e of details) {
              const instancePath = e.instancePath || e.instance || '';
              const msg = e.message || 'Validation error';
              lines.push(`  - ${instancePath ? instancePath + ': ' : ''}${msg}`);
            }
          }
          ctx.presenter.write(box('Config Validation', lines));
        }
        return noFail ? 0 : 1;
      }
    }
  )) as number;
};


