// @ts-expect-error - types will be available after command-kit types are generated
import { defineCommand } from '@kb-labs/shared-command-kit';
import { readProfilesSection, resolveProfile } from '@kb-labs/core-config';
import { ANALYTICS_EVENTS, ANALYTICS_ACTOR } from '../../infra/analytics/events';

export const run = defineCommand({
  name: 'profiles:resolve',
  flags: {
    profile: {
      type: 'string',
      description: 'Profile ID to resolve',
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
    startEvent: ANALYTICS_EVENTS.PROFILES_RESOLVE_STARTED,
    finishEvent: ANALYTICS_EVENTS.PROFILES_RESOLVE_FINISHED,
    actor: ANALYTICS_ACTOR.id,
    includeFlags: true,
  },
  // @ts-expect-error - types will be inferred from schema after types are generated
  async handler(ctx: any, argv: any, flags: any) {
    const cwd = flags.cwd || ctx.cwd || process.cwd();
    
    ctx.tracker.checkpoint('load');

    if (!flags.profile) {
      const profilesSection = await readProfilesSection(cwd);
      const availableProfiles = profilesSection.profiles.map((p) => p.id);
      const msg = `No profile specified. Available profiles: ${availableProfiles.join(', ') || 'none'}`;
      ctx.output?.error(msg);
      return 1;
    }

    const bundleProfile = await resolveProfile({ cwd, profileId: flags.profile });

    ctx.tracker.checkpoint('complete');

    if (flags.json) {
      ctx.output?.json({
        id: bundleProfile.id,
        label: bundleProfile.label,
        version: bundleProfile.version,
        source: bundleProfile.source,
        products: bundleProfile.products,
        scopes: bundleProfile.scopes.map((s) => ({
          id: s.id,
          label: s.label,
          include: s.include,
          exclude: s.exclude,
          isDefault: s.isDefault,
          products: s.products,
        })),
        trace: bundleProfile.trace,
        productsByScope: bundleProfile.productsByScope,
      });
    } else {
      ctx.output?.write(`ID: ${bundleProfile.id}\n`);
      if (bundleProfile.label) {
        ctx.output?.write(`Label: ${bundleProfile.label}\n`);
      }
      if (bundleProfile.version) {
        ctx.output?.write(`Version: ${bundleProfile.version}\n`);
      }
      ctx.output?.write(`Source: ${bundleProfile.source}\n`);
      if (bundleProfile.trace?.extends && bundleProfile.trace.extends.length > 0) {
        ctx.output?.write(`Extends: ${bundleProfile.trace.extends.join(' → ')}\n`);
      }
      ctx.output?.write(`Products: ${Object.keys(bundleProfile.products || {}).join(', ') || 'none'}\n`);
      ctx.output?.write(`Scopes: ${bundleProfile.scopes.map((s) => s.id).join(', ') || 'none'}\n`);
    }

    return { ok: true, profile: bundleProfile };
  },
});
