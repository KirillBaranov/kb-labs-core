// @ts-expect-error - types will be available after command-kit types are generated
import { defineCommand } from '@kb-labs/shared-command-kit';
import { box, keyValue, formatTiming } from '@kb-labs/shared-cli-ui';
import { initAll } from '@kb-labs/core-bundle';
import { ANALYTICS_EVENTS, ANALYTICS_ACTOR } from '../../infra/analytics/events';

export const run = defineCommand({
  name: 'init:setup',
  flags: {
    format: {
      type: 'string',
      description: 'Config format',
      choices: ['yaml', 'json'] as const,
      default: 'yaml',
    },
    products: {
      type: 'string',
      description: 'Comma-separated product list',
      default: 'aiReview',
    },
    'preset-ref': {
      type: 'string',
      description: 'Preset reference',
    },
    'policy-bundle': {
      type: 'string',
      description: 'Policy bundle name',
    },
    'dry-run': {
      type: 'boolean',
      description: 'Dry run mode',
      default: false,
    },
    force: {
      type: 'boolean',
      description: 'Force initialization even if already exists',
      default: false,
    },
    yes: {
      type: 'boolean',
      description: 'Skip confirmation prompts',
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
    startEvent: ANALYTICS_EVENTS.INIT_SETUP_STARTED,
    finishEvent: ANALYTICS_EVENTS.INIT_SETUP_FINISHED,
    actor: ANALYTICS_ACTOR.id,
    includeFlags: true,
  },
  // @ts-expect-error - types will be inferred from schema after types are generated
  async handler(ctx: any, argv: any, flags: any) {
    const cwd = flags.cwd || ctx.cwd || process.cwd();
    const products = flags.products ? flags.products.split(',') : ['aiReview'];
    
    ctx.tracker.checkpoint('init');

    ctx.logger?.info('Initializing KB Labs workspace', {
      format: flags.format || 'yaml',
      products,
      presetRef: flags['preset-ref'],
      policyBundle: flags['policy-bundle'],
      dryRun: flags['dry-run'],
      force: flags.force,
      cwd,
    });

    const result = await initAll({
      cwd,
      format: (flags.format as 'yaml' | 'json') || 'yaml',
      products: products as any[],
      presetRef: flags['preset-ref'],
      policyBundle: flags['policy-bundle'],
      dryRun: flags['dry-run'],
      force: flags.force,
    });
    
    ctx.tracker.checkpoint('complete');

    if (flags.json) {
      ctx.output?.json({ ok: true, result, timingMs: ctx.tracker.total() });
    } else {
      const summary = keyValue({
        'Created': result.stats.created.toString(),
        'Updated': result.stats.updated.toString(),
        'Skipped': result.stats.skipped.toString(),
        'Status': 'Success',
      });
      ctx.output?.write(box('KB Labs Setup Complete', [...summary, '', `Time: ${formatTiming(ctx.tracker.total())}`]));
    }

    ctx.logger?.info('KB Labs workspace initialized successfully', {
      created: result.stats.created,
      updated: result.stats.updated,
      skipped: result.stats.skipped,
    });

    return { ok: true, result, stats: result.stats };
  },
});
