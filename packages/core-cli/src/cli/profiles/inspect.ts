// @ts-expect-error - types will be available after command-kit types are generated
import { defineCommand } from '@kb-labs/shared-command-kit';
import { readProfilesSection, resolveProfile } from '@kb-labs/core-config';
import { box, safeSymbols, safeColors } from '@kb-labs/shared-cli-ui';
import { ANALYTICS_EVENTS, ANALYTICS_ACTOR } from '../../infra/analytics/events';

export const run = defineCommand({
  name: 'profiles:inspect',
  flags: {
    profile: {
      type: 'string',
      description: 'Profile ID to inspect',
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
    startEvent: ANALYTICS_EVENTS.PROFILES_INSPECT_STARTED,
    finishEvent: ANALYTICS_EVENTS.PROFILES_INSPECT_FINISHED,
    actor: ANALYTICS_ACTOR.id,
    includeFlags: true,
  },
  // @ts-expect-error - types will be inferred from schema after types are generated
  async handler(ctx: any, argv: any, flags: any) {
    const cwd = flags.cwd || ctx.cwd || process.cwd();
    
    ctx.tracker.checkpoint('load');

    const profilesSection = await readProfilesSection(cwd);
    const availableProfiles = profilesSection.profiles.map((p) => p.id);

    if (!flags.profile) {
      const msg = `No profile specified. Available profiles: ${availableProfiles.join(', ') || 'none'}`;
      if (flags.json) {
        ctx.output?.json({ ok: false, error: msg, available: availableProfiles });
      } else {
        ctx.output?.error(msg);
      }
      return 1;
    }

    if (!availableProfiles.includes(flags.profile)) {
      const msg = `Profile "${flags.profile}" not found. Available: ${availableProfiles.join(', ') || 'none'}`;
      if (flags.json) {
        ctx.output?.json({ ok: false, error: msg, available: availableProfiles });
      } else {
        ctx.output?.error(msg);
      }
      return 1;
    }

    const bundleProfile = await resolveProfile({ cwd, profileId: flags.profile });

    ctx.tracker.checkpoint('complete');

    if (flags.json) {
      ctx.output?.json({
        ok: true,
        profileId: bundleProfile.id,
        label: bundleProfile.label,
        source: bundleProfile.source,
        version: bundleProfile.version,
        products: Object.keys(bundleProfile.products || {}),
        scopes: bundleProfile.scopes.map((s) => ({
          id: s.id,
          label: s.label,
          isDefault: s.isDefault,
        })),
        trace: bundleProfile.trace,
      });
    } else {
      const lines: string[] = [
        `${safeSymbols.info} ${safeColors.bold(bundleProfile.label || bundleProfile.id)}${bundleProfile.version ? `@${bundleProfile.version}` : ''} (${bundleProfile.id})`,
        `source: ${bundleProfile.source}`,
        bundleProfile.version ? `version: ${bundleProfile.version}` : '',
        `products: ${Object.keys(bundleProfile.products || {}).join(', ') || 'none'}`,
        `scopes: ${bundleProfile.scopes.map((s) => s.id).join(', ') || 'none'}`,
        bundleProfile.trace?.extends
          ? `extends: ${bundleProfile.trace.extends.join(' → ')}`
          : '',
      ].filter(Boolean);

      ctx.output?.write(box('Profile Inspect', lines));
    }

    return { ok: true, profile: bundleProfile };
  },
});
