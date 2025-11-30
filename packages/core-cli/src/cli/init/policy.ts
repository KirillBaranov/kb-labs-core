// @ts-expect-error - types will be available after command-kit types are generated
import { defineCommand } from '@kb-labs/shared-command-kit';
import { initPolicy } from '@kb-labs/core-policy';
import { ANALYTICS_EVENTS, ANALYTICS_ACTOR } from '../../infra/analytics/events';

export const run = defineCommand({
  name: 'init:policy',
  flags: {
    'bundle-name': {
      type: 'string',
      description: 'Bundle name',
      default: 'default',
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
    startEvent: ANALYTICS_EVENTS.INIT_POLICY_STARTED,
    finishEvent: ANALYTICS_EVENTS.INIT_POLICY_FINISHED,
    actor: ANALYTICS_ACTOR.id,
    includeFlags: true,
  },
  // @ts-expect-error - types will be inferred from schema after types are generated
  async handler(ctx: any, argv: any, flags: any) {
    const cwd = flags.cwd || ctx.cwd || process.cwd();
    const bundleName = flags['bundle-name'] || 'default';
    
    ctx.tracker.checkpoint('init');

    const result = await initPolicy({
      bundleName,
      cwd
    });
    
    ctx.tracker.checkpoint('complete');

    ctx.logger?.info('Policy initialized successfully', {
      bundleName,
    });

    if (flags.json) {
      ctx.output?.json(result);
    } else {
      ctx.output?.write('Policy initialized successfully.\n');
    }

    return { ok: true, result };
  },
});
