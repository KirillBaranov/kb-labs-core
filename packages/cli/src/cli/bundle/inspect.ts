// @ts-expect-error - types will be available after command-kit types are generated
import { defineCommand } from '@kb-labs/cli-command-kit';
import { loadBundle, type ProductId } from '@kb-labs/core-bundle';
import { box } from '@kb-labs/shared-cli-ui';
import { ANALYTICS_EVENTS, ANALYTICS_ACTOR } from '../../infra/analytics/events.js';

export const run = defineCommand({
  name: 'bundle:inspect',
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
    trace: {
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
    startEvent: ANALYTICS_EVENTS.BUNDLE_INSPECT_STARTED,
    finishEvent: ANALYTICS_EVENTS.BUNDLE_INSPECT_FINISHED,
    actor: ANALYTICS_ACTOR.id,
    includeFlags: true,
  },
  // @ts-expect-error - types will be inferred from schema after types are generated
  async handler(ctx: any, argv: any, flags: any) {
    const cwd = flags.cwd || ctx.cwd || process.cwd();
    
    ctx.tracker.checkpoint('load');

    const bundle = await loadBundle({ cwd, product: flags.product as ProductId, profileId: flags.profile, scopeId: flags.scope });
    const trace = flags.trace ? bundle.trace : undefined;

    ctx.tracker.checkpoint('complete');

    ctx.logger?.info('Bundle inspected successfully', {
      product: flags.product,
      profileId: bundle.profile?.id,
      scopeId: bundle.profile?.activeScopeId,
      artifactsCount: Object.keys(bundle.artifacts.summary).length,
    });

    if (flags.json) {
      ctx.output?.json({ ok: true, product: flags.product, profile: bundle.profile, artifacts: bundle.artifacts.summary, trace });
    } else {
      const profileSummary = bundle.profile
        ? `${bundle.profile.name ?? bundle.profile.id}${bundle.profile.version ? '@' + bundle.profile.version : ''}`
        : 'none';
      const lines: string[] = [
        `${ctx.output?.ui.symbols.info ?? 'ℹ'} ${ctx.output?.ui.colors.bold(`Bundle for ${flags.product}`) ?? `Bundle for ${flags.product}`} (profile: ${profileSummary})`,
        bundle.profile?.activeScopeId
          ? `scope: ${bundle.profile.activeScopeId} (${bundle.profile.scopeSelection?.strategy ?? 'auto'})`
          : 'scope: n/a',
        `artifacts keys: ${Object.keys(bundle.artifacts.summary).join(', ') || 'none'}`,
      ];
      ctx.output?.write(box('Bundle Inspect', lines));
    }

    return { ok: true, product: flags.product, profile: bundle.profile, artifacts: bundle.artifacts.summary };
  },
});
