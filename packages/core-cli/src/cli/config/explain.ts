// @ts-expect-error - types will be available after command-kit types are generated
import { defineCommand } from '@kb-labs/shared-command-kit';
import { explainBundle } from '@kb-labs/core-bundle';
import { box } from '@kb-labs/shared-cli-ui';
import { ANALYTICS_EVENTS, ANALYTICS_ACTOR } from '../../infra/analytics/events';

export const run = defineCommand({
  name: 'config:explain',
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
    startEvent: ANALYTICS_EVENTS.CONFIG_EXPLAIN_STARTED,
    finishEvent: ANALYTICS_EVENTS.CONFIG_EXPLAIN_FINISHED,
    actor: ANALYTICS_ACTOR.id,
    includeFlags: true,
  },
  // @ts-expect-error - types will be inferred from schema after types are generated
  async handler(ctx: any, argv: any, flags: any) {
    const cwd = flags.cwd || ctx.cwd || process.cwd();
    
    ctx.tracker.checkpoint('explain');

    const trace = await explainBundle({
      cwd,
      product: flags.product as any,
      profileId: flags.profile,
      scopeId: flags.scope,
    });
    
    ctx.tracker.checkpoint('complete');

    ctx.logger?.info('Config explanation generated', {
      product: flags.product,
      traceStepsCount: trace.length,
    });

    if (flags.json) {
      ctx.output?.json({ trace });
    } else {
      const lines = [
        ...trace.map(step => `${step.layer}: ${step.source}`)
      ];
      ctx.output?.write(box('Config Explain', lines.map(l => `  ${l}`)));
    }

    return { ok: true, trace };
  },
});
