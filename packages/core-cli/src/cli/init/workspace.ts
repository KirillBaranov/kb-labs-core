import { defineCommand } from '@kb-labs/shared-command-kit';
import { initWorkspaceConfig } from '@kb-labs/core-config';
import { ANALYTICS_EVENTS, ANALYTICS_ACTOR } from '../../infra/analytics/events';
export const run = defineCommand({
  name: 'init:workspace',
  flags: {
    format: {
      type: 'string',
      description: 'Config format',
      choices: ['yaml', 'json'] as const,
      default: 'yaml',
    },
    force: {
      type: 'boolean',
      description: 'Force initialization even if already exists',
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
    startEvent: ANALYTICS_EVENTS.INIT_WORKSPACE_STARTED,
    finishEvent: ANALYTICS_EVENTS.INIT_WORKSPACE_FINISHED,
    actor: ANALYTICS_ACTOR.id,
    includeFlags: true,
  },
  async handler(ctx: any, argv: any, flags: any) {
    const cwd = flags.cwd || ctx.cwd || process.cwd();
    ctx.tracker.checkpoint('init');
    const result = await initWorkspaceConfig({
      format: flags.format || 'yaml',
      force: flags.force,
      cwd
    });
    ctx.tracker.checkpoint('complete');
    ctx.logger?.info('Workspace configuration initialized successfully', {
      format: flags.format || 'yaml',
    });
    if (flags.json) {
      ctx.output?.json(result);
    } else {
      ctx.output?.write('Workspace configuration initialized successfully.\n');
    }
    return { ok: true, result };
  },
});
