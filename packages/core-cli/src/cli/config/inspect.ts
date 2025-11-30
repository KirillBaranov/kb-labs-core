// @ts-expect-error - types will be available after command-kit types are generated
import { defineCommand } from '@kb-labs/shared-command-kit';
import { loadBundle, type ProductId } from '@kb-labs/core-bundle';
import { validateProductConfig } from '@kb-labs/core-config';
import { box } from '@kb-labs/shared-cli-ui';
import { ANALYTICS_EVENTS, ANALYTICS_ACTOR } from '../../infra/analytics/events';

export const run = defineCommand({
  name: 'config:inspect',
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
    startEvent: ANALYTICS_EVENTS.CONFIG_INSPECT_STARTED,
    finishEvent: ANALYTICS_EVENTS.CONFIG_INSPECT_FINISHED,
    actor: ANALYTICS_ACTOR.id,
    includeFlags: true,
  },
  // @ts-expect-error - types will be inferred from schema after types are generated
  async handler(ctx: any, argv: any, flags: any) {
    const cwd = flags.cwd || ctx.cwd || process.cwd();
    
    ctx.tracker.checkpoint('load');

    const bundle = await loadBundle({ cwd, product: flags.product as ProductId, profileId: flags.profile, scopeId: flags.scope });
    const cfg = bundle.config;
    const val = validateProductConfig(flags.product as ProductId, cfg);

    ctx.tracker.checkpoint('complete');

    if (flags.json) {
      ctx.output?.json({ ok: true, product: flags.product, profileId: bundle.profile?.id, topKeys: Object.keys(cfg || {}), validation: val });
    } else {
      const profileSummary = bundle.profile?.id || 'none';
      const lines: string[] = [
        `${ctx.output?.ui.symbols.info ?? 'ℹ'} ${ctx.output?.ui.colors.bold(`Product: ${flags.product}`) ?? `Product: ${flags.product}`} (profile: ${profileSummary})`,
        `topKeys: ${Object.keys(cfg || {}).join(', ') || 'none'}`,
        `validation: ${val.ok ? 'ok' : `errors=${val.errors?.length ?? 0}`}`,
      ];
      ctx.output?.write(box('Config Inspect', lines));
    }

    return { ok: val.ok, product: flags.product, validation: val };
  },
});
