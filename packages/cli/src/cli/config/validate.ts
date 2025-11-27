// @ts-expect-error - types will be available after command-kit types are generated
import { defineCommand } from '@kb-labs/cli-command-kit';
import { loadBundle } from '@kb-labs/core-bundle';
import type { ProductId } from '@kb-labs/core-bundle';
import { box, safeSymbols, safeColors } from '@kb-labs/shared-cli-ui';
import { ANALYTICS_EVENTS, ANALYTICS_ACTOR } from '../../infra/analytics/events.js';

export const run = defineCommand({
  name: 'config:validate',
  flags: {
    product: {
      type: 'string',
      description: 'Product ID',
      required: true,
    },
    profile: {
      type: 'string',
      description: 'Profile ID (Profiles v2)',
    },
    scope: {
      type: 'string',
      description: 'Scope ID within profile',
    },
    'no-fail': {
      type: 'boolean',
      description: 'Warn instead of failing',
      default: false,
    },
    cwd: {
      type: 'string',
      description: 'Working directory',
    },
    json: {
      type: 'boolean',
      description: 'Output in JSON format',
      default: false,
    },
  },
  analytics: {
    startEvent: ANALYTICS_EVENTS.CONFIG_VALIDATE_STARTED,
    finishEvent: ANALYTICS_EVENTS.CONFIG_VALIDATE_FINISHED,
    actor: ANALYTICS_ACTOR.id,
    includeFlags: true,
  },
  // @ts-expect-error - types will be inferred from schema after types are generated
  async handler(ctx: any, argv: any, flags: any) {
    const cwd = flags.cwd || ctx.cwd || process.cwd();
    const noFail = flags['no-fail'];
    
    ctx.tracker.checkpoint('load');

    try {
      await loadBundle({
        cwd,
        product: flags.product as ProductId,
        profileId: flags.profile,
        scopeId: flags.scope,
        validate: noFail ? 'warn' : true,
      });

      ctx.tracker.checkpoint('complete');

      if (flags.json) {
        ctx.output?.json({ ok: true, product: flags.product });
      } else {
        ctx.output?.write(
          box('Config Validation', [
            `${safeSymbols.success} ${safeColors.bold('Valid config')} for ${flags.product}`,
          ])
        );
      }

      return { ok: true, product: flags.product };
    } catch (err: any) {
      const details = err?.details || null;
      const errorsArray = Array.isArray(details) ? details : [];

      if (flags.json) {
        ctx.output?.json({ ok: false, errors: details });
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
        ctx.output?.write(box('Config Validation', lines));
      }
      
      // Return exit code based on no-fail flag
      return noFail ? 0 : 1;
    }
  },
});
