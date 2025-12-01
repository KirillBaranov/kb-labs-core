import { defineCommand } from '@kb-labs/shared-command-kit';
import { loadBundle } from '@kb-labs/core-bundle';
import { ANALYTICS_EVENTS, ANALYTICS_ACTOR } from '../../infra/analytics/events';
export const run = defineCommand({
  name: 'bundle:print',
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
    'with-trace': {
      type: 'boolean',
      description: 'Include trace information',
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
    startEvent: ANALYTICS_EVENTS.BUNDLE_PRINT_STARTED,
    finishEvent: ANALYTICS_EVENTS.BUNDLE_PRINT_FINISHED,
    actor: ANALYTICS_ACTOR.id,
    includeFlags: true,
  },
  async handler(ctx: any, argv: any, flags: any) {
    const cwd = flags.cwd || ctx.cwd || process.cwd();
    ctx.tracker.checkpoint('load');
    const bundle = await loadBundle({
      cwd,
      product: flags.product as any,
      profileId: flags.profile,
      scopeId: flags.scope,
    });
    ctx.tracker.checkpoint('complete');
    ctx.logger?.info('Bundle loaded successfully', {
      product: bundle.product,
      profileId: bundle.profile?.id,
      scopeId: bundle.profile?.activeScopeId,
    });
    if (flags.json) {
      ctx.output?.json(bundle);
    } else {
      ctx.output?.write(`Product: ${bundle.product}\n`);
      const profileSummary = bundle.profile
        ? `${bundle.profile.name ?? bundle.profile.id}${bundle.profile.version ? '@' + bundle.profile.version : ''}`
        : 'none';
      ctx.output?.write(`Profile: ${profileSummary}\n`);
      if (bundle.profile?.activeScopeId) {
        ctx.output?.write(`Scope: ${bundle.profile.activeScopeId} (${bundle.profile.scopeSelection?.strategy ?? 'auto'})\n`);
      }
      ctx.output?.write(`Config: ${JSON.stringify(bundle.config, null, 2)}\n`);
      if (flags['with-trace']) {
        ctx.output?.write('\nTrace:\n');
        for (const step of bundle.trace) {
          ctx.output?.write(`  ${step.layer}: ${step.source}\n`);
        }
      }
    }
    return { ok: true, bundle };
  },
});
