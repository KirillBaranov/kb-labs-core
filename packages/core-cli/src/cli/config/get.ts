// @ts-expect-error - types will be available after command-kit types are generated
import { defineCommand } from '@kb-labs/shared-command-kit';
import { loadBundle } from '@kb-labs/core-bundle';
import YAML from 'yaml';
import { box } from '@kb-labs/shared-cli-ui';
import { ANALYTICS_EVENTS, ANALYTICS_ACTOR } from '../../infra/analytics/events';

export const run = defineCommand({
  name: 'config:get',
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
    yaml: {
      type: 'boolean',
      description: 'Output in YAML format',
      default: false,
    },
  },
  analytics: {
    startEvent: ANALYTICS_EVENTS.CONFIG_GET_STARTED,
    finishEvent: ANALYTICS_EVENTS.CONFIG_GET_FINISHED,
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

    ctx.logger?.info('Config loaded successfully', {
      product: flags.product,
      profileId: bundle.profile?.id,
      scopeId: bundle.profile?.activeScopeId,
      format: flags.yaml ? 'yaml' : 'json',
    });

    if (flags.json) {
      ctx.output?.json(bundle.config);
    } else {
      ctx.output?.write(
        box('Product Config', [
          `${ctx.output?.ui.symbols.success ?? '✓'} ${ctx.output?.ui.colors.bold('Loaded config') ?? 'Loaded config'} for ${flags.product}`,
        ])
      );
      const configOutput = flags.yaml 
        ? YAML.stringify(bundle.config)
        : JSON.stringify(bundle.config, null, 2);
      ctx.output?.write(configOutput);
    }

    return { ok: true, config: bundle.config };
  },
});
